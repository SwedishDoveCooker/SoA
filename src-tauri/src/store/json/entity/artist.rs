use super::song::Song;
use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, hash::Hash};

#[derive(Serialize, Deserialize, Debug, Clone, Eq)]
pub struct Artist {
    pub name: String,
    pub songs: Vec<String>,
    // pub releases: Vec<String>, // 这个字段没有显式意义 本身 release 和 artist 都只是一种 display struct
}

impl Hash for Artist {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        self.name.hash(state);
    }
}

impl PartialEq for Artist {
    fn eq(&self, other: &Self) -> bool {
        self.name == other.name
    }
}

impl PartialOrd for Artist {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Artist {
    fn cmp(&self, other: &Self) -> Ordering {
        self.name.cmp(&other.name)
    }
}

#[allow(unused)]
impl Artist {
    pub fn new(name: String, songs: Vec<String>) -> Self {
        Artist { name, songs }
    }

    pub fn from_song(song: &Song) -> Option<Self> {
        if let Some(artist_name) = &song.artist {
            let artist = Artist {
                name: artist_name.clone(),
                songs: vec![song.path.to_string_lossy().to_string()],
            };
            Some(artist)
        } else {
            None
        }
    }
}
