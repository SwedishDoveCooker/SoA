use crate::misc::{config::get_global, utils::get_time};
use log::{debug, error};
use std::{collections::HashMap, path::PathBuf};

#[derive(Debug, Clone)]
pub struct Dir {
    // pub path: PathBuf,
    pub path: PathBuf,
    pub audio_files: HashMap<PathBuf, String>,
}

#[allow(unused)]
impl Dir {
    pub fn new<P: Into<PathBuf>>(path: P) -> Self {
        let mut new = Dir {
            path: path.into(),
            audio_files: HashMap::new(),
        };
        new.glob(true);
        new
    }

    pub fn init<P: Into<PathBuf>>(path: P) -> Self {
        let mut new = Self::new(path);
        let _ = new.glob(true);
        new
    }

    fn glob_in(&mut self, recrusive: bool) -> HashMap<PathBuf, String> {
        self.audio_files.clear();
        let pattern = if recrusive {
            format!("{}/**/*", self.path.display())
        } else {
            format!("{}/*", self.path.display())
        };
        for entry in glob::glob(&pattern).expect("Failed to read glob pattern") {
            match entry {
                Ok(path) => {
                    debug!("Found file: {:?}", path);
                    if let Some(ext) = path.extension() {
                        if get_global()
                            .get("supported_audio_extensions")
                            .and_then(|v| v.as_array().cloned())
                            .map(|arr| {
                                arr.iter()
                                    .filter_map(|e| e.as_str().map(|s| s.to_string()))
                                    .collect::<Vec<String>>()
                            })
                            .unwrap_or_default()
                            .iter()
                            .any(|s| s.eq_ignore_ascii_case(ext.to_str().unwrap_or("")))
                        {
                            let (_, updated_at) = get_time(&path);
                            debug!("Adding audio file: {:?}", path);
                            // self.audio_files.push(path);
                            self.audio_files.insert(path, updated_at);
                        }
                    }
                }
                Err(e) => error!("Dir glob error: {:?}", e),
            }
        }
        self.audio_files.clone()
    }

    pub fn glob(&mut self, recrusive: bool) -> Vec<PathBuf> {
        self.glob_in(recrusive);
        self.audio_files.keys().cloned().collect()
    }

    pub fn update(&mut self) -> (Vec<PathBuf>, Vec<PathBuf>, Vec<PathBuf>) {
        let old = self.audio_files.clone();
        // self.audio_files.clear();
        let new = self.glob_in(true);
        (
            // old.iter()
            //     .filter(|x| !new.contains(x))
            //     .cloned()
            //     .collect::<Vec<_>>(),
            // new.iter()
            //     .filter(|x| !old.contains(x))
            //     .cloned()
            //     .collect::<Vec<_>>(),
            // new.iter()
            //     .filter(|x| old.contains(x) && )
            //     .cloned()
            //     .collect::<Vec<_>>(),
            old.iter()
                .filter(|(path, updated_at)| !new.contains_key(*path))
                .map(|(path, _)| path.clone())
                .collect::<Vec<_>>(),
            new.iter()
                .filter(|(path, _)| !old.contains_key(*path))
                .map(|(path, _)| path.clone())
                .collect::<Vec<_>>(),
            new.iter()
                .filter(|(path, updated_at)| {
                    old.contains_key(*path)
                        && old
                            .get(*path)
                            .map(|old_updated_at| old_updated_at != *updated_at)
                            .unwrap_or(false)
                })
                .map(|(path, _)| path.clone())
                .collect::<Vec<_>>(),
        )
    }
}
