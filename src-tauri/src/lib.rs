use tauri::Manager;

mod activity;
mod tray;

use activity::{ActiveWindowInfo, IdleInfo};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_active_window, get_idle_time, move_foreground_window, capture_foreground_hwnd, move_captured_window, send_space_to_window])
        .setup(|app| {
            tray::create_tray(&app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
