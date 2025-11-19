use crate::{
    misc::error::CoreResult,
    store::json::{
        entity::{artist::Artist, song::Song},
        op::sm::StoreManager,
    },
};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
};

pub struct ArtistOp {
    pub sm: Arc<Mutex<StoreManager<HashSet<Song>>>>,
}

#[allow(unused)]
impl ArtistOp {
    pub fn list_all(&self) -> CoreResult<Vec<Artist>> {
        let songs = self.sm.lock().unwrap().load()?.into_iter().collect();
        Ok(self.from_songs(&songs))
    }

    pub fn from_songs(&self, songs: &Vec<Song>) -> Vec<Artist> {
        let mut artist_map: HashMap<String, Vec<String>> =
            songs.iter().fold(HashMap::new(), |mut map, song| {
                if let Some(artist_name) = &song.artist {
                    let entry = map.entry(artist_name.clone()).or_default();
                    entry.push(song.path.to_string_lossy().to_string().clone());
                } else {
                    // 如果你偏要叫Unknown Artist那我没什么好说的
                    let entry = map.entry("Unknown Artist".to_string()).or_default();
                    entry.push(song.path.to_string_lossy().to_string().clone());
                }
                map
            });
        let mut vec = artist_map
            .into_iter()
            .map(|(name, songs)| Artist { name, songs })
            .collect::<Vec<_>>();
        vec.sort();
        vec
    }
}
