use crate::{meta::pic::get_art_dir_path, misc::error::CoreError, store::json::entity::song::Song};
use log::debug;
use std::fs;

pub struct PicOp();

impl PicOp {
    pub fn get_song_pic(&self, song: &Song) -> Result<bool, CoreError> {
        // let (dir_exists, pic_exists) = song.check_art_cache()?;
        let (dir_exists, cache_path_opt, pic_exists) = song.check_art_cache()?;
        debug!(
            "Checking cover art cache for song: {}: dir_exists={}, pic_exists={}, cache_path={:?}",
            song.path.clone().to_string_lossy(),
            dir_exists,
            pic_exists,
            cache_path_opt.as_ref().map(|p| p.to_string_lossy())
        );
        if pic_exists {
            debug!(
                "Cover art found in cache for song: {} - {}",
                song.artist.clone().unwrap_or("Unknown Artist".to_string()),
                song.title.clone().unwrap_or("Unknown Title".to_string())
            );
            return Ok(true);
        }
        debug!(
            "Cover art not found in cache, extracting from file: {:?}",
            &song.path
        );
        // if dir_exists {
        //     let cover_dir = get_art_dir_path()?;
        //     fs::remove_dir_all(cover_dir)?;
        // }
        let picture_opt = song.get_release_art()?;
        let cover_dir = get_art_dir_path()?;
        if !cover_dir.exists() {
            debug!("Creating cover art directory at {:?}", &cover_dir);
            fs::create_dir_all(&cover_dir)?;
        }
        // if song.artist.is_none() && song.title.is_none() {
        //     return Ok(false);
        // }
        let cache_path = cache_path_opt
            .ok_or_else(|| CoreError::OtherError("Failed to generate cache path".to_string()))?;
        if let Some(picture) = picture_opt {
            // let cover_path = cover_dir.join(format!(
            //     "{}-{}.{}",
            //     song.artist.clone().unwrap_or("Unknown Artist".to_string()),
            //     song.title.clone().unwrap_or("Unknown Title".to_string()),
            //     match picture
            //         .mime_type()
            //         .ok_or_else(|| CoreError::FsError(format!(
            //             "Invalid mime type for picture in file: {:?}",
            //             &song.path
            //         )))?
            //         .as_str()
            //     {
            //         "image/jpeg" => "jpg",
            //         "image/png" => "png",
            //         "image/bmp" => "bmp",
            //         "image/gif" => "gif",
            //         "image/webp" => "webp",
            //         "image/tiff" => "tiff",
            //         _ => "img",
            //     }
            // ));
            // Handle invalid MIME types gracefully by using a default extension
            let extension = picture
                .mime_type().map(|mime| match mime.as_str() {
                        "image/jpeg" => "jpg",
                        "image/png" => "png",
                        "image/bmp" => "bmp",
                        "image/gif" => "gif",
                        "image/webp" => "webp",
                        "image/tiff" => "tiff",
                        _ => "img",
                    })
                .unwrap_or_else(|| {
                    debug!(
                        "Invalid or missing MIME type for picture in file: {:?}, using default extension",
                        &song.path
                    );
                    "img"
                });

            let cover_path = cache_path.with_extension(extension);
            debug!("Writing cover art to {:?}", &cover_path);
            fs::write(cover_path, picture.data())?;
            Ok(true)
        } else {
            // let cover_path = cover_dir.join(format!(
            //     "{}-{}.img",
            //     song.artist.clone().unwrap_or("Unknown Artist".to_string()),
            //     song.title.clone().unwrap_or("Unknown Title".to_string()),
            // ));
            let cover_path = cache_path.with_extension("img");
            debug!(
                "No embedded cover art found, creating empty placeholder at {:?}",
                &cover_path
            );
            fs::write(cover_path, [])?;
            Ok(false)
        }
    }

    pub fn get_song_pics(
        &self,
        songs: &Vec<Song>,
        // app: &tauri::AppHandle,
    ) -> Result<Vec<bool>, CoreError> {
        debug!("Getting song pictures for {} songs", songs.len());
        songs.iter().map(|song| self.get_song_pic(song)).collect()
    }
}
