use crate::{
    misc::{
        config::get_global,
        error::{CoreError, CoreResult},
        utils::get_time,
    },
    store::json::{
        entity::song::Song,
        op::{sm::StoreManager, song::SongOp},
    },
};
use log::{debug, error, info, warn};
use std::{
    collections::HashSet,
    fs::remove_file,
    path::PathBuf,
    sync::{Arc, Mutex},
};

#[derive(Clone)]
pub struct SongController {
    pub op: Arc<SongOp>,
}

#[allow(unused)]
impl SongController {
    /// new new new!
    pub fn new() -> CoreResult<Self> {
        let config = get_global();
        print!("112");
        let op = Arc::new(SongOp {
            sm: Arc::new(Mutex::new(StoreManager::<HashSet<Song>>::new(
                // config
                //     // .get("store.song_store")
                //     .get("store")
                //     .and_then(|v| v.as_str().map(|s| s.to_string()))
                //     .unwrap(),
                config
                    .get("song_store")
                    .ok_or_else(|| {
                        CoreError::OtherError(
                            "missing 'store.song_store' key in Config".to_string(),
                        )
                    })?
                    .as_str()
                    .ok_or_else(|| {
                        CoreError::OtherError("`store.song_store` field not a string".to_string())
                    })?
                    .to_string(),
            )?)),
        });
        print!("112");
        info!("SongController initialized");
        Ok(Self { op })
    }

    pub fn get_op(&self) -> Arc<SongOp> {
        self.op.clone()
    }

    /// get song information from cache and update store
    pub fn get_from_cache(&self, files: Vec<PathBuf>) -> CoreResult<Vec<Song>> {
        self.get_from_cache_with_progress(files, &|_, _| {})
    }

    /// get song information from cache with progress callback
    pub fn get_from_cache_with_progress<F>(
        &self,
        files: Vec<PathBuf>,
        progress_callback: &F,
    ) -> CoreResult<Vec<Song>>
    where
        F: Fn(usize, usize),
    {
        let cached_songs = self.op.list_all()?;
        let cached_files = cached_songs
            .into_iter()
            .map(|song| song.path.clone())
            .collect::<Vec<PathBuf>>();
        let (added_files, common_files, removed_files) = files.into_iter().fold(
            (
                Vec::<PathBuf>::new(),
                Vec::<PathBuf>::new(),
                cached_files.clone(),
            ),
            |(mut added, mut common, mut removed), file| {
                if removed.contains(&file) {
                    common.push(file.clone());
                    removed.retain(|f| f != &file);
                } else {
                    added.push(file.clone());
                }
                (added, common, removed)
            },
        );
        debug!("added files: {:#?}", added_files);
        debug!("common files: {:#?}", common_files);
        debug!("removed files: {:#?}", removed_files);
        let (mut song_infos, expired_song_infos) = common_files.iter().fold(
            (Vec::<Song>::new(), Vec::<Song>::new()),
            |(mut valid_songs, mut expired_songs), file| {
                match self.op.locate(file) {
                    Ok(song) => match (song.updated_at == get_time(file).1) {
                        true => valid_songs.push(song),
                        false => {
                            expired_songs.push(song.clone());
                            match Song::from_path(file, song.score) {
                                Ok(updated_song) => valid_songs.push(updated_song),
                                Err(e) => {
                                    warn!("Failed to re-parse updated file {:?}: {:?}", file, e);
                                }
                            }
                        }
                    },
                    Err(e) => {
                        error!("Failed to locate cached song {:?}: {:?}", file, e);
                    }
                }
                (valid_songs, expired_songs)
            },
        );

        const BATCH_SIZE: usize = 50;
        let total_new_files = added_files.len();
        let mut failed_files = Vec::new();
        let mut processed = 0;

        info!(
            "Processing {} new files in batches of {}",
            total_new_files, BATCH_SIZE
        );

        for chunk in added_files.chunks(BATCH_SIZE) {
            for file in chunk {
                match Song::from_path(file, None) {
                    Ok(song) => song_infos.push(song),
                    Err(e) => {
                        warn!("Skipping file {:?} due to parse error: {:?}", file, e);
                        failed_files.push(file.clone());
                    }
                }
                processed += 1;
            }

            progress_callback(processed, total_new_files);

            if processed % (BATCH_SIZE * 5) == 0 || processed == total_new_files {
                song_infos.sort_by(|a, b| a.cmp(&b));
                self.op.save_all(&song_infos);
                debug!("Saved progress: {}/{} files", processed, total_new_files);
            }
        }

        if !failed_files.is_empty() {
            info!(
                "Failed to parse {} files. Check logs for details.",
                failed_files.len()
            );
        }

        song_infos.sort_by(|a, b| a.cmp(&b));
        self.op.save_all(&song_infos);
        Ok(song_infos)
    }

