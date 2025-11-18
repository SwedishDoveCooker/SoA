use crate::{
    // meta::lyric::ParsedLyric,
    misc::error::CoreResult,
    store::json::{entity::song::Song, op::lyric::LyricOp},
};
use log::info;

pub struct LyricController {
    op: LyricOp,
}

#[allow(unused)]
impl LyricController {
    pub fn new() -> Self {
        let op = LyricOp {};
        info!("LyricController initialized");
        Self { op }
    }

    pub fn get_op(&self) -> &LyricOp {
        &self.op
    }

    pub fn cache_lyric(&self, song: &Song) -> CoreResult<bool> {
        self.op.cache_song_lyric(song)
    }

    pub fn cache_lyrics(&self, songs: &Vec<Song>) -> CoreResult<Vec<bool>> {
        self.op.cache_songs_lyrics(songs)
    }

    pub fn remove_lyric_cache(&self, song: &Song) -> CoreResult<()> {
        self.op.remove_lyric_cache(song)
    }

    pub fn get_lyric(&self, song: &Song) -> CoreResult<Option<String>> {
        self.op.get_lyric(song)
    }
}
