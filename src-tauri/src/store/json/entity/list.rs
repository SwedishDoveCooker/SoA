use serde::{Deserialize, Serialize};
use std::{
    cmp::Ordering,
    hash::{Hash, Hasher},
    path::PathBuf,
};

#[derive(Serialize, Deserialize, Debug, Clone, Default, Eq)]
pub struct Playlist {
    pub name: String,
    pub created_at: String,
    pub songs: Vec<PathBuf>,
}

impl Hash for Playlist {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.name.hash(state);
    }
}

impl PartialEq for Playlist {
    fn eq(&self, other: &Self) -> bool {
        self.name == other.name
    }
}

impl PartialOrd for Playlist {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Playlist {
    fn cmp(&self, other: &Self) -> Ordering {
        self.name.cmp(&other.name)
    }
}

#[allow(unused)]
impl Playlist {
    pub fn new(name: String, created_at: String, songs: Vec<PathBuf>) -> Self {
        Playlist {
            name,
            created_at,
            songs,
        }
    }

    pub fn sample(name: String) -> Self {
        Playlist {
            name,
            created_at: "2024-01-01T00:00:00+00:00".to_string(),
            songs: vec![],
        }
    }
}
