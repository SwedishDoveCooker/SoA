use crate::{
    misc::error::{CoreError, CoreResult},
    store::json::{entity::song::Song, op::sm::StoreManager},
};
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
};

pub struct SongOp {
    pub sm: Arc<Mutex<StoreManager<HashSet<Song>>>>,
}

#[allow(unused)]
impl SongOp {
    pub fn list_all(&self) -> CoreResult<Vec<Song>> {
        let songs = self.sm.lock().unwrap().load()?;
        Ok(songs.iter().cloned().collect())
    }

    // // // return cloned Song
    // // // wip: use refcell?
    pub fn locate(&self, file: &PathBuf) -> CoreResult<Song> {
        let songs = self.sm.lock().unwrap().load()?;
        songs
            .get(&Song::sample(file.clone()))
            .cloned()
            .ok_or_else(|| {
                CoreError::OtherError(format!("Song with path {file:?} not found in the store"))
            })
    }

    pub fn list_by_artist(&self, artist: &str) -> CoreResult<Vec<Song>> {
        let songs = self.sm.lock().unwrap().load()?;
        let filtered_songs: Vec<Song> = songs
            .iter()
            .filter(|song| {
                if let Some(song_artist) = &song.artist {
                    song_artist == artist
                } else {
                    false
                }
            })
            .cloned()
            .collect();
        Ok(filtered_songs)
    }

    pub fn list_unknown_artist(&self) -> CoreResult<Vec<Song>> {
        let songs = self.sm.lock().unwrap().load()?;
        let filtered_songs: Vec<Song> = songs
            .iter()
            .filter(|song| song.artist.is_none())
            .cloned()
            .collect();
        Ok(filtered_songs)
    }

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

    pub fn list_unknown_release(&self) -> CoreResult<Vec<Song>> {
        let songs = self.sm.lock().unwrap().load()?;
        let filtered_songs: Vec<Song> = songs
            .iter()
            .filter(|song| song.release.is_none())
            .cloned()
            .collect();
        Ok(filtered_songs)
    }

    pub fn save_all(&self, songs: &Vec<Song>) -> CoreResult<()> {
        let song_set: HashSet<Song> = songs.iter().cloned().collect();
        self.sm.lock().unwrap().save(&song_set)
    }

    // 此处产生重复会被 HashSet 自动去重, 预期
    pub fn add_save(&self, songs: &Vec<Song>) -> CoreResult<()> {
        let mut existing_songs = self.sm.lock().unwrap().load()?;
        songs.iter().for_each(|song| {
            existing_songs.insert(song.clone());
        });
        self.sm.lock().unwrap().save(&existing_songs)
    }

    pub fn remove(&self, songs: &Vec<Song>) -> CoreResult<()> {
        let mut existing_songs = self.sm.lock().unwrap().load()?;
        songs.iter().try_for_each(|song| {
            existing_songs.remove(song).then_some(()).ok_or_else(|| {
                CoreError::OtherError(format!("Remove song with path {:?} not found", song.path))
            })
        })?;
        self.sm.lock().unwrap().save(&existing_songs)
    }

    pub fn remove_by_files(&self, files: &Vec<PathBuf>) -> CoreResult<()> {
        let mut existing_songs = self.sm.lock().unwrap().load()?;
        files.iter().try_for_each(|file| {
            existing_songs
                .remove(&Song::sample(file.clone()))
                .then_some(())
                .ok_or_else(|| {
                    CoreError::OtherError(format!("Remove file with path {file:?} not found"))
                })
        })?;
        self.sm.lock().unwrap().save(&existing_songs)
    }

    pub fn modify(&self, song: &Song) -> CoreResult<()> {
        let mut existing_songs = self.sm.lock().unwrap().load()?;
        existing_songs.replace(song.clone()).ok_or_else(|| {
            CoreError::OtherError(format!(
                "Song with path {:?} not found in the store",
                song.path
            ))
        })?;
        self.sm.lock().unwrap().save(&existing_songs)
    }
}
