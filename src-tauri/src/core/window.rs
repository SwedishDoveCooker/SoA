use tauri::{AppHandle, Manager};

pub fn window_pin(app: AppHandle, pin: bool) {
    app.get_webview_window("main")
        .unwrap()
        .set_always_on_top(pin)
        .unwrap();
}
