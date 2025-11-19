use crate::{
    library::fs::FileSystem,
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
        utils::resolve_path,
    },
    store::json::{
        controller::{
            alist::AlistController, artist::ArtistController, list::PlaylistController,
            lyric::LyricController, pic::PicController, recent::RecentController,
            release::ReleaseController, song::SongController,
        },
        entity::{
            alist::Alist, artist::Artist, list::Playlist, recent::Recent, release::Release,
            song::Song,
        },
    },
};

use log::{debug, info, warn};
use serde_json::json;
use std::{
    fs::{copy, create_dir_all, remove_file},
    path::PathBuf,
};
use tauri::{AppHandle, Emitter};

pub struct Library {
    // wip: remove data_fields?
    pub app: AppHandle,
    pub song_info: Vec<Song>,
    pub release_info: Vec<Release>,
    pub artist_info: Vec<Artist>,
    pub playlist: Vec<Playlist>,
    pub alist: Vec<Alist>,
    pub recent: Vec<Recent>,
    pub dir_path: Vec<PathBuf>,
    pub fs: FileSystem,
    pub song_controller: SongController,
    pub release_controller: ReleaseController,
    pub pic_controller: PicController,
    pub lyric_controller: LyricController,
    pub artist_controller: ArtistController,
    pub playlist_controller: PlaylistController,
    pub alist_controller: AlistController,
    pub recent_controller: RecentController,
}

