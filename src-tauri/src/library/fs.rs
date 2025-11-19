use crate::library::dir::Dir;
use crate::library::watch::DirectoryWatcher;
use crate::misc::error::CoreResult;
use log::{debug, info, warn};
use notify_debouncer_mini::DebouncedEvent;
use std::{
    collections::HashSet,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::{AppHandle, Emitter};

#[derive(Debug)]
pub struct FileSystem {
    pub watcher: DirectoryWatcher,
    pub dirs: Arc<Mutex<Vec<Dir>>>,
    pub ignored_paths: Arc<Mutex<HashSet<PathBuf>>>,
}

#[allow(unused)]
impl FileSystem {
    pub fn new(debounce_timeout: u64, app_handle: AppHandle) -> Self {
        let dirs = Arc::new(Mutex::new(Vec::<Dir>::new()));
        let dirs_clone = Arc::clone(&dirs);
        let ignored_paths = Arc::new(Mutex::new(HashSet::<PathBuf>::new()));
        let ignored_paths_clone = Arc::clone(&ignored_paths);

        // big&lovely closure
        let handler = Box::new(move |res: Result<Vec<DebouncedEvent>, notify::Error>| {
            if let Ok(events) = res {
                let locked_dirs = dirs_clone.lock().unwrap();
                let paths_to_update = events
                    .iter()
                    .filter_map(|event| {
                        locked_dirs
                            .iter()
                            .find(|dir| event.path.starts_with(&dir.path))
                            .map(|d| d.path.clone())
                    })
                    .collect::<HashSet<_>>();
                drop(locked_dirs);
                if paths_to_update.is_empty() {
                    return;
                }
                let mut locked_dirs = dirs_clone.lock().unwrap();
                let mut ignored = ignored_paths_clone.lock().unwrap();
                paths_to_update.iter().for_each(|path| {
                    if let Some(dir) = locked_dirs.iter_mut().find(|d| &d.path == path) {
                        info!("FileSystem Watcher: Updating dir {:?}", dir.path);
                        let (removed_files, added_files, modified_files) = dir.update();
                        // if !removed_files.is_empty() || !added_files.is_empty() {
                        //     info!("FileSystem Watcher: Emitting files-changed");
                        //     // wip: 改为仅发送通知 然后前端调用通道获取更新后的文件列表
                        //     app_handle
                        //         .emit("files-changed", (removed_files, added_files, all_files))
                        //         .unwrap();
                        // }
                        // if !all_files.is_empty() {
                        //     debug!("FS: Emitting internal signal fs-files-all");
                        //     app_handle.emit("fs-files-all", all_files).unwrap();
                        // }
                        if !removed_files.is_empty() {
                            debug!("FileSystem Watcher: Emitting internal signal fs-files-removed");
                            app_handle.emit("fs-files-removed", removed_files).unwrap();
                        }
                        if !added_files.is_empty() {
                            debug!("FileSystem Watcher: Emitting internal signal fs-files-added");
                            app_handle.emit("fs-files-added", added_files).unwrap();
                        }
                        let mut final_modified_files = Vec::new();
                        for file in modified_files {
                            if ignored.remove(&file) {
                                warn!("FS Watcher: Ignoring modification event for {file:?}");
                            } else {
                                final_modified_files.push(file);
                            }
                        }
                        // if !modified_files.is_empty() {
                        if !final_modified_files.is_empty() {
                            debug!(
                                "FileSystem Watcher: Emitting internal signal fs-files-modified"
                            );
                            app_handle
                                .emit("fs-files-modified", final_modified_files)
                                .unwrap();
                        }
                    }
                });
            }
        });
        FileSystem {
            watcher: DirectoryWatcher::new(Duration::from_millis(debounce_timeout), handler),
            dirs,
            ignored_paths,
        }
    }

    pub fn ignore_next_modify(&mut self, path: &PathBuf) {
        info!("FS: Ignoring next modify event for {path:?}");
        self.ignored_paths.lock().unwrap().insert(path.clone());
    }

    pub fn add_dir<P: Into<PathBuf>>(&mut self, path: P) -> CoreResult<()> {
        let dir = Dir::new(path);
        let mut dirs_lock = self.dirs.lock().unwrap();
        dirs_lock
            .iter()
            .find(|x| x.path == dir.path)
            .map(|_| ())
            .is_none()
            .then(|| {
                dirs_lock.push(dir.clone());
            });
        self.watcher.watch(&dir.path)?;
        Ok(())
    }

    pub fn remove_dir<P: Into<PathBuf>>(&mut self, path: P) -> CoreResult<()> {
        let path_buf = path.into();
        self.watcher.unwatch(&path_buf)?;
        self.dirs.lock().unwrap().retain(|x| x.path != path_buf);
        Ok(())
    }

    pub fn glob_dirs(&self) -> Vec<PathBuf> {
        self.dirs
            .lock()
            .unwrap()
            .iter()
            .map(|d| d.path.clone())
            .collect()
    }

    pub fn glob_files(&self) -> Vec<PathBuf> {
        self.dirs
            .lock()
            .unwrap()
            .iter_mut()
            .flat_map(|d| d.glob(true))
            .collect()
        // .flat_map(|d| d.audio_files.clone())
        // .collect()
    }
}
