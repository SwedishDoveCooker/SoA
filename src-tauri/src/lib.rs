use crate::core::{
    cmd::{get_all_tracks, modify, scan_dir},
    setup,
};
use tauri::{async_runtime, Manager};

mod core;
// use tauri_plugin_store::StoreExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

// #[tauri::command]
// async fn get_local_tracks(directory: String) -> Result<Vec<core::track::Track>, String> {
//     core::track::get_local_tracks(directory).await
// }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // .plugin(tauri_plugin_store::Builder::new().build())
        // .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            app.run_on_main_thread(move || {
                async_runtime::spawn(async move {
                    let pool = setup::initialize_database(&app_handle)
                        .await
                        .expect("database init failed");
                    app_handle.manage(pool);
                });
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // greet,
            // get_local_tracks,
            // core::track::load_tracks,
            // core::track::save_tracks,
            get_all_tracks,
            scan_dir,
            modify,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
