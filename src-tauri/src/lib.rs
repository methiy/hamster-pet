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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_active_window, get_idle_time, move_foreground_window, capture_foreground_hwnd, move_captured_window, send_space_to_window, get_cursor_position])
        .setup(|app| {
            tray::create_tray(&app.handle())?;

            // Register Ctrl+Shift+P global shortcut for summoning the pet
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let handle = app.handle().clone();
            app.global_shortcut().on_shortcut("Ctrl+Shift+P", move |_app, _shortcut, event| {
                if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    let _ = handle.emit("summon-pet", ());
                }
            })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
