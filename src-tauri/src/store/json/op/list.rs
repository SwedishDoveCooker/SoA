use crate::{
    misc::error::{CoreError, CoreResult},
    store::json::{
        entity::{list::Playlist, song::Song},
        op::sm::StoreManager,
    },
};
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
};

pub struct PlaylistOp {
    pub sm: Arc<Mutex<StoreManager<HashSet<Playlist>>>>,
}

#[allow(unused)]
impl PlaylistOp {
    pub fn create(&self, name: String) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        let playlist = Playlist {
            name: name.clone(),
            songs: Vec::new(),
            created_at: chrono::Local::now().timestamp().to_string(),
        };
        if lists.insert(playlist) {
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} already exists in the store",
                name
            )))
        }
    }

    pub fn list_all(&self) -> CoreResult<Vec<Playlist>> {
        let lists = self.sm.lock().unwrap().load()?;
        let mut vec = lists.iter().cloned().collect::<Vec<_>>();
        vec.sort_by(|a, b| a.cmp(&b));
        Ok(vec)
    }

    pub fn insert(&self, playlist: &Playlist) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if lists.insert(playlist.clone()) {
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} already exists in the store",
                playlist.name
            )))
        }
    }

    pub fn locate(&self, name: String) -> CoreResult<Playlist> {
        let lists = self.sm.lock().unwrap().load()?;
        lists
            .get(&Playlist::sample(name.clone()))
            .cloned()
            .ok_or_else(|| {
                CoreError::OtherError(format!(
                    "Playlist with name {:?} not found in the store",
                    name
                ))
            })
    }

    pub fn rename(&self, old_name: String, new_name: String) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if let Some(mut playlist) = lists.take(&Playlist::sample(old_name.clone())) {
            playlist.name = new_name.clone();
            if lists.contains(&playlist) {
                return Err(CoreError::OtherError(format!(
                    "Playlist with name {:?} already exists in the store",
                    new_name
                )));
            }
            lists.insert(playlist);
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                old_name
            )))
        }
    }

    pub fn modify(&self, playlist: &Playlist) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        lists.replace(playlist.clone()).ok_or_else(|| {
            CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                playlist.name
            ))
        })?;
        self.sm.lock().unwrap().save(&lists)
    }

    pub fn remove(&self, name: String) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if lists.remove(&Playlist::sample(name.clone())) {
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn remove_batch(&self, names: Vec<String>) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        names.iter().try_for_each(|name| {
            lists
                .remove(&Playlist::sample(name.clone()))
                .then_some(())
                .ok_or_else(|| {
                    CoreError::OtherError(format!(
                        "Playlist with name {:?} not found in the store",
                        name
                    ))
                })
        })?;
        self.sm.lock().unwrap().save(&lists)?;
        Ok(())
    }

    pub fn add_songs(&self, name: String, songs: Vec<Song>) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if let Some(mut playlist) = lists.take(&Playlist::sample(name.clone())) {
            songs.iter().for_each(|song| {
                playlist.songs.push(song.path.clone());
            });
            lists.insert(playlist);
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn unique(&self, name: String) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if let Some(mut playlist) = lists.take(&Playlist::sample(name.clone())) {
            let mut seen = HashSet::new();
            playlist.songs.retain(|path| seen.insert(path.clone()));
            lists.insert(playlist);
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn remove_songs_all(&self, name: String, songs: Vec<Song>) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if let Some(mut playlist) = lists.take(&Playlist::sample(name.clone())) {
            let song_paths: HashSet<PathBuf> = songs.iter().map(|song| song.path.clone()).collect();
            playlist.songs.retain(|path| !song_paths.contains(path));
            lists.insert(playlist);
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn remove_song_path_all(&self, song_paths: Vec<PathBuf>) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        let playlists_to_update: Vec<Playlist> = lists
            .iter()
            .filter(|pl| pl.songs.iter().any(|path| song_paths.contains(path)))
            .cloned()
            .collect();
        playlists_to_update.into_iter().for_each(|mut playlist| {
            playlist.songs.retain(|path| !song_paths.contains(path));
            lists.replace(playlist).unwrap();
        });
        self.sm.lock().unwrap().save(&lists)
    }

    pub fn remove_songs(&self, name: String, index: Vec<usize>) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if let Some(mut playlist) = lists.take(&Playlist::sample(name.clone())) {
            let index_set: HashSet<usize> = index.into_iter().collect();
            playlist.songs = playlist
                .songs
                .iter()
                .enumerate()
                .filter_map(|(idx, path)| {
                    if index_set.contains(&idx) {
                        None
                    } else {
                        Some(path.clone())
                    }
                })
                .collect();
            lists.insert(playlist);
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn clear_songs(&self, name: String) -> CoreResult<()> {
        let mut lists = self.sm.lock().unwrap().load()?;
        if let Some(mut playlist) = lists.take(&Playlist::sample(name.clone())) {
            playlist.songs.clear();
            lists.insert(playlist);
            self.sm.lock().unwrap().save(&lists)?;
            Ok(())
        } else {
            Err(CoreError::OtherError(format!(
                "Playlist with name {:?} not found in the store",
                name
            )))
        }
    }

    pub fn clear_all(&self) -> CoreResult<()> {
        let lists: HashSet<Playlist> = HashSet::new();
        self.sm.lock().unwrap().save(&lists)
    }
}