#[allow(unused)]
impl Library {
    pub fn init(app: &AppHandle) -> CoreResult<Self> {
        let debounce_timeout = get_global()
            .get("debounce_timeout_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(500);
        let app = app.clone();
        let single_dir = PathBuf::from(
            get_global()
                .get("single_song_store")
                .ok_or_else(|| {
                    CoreError::OtherError(
                        "missing 'store.single_song_store' key in Config".to_string(),
                    )
                })?
                .as_str()
                .ok_or_else(|| {
                    CoreError::OtherError(
                        "`store.single_song_store` field not a string".to_string(),
                    )
                })?
                .to_string(),
        );
        let single_dir = resolve_path(&app, single_dir)?;
        create_dir_all(&single_dir)?;
        info!("Single song dir set to {single_dir:?}");
        let mut fs = FileSystem::new(debounce_timeout, app.clone());
        fs.add_dir(single_dir.clone())?;
        get_global().get("listen_paths").and_then(|paths| {
            paths.as_array().map(|arr| {
                arr.iter().for_each(|p| {
                    if let Some(path_str) = p.as_str() {
                        let path = PathBuf::from(path_str);
                        if let Ok(resolved_path) = resolve_path(&app, path) {
                            if let Err(e) = fs.add_dir(resolved_path.clone()) {
                                warn!("Failed to add cached listen path {resolved_path:?}: {e:?}");
                            }
                        }
                    }
                });
            })
        });
        // let mut dir_path = vec![single_dir];
        // dir_path.append(&mut fs.glob_dirs());
        let dir_path = fs.glob_dirs();
        let song_controller = SongController::new()?;
        let release_controller = ReleaseController::new()?;
        let pic_controller = PicController::new();
        let lyric_controller = LyricController::new();
        let artist_controller = ArtistController::new()?;
        let playlist_controller = PlaylistController::new()?;
        let alist_controller = AlistController::new()?;
        let recent_controller = RecentController::new()?;
        Ok(Library {
            app,
            song_info: Vec::new(),
            release_info: Vec::new(),
            artist_info: Vec::new(),
            playlist: Vec::new(),
            alist: Vec::new(),
            recent: Vec::new(),
            dir_path,
            fs,
            song_controller,
            release_controller,
            pic_controller,
            lyric_controller,
            artist_controller,
            playlist_controller,
            recent_controller,
            alist_controller,
        })
    }

    pub fn load(&mut self) -> CoreResult<()> {
        let files = self.fs.glob_files();
        let total_files = files.len();
        debug!("Fs current dirs: {:?}", self.fs.glob_dirs());
        debug!("current dir paths: {:?}", self.dir_path);
        debug!("Loading library from {total_files} files");

        let app_handle = self.app.clone();
        self.song_info =
            self.song_controller
                .get_from_cache_with_progress(files, &|processed, total| {
                    if total > 0 {
                        let progress = (processed as f32 / total as f32 * 100.0) as u32;
                        let _ = app_handle.emit(
                            "scan_progress",
                            serde_json::json!({
                                "processed": processed,
                                "total": total,
                                "progress": progress
                            }),
                        );
                        if processed % 50 == 0 || processed == total {
                            info!("Scan progress: {processed}/{total} ({progress}%)");
                        }
                    }
                })?;

        self.release_info = self.release_controller.from_songs(&self.song_info);
        self.pic_controller.get_release_arts(&self.song_info)?;
        self.lyric_controller.cache_lyrics(&self.song_info)?;
        self.artist_info = self.artist_controller.from_songs(&self.song_info);
        self.playlist = self.playlist_controller.get_all_playlists()?;
        self.alist = self.alist_controller.get_all_alists()?;
        self.recent = self.recent_controller.get_all_recents()?;

        let _ = self.app.emit(
            "scan_complete",
            serde_json::json!({
                "total": total_files,
                "loaded": self.song_info.len()
            }),
        );
        info!(
            "Library loaded: {} songs from {} files",
            self.song_info.len(),
            total_files
        );

        Ok(())
    }

    pub fn update_song_info(&mut self, new_song: &Song) -> CoreResult<()> {
        self.song_controller.update_song_info(new_song)?;
        self.song_info.retain(|s| s.path != new_song.path);
        self.song_info.push(new_song.clone());
        self.song_info.sort();
        self.release_info = self.release_controller.from_songs(&self.song_info);
        self.artist_info = self.artist_controller.from_songs(&self.song_info);
        self.pic_controller.get_release_arts(&self.song_info)?;
        self.lyric_controller.cache_lyrics(&self.song_info)?;
        Ok(())
    }

    pub fn update_multi_song_info(&mut self, new_songs: &Vec<Song>) -> CoreResult<()> {
        new_songs.iter().for_each(|song| {
            self.song_controller.update_song_info(song).unwrap();
            self.song_info.retain(|s| s.path != song.path);
            self.song_info.push(song.clone());
        });
        self.song_info.sort();
        self.release_info = self.release_controller.from_songs(&self.song_info);
        self.artist_info = self.artist_controller.from_songs(&self.song_info);
        self.pic_controller.get_release_arts(&self.song_info)?;
        self.lyric_controller.cache_lyrics(&self.song_info)?;
        Ok(())
    }

    pub fn update_song_tags(
        &mut self,
        song: &Song,
        new_cover_path: Option<PathBuf>,
    ) -> CoreResult<()> {
        self.fs.ignore_next_modify(&song.path);
        song.write_tags(new_cover_path.as_ref())?;
        if let Ok(Some(old_cache_path)) = song.get_art_cache_path() {
            if old_cache_path.exists() {
                let _ = remove_file(old_cache_path);
            }
        }
        let (created_at, updated_at) = crate::misc::utils::get_time(&song.path);
        let mut updated_song = song.clone();
        updated_song.created_at = created_at;
        updated_song.updated_at = updated_at;
        self.song_controller.update_song_info(&updated_song)?;
        self.pic_controller.get_release_art(&updated_song)?;
        self.lyric_controller
            .cache_lyrics(&vec![updated_song.clone()])?;
        self.song_info.retain(|s| s.path != updated_song.path);
        self.song_info.push(updated_song.clone());
        self.song_info.sort();
        self.release_info = self.release_controller.from_songs(&self.song_info);
        self.artist_info = self.artist_controller.from_songs(&self.song_info);

        Ok(())
    }

    pub fn add_single_song(&mut self, path: PathBuf) -> CoreResult<()> {
        let file = path.file_name().ok_or_else(|| {
            CoreError::OtherError("Failed to get file name when adding single song".to_string())
        })?;
        let new_path = self.dir_path[0].join(file);
        if new_path.exists() {
            return Err(CoreError::FsError(format!(
                "File {new_path:?} already exists in single song dir"
            )));
        }
        info!("Copying single song from {path:?} to {new_path:?}");
        copy(path, new_path)?;
        Ok(())
    }

    pub fn add_single_songs(&mut self, paths: Vec<PathBuf>) -> CoreResult<()> {
        paths
            .iter()
            .try_for_each(|path| self.add_single_song(path.clone()))?;
        Ok(())
    }

    pub fn add_dir(&mut self, path: PathBuf) -> CoreResult<()> {
        if path == self.dir_path[0] {
            return Err(CoreError::OtherError(
                "Cannot remove single song dir".to_string(),
            ));
        }
        self.fs.add_dir(path.clone())?;
        self.dir_path = self.fs.glob_dirs();
        let config = get_global();
        // config.get("store").and_then(|store| {
        //     store
        //         .get("listen_paths")
        //         .and_then(|v| v.as_array())
        //         .map(|arr| {})
        // });
        config.set("listen_paths", json!(self.dir_path));
        self.load()?;
        Ok(())
    }

    pub fn remove_dir(&mut self, path: PathBuf) -> CoreResult<()> {
        self.fs.remove_dir(path.clone())?;
        self.dir_path = self.fs.glob_dirs();
        let config = get_global();
        config.set("listen_paths", json!(self.dir_path));
        self.load()?;
        Ok(())
    }

    pub fn on_file_added(&mut self, files: Vec<PathBuf>) -> CoreResult<()> {
        info!("Detected file changes: {files:?}");
        self.song_controller.add_song_infos(files.clone());
        self.song_info = self.song_controller.get_all()?;
        self.release_info = self.release_controller.list_all()?;
        self.artist_info = self.artist_controller.list_all()?;
        self.pic_controller.get_release_arts(&self.song_info)?;
        self.app.emit("lib_updated", ()).unwrap();
        Ok(())
    }

    pub fn on_file_modified(&mut self, files: Vec<PathBuf>) -> CoreResult<()> {
        info!("Detected file changes: {files:?}");
        self.song_controller
            .update_song_infos_by_files(files.clone())?;
        self.song_info = self.song_controller.get_all()?;
        self.release_info = self.release_controller.list_all()?;
        self.artist_info = self.artist_controller.list_all()?;
        self.pic_controller.get_release_arts(&self.song_info)?;
        self.app.emit("lib_updated", ()).unwrap();
        Ok(())
    }

    pub fn on_file_removed(&mut self, files: Vec<PathBuf>) -> CoreResult<()> {
        info!("Detected file removals: {files:?}");
        self.song_controller
            .remove_song_infos_by_files(files.clone())?;
        self.playlist_controller
            .remove_song_path_all(files.clone())?;
        self.recent_controller
            .remove_by_song_paths(files.iter().collect())?;
        files.iter().for_each(|path| {
            let song_sample = Song::sample(path.clone());
            if let Ok(Some(cache_path)) = song_sample.get_art_cache_path() {
                if cache_path.exists() {
                    let _ = remove_file(cache_path);
                }
            }
            if let Ok(lyric_cache_path) = song_sample.get_lyric_cache_path() {
                if lyric_cache_path.exists() {
                    let _ = remove_file(lyric_cache_path);
                }
            }
        });
        self.song_info = self.song_controller.get_all()?;
        self.release_info = self.release_controller.list_all()?;
        self.artist_info = self.artist_controller.list_all()?;
        // self.playlist = self.playlist_controller.get_all_playlists()?;
        // self.recent = self.recent_controller.get_all_recents()?;
        self.pic_controller.get_release_arts(&self.song_info)?;
        self.app.emit("lib_updated", ()).unwrap();
        Ok(())
    }
}
