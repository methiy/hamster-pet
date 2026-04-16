use tauri::Manager;

mod activity;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_active_window, get_idle_time])
        .setup(|_app| {
            // Window is configured in tauri.conf.json
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
