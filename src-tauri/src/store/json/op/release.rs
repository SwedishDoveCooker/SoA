use crate::{
    misc::error::{CoreError, CoreResult},
    store::json::{
        entity::{release::Release, song::Song},
        op::sm::StoreManager,
    },
};
use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
    sync::{Arc, Mutex},
};

pub struct ReleaseOp {
    pub sm: Arc<Mutex<StoreManager<HashSet<Song>>>>,
}

#[allow(unused)]
impl ReleaseOp {
    /// unused
    pub fn list_by_artist_release(&self, artist: &str, release: &str) -> CoreResult<Vec<Song>> {
        let songs = self.sm.lock().unwrap().load()?;
        let filtered_songs: Vec<Song> = songs
            .iter()
            .filter(|song| {
                if let (Some(song_artist), Some(song_release)) = (&song.artist, &song.release) {
                    song_artist == artist && song_release == release
                } else {
                    false
                }
            })
            .cloned()
            .collect();
        Ok(filtered_songs)
    }

    pub fn remove_by_artist_release(&self, artist: &str, release: &str) -> CoreResult<()> {
        let mut songs = self.sm.lock().unwrap().load()?;
        songs.retain(|song| {
            if let (Some(song_artist), Some(song_release)) = (&song.artist, &song.release) {
                !(song_artist == artist && song_release == release)
            } else {
                true
            }
        });
        self.sm.lock().unwrap().save(&songs)
    }

    pub fn select_by_song(&self, song: &Song) -> CoreResult<Vec<Song>> {
        let songs = self.sm.lock().unwrap().load()?;
        let filtered_songs: Vec<Song> = songs
            .iter()
            .filter(|s| {
                if let (Some(song_artist), Some(song_release)) = (&song.artist, &song.release) {
                    if let (Some(s_artist), Some(s_release)) = (&s.artist, &s.release) {
                        song_artist == s_artist && song_release == s_release
                    } else {
                        false
                    }
                } else {
                    false
                }
            })
            .cloned()
            .collect();
        Ok(filtered_songs)
    }

    pub fn from_song(&self, song: &Song) -> Release {
        if let Some(release_title) = &song.release {
            let release = Release {
                title: release_title.clone(),
                artist: song.artist.clone(),
                songs: vec![song.path.to_string_lossy().to_string()],
            };
            release
        } else {
            Release {
                title: "unknown_release".to_string(),
                artist: song.artist.clone(),
                songs: vec![song.path.to_string_lossy().to_string()],
            }
        }
    }

    pub fn from_songs(&self, songs: &Vec<Song>) -> Vec<Release> {
        let mut release_map = songs.iter().fold(
            HashMap::<(String, Option<String>), Vec<String>>::new(),
            |mut acc, song| {
                if let Some(release_title) = &song.release {
                    let key = (release_title.clone(), song.artist.clone());
                    acc.entry(key)
                        .or_default()
                        .push(song.path.to_string_lossy().to_string());
                } else {
                    acc.entry(("unknown_release".to_string(), song.artist.clone()))
                        .or_default()
                        .push(song.path.to_string_lossy().to_string());
                }
                acc
            },
        );
        let mut vec = release_map
            .iter()
            .map(|((title, artist), song_paths)| Release {
                title: title.clone(),
                artist: artist.clone(),
                songs: song_paths.clone(),
            })
            .collect::<Vec<_>>();
        vec.sort();
        vec
    }

    pub fn add_save(&self, files: &Vec<PathBuf>) -> CoreResult<()> {
        let mut songs = self.sm.lock().unwrap().load()?;
        let releases = self.from_songs(&songs.iter().cloned().collect::<Vec<Song>>());
        files.iter().try_for_each(|file| {
            let song = Song::from_path(file, None)?;
            releases.iter().for_each(|release| {
                if let Some(release_title) = &song.release {
                    if release.title == *release_title && release.artist == song.artist {}
                }
            });
            songs.insert(song).then_some(()).ok_or_else(|| {
                CoreError::OtherError(format!("Add song with path {file:?} already exists"))
            })
        });
        self.sm.lock().unwrap().save(&songs)
    }

    /// not inspected
    pub fn from_songs_merge(&self, songs: &Vec<Song>, releases: &mut Vec<Release>) -> Vec<Release> {
        let mut release_map = releases.iter().fold(
            HashMap::<(String, Option<String>), Vec<String>>::new(),
            |mut acc, release| {
                let key = (release.title.clone(), release.artist.clone());
                acc.entry(key).or_default().extend(release.songs.clone());
                acc
            },
        );
        songs.iter().for_each(|song| {
            if let Some(release_title) = &song.release {
                let key = (release_title.clone(), song.artist.clone());
                release_map
                    .entry(key)
                    .or_insert_with(Vec::new)
                    .push(song.path.to_string_lossy().to_string());
            } else {
                release_map
                    .entry(("unknown_release".to_string(), song.artist.clone()))
                    .or_insert_with(Vec::new)
                    .push(song.path.to_string_lossy().to_string());
            }
        });
        release_map
            .iter()
            .map(|((title, artist), song_paths)| Release {
                title: title.clone(),
                artist: artist.clone(),
                songs: song_paths.clone(),
            })
            .collect()
    }

    pub fn list_all(&self) -> CoreResult<Vec<Release>> {
        let songs = self.sm.lock().unwrap().load()?;
        let releases = self.from_songs(&songs.iter().cloned().collect::<Vec<Song>>());
        Ok(releases)
    }
}
