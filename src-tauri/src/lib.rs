use tauri::Manager;
use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem};

mod activity;
mod tray;

use activity::{ActiveWindowInfo, IdleInfo, CursorPosition};

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
fn capture_foreground_hwnd() -> bool {
    activity::platform::capture_foreground_hwnd()
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![get_active_window, get_idle_time, move_foreground_window, capture_foreground_hwnd, move_captured_window, send_space_to_window, get_cursor_position, set_window_bounds, show_context_menu])
        .setup(|app| {
            tray::create_tray(&app.handle())?;

            // Register global shortcuts
            use tauri_plugin_global_shortcut::GlobalShortcutExt;

            // Ctrl+Shift+P — Summon pet
            let handle = app.handle().clone();
            app.global_shortcut().on_shortcut("Ctrl+Shift+P", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = handle.emit("summon-pet", ());
                }
            })?;

            // Ctrl+Shift+F — Feed
            let handle2 = app.handle().clone();
            app.global_shortcut().on_shortcut("Ctrl+Shift+F", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = handle2.emit("tray-action", "feed");
                }
            })?;

            // Ctrl+Shift+N — Reminder
            let handle3 = app.handle().clone();
            app.global_shortcut().on_shortcut("Ctrl+Shift+N", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = handle3.emit("tray-action", "reminder");
                }
            })?;

            // Ctrl+Shift+T — Pomodoro
            let handle4 = app.handle().clone();
            app.global_shortcut().on_shortcut("Ctrl+Shift+T", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = handle4.emit("tray-action", "pomodoro");
                }
            })?;

            // Handle context menu item clicks
            let menu_handle = app.handle().clone();
            app.on_menu_event(move |_app, event| {
                let id = event.id().as_ref();
                match id {
                    "ctx_feed" => { let _ = menu_handle.emit("tray-action", "feed"); }
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