    pub fn get_all(&self) -> CoreResult<Vec<Song>> {
        let mut vec = self.op.list_all()?;
        vec.sort_by(|a, b| a.cmp(&b));
        Ok(vec)
    }

    /// get song information by artist from store without updating
    pub fn get_by_artist(&self, artist: &str) -> CoreResult<Vec<Song>> {
        self.op.list_by_artist(artist)
    }

    /// get song information by artists from store without updating
    pub fn get_by_artists(&self, artists: Vec<String>) -> CoreResult<Vec<Song>> {
        let songs = artists
            .into_iter()
            .flat_map(|artist| self.op.list_by_artist(&artist).unwrap_or_default())
            .collect();
        Ok(songs)
    }

    /// get songs with unknown artist from store without updating
    pub fn get_unknown_artist_songs(&self) -> CoreResult<Vec<Song>> {
        self.op.list_unknown_artist()
    }

    /// get song information by artist and release from store without updating
    pub fn get_song_by_artist_release(&self, artist: &str, release: &str) -> CoreResult<Vec<Song>> {
        self.op.list_by_artist_release(artist, release)
    }

    /// get song information by artists and releases from store without updating
    pub fn get_by_artists_releases(
        &self,
        artist_releases: Vec<(String, String)>,
    ) -> CoreResult<Vec<Song>> {
        let songs = artist_releases
            .into_iter()
            .flat_map(|(artist, release)| {
                self.op
                    .list_by_artist_release(&artist, &release)
                    .unwrap_or_default()
            })
            .collect();
        Ok(songs)
    }

    /// get songs with unknown release from store without updating
    pub fn get_unknown_release_songs(&self) -> CoreResult<Vec<Song>> {
        self.op.list_unknown_release()
    }

    /// get song information by file from store without updating
    pub fn get_by_file(&self, file: &PathBuf) -> CoreResult<Song> {
        self.op.locate(file)
    }

    /// get song information by files from store without updating
    pub fn get_by_files(&self, files: Vec<PathBuf>) -> CoreResult<Vec<Song>> {
        let songs = files
            .into_iter()
            .filter_map(|file| self.op.locate(&file).ok())
            .collect();
        Ok(songs)
    }

    pub fn add_song_infos(&self, files: Vec<PathBuf>) -> CoreResult<()> {
        let mut song_infos = Vec::new();
        let mut failed_count = 0;
        for file in files.iter() {
            match Song::from_path(file, None) {
                Ok(song) => song_infos.push(song),
                Err(e) => {
                    warn!("Failed to parse file {:?}: {:?}", file, e);
                    failed_count += 1;
                }
            }
        }
        if failed_count > 0 {
            info!("Skipped {} files due to parse errors", failed_count);
        }
        if !song_infos.is_empty() {
            self.op.add_save(&song_infos)?;
        }
        Ok(())
    }

    pub fn remove_song_infos(&self, songs: Vec<Song>) -> CoreResult<()> {
        self.op.remove(&songs)?;
        Ok(())
    }

    pub fn remove_song_infos_by_files(&self, files: Vec<PathBuf>) -> CoreResult<()> {
        self.op.remove_by_files(&files)?;
        Ok(())
    }

    pub fn update_song_info(&self, song: &Song) -> CoreResult<()> {
        self.op.modify(song)?;
        Ok(())
    }

    pub fn update_song_infos(&self, songs: Vec<Song>) -> CoreResult<()> {
        songs.iter().try_for_each(|song| self.op.modify(song))?;
        Ok(())
    }

    pub fn update_song_infos_by_files(&self, files: Vec<PathBuf>) -> CoreResult<()> {
        files.iter().try_for_each(|file| {
            let old_score = self.op.locate(file).ok().and_then(|s| s.score);
            let song = Song::from_path(file, old_score)?;
            self.op.modify(&song)
        })?;
        Ok(())
    }

    pub fn get_song_info(&self, file: &PathBuf) -> CoreResult<Song> {
        Song::from_path(file, None)
    }

    /// get song information from files and do not operate store
    pub fn get_song_infos(&self, files: Vec<PathBuf>) -> CoreResult<Vec<Song>> {
        let songs = files
            .into_iter()
            .filter_map(|file| Song::from_path(&file, None).ok())
            .collect();
        Ok(songs)
    }

    /// del song on the disk
    pub fn delete_song_file(&self, song: &PathBuf) -> CoreResult<()> {
        remove_file(song).map_err(|e| CoreError::FsError(e.to_string()))
    }

    pub fn delete_song_files(&self, songs: Vec<PathBuf>) -> CoreResult<()> {
        songs
            .iter()
            .try_for_each(|song| remove_file(song).map_err(|e| CoreError::FsError(e.to_string())))
    }
}
