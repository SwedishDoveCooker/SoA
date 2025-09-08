// use crate::core::{consts, error};
// use futures::stream::{iter, StreamExt};
// use lofty::file::TaggedFileExt;
// use lofty::probe::Probe;
// use lofty::tag::Accessor;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};

// use crate::core::error::CoreResult;
// use std::path::{Path, PathBuf};
// use tauri::AppHandle;
// use tauri_plugin_store::StoreBuilder;
// use thiserror::Error;
// use tokio::task;
// use uuid::Uuid;

#[non_exhaustive]
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub(crate) struct Track {
    pub id: i64,

    pub path: String,
    pub title: String,
    pub duration: u32,

    pub artist_id: Option<i64>,
    pub release_id: Option<i64>,

    pub art_b64: Option<String>,
    pub lyrics: Option<String>,
    // pub release: Option<String>,
    // pub release_pic_b64: Option<String>,
    pub score: Option<TrackScore>,
    // things like sample rate, channels
}

#[non_exhaustive]
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub(crate) struct TrackView {
    pub id: i64,
    pub path: String,
    pub title: String,
    pub duration: u32,

    // pub artist_id: Option<u64>,
    pub artist_name: Option<String>,

    // pub release_id: Option<u64>,
    pub release_name: Option<String>,
    // pub release_art_b64: Option<String>,
    pub art_b64: Option<String>,
    pub lyrics: Option<String>,
    pub score: Option<TrackScore>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
pub(crate) enum TrackScore {
    SuperBigCupUp,
    SuperBigCup,
    SuperBigCupDown,

    BigCupUp,
    BigCup,
    BigCupDown,

    MedCupUp,
    MedCup,
    MedCupDown,
    // UnScored,
}

// #[allow(dead_code)]
// #[derive(Debug, Deserialize)]
// pub(crate) struct Filter {
//     pub field: String,
//     pub operator: String,
//     pub value: serde_json::Value,
// }

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub(crate) struct Release {
    pub id: i64,
    pub name: String,
    // pub art_b64: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub(crate) struct Artist {
    pub id: i64,
    pub name: String,
}

// impl FromRow<'_, SqliteRow> for TrackScore {
//     fn from_row(row: &SqliteRow) -> Result<TrackScore, Error> {
//         let score_str: Option<String> = row.try_get("score")?;
//         match score_str.as_deref() {
//             Some("SuperBigCupUp") => Ok(TrackScore::SuperBigCupUp),
//             Some("SuperBigCup") => Ok(TrackScore::SuperBigCup),
//             Some("SuperBigCupDown") => Ok(TrackScore::SuperBigCupDown),
//             Some("BigCupUp") => Ok(TrackScore::BigCupUp),
//             Some("BigCup") => Ok(TrackScore::BigCup),
//             Some("BigCupDown") => Ok(TrackScore::BigCupDown),
//             Some("MedCupUp") => Ok(TrackScore::MedCupUp),
//             Some("MedCup") => Ok(TrackScore::MedCup),
//             Some("MedCupDown") => Ok(TrackScore::MedCupDown),
//             _ => Err(Error::ColumnNotFound(
//                 "Invalid or missing score value".into(),
//             )),
//         }
//     }
// }

// #[derive(Debug, Error)]
// pub enum TrackError {
//     #[error("File not found: {0}")]
//     NotFoundError(#[from] std::io::Error),

//     #[error("Failed to parse audio file: {0}")]
//     ParseError(#[from] lofty::error::LoftyError),

//     #[error("Tokio join error: {0}")]
//     TokioJoinError(#[from] tokio::task::JoinError),
// }

// impl Track {
// pub async fn from_path(path_string: String) -> Result<Self, error::CoreError> {
//     task::spawn_blocking(move || {
//         let path = Path::new(path_string.as_str());
//         if !path.exists() {
//             return Err(error::CoreError::IoError(std::io::Error::new(
//                 std::io::ErrorKind::NotFound,
//                 format!("File not found: {}", path.display()),
//             )));
//         }

//         let probe = Probe::open(&path)?.read()?;

//         let tag = probe.primary_tag();
//         if let Some(tag) = tag {
//             return Ok(Track {
//                 id: Uuid::new_v4().to_string(),
//                 path: path_string,
//                 title: tag.title().map(|s| s.to_string()),
//                 artist: tag.artist().map(|s| s.to_string()),
//                 release: tag.release().map(|s| s.to_string()),
//                 release_pic_b64: tag.pictures().first().map(|pic| {
//                     let encoded = base64::Engine::encode(
//                         &base64::engine::general_purpose::STANDARD,
//                         &pic.data(),
//                     );
//                     format!("data:{};base64,{}", pic.mime_type().unwrap(), encoded)
//                 }),
//                 score: TrackScore::UnScored,
//             });
//         }

//         // no tags
//         Ok(Track {
//             id: Uuid::new_v4().to_string(),
//             path: path_string,
//             title: None,
//             artist: None,
//             release: None,
//             release_pic_b64: None,
//             score: TrackScore::UnScored,
//         })
//     })
//     .await
//     .map_err(|e| error::CoreError::TokioJoinError(e))?
// }

// pub fn test_read(path: String) -> String {
//     let probe = Probe::open(&path).and_then(|p| p.read()).ok();
//     if let Some(probe) = probe {
//         format!("{:?}", probe.properties())
//     } else {
//         "Failed to read file".into()
//     }
// }

// #[allow(dead_code)]
// pub fn score(&self) -> &TrackScore {
//     &self.score
// }

// #[allow(dead_code)]
// pub fn set_score(&mut self, score: String) {
//     self.score = match score.as_str() {
//         "SuperBigCupUp" => TrackScore::SuperBigCupUp,
//         "SuperBigCup" => TrackScore::SuperBigCup,
//         "SuperBigCupDown" => TrackScore::SuperBigCupDown,
//         "BigCupUp" => TrackScore::BigCupUp,
//         "BigCup" => TrackScore::BigCup,
//         "BigCupDown" => TrackScore::BigCupDown,
//         "MedCupUp" => TrackScore::MedCupUp,
//         "MedCup" => TrackScore::MedCup,
//         "MedCupDown" => TrackScore::MedCupDown,
//         _ => TrackScore::UnScored,
//     };
// }
// }

// pub async fn get_local_tracks(directory: String) -> Result<Vec<Track>, String> {
//     let search_path = format!("{}/**/*", directory);
//     let paths: Vec<_> = glob::glob(&search_path)
//         .map_err(|e| e.to_string())?
//         .filter_map(Result::ok)
//         .collect();

//     let track_futures: Vec<_> = iter(paths)
//         .map(|path| {
//             let path_str = path.to_string_lossy().to_string();
//             Track::from_path(path_str)
//         })
//         .buffer_unordered(consts::CONCURRENT_SCANS)
//         .filter_map(|res| async move {
//             match res {
//                 Ok(track) => Some(track),
//                 Err(e) => {
//                     eprintln!("Error processing track: {}", e);
//                     None
//                 }
//             }
//         })
//         .collect()
//         .await;

//     Ok(track_futures)

// // tmp
// // to make cargo happy
// Err("114514".to_string())
// }

// #[tauri::command]
// pub fn get_local_tracks(path: String) -> Vec<Track> {
//     let mut tracks = Vec::new();
// if let Ok(tagged_file) = Probe::open(&path).and_then(|p| p.read()) {
//     let tag = tagged_file.primary_tag();
//     let title = tag.and_then(|t| {
//         t.get_string(&lofty::ItemKey::TrackTitle)
//             .map(|s| s.to_string())
//     });
//     let artist =
//         tag.and_then(|t| t.get_string(&lofty::ItemKey::Artist).map(|s| s.to_string()));
//     let release = tag.and_then(|t| {
//         t.get_string(&lofty::ItemKey::AlbumTitle)
//             .map(|s| s.to_string())
//     });
//     // Extract release art if available
//     let release_pic_b64 = tagged_file.pictures().next().and_then(|pic| {
//         let encoded = base64::encode(&pic.data);
//         Some(format!("data:{};base64,{}", pic.mime_type, encoded))
//     });
//     tracks.push(Track {
//         path,
//         title,
//         artist,
//         release,
//         release_pic_b64,
//     });
// }
//     tracks
// }

// #[tauri::command]
// async fn get_local_tracks(directory: String) -> Result<Vec<Track>, String> {
//     let search_path = format!("{}/**/*.mp3", directory);
//     let mut tracks = Vec::new();
//     for entry in glob::glob(&search_path).map_err(|e| e.to_string())? {
//         if let Ok(path) = entry {
//             let path_str = path.to_string_lossy().to_string();
//             let tagged_file = Probe::open(&path)
//                 .map_err(|e| e.to_string())?
//                 .read()
//                 .map_err(|e| e.to_string())?;
//             let tag = tagged_file.primary_tag();
//             let mut track = Track {
//                 path: path_str,
//                 title: tag.as_ref().and_then(|t| t.title().as_deref().map(String::from)),
//                 artist: tag.as_ref().and_then(|t| t.artist().as_deref().map(String::from)),
//                 release: tag.as_ref().and_then(|t| t.release().as_deref().map(String::from)),
//                 release_art_base64: None,
//             };
//             if let Some(picture) = tag.as_ref().and_then(|t| t.get_picture(0)) {
//                 let mime_type = picture.mime_type().to_string();
//                 let data = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, picture.data());
//                 track.release_art_base64 = Some(format!("data:{};base64,{}", mime_type, data));
//             }
//             tracks.push(track);
//         }
//     }
//     Ok(tracks)
// }

// impl Default for Track {
//     fn default() -> Self {
//         Track {
//             id: Uuid::new_v4().to_string(),
//             path: String::new(),
//             title: None,
//             artist: None,
//             release: None,
//             release_pic_b64: None,
//             score: TrackScore::UnScored,
//         }
//     }
// }

// quer: NEED TO BE ASYNC?
// #[tauri::command]
// pub fn load_tracks(app: AppHandle) -> Result<Vec<Track>, String> {
//     let path = PathBuf::from(consts::STORE_TRACKLIST_PATH);
//     let store = StoreBuilder::new(&app, path).build();

//     if let Err(e) = store {
//         // if e.to_string().contains("os error 2") {
//         //     // "os error 2" is "No such file or directory"
//         //     return Ok(Vec::new());
//         // }
//         // 目测不会触发
//         // 似乎这个插件在文件不存在时不会出现任何问题
//         return Err(e.to_string());
//     };

//     match store.unwrap().get(consts::STORE_KEY_TRACKLIST) {
//         Some(json_value) => serde_json::from_value(json_value.clone()).map_err(|e| e.to_string()),
//         None => Ok(Vec::new()), // No tracks found, return empty vector
//     }

//     // // Test
//     // Ok(vec![
//     //     Track {
//     //         id: Uuid::new_v4().to_string(),
//     //         path: String::from("/path/to/track.mp3"),
//     //         title: Some(String::from("Track Title")),
//     //         artist: Some(String::from("Track Artist")),
//     //         release: Some(String::from("Track Album")),
//     //         release_pic_b64: None,
//     //         score: None,
//     //     },
//     //     Track {
//     //         id: Uuid::new_v4().to_string(),
//     //         path: String::from("/path/to/track2.mp3"),
//     //         title: Some(String::from("Track Title 2")),
//     //         artist: Some(String::from("Track Artist 2")),
//     //         release: Some(String::from("Track Album 2")),
//     //         release_pic_b64: None,
//     //         score: None,
//     //     },
//     // ])
// }

// #[tauri::command]
// pub fn save_tracks(app: AppHandle, tracks: Vec<Track>) -> Result<(), String> {
//     let path = PathBuf::from(consts::STORE_TRACKLIST_PATH);
//     let store = StoreBuilder::new(&app, path).build().unwrap();

//     // attn: 我没有考虑文件未存在的情况 或者没有妥善考虑 因为我不清楚store的工作方式
//     store.set(
//         consts::STORE_KEY_TRACKLIST.to_string(),
//         serde_json::to_value(&tracks).unwrap(),
//     );

//     // Err("test".into())

//     store.save().map_err(|e| e.to_string())?;
//     // println!("Tracks saved successfully");

//     Ok(())
// }
