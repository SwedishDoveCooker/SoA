use crate::misc::error::CoreError;

use super::error::CoreResult;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::{Arc, OnceLock};
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{Store, StoreExt};

// #[derive(Debug, Deserialize, Serialize, Clone)]
// pub struct Config {
//     pub log: LogConfig,
//     pub store: StoreConfig,
//     pub misc: MiscConfig,
// }

// #[derive(Debug, Deserialize, Serialize, Clone)]
// pub struct LogConfig {
//     pub log_prefix: String,
//     pub log_level: String,
// }

// #[derive(Debug, Deserialize, Serialize, Clone)]
// pub struct StoreConfig {
//     pub store_base: String,
//     pub song_store: String,
//     pub playlist_store: String,
//     pub recent_store: String,
//     pub release_cover_store: String,
//     pub lyric_store: String,
//     pub single_song_store: String,
//     pub listen_paths: Vec<String>,
// }

// #[derive(Debug, Deserialize, Serialize, Clone)]
// pub struct MiscConfig {
//     pub debounce_timeout_ms: u64,
// }

// impl Default for Config {
//     fn default() -> Self {
//         Self {
//             log: LogConfig::default(),
//             store: StoreConfig::default(),
//             misc: MiscConfig::default(),
//         }
//     }
// }

// impl Default for LogConfig {
//     fn default() -> Self {
//         Self {
//             log_prefix: "soa".to_string(),
//             log_level: "info".to_string(),
//         }
//     }
// }

// impl Default for StoreConfig {
//     fn default() -> Self {
//         Self {
//             store_base: "".to_string(), // 默认为空
//             song_store: "songs.json".to_string(),
//             playlist_store: "playlists.json".to_string(),
//             recent_store: "recents.json".to_string(),
//             release_cover_store: "releases_cover".to_string(),
//             lyric_store: "lyrics".to_string(),
//             single_song_store: "lib".to_string(),
//             listen_paths: vec![],
//         }
//     }
// }

// impl Default for MiscConfig {
//     fn default() -> Self {
//         Self {
//             debounce_timeout_ms: 2000,
//         }
//     }
// }

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Config {
    pub log_prefix: String,
    pub log_level: String,
    pub store_base: String,
    pub song_store: String,
    pub playlist_store: String,
    pub alist_store: String,
    pub recent_store: String,
    pub release_cover_store: String,
    pub lyric_store: String,
    pub single_song_store: String,
    pub listen_paths: Vec<String>,
    pub debounce_timeout_ms: u64,
    pub supported_audio_extensions: Vec<String>,
    // pub theme: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            log_prefix: "soa".to_string(),
            log_level: "info".to_string(),
            store_base: "".to_string(),
            song_store: "songs.json".to_string(),
            playlist_store: "playlists.json".to_string(),
            alist_store: "alist.json".to_string(),
            recent_store: "recents.json".to_string(),
            release_cover_store: "releases_cover".to_string(),
            lyric_store: "lyrics".to_string(),
            single_song_store: "lib".to_string(),
            listen_paths: vec![],
            debounce_timeout_ms: 2000,
            supported_audio_extensions: vec![
                "mp3".to_string(),
                "flac".to_string(),
                "wav".to_string(),
            ],
            // theme: "system".to_string(),
        }
    }
}

// lazy_static! {
//     static ref CONFIG_INSTANCE: Config = {
//         let config_content = fs::read_to_string("config.toml").unwrap();
//         let config: Config = toml::from_str(&config_content).unwrap();
//         config
//     };
// }

// // wip: merge into apphandle?
// #[allow(unused)]
// impl Config {
//     pub fn get() -> &'static Self {
//         &CONFIG_INSTANCE
//     }

//     pub fn modify<F: FnOnce(&mut Config)>(f: F) {
//         let mut config = CONFIG_INSTANCE.clone();
//         f(&mut config);
//     }

//     pub fn save(&self) -> CoreResult<()> {
//         let toml_string = toml::to_string(self).unwrap();
//         fs::write("config.toml", toml_string)?;
//         Ok(())
//     }
// }

#[allow(unused)]
pub fn path() -> PathBuf {
    PathBuf::from("config.json")
}

#[allow(unused)]
// deprecated
// no one likes passing apphandle everywhere
pub fn get(app: &AppHandle<Wry>) -> CoreResult<Config> {
    let path = path();
    let store = app.store(path).unwrap();
    let json_val = serde_json::Value::Object(store.entries().into_iter().collect());
    let config: Config = serde_json::from_value(json_val)
        .map_err(|e| CoreError::OtherError(format!("Failed to deserialize config: {}", e)))?;
    Ok(config)
}

#[allow(unused)]
pub fn modify<F>(app: &AppHandle<Wry>, f: F) -> CoreResult<()>
where
    F: FnOnce(&mut Config),
{
    let path = path();
    let mut current_config = get(app)?;
    f(&mut current_config);
    let store = app.store(path).unwrap();
    let json_value = serde_json::to_value(&current_config).unwrap();
    if let serde_json::Value::Object(map) = json_value {
        map.into_iter().for_each(|(k, v)| {
            store.set(k, v);
        });
        store
            .save()
            .map_err(|e| CoreError::OtherError(format!("Failed to save modified config: {}", e)))?;
    }
    Ok(())
}

static GLOBAL_CONFIG_STORE: OnceLock<Arc<Store<Wry>>> = OnceLock::new();

pub fn init_global(store: Arc<Store<Wry>>) {
    let _ = GLOBAL_CONFIG_STORE.set(store);
}

pub fn get_global() -> &'static Store<Wry> {
    GLOBAL_CONFIG_STORE
        .get()
        .expect("Global config store is not initialized")
}
