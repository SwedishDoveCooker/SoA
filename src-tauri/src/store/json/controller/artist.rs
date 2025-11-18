use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
    },
    store::json::{
        entity::{artist::Artist, song::Song},
        op::{artist::ArtistOp, sm::StoreManager},
    },
};
use log::info;
use std::{
    collections::HashSet,
    sync::{Arc, Mutex},
};

#[derive(Clone)]
pub struct ArtistController {
    pub op: Arc<ArtistOp>,
}

#[allow(unused)]
impl ArtistController {
    pub fn new() -> CoreResult<Self> {
        let config = get_global();
        let op = Arc::new(ArtistOp {
            sm: Arc::new(Mutex::new(StoreManager::<HashSet<Song>>::new(
                // config
                //     .get("store.artist_store")
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
        info!("ArtistController initialized");
        Ok(Self { op })
    }

    pub fn get_op(&self) -> Arc<ArtistOp> {
        self.op.clone()
    }

    pub fn from_songs(&self, songs: &Vec<Song>) -> Vec<Artist> {
        self.op.from_songs(songs)
    }

    pub fn list_all(&self) -> CoreResult<Vec<Artist>> {
        let mut vec = self.op.list_all()?;
        vec.sort_by(|a, b| a.cmp(&b));
        Ok(vec)
    }
}
