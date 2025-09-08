use crate::core::{consts, error::CoreResult};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool};
use std::path::{Path, PathBuf};
use tauri::{path::BaseDirectory, AppHandle, Manager, Runtime};

pub fn resolve_store_path<R: Runtime>(
    app: &AppHandle<R>,
    path: impl AsRef<Path>,
) -> CoreResult<PathBuf> {
    Ok(dunce::simplified(&app.path().resolve(path, BaseDirectory::AppData)?).to_path_buf())
}

// pub async fn initialize_database(app: &AppHandle) -> CoreResult<()> {
pub async fn initialize_database(app: &AppHandle) -> CoreResult<SqlitePool> {
    let db_path = resolve_store_path(app, consts::DATABASE_NAME)?;
    if !db_path.exists() {
        std::fs::create_dir_all(db_path.parent().unwrap())?; // 大概不会有问题(
    }
    // let db_path = app_dir.join("music_library.db");
    // let db_path = app_dir.join(consts::
    // println!("Database path: {}", db_path.display());
    // let db_url = format!("sqlite://{}", db_path.to_str().unwrap());
    let opts = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);
    let pool = SqlitePool::connect_with(opts).await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS artists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
        CREATE TABLE IF NOT EXISTS releases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            duration INTEGER NOT NULL,
            release_id INTEGER,
            art_b64 TEXT,
            lyrics TEXT,
            score TEXT,
            FOREIGN KEY(release_id) REFERENCES releases(id)
        );
        CREATE TABLE IF NOT EXISTS track_artists (
            track_id INTEGER NOT NULL,
            artist_id INTEGER NOT NULL,
            PRIMARY KEY (track_id, artist_id),
            FOREIGN KEY (track_id) REFERENCES tracks(id),
            FOREIGN KEY (artist_id) REFERENCES artists(id)
        );
        CREATE TABLE IF NOT EXISTS release_artists (
            release_id INTEGER NOT NULL,
            artist_id INTEGER NOT NULL,
            PRIMARY KEY (release_id, artist_id),
            FOREIGN KEY (release_id) REFERENCES releases(id),
            FOREIGN KEY (artist_id) REFERENCES artists(id)
        );
    "#,
    )
    .execute(&pool)
    .await?;

    Ok(pool)
    // Ok(())
}
