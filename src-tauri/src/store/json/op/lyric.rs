use crate::{misc::error::CoreResult, store::json::entity::song::Song};
use log::debug;
use std::fs;

pub struct LyricOp();

#[allow(unused)]
impl LyricOp {
    pub fn cache_song_lyric(&self, song: &Song) -> CoreResult<bool> {
        let cache_path = song.get_lyric_cache_path()?;
        if cache_path.exists() {
            debug!("Lyric cache already exists for: {:?}", &song.path);
            return Ok(true);
        }
        if let Some(parent) = cache_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)?;
            }
        }

        let lrc_path = song.path.with_extension("lrc");
        debug!("Looking for .lrc file at {:?}", &lrc_path);
        if lrc_path.exists() {
            debug!(
                "Found .lrc for {:?}, caching to {:?}",
                &song.path, &cache_path
            );
            fs::copy(lrc_path, cache_path)?;
            Ok(true)
        } else {
            debug!("No .lrc found for {:?}, creating placeholder", &song.path);
            fs::write(cache_path, &[])?;
            Ok(false)
        }
    }

    pub fn cache_songs_lyrics(&self, songs: &Vec<Song>) -> CoreResult<Vec<bool>> {
        debug!("Caching lyrics for {} songs", songs.len());
        songs
            .iter()
            .map(|song| self.cache_song_lyric(song))
            .collect()
    }

    pub fn remove_lyric_cache(&self, song: &Song) -> CoreResult<()> {
        let cache_path = song.get_lyric_cache_path()?;
        if cache_path.exists() {
            debug!("Removing lyric cache: {:?}", &cache_path);
            fs::remove_file(cache_path)?;
        }
        Ok(())
    }

    pub fn get_lyric(&self, song: &Song) -> CoreResult<Option<String>> {
        let cache_path = song.get_lyric_cache_path()?;
        if !cache_path.exists() {
            debug!("Lyric cache not found for: {:?}", &song.path);
            return Ok(None);
        }
        let metadata = fs::metadata(&cache_path)?;
        if metadata.len() == 0 {
            debug!("Lyric cache is an empty placeholder for: {:?}", &song.path);
            return Ok(None);
        }
        let content = fs::read_to_string(cache_path)?;
        if content.is_empty() {
            return Ok(None);
        }
        // let parsed = ParsedLyric::parse(&content);
        // if parsed.lines.is_empty() {
        //     warn!(
        //         "Lyric file for {:?} was parsed but returned no lines.",
        //         &song.path
        //     );
        //     return Ok(None);
        // }
        Ok(Some(content))
    }
}
