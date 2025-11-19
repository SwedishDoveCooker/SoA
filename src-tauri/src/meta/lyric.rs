use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
        utils::{get_path_hash, resolve_resource_path},
    },
    store::json::entity::song::Song,
};
// use lazy_static::lazy_static;
// use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    // collections::BTreeMap,
    path::{Path, PathBuf},
};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LyricCache {
    pub content: String,
    pub format: String,
}

// #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
// pub struct LyricWord {
//     pub start_time: u32,
//     pub duration: u32,
//     pub text: String,
// }

// #[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
// pub enum LyricLineContent {
//     Simple(String),
//     Enhanced(Vec<LyricWord>),
// }

// pub type LyricMap = BTreeMap<u32, LyricLineContent>;

// #[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
// pub struct ParsedLyric {
//     pub title: Option<String>,
//     pub artist: Option<String>,
//     pub release: Option<String>,
//     pub by: Option<String>,
//     pub offset: i32,

//     pub lines: LyricMap,
//     pub is_plain_lyric: bool,
// }

// lazy_static! {
//     // [ti:Title], [ar:Artist], [al:Album], [by:Creator], [offset:ms]
//     static ref RE_META: Regex = Regex::new(r"\[(ti|ar|al|by|offset):(.+?)\]").unwrap();

//     // [mm:ss.xx], [mm:ss.xxx]
//     static ref RE_TIME: Regex = Regex::new(r"\[(\d{2}):(\d{2})\.(\d{2,3})\]").unwrap();

//     // (start,duration)Word
//     static ref RE_WORD: Regex = Regex::new(r"\((?P<start>\d+),(?P<duration>\d+)\)(?P<text>.+?)(?=\(\d+,\d+\)|$)").unwrap();
// }

// #[allow(unused)]
// impl ParsedLyric {
//     pub fn parse(lyric_text: &str) -> Self {
//         let mut result = ParsedLyric::default();
//         let mut lines_map: BTreeMap<u32, LyricLineContent> = BTreeMap::new();

//         if lyric_text.is_empty() {
//             return result;
//         }

//         for line in lyric_text.lines() {
//             let line = line.trim();
//             if line.is_empty() {
//                 continue;
//             }

//             if let Some(caps) = RE_META.captures(line) {
//                 let key = caps.get(1).map_or("", |m| m.as_str());
//                 let value = caps.get(2).map_or("", |m| m.as_str()).trim().to_string();

//                 match key {
//                     "ti" => result.title = Some(value),
//                     "ar" => result.artist = Some(value),
//                     "al" => result.release = Some(value),
//                     "by" => result.by = Some(value),
//                     "offset" => result.offset = value.parse().unwrap_or(0),
//                     _ => {}
//                 }
//                 continue;
//             }

//             let mut timestamps: Vec<u32> = Vec::new();
//             for caps in RE_TIME.captures_iter(line) {
//                 let m: u32 = caps.get(1).unwrap().as_str().parse().unwrap_or(0);
//                 let s: u32 = caps.get(2).unwrap().as_str().parse().unwrap_or(0);

//                 let ms_str = caps.get(3).unwrap().as_str();
//                 let ms: u32 = if ms_str.len() == 2 {
//                     ms_str.parse().unwrap_or(0) * 10
//                 } else {
//                     ms_str.parse().unwrap_or(0)
//                 };

//                 let time_ms = (m * 60 * 1000) + (s * 1000) + ms;
//                 timestamps.push(time_ms);
//             }

//             if timestamps.is_empty() {
//                 continue;
//             }

//             let text = line.split(']').last().unwrap_or("").trim();
//             let content: LyricLineContent;

//             if text.starts_with('(') && RE_WORD.is_match(text) {
//                 let mut words: Vec<LyricWord> = Vec::new();
//                 for caps in RE_WORD.captures_iter(text) {
//                     words.push(LyricWord {
//                         start_time: caps["start"].parse().unwrap_or(0),
//                         duration: caps["duration"].parse().unwrap_or(0),
//                         text: caps["text"].to_string(),
//                     });
//                 }
//                 content = LyricLineContent::Enhanced(words);
//             } else {
//                 content = LyricLineContent::Simple(text.to_string());
//             }

//             for t in timestamps {
//                 lines_map.insert(t, content.clone());
//             }
//         }

//         if lines_map.is_empty() && !lyric_text.is_empty() {
//             result.is_plain_lyric = true;
//             let plain_text = lyric_text.lines().collect::<Vec<&str>>().join("\n");
//             lines_map.insert(0, LyricLineContent::Simple(plain_text));
//         }

//         result.lines = lines_map;
//         result
//     }

//     pub fn get_line_at_time(&self, time_ms: i64) -> Option<(u32, &LyricLineContent)> {
//         let adjusted_time = time_ms + (self.offset as i64);
//         if adjusted_time < 0 {
//             return None;
//         }
//         let adjusted_time_u32 = adjusted_time as u32;

//         self.lines
//             .range(..=adjusted_time_u32)
//             .next_back()
//             .map(|(timestamp, content)| (*timestamp, content))
//     }
// }

impl Song {
    pub fn get_lyric_cache_path(&self) -> CoreResult<PathBuf> {
        let lyric_dir = get_lyric_dir_path()?;
        let hash = get_path_hash(&self.path);
        Ok(lyric_dir.join(format!("{hash}.lrc")))
    }
}

pub fn get_lyric_dir_path() -> CoreResult<PathBuf> {
    let lyric_dir = resolve_resource_path(
        &PathBuf::from(
            get_global()
                .get("store_base")
                .ok_or_else(|| {
                    CoreError::OtherError("missing 'store_base' key in Config".to_string())
                })?
                .as_str()
                .ok_or_else(|| {
                    CoreError::OtherError("'store_base' field not a string".to_string())
                })?
                .to_string(),
        ),
        Path::new(
            get_global()
                .get("lyric_store")
                .ok_or_else(|| {
                    CoreError::OtherError("missing 'store.lyric_store' key in Config".to_string())
                })?
                .as_str()
                .ok_or_else(|| {
                    CoreError::OtherError("`store.lyric_store` field not a string".to_string())
                })?,
        ),
    )?;
    Ok(lyric_dir)
}
