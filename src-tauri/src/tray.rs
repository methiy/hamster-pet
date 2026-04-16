use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let pet_mode = MenuItemBuilder::with_id("pet_mode", "🐹 宠物模式").build(app)?;
    let work_mode = MenuItemBuilder::with_id("work_mode", "⌨️ 打字模式").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "❌ 退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&pet_mode)
        .item(&work_mode)
        .item(&separator)
        .item(&quit)
        .build()?;

    let icon = app.default_window_icon().cloned()
        .expect("No default window icon found");

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("Hamster Pet")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "pet_mode" => {
                    let _ = app.emit("mode-change", "normal");
                }
                "work_mode" => {
                    let _ = app.emit("mode-change", "work");
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
