use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
    },
    store::json::{
        entity::{release::Release, song::Song},
        op::{release::ReleaseOp, sm::StoreManager},
    },
};
use log::info;
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
};

#[derive(Clone)]
pub struct ReleaseController {
    pub op: Arc<ReleaseOp>,
}

#[allow(unused)]
impl ReleaseController {
    pub fn new() -> CoreResult<Self> {
        let config = get_global();
        let op = Arc::new(ReleaseOp {
            sm: Arc::new(Mutex::new(StoreManager::<HashSet<Song>>::new(
                // config
                //     .get("store.song_store")
                //     .and_then(|v| v.as_str().map(|s| s.to_string()))
                //     .unwrap(),
                config
                    .get("song_store")
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "missing 'store.song_store' key in Config".to_string(),
                        )
                    })?
                    .as_str()
                    .ok_or_else(|| {
                        CoreError::OtherError("`store.song_store` field not a string".to_string())
                    })?
                    .to_string(),
            )?)),
        });
        info!("ReleaseController initialized");
        Ok(Self { op })
    }

    pub fn get_op(&self) -> Arc<ReleaseOp> {
        self.op.clone()
    }

    pub fn from_song(&self, song: &Song) -> Release {
        self.op.from_song(song)
    }

    pub fn from_songs(&self, songs: &Vec<Song>) -> Vec<Release> {
        self.op.from_songs(songs)
    }

    pub fn list_all(&self) -> CoreResult<Vec<Release>> {
        let mut vec = self.op.list_all()?;
        vec.sort();
        Ok(vec)
    }
}
