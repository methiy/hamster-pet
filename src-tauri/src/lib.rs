use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;
use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};

mod activity;
mod tray;

use activity::{ActiveWindowInfo, IdleInfo, CursorPosition};

/// Map from logical shortcut id (e.g. "summon") to its currently-bound
/// accelerator string (e.g. "Ctrl+Shift+P"). Kept in a Mutex so that
/// the `rebind_shortcut` command can unregister the old binding before
/// swapping in a new one.
struct ShortcutBindings(Mutex<HashMap<String, String>>);

/// The action each shortcut id fires when pressed. Centralized so
/// rebinding only needs to re-attach the same handler to a new
/// accelerator; the emit payload never changes.
fn emit_for_id(app: &tauri::AppHandle, id: &str) {
    match id {
        "summon" => { let _ = app.emit("summon-pet", ()); }
        "feed" => { let _ = app.emit("tray-action", "feed"); }
        "reminder" => { let _ = app.emit("tray-action", "reminder"); }
        "pomodoro" => { let _ = app.emit("tray-action", "pomodoro"); }
        "snack" => { let _ = app.emit("tray-action", "enter-feeding"); }
        _ => {}
    }
}

/// Default accelerator for each id. Used on first run and by the
/// "reset to default" button in the About panel.
fn default_accel(id: &str) -> Option<&'static str> {
    Some(match id {
        "summon" => "Ctrl+Shift+P",
        "feed" => "Ctrl+Shift+F",
        "reminder" => "Ctrl+Shift+N",
        "pomodoro" => "Ctrl+Shift+T",
        "snack" => "Ctrl+Shift+E",
        _ => return None,
    })
}

/// Register a shortcut with the global_shortcut plugin, wiring its
/// Pressed event to emit_for_id. Errors propagate to the caller so
/// rebind_shortcut can roll back on failure.
fn register_shortcut(
    app: &tauri::AppHandle,
    id: &str,
    accel: &str,
) -> Result<(), String> {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let id_owned = id.to_string();
    let app_clone = app.clone();
    app.global_shortcut()
        .on_shortcut(accel, move |_app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                emit_for_id(&app_clone, &id_owned);
            }
        })
        .map_err(|e| format!("register '{}' -> '{}' failed: {}", id, accel, e))
}

/// Unregister a specific accelerator. Ignores errors — the caller
/// always wants to re-register something else next, and the plugin is
/// forgiving about unknown accelerators.
fn unregister_accel(app: &tauri::AppHandle, accel: &str) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let _ = app.global_shortcut().unregister(accel);
}

/// Rebind shortcut `id` from its current accelerator (as tracked in
/// the ShortcutBindings state) to `new_accel`. Registers the new
/// binding first; on failure, re-registers the old one so we never
/// silently lose a shortcut.
#[tauri::command]
fn rebind_shortcut(
    app: tauri::AppHandle,
    state: tauri::State<'_, ShortcutBindings>,
    id: String,
    new_accel: String,
) -> Result<(), String> {
    let old_accel_opt = {
        let map = state.0.lock().map_err(|e| format!("lock: {}", e))?;
        map.get(&id).cloned()
    };
    let old_accel = match old_accel_opt {
        Some(v) => v,
        None => return Err(format!("unknown shortcut id: {}", id)),
    };

    if old_accel == new_accel {
        return Ok(());
    }

    unregister_accel(&app, &old_accel);
    match register_shortcut(&app, &id, &new_accel) {
        Ok(()) => {
            let mut map = state.0.lock().map_err(|e| format!("lock: {}", e))?;
            map.insert(id, new_accel);
            Ok(())
        }
        Err(e) => {
            // Roll back: put the old binding back so the user doesn't
            // end up with a missing shortcut.
            let _ = register_shortcut(&app, &id, &old_accel);
            Err(e)
        }
    }
}

#[tauri::command]
fn get_active_window() -> Option<ActiveWindowInfo> {
    activity::platform::get_foreground_window_info()
}

#[tauri::command]
fn get_idle_time() -> IdleInfo {
    IdleInfo {
        idle_seconds: activity::platform::get_idle_seconds(),
    }
}

#[tauri::command]
fn move_foreground_window(x: i32, y: i32) -> bool {
    activity::platform::move_foreground_window(x, y)
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    // Match the tray menu's quit behavior: terminate the whole process so
    // the tray icon also goes away. A plain window.close() on the pet
    // window would leave the tray icon dangling, because Tauri doesn't
    // auto-exit when a child window closes.
    app.exit(0);
}

#[tauri::command]
fn capture_foreground_hwnd() -> bool {
    activity::platform::capture_foreground_hwnd()
}

#[tauri::command]
fn capture_foreground_hwnd_debug() -> activity::CaptureDebug {
    activity::platform::capture_foreground_hwnd_debug()
}

#[tauri::command]
fn get_captured_hwnd() -> Option<i64> {
    activity::platform::get_captured_hwnd()
}

#[tauri::command]
fn move_captured_window(x: i32, y: i32) -> bool {
    activity::platform::move_captured_window(x, y)
}

#[tauri::command]
fn send_space_to_window() -> bool {
    activity::platform::send_space_to_captured_window()
}

#[tauri::command]
fn get_cursor_position() -> Option<CursorPosition> {
    activity::platform::get_cursor_position()
}

#[tauri::command]
fn set_hwnd_position(hwnd: i64, x: i32, y: i32) -> bool {
    activity::platform::set_hwnd_position(hwnd, x, y)
}

