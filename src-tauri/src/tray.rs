use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

pub fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let summon = MenuItemBuilder::with_id("summon", "📍 召唤宠物  Ctrl+Shift+P").build(app)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let feed = MenuItemBuilder::with_id("feed", "🍽️ 喂食  Ctrl+Shift+F").build(app)?;
    let shop = MenuItemBuilder::with_id("shop", "🏪 商店").build(app)?;
    let reminder = MenuItemBuilder::with_id("reminder", "📝 备忘  Ctrl+Shift+N").build(app)?;
    let status = MenuItemBuilder::with_id("status", "📊 状态").build(app)?;
    let pomodoro = MenuItemBuilder::with_id("pomodoro", "🍅 番茄钟  Ctrl+Shift+T").build(app)?;
    let settings = MenuItemBuilder::with_id("settings", "⚙️ 设置").build(app)?;
    let passthrough = MenuItemBuilder::with_id("passthrough", "👆 鼠标穿透").build(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItemBuilder::with_id("quit", "❌ 退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&summon)
        .item(&sep1)
        .item(&feed)
        .item(&shop)
        .item(&reminder)
        .item(&status)
        .item(&pomodoro)
        .item(&settings)
        .item(&passthrough)
        .item(&sep2)
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
                "feed" => {
                    let _ = app.emit("tray-action", "feed");
                }
                "shop" => {
                    let _ = app.emit("tray-action", "shop");
                }
                "reminder" => {
                    let _ = app.emit("tray-action", "reminder");
                }
                "status" => {
                    let _ = app.emit("tray-action", "status");
                }
                "pomodoro" => {
                    let _ = app.emit("tray-action", "pomodoro");
                }
                "settings" => {
                    let _ = app.emit("tray-action", "settings");
                }
                "passthrough" => {
                    let _ = app.emit("tray-action", "toggle-passthrough");
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
