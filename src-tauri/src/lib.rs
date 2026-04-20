use tauri::Manager;
use tauri::Emitter;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .invoke_handler(tauri::generate_handler![get_active_window, get_idle_time, move_foreground_window, capture_foreground_hwnd, move_captured_window, send_space_to_window, get_cursor_position, set_window_bounds])
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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
