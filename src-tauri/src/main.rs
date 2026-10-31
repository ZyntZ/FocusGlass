// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

fn main() {
    // Ctrl+Shift+G — аварийный выход из режима click-through и показ окна
    let restore = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyG);
    let restore_handler = restore.clone();

    tauri::Builder::default()
        .manage(commands::DeviceManagerState::default())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &restore_handler && event.state() == ShortcutState::Pressed {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.set_ignore_cursor_events(false);
                            let _ = w.unminimize();
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("click-through-disabled", ());
                        }
                    }
                })
                .build(),
        )
        .setup(move |app| {
            app.global_shortcut().register(restore)?;

            let show_dashboard =
                MenuItem::with_id(app, "show_dashboard", "Open Dashboard", true, None::<&str>)?;
            let switch_hud =
                MenuItem::with_id(app, "switch_hud", "Floating HUD Overlay", true, None::<&str>)?;
            let disable_ct = MenuItem::with_id(
                app,
                "disable_click_through",
                "Disable Click-Through (Ctrl+Shift+G)",
                true,
                None::<&str>,
            )?;
            let sep = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Quit FocusGlass", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[&show_dashboard, &switch_hud, &disable_ct, &sep, &quit],
            )?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("FocusGlass Biofeedback");

            if let Some(icon) = app.default_window_icon().cloned() {
                tray_builder = tray_builder.icon(icon);
            }

            let _tray = tray_builder
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show_dashboard" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.set_ignore_cursor_events(false);
                            let _ = w.unminimize();
                            let _ = w.unmaximize();
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("tray-open-dashboard", ());
                        }
                    }
                    "switch_hud" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.unminimize();
                            let _ = w.maximize();
                            let _ = w.show();
                            let _ = w.emit("tray-open-hud", ());
                        }
                    }
                    "disable_click_through" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.set_ignore_cursor_events(false);
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.emit("click-through-disabled", ());
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::set_click_through,
            commands::set_overlay_mode,
            commands::get_device_status,
            commands::set_device_source,
            commands::scan_brainbit_devices,
            commands::load_session_history,
            commands::save_session_history,
            commands::toggle_always_on_top,
            commands::minimize_window,
            commands::close_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running FocusGlass tauri application");
}
