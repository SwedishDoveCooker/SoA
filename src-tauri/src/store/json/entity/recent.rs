use super::song::Song;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::path::PathBuf;
// use std::collections::VecDeque;

#[derive(Serialize, Deserialize, Debug, Clone, Eq)]
pub struct Recent {
    // pub song: Song,
    pub song: PathBuf,
    pub accessed_at: Option<String>,
    // (((((
    // pub play_count: u32,
}

impl PartialEq for Recent {
    fn eq(&self, other: &Self) -> bool {
        self.song == other.song && self.accessed_at == other.accessed_at
    }
}

impl PartialOrd for Recent {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        match (&self.accessed_at, &other.accessed_at) {
            (Some(a), Some(b)) => Some(b.cmp(a)), // 最近访问的在前面
            (Some(_), None) => Some(Ordering::Less),
            (None, Some(_)) => Some(Ordering::Greater),
            (None, None) => Some(Ordering::Equal),
        }
    }
}

impl Ord for Recent {
    fn cmp(&self, other: &Self) -> Ordering {
        self.partial_cmp(other).unwrap()
    }
}

pub type Recents = Vec<Recent>;
// pub type Recents = VecDeque<Recent>;

#[allow(unused)]
impl Recent {
    pub fn new(song: PathBuf, accessed_at: Option<String>) -> Self {
        Self {
            song,
            accessed_at,
            // play_count,
        }
    }

    pub fn from_song(song: Song) -> Self {
        let accessed_at = Some(Local::now().to_rfc3339());
        Self {
            song: song.path.clone(),
            accessed_at,
            // play_count: 0,
        }
    }
}
