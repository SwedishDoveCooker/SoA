use crate::core::{
    error::CoreResult,
    model::TrackView,
    query::{process_file, update_track},
};
use futures::stream::{self, StreamExt};
use sqlx::SqlitePool;
use std::collections::HashSet;
use std::path::PathBuf;
use walkdir::WalkDir;

const CONCURRENT_SCANS: usize = 1; // refac later ☺️

#[tauri::command]
pub async fn get_all_tracks(pool: tauri::State<'_, SqlitePool>) -> CoreResult<Vec<TrackView>> {
    let tracks = sqlx::query_as::<_, TrackView>(
        r#"
        SELECT
            t.id, t.path, t.title, t.duration, t.art_b64, t.lyrics, t.score,
            GROUP_CONCAT(ar.name, ', ') AS artist_name,
            re.name AS release_name
            -- re.art_b64 AS release_art_b64
        FROM tracks t
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists ar ON ta.artist_id = ar.id
        LEFT JOIN releases re ON t.release_id = re.id
        GROUP BY t.id
        -- ORDER BY re.name, t.title ASC
        ORDER BY t.id ASC
    "#,
    )
    .fetch_all(pool.inner())
    .await?;
    Ok(tracks)
}

#[tauri::command]
pub async fn scan_dir(directory: String, pool: tauri::State<'_, SqlitePool>) -> CoreResult<usize> {
    let allowed_extensions: HashSet<&str> = ["mp3", "flac", "m4a", "ogg", "wav", "aac"]
        .into_iter()
        .collect();

    let paths: Vec<PathBuf> = WalkDir::new(directory)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.file_type().is_file()
                && entry
                    .path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| allowed_extensions.contains(s.to_ascii_lowercase().as_str()))
                    .unwrap_or(false)
        })
        .map(|entry| entry.into_path())
        .collect();

    let new_tracks_stream = stream::iter(paths)
        .map(|path| {
            let pool = pool.inner().clone();
            tokio::spawn(async move { process_file(path, &pool).await })
        })
        .buffer_unordered(CONCURRENT_SCANS);

    let results: Vec<_> = new_tracks_stream.collect().await;
    let new_tracks_count = results
        .into_iter()
        .filter(|res| matches!(res, Ok(Ok(()))))
        .count();
    Ok(new_tracks_count)
}

#[tauri::command]
pub async fn modify(track: TrackView, pool: tauri::State<'_, SqlitePool>) -> CoreResult<()> {
    update_track(track, pool.inner()).await
}
