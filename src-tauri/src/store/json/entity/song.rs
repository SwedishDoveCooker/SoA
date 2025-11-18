use super::score::Score;
use serde::{Deserialize, Serialize};
use std::{
    cmp::Ordering,
    hash::{Hash, Hasher},
    path::PathBuf,
};

#[derive(Serialize, Deserialize, Debug, Clone, Eq)]
pub struct Song {
    // pub id: String,
    pub path: PathBuf,
    pub title: Option<String>,
    pub duration: Option<u32>,
    pub score: Option<Score>,
    pub created_at: String,
    pub updated_at: String,
    // pub artist_id: Option<String>,
    pub artist: Option<String>,
    // pub release_id: String,
    pub release: Option<String>,
}

impl PartialEq for Song {
    fn eq(&self, other: &Self) -> bool {
        self.path == other.path
    }
}

impl Hash for Song {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.path.hash(state);
    }
}

impl Ord for Song {
    fn cmp(&self, other: &Self) -> Ordering {
        self.title.cmp(&other.title)
    }
}

impl PartialOrd for Song {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

#[allow(unused)]
impl Song {
    pub fn new(
        path: PathBuf,
        title: Option<String>,
        duration: Option<u32>,
        score: Option<Score>,
        created_at: String,
        updated_at: String,
        artist: Option<String>,
        release: Option<String>,
    ) -> Self {
        Song {
            path,
            title,
            duration,
            score,
            created_at,
            updated_at,
            artist,
            release,
        }
    }

    pub fn sample(path: PathBuf) -> Self {
        Song {
            path,
            title: None,
            duration: None,
            score: None,
            created_at: String::new(),
            updated_at: String::new(),
            artist: None,
            release: None,
        }
    }
}
