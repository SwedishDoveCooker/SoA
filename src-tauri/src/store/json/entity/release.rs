#[allow(unused_imports)]
use super::song::Song;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use std::{cmp::Ordering, hash::Hash, sync::Weak};

#[derive(Serialize, Deserialize, Debug, Clone, Eq)]
pub struct Release {
    // pub id: String,
    pub title: String,
    pub artist: Option<String>,
    pub songs: Vec<String>,
    // pub songs: Vec<Weak<Song>>,
}

impl Hash for Release {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        // self.id.hash(state);
        self.title.hash(state);
        self.artist.hash(state);
    }
}

impl PartialEq for Release {
    fn eq(&self, other: &Self) -> bool {
        // self.id == other.id
        self.title == other.title && self.artist == other.artist
    }
}

impl PartialOrd for Release {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Release {
    fn cmp(&self, other: &Self) -> Ordering {
        self.title.cmp(&other.title)
    }
}

// impl Eq for Release {}

#[allow(unused)]
impl Release {
    pub fn new(title: String, artist: Option<String>, songs: Vec<String>) -> Self {
        Release {
            title,
            artist,
            songs,
        }
    }

    pub fn from_song(song: &Song) -> Option<Self> {
        if let Some(release_title) = &song.release {
            let release = Release {
                // id: format!(
                //     "{}_{}",
                //     song.artist.clone().unwrap_or("unknown_artist".to_string()),
                //     release_title
                // ),
                title: release_title.clone(),
                artist: song.artist.clone(),
                songs: vec![song.path.to_string_lossy().to_string()],
            };
            Some(release)
        } else {
            None
        }
    }
}
