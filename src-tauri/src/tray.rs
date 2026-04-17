use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let summon = MenuItemBuilder::with_id("summon", "📍 召唤宠物").build(app)?;
    let pet_mode = MenuItemBuilder::with_id("pet_mode", "🐹 宠物模式").build(app)?;
    let work_mode = MenuItemBuilder::with_id("work_mode", "⌨️ 打字模式").build(app)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "❌ 退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&summon)
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
        .menu_on_left_click(false)  // Left click → show window, not menu
        .tooltip("Hamster Pet")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "summon" => {
                    let _ = app.emit("summon-pet", ());
                }
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
            // Only handle left-click press to show/focus the main window
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
