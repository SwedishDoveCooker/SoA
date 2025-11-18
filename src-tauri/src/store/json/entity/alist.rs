use super::{artist::Artist, list::Playlist, release::Release, song::Song};
use serde::{Deserialize, Serialize};
use std::{
    cmp::Ordering,
    hash::{Hash, Hasher},
};

#[derive(Serialize, Deserialize, Debug, Clone, Default, Eq)]
pub struct Alist {
    pub name: String,
    pub created_at: String,
    pub elements: Vec<Aelement>,
}

impl Hash for Alist {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.name.hash(state);
    }
}

impl PartialOrd for Alist {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Alist {
    fn cmp(&self, other: &Self) -> Ordering {
        self.name.cmp(&other.name)
    }
}

impl PartialEq for Alist {
    fn eq(&self, other: &Self) -> bool {
        self.name == other.name
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Eq, PartialEq, Hash)]
pub enum Aelement {
    Song(Song),
    Playlist(Playlist),
    Release(Release),
    Artist(Artist),
}
