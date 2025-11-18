use crate::misc::error::{CoreError, CoreResult};
use notify::{FsEventWatcher, RecursiveMode};
use notify_debouncer_mini::{new_debouncer, DebouncedEvent, Debouncer};
use std::{
    // cell::RefCell,
    collections::HashSet,
    path::{Path, PathBuf},
    // sync::{mpsc, Weak},
    time::Duration,
};

#[derive(Debug)]
pub struct DirectoryWatcher {
    _debouncer: Debouncer<FsEventWatcher>,

    // dirs: Weak<RefCell<HashSet<Dir>>>,
    watched_paths: HashSet<PathBuf>,
}

#[allow(unused)]
impl DirectoryWatcher {
    pub fn new(
        timeout: Duration,
        // dirs: Weak<RefCell<HashSet<Dir>>>,
        handler: Box<dyn FnMut(Result<Vec<DebouncedEvent>, notify::Error>) + Send>,
    ) -> Self {
        let debouncer = new_debouncer(timeout, handler).unwrap();
        DirectoryWatcher {
            _debouncer: debouncer,
            // dirs,
            watched_paths: HashSet::new(),
        }
    }

    pub fn watch<P: AsRef<Path>>(&mut self, path: P) -> CoreResult<()> {
        let path_buf = path.as_ref().to_path_buf();
        self.watched_paths
            .insert(path_buf.clone())
            .then(|| ())
            .ok_or(CoreError::FsError("Path already watched".to_string()))?;
        self._debouncer
            .watcher()
            .watch(path_buf.as_ref(), RecursiveMode::Recursive)?;
        Ok(())
    }

    pub fn unwatch<P: AsRef<Path>>(&mut self, path: P) -> CoreResult<()> {
        let path_buf = path.as_ref().to_path_buf();
        self._debouncer.watcher().unwatch(path_buf.as_ref())?;
        self.watched_paths
            .remove(&path_buf)
            .then(|| ())
            .ok_or(CoreError::FsError("Path not being watched".to_string()))?;
        Ok(())
    }

    pub fn glob(&self) -> Vec<PathBuf> {
        self.watched_paths.iter().cloned().collect()
    }

    //     pub fn poll_changed_dirs(&self) -> Option<Result<HashSet<PathBuf>, CoreError>> {
    //         match self.rx.try_recv() {
    //             // 喜欢拆 result 吗(
    //             Ok(Ok(events)) => {
    //                 if events.is_empty() {
    //                     return None;
    //                 }

    //                 let changed_paths = self.map_events_to_dirs(events);
    //                 if changed_paths.is_empty() {
    //                     None
    //                 } else {
    //                     Some(Ok(changed_paths))
    //                 }
    //             }
    //             Ok(Err(notify_error)) => Some(Err(CoreError::from(notify_error))),
    //             Err(mpsc::TryRecvError::Empty) => None,
    //             Err(mpsc::TryRecvError::Disconnected) => {
    //                 Some(Err(CoreError::RecvError(mpsc::RecvError)))
    //             }
    //         }
    //     }

    //     pub fn recv_changed_dirs(&self) -> Result<HashSet<PathBuf>, CoreError> {
    //         loop {
    //             match self.rx.recv()? {
    //                 Ok(events) => {
    //                     if events.is_empty() {
    //                         continue;
    //                     }

    //                     let changed_paths = self.map_events_to_dirs(events);

    //                     if !changed_paths.is_empty() {
    //                         return Ok(changed_paths);
    //                     }
    //                 }
    //                 Err(notify_error) => {
    //                     return Err(CoreError::from(notify_error));
    //                 }
    //             }
    //         }
    //     }

    //     fn map_events_to_dirs(&self, events: Vec<DebouncedEvent>) -> HashSet<PathBuf> {
    //         let mut changed_monitored_paths = HashSet::new();
    //         for event in events {
    //             for monitored_path in &self.watched_paths {
    //                 if event.path.starts_with(monitored_path) {
    //                     changed_monitored_paths.insert(monitored_path.clone());
    //                     break;
    //                 }
    //             }
    //         }
    //         changed_monitored_paths
    //     }
}
