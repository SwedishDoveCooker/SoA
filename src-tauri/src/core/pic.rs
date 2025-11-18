use crate::{core::library::CoreResult, store::json::entity::song::Song};
use log::debug;
use std::path::PathBuf;

pub fn get_cover_art_path(song: Song) -> CoreResult<Option<PathBuf>> {
    debug!("Received get_cover_art_path command");
    if let Some(path) = song.get_art_cache_path()? {
        if path.extension().and_then(|s| s.to_str()) == Some("img") {
            return Ok(None);
        }
        Ok(Some(path))
    } else {
        Ok(None)
    }
}
