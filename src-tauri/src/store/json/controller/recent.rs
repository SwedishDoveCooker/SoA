use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
    },
    store::json::{
        entity::{
            recent::{Recent, Recents},
            song::Song,
        },
        op::{recent::RecentOp, sm::StoreManager},
    },
};
use log::info;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

#[derive(Clone)]
pub struct RecentController {
    pub op: Arc<RecentOp>,
}

#[allow(unused)]
impl RecentController {
    pub fn new() -> CoreResult<Self> {
        let config = get_global();
        let op = Arc::new(RecentOp {
            sm: Arc::new(Mutex::new(StoreManager::<Recents>::new(
                // config
                //     .get("store.recent_store")
                //     .and_then(|v| v.as_str().map(|s| s.to_string()))
                //     .unwrap(),
                config
                    .get("recent_store")
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "missing 'store.recent_store' key in Config".to_string(),
                        )
                    })?
                    .as_str()
                    .ok_or_else(|| {
                        CoreError::OtherError("`store.recent_store` field not a string".to_string())
                    })?
                    .to_string(),
            )?)),
        });
        info!("RecentController initialized");
        Ok(Self { op })
    }

    pub fn get_op(&self) -> Arc<RecentOp> {
        self.op.clone()
    }

    pub fn get_all_recents(&self) -> CoreResult<Recents> {
        self.op.list_all()
    }

    pub fn clear(&self) -> CoreResult<()> {
        self.op.clear()
    }

    pub fn add(&self, song: Song) -> CoreResult<()> {
        self.op.add(song)
    }

    pub fn insert(&self, recent: &Recent) -> CoreResult<()> {
        self.op.insert(recent)
    }

    pub fn remove_by_index(&self, index: usize) -> CoreResult<()> {
        self.op.remove_by_index(index)
    }

    pub fn remove_by_indexs(&self, indices: Vec<usize>) -> CoreResult<()> {
        self.op.remove_by_indexs(indices)
    }

    pub fn remove_by_song_all(&self, song: Song) -> CoreResult<()> {
        self.op.remove_by_song_all(song)
    }

    pub fn remove_by_songs(&self, songs: Vec<Song>) -> CoreResult<()> {
        self.op.remove_by_songs_all(songs)
    }

    pub fn remove_by_song_path(&self, song_path: &PathBuf) -> CoreResult<()> {
        self.op.remove_by_song_path(song_path)
    }

    pub fn remove_by_song_paths(&self, song_paths: Vec<&PathBuf>) -> CoreResult<()> {
        self.op.remove_by_song_paths(song_paths)
    }
}
