use core::{
    cmd::{
        add_dir, add_element_to_alist, add_elements_to_alist, add_recents, add_single_song,
        add_single_songs, add_song_to_playlist, add_songs_to_playlist, clear_alist_elements,
        clear_playlist, clear_recents, clear_songs_multi, create_alist, create_playlist,
        delete_alist, delete_playlist, delete_song_file, delete_song_files, freeze_alist,
        get_all_alists, get_all_artists, get_all_playlists, get_all_recents, get_all_releases,
        get_all_songs, get_cover_art_path, get_glob_dirs, get_lyric, get_song_by_file,
        get_songs_by_files, list_all_alist_elements, list_all_alist_songs, modify, modify_multiple,
        ping, player_pause, player_play, player_play_file, player_seek, player_set_volume,
        player_stop, refresh_library, remove_alists, remove_dir, remove_element_from_alist_all,
        remove_element_from_alist_by_index, remove_elements_from_alist_all,
        remove_elements_from_alist_by_indices, remove_recents_by_index, remove_recents_by_song_all,
        remove_song_from_playlist_all, remove_songs_from_playlist_by_index, rename_alist,
        rename_playlist, update_song_tags, window_pin,
    },
    playback::{spawn_progress_emitter, PlaybackService},
};
use kira::manager::{backend::cpal::CpalBackend, AudioManager, AudioManagerSettings};
use library::library::Library;
use log::{debug, info};
use misc::config::{init_global, Config};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{Listener, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_log::{Target, TargetKind, TimezoneStrategy};
mod core;
mod library;
mod meta;
mod misc;
mod store;
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

// wip: add tauri-plugin-window-state

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_prevent_default::debug())
        // wip: set log level
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    // Target::new(TargetKind::Stderr),
                    Target::new(TargetKind::Webview),
                    Target::new(TargetKind::LogDir {
                        file_name: Some("soa".to_string()),
                    }),
                ])
                .format(|out, message, record| {
                    out.finish(format_args!(
                        "[{} {}] {}",
                        record.level(),
                        record.target(),
                        message
                    ))
                })
                .timezone_strategy(TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let win_builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("soa")
                .inner_size(1250.0, 800.0);
            // let win_builder = win_builder.always_on_top(true);

            // set transparent title bar only when building for macOS
            #[cfg(target_os = "macos")]
            let win_builder = win_builder.title_bar_style(TitleBarStyle::Transparent);

            let window = win_builder.build().unwrap();

            // set background color only when building for macOS
            #[cfg(target_os = "macos")]
            {
                use objc2_app_kit::{NSColor, NSWindow};

                let ns_window = window.ns_window().unwrap();
                let ns_window_ptr = ns_window as *mut NSWindow;
                unsafe {
                    let bg_color = NSColor::colorWithRed_green_blue_alpha(
                        200.0 / 255.0,
                        150.0 / 255.0,
                        200.0 / 255.0,
                        0.4,
                    );
                    (*ns_window_ptr).setBackgroundColor(Some(&bg_color));
                }
            }

            let app_handle = app.handle().clone();
            let store = tauri_plugin_store::StoreBuilder::new(app, "config.json")
                .auto_save(Duration::from_millis(100))
                .build()?;
            // store.set("some-key", json!({ "value": 5 }));
            if store.is_empty() {
                info!("Config.json not found, creating default config.");
                let mut default_config = Config::default();
                default_config.store_base =
                    app.path().app_data_dir()?.to_string_lossy().to_string();
                let config_json = serde_json::to_value(&default_config)
                    .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                if let serde_json::Value::Object(map) = config_json {
                    for (key, value) in map {
                        println!("Setting default config key: {} {:?}", &key, &value);
                        store.set(key, value);
                    }
                }
                store.save()?;
            }
            init_global(store.clone());
            debug!("Config store initialized. Contents: {:#?}", store.entries());
            app.manage(store);
            let mut library = Library::init(app.handle())?;
            library.load()?;
            let library_state: Arc<Mutex<Library>> = Arc::new(Mutex::new(library));
            app.manage(library_state.clone());
            let library_added_clone = library_state.clone();
            app.listen("fs-files-added", move |event| {
                let files: Vec<PathBuf> = serde_json::from_str(event.payload()).unwrap();
                library_added_clone
                    .lock()
                    .unwrap()
                    .on_file_added(files)
                    .unwrap();
            });
            let library_modified_clone = library_state.clone();
            app.listen("fs-files-modified", move |event| {
                let files: Vec<PathBuf> = serde_json::from_str(event.payload()).unwrap();
                library_modified_clone
                    .lock()
                    .unwrap()
                    .on_file_modified(files)
                    .unwrap();
            });
            let library_removed_clone = library_state.clone();
            app.listen("fs-files-removed", move |event| {
                let files: Vec<PathBuf> = serde_json::from_str(event.payload()).unwrap();
                library_removed_clone
                    .lock()
                    .unwrap()
                    .on_file_removed(files)
                    .unwrap();
            });
            info!("Initializing Audio Manager (Kira)...");
            let audio_manager = AudioManager::<CpalBackend>::new(AudioManagerSettings::default())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            info!("Initializing PlaybackService...");
            let playback_service = PlaybackService::new(app_handle.clone(), audio_manager)?;
            spawn_progress_emitter(playback_service.clone(), app_handle.clone());
            app.manage(playback_service);
            info!("PlaybackService initialized and managed.");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ping,
            get_glob_dirs,
            refresh_library,
            add_dir,
            remove_dir,
            get_all_songs,
            modify,
            modify_multiple,
            update_song_tags,
            add_single_song,
            add_single_songs,
            get_all_artists,
            get_all_releases,
            get_all_recents,
            get_all_playlists,
            get_all_alists,
            get_song_by_file,
            create_playlist,
            delete_playlist,
            rename_playlist,
            add_song_to_playlist,
            remove_song_from_playlist_all,
            remove_songs_from_playlist_by_index,
            clear_playlist,
            create_alist,
            delete_alist,
            rename_alist,
            add_element_to_alist,
            add_elements_to_alist,
            remove_element_from_alist_by_index,
            remove_elements_from_alist_by_indices,
            remove_element_from_alist_all,
            remove_elements_from_alist_all,
            clear_alist_elements,
            freeze_alist,
            list_all_alist_elements,
            list_all_alist_songs,
            remove_alists,
            add_recents,
            remove_recents_by_index,
            remove_recents_by_song_all,
            clear_recents,
            delete_song_file,
            delete_song_files,
            get_songs_by_files,
            add_songs_to_playlist,
            window_pin,
            clear_songs_multi,
            get_cover_art_path,
            get_lyric,
            player_play_file,
            player_play,
            player_pause,
            player_stop,
            player_seek,
            player_set_volume,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
