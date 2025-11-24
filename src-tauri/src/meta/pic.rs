use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
        utils::{get_path_hash, resolve_resource_path},
    },
    store::json::entity::song::Song,
};
use lofty::{config::ParseOptions, picture::Picture, prelude::*, probe::Probe};
use log::debug;
use std::path::{Path, PathBuf};

const PIC_SUFFIXES: [&str; 7] = ["jpg", "jpeg", "png", "bmp", "gif", "webp", "tiff"];

#[allow(unused)]
impl Song {
    pub fn get_release_art(&self) -> CoreResult<Option<Picture>> {
        let parse_options = ParseOptions::new()
            .read_properties(true)
            .parsing_mode(lofty::config::ParsingMode::Relaxed);

        let tagged_file = Probe::open(&self.path)?.options(parse_options).read()?;
        let pic = tagged_file
            .primary_tag()
            .and_then(|tag| tag.pictures().first().cloned());
        debug!("get_release_art for {:#?}: {:#?}", self.path, pic);
        Ok(pic)
    }

    pub fn has_release_art(&self) -> CoreResult<bool> {
        Ok(self.get_release_art()?.is_some())
    }

    pub fn check_art_cache(&self) -> CoreResult<(bool, Option<PathBuf>, bool)> {
        let cover_dir = get_art_dir_path()?;
        let hash = get_path_hash(&self.path);
        // let cover_path_prefix = cover_dir.join(format!(
        //     "{}-{}.aac",
        //     self.artist.clone().unwrap_or_default(),
        //     self.title.clone().unwrap_or_default()
        // ));
        // Ok((
        //     cover_dir.exists(),
        //     PIC_SUFFIXES.iter().any(|suffix| {
        //         let cover_path = cover_path_prefix.with_extension(suffix);
        //         cover_path.exists()
        //     }),
        // ))
        // for suffix in PIC_SUFFIXES.iter() {
        //     let cover_path = cover_dir.join(format!("{}.{}", hash, suffix));
        //     if cover_path.exists() {
        //         return Ok((true, Some(cover_path), true));
        //     }
        // }
        for suffix in PIC_SUFFIXES.iter() {
            let cover_path = cover_dir.join(format!("{hash}.{suffix}"));
            if cover_path.exists() {
                return Ok((true, Some(cover_path), true));
            }
        }

        let placeholder_path = cover_dir.join(format!("{hash}.img"));
        Ok((cover_dir.exists(), Some(placeholder_path), false))
    }

    pub fn get_art_cache_path(&self) -> CoreResult<Option<PathBuf>> {
        let cover_dir = get_art_dir_path()?;
        let hash = get_path_hash(&self.path);

        for suffix in PIC_SUFFIXES.iter() {
            let cover_path = cover_dir.join(format!("{hash}.{suffix}"));
            if cover_path.exists() {
                return Ok(Some(cover_path));
            }
        }
        let placeholder_path = cover_dir.join(format!("{hash}.img"));
        if placeholder_path.exists() {
            return Ok(Some(placeholder_path));
        }

        Ok(None)
    }
}

pub fn get_art_dir_path() -> CoreResult<PathBuf> {
    let cover_dir = resolve_resource_path(
        &PathBuf::from(
            // config
            //     .get("store.store_base")
            //     .and_then(|v| v.as_str().map(|s| s.to_string()))
            //     .unwrap(),
            get_global()
                .get("store_base")
                .ok_or_else(|| {
                    CoreError::OtherError("missing 'store_base' key in Config".to_string())
                })?
                .as_str()
                .ok_or_else(|| {
                    CoreError::OtherError("'store_base' field not a string".to_string())
                })?
                .to_string(),
        ),
        Path::new(
            // &config
            //     .get("store.release_cover_store")
            //     .and_then(|v| v.as_str().map(|s| s.to_string()))
            //     .unwrap(),
            get_global()
                .get("release_cover_store")
                .ok_or_else(|| {
                    CoreError::OtherError(
                        "missing 'store.release_cover_store' key in Config".to_string(),
                    )
                })?
                .as_str()
                .ok_or_else(|| {
                    CoreError::OtherError(
                        "`store.release_cover_store` field not a string".to_string(),
                    )
                })?,
        ),
    )?;
    Ok(cover_dir)
}
