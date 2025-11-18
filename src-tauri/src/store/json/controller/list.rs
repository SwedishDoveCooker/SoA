use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
    },
    store::json::{
        entity::{list::Playlist, song::Song},
        op::{list::PlaylistOp, sm::StoreManager},
    },
};
use log::info;
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
};

#[derive(Clone)]
pub struct PlaylistController {
    pub op: Arc<PlaylistOp>,
}

#[allow(unused)]
impl PlaylistController {
    pub fn new() -> CoreResult<Self> {
        let config = get_global();
        let op = Arc::new(PlaylistOp {
            sm: Arc::new(Mutex::new(StoreManager::<HashSet<Playlist>>::new(
                config
                    .get("playlist_store")
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "missing 'store.playlist_store' key in Config".to_string(),
                        )
                    })?
                    .as_str()
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "`store.playlist_store` field not a string".to_string(),
                        )
                    })?
                    .to_string(),
            )?)),
        });
        info!("PlaylistController initialized");
        Ok(Self { op })
    }

    pub fn get_op(&self) -> Arc<PlaylistOp> {
        self.op.clone()
    }

    pub fn get_all_playlists(&self) -> CoreResult<Vec<Playlist>> {
        self.op.list_all()
    }

    pub fn get_playlist(&self, name: String) -> CoreResult<Playlist> {
        self.op.locate(name)
    }

    pub fn get_playlists(&self, names: Vec<String>) -> CoreResult<Vec<Playlist>> {
        let playlists = names
            .into_iter()
            .map(|name| self.op.locate(name))
            .collect::<CoreResult<Vec<Playlist>>>()?;
        Ok(playlists)
    }

    pub fn add(&self, playlist: &Playlist) -> CoreResult<()> {
        self.op.insert(playlist)
    }

    pub fn create_playlist(&self, name: String) -> CoreResult<()> {
        self.op.create(name)
    }

    pub fn rename(&self, old_name: String, new_name: String) -> CoreResult<()> {
        self.op.rename(old_name, new_name)
    }

    pub fn add_song(&self, name: String, song: Song) -> CoreResult<()> {
        self.op.add_songs(name, vec![song])
    }

    pub fn add_songs(&self, name: String, songs: Vec<Song>) -> CoreResult<()> {
        self.op.add_songs(name, songs)
    }

    pub fn remove_song_all(&self, name: String, song: Song) -> CoreResult<()> {
        self.op.remove_songs_all(name, vec![song])
    }

    pub fn remove_songs_all(&self, name: String, songs: Vec<Song>) -> CoreResult<()> {
        self.op.remove_songs_all(name, songs)
    }

    pub fn remove_song_path_all(&self, song_paths: Vec<PathBuf>) -> CoreResult<()> {
        self.op.remove_song_path_all(song_paths)
    }

    pub fn remove_songs(&self, name: String, index: Vec<usize>) -> CoreResult<()> {
        self.op.remove_songs(name, index)
    }

    pub fn clear_songs(&self, name: String) -> CoreResult<()> {
        self.op.clear_songs(name)
    }

    pub fn clear_songs_multi(&self, names: Vec<String>) -> CoreResult<()> {
        names
            .iter()
            .try_for_each(|name| self.op.clear_songs(name.clone()))?;
        Ok(())
    }

    pub fn del(&self, name: String) -> CoreResult<()> {
        self.op.remove(name)
    }

    pub fn del_batch(&self, names: Vec<String>) -> CoreResult<()> {
        self.op.remove_batch(names)
    }

    pub fn unique(&self, name: String) -> CoreResult<()> {
        self.op.unique(name)
    }
}
