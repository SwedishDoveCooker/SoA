use super::error::{CoreError, CoreResult};
use chrono::{DateTime, Local};
use std::{
    collections::hash_map::DefaultHasher,
    env, fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    time::SystemTime,
};
use tauri::{path::BaseDirectory, AppHandle, Manager, Runtime};

#[allow(unused)]
pub fn get_current_dir() -> CoreResult<PathBuf> {
    let current_dir = env::current_exe()?;
    let current_dir = current_dir
        .parent()
        .ok_or_else(|| CoreError::FsError("Failed to get parent of current exe".to_string()))?;
    Ok(current_dir.to_path_buf())
}

pub fn resolve_path<R: Runtime>(app: &AppHandle<R>, path: impl AsRef<Path>) -> CoreResult<PathBuf> {
    Ok(dunce::simplified(&app.path().resolve(path, BaseDirectory::AppData)?).to_path_buf())
}

pub fn resolve_resource_path(base_path: &PathBuf, path: impl AsRef<Path>) -> CoreResult<PathBuf> {
    Ok(dunce::simplified(&base_path.join(path.as_ref())).to_path_buf())
}

#[allow(unused)]
pub fn sanitize(input: &String) -> String {
    input.trim().replace('\0', "")
}

pub fn get_time(path: &PathBuf) -> (String, String) {
    fs::metadata(path)
        .map(|meta| (meta.created(), meta.modified()))
        .map(|(created, updated)| {
            let created_datetime: DateTime<Local> =
                created.unwrap_or(SystemTime::UNIX_EPOCH).into();
            let updated_datetime: DateTime<Local> =
                updated.unwrap_or(SystemTime::UNIX_EPOCH).into();
            (created_datetime.to_rfc3339(), updated_datetime.to_rfc3339())
        })
        .unwrap_or_else(|_| (Local::now().to_rfc3339(), Local::now().to_rfc3339()))
}

pub fn get_path_hash(path: &PathBuf) -> String {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}