#[tauri::command]
fn get_hwnd_rect(hwnd: i64) -> Option<activity::WindowRect> {
    activity::platform::get_hwnd_rect(hwnd)
}

#[tauri::command]
fn create_reminder_notepad(text: String) -> Result<i64, String> {
    activity::platform::create_reminder_notepad(&text)
}

/// Write a reminder text file to the app data directory (`<appDataDir>/reminder.txt`),
/// overwriting any prior one. UTF-8 BOM is prepended so external tools that
/// open the file still display Chinese correctly. Returns the absolute path written.
#[tauri::command]
fn write_reminder_file(app: tauri::AppHandle, text: String) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir: {}", e))?;
    let path = dir.join("reminder.txt");
    let mut bytes: Vec<u8> = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice(text.as_bytes());
    std::fs::write(&path, &bytes).map_err(|e| format!("write: {}", e))?;
    Ok(path.to_string_lossy().into_owned())
}

/// Append a debug line (with an ISO-8601-ish timestamp) to
/// `<appDataDir>/reminder-debug.log`. Used by the interval-reminder flow
/// to record why `capture_foreground_hwnd` succeeded / failed, without
/// polluting the in-app speech bubble. Returns the log file path.
#[tauri::command]
fn append_debug_log(app: tauri::AppHandle, line: String) -> Result<String, String> {
    use std::io::Write;
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("mkdir: {}", e))?;
    let path = dir.join("reminder-debug.log");

    // Best-effort local timestamp. We don't pull in chrono just for this —
    // a seconds-since-epoch prefix is enough to correlate events.
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let mut f = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("open log: {}", e))?;
    writeln!(f, "[{}] {}", ts, line).map_err(|e| format!("write log: {}", e))?;
    Ok(path.to_string_lossy().into_owned())
}

/// Atomically set window position and size in one OS call to avoid flicker.
/// All values are in physical pixels.
#[tauri::command]
fn set_window_bounds(window: tauri::Window, x: i32, y: i32, width: i32, height: i32) -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOZORDER, SWP_NOACTIVATE};
        use windows::Win32::Foundation::HWND;

        let hwnd = match window.hwnd() {
            Ok(h) => HWND(h.0),
            Err(_) => return false,
        };

        unsafe {
            SetWindowPos(
                hwnd,
                HWND::default(),
                x, y, width, height,
                SWP_NOZORDER | SWP_NOACTIVATE,
            ).is_ok()
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, x, y, width, height);
        false
    }
}

#[tauri::command]
fn show_context_menu(window: tauri::Window) {
    let app = window.app_handle();
    let menu = MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id("ctx_feed", "🍽️ 喂食").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_snack", "🍿 丢零食").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_shop", "🏪 商店").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_postcard", "📮 明信片").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_souvenir", "🎁 纪念品").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_reminder", "📝 备忘").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_status", "📊 状态").build(app).unwrap())
        .item(&PredefinedMenuItem::separator(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_pomodoro", "🍅 番茄钟").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_settings", "⚙️ 设置").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_about", "ℹ️ 关于").build(app).unwrap())
        .item(&MenuItemBuilder::with_id("ctx_quit", "❌ 退出").build(app).unwrap())
        .build()
        .unwrap();
    let _ = window.popup_menu(&menu);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_active_window, get_idle_time, move_foreground_window, capture_foreground_hwnd, capture_foreground_hwnd_debug, get_captured_hwnd, move_captured_window, send_space_to_window, get_cursor_position, set_window_bounds, show_context_menu, set_hwnd_position, get_hwnd_rect, create_reminder_notepad, write_reminder_file, append_debug_log, quit_app, rebind_shortcut])
        .setup(|app| {
            tray::create_tray(&app.handle())?;

            // Register default global shortcuts. The id -> accel map
            // is stashed in app state so the rebind_shortcut command
            // can unregister/re-register atomically later.
            let mut bindings: HashMap<String, String> = HashMap::new();
            for id in ["summon", "feed", "reminder", "pomodoro", "snack"] {
                let accel = default_accel(id).unwrap();
                register_shortcut(&app.handle(), id, accel)
                    .map_err(|e| Box::<dyn std::error::Error>::from(e))?;
                bindings.insert(id.to_string(), accel.to_string());
            }
            app.manage(ShortcutBindings(Mutex::new(bindings)));

            // Handle context menu item clicks
            let menu_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let id = event.id().as_ref();
                match id {
                    "ctx_feed" => { let _ = menu_handle.emit("tray-action", "feed"); }
                    "ctx_snack" => { let _ = menu_handle.emit("tray-action", "enter-feeding"); }
                    "ctx_shop" => { let _ = menu_handle.emit("tray-action", "shop"); }
                    "ctx_postcard" => { let _ = menu_handle.emit("tray-action", "postcard"); }
                    "ctx_souvenir" => { let _ = menu_handle.emit("tray-action", "souvenir"); }
                    "ctx_reminder" => { let _ = menu_handle.emit("tray-action", "reminder"); }
                    "ctx_status" => { let _ = menu_handle.emit("tray-action", "status"); }
                    "ctx_pomodoro" => { let _ = menu_handle.emit("tray-action", "pomodoro"); }
                    "ctx_settings" => { let _ = menu_handle.emit("tray-action", "settings"); }
                    "ctx_about" => { let _ = menu_handle.emit("tray-action", "about"); }
                    "ctx_quit" => { let _ = menu_handle.emit("tray-action", "quit"); }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
