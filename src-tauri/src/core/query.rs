use crate::core::{
    error::CoreResult,
    model::{Artist, Release, TrackView},
};
use lazy_static::lazy_static;
use lofty::{file::AudioFile, prelude::TaggedFileExt, probe::Probe, tag::Accessor};
use regex::Regex;
use sqlx::{QueryBuilder, Sqlite, SqlitePool, Transaction};
use std::path::PathBuf;

lazy_static! {
    static ref ARTIST_TITLE_RE: Regex =
        Regex::new(r"^(?P<artist>.+?)\s*-\s*(?P<title>.+)$").unwrap();
    static ref ARTIST_SPLIT_RE: Regex = Regex::new(r"\s*[,;&/]\s*| feat\. | ft\. ").unwrap();
}

pub async fn process_file(path: PathBuf, pool: &SqlitePool) -> CoreResult<()> {
    let path_str = path.to_string_lossy().to_string();
    // println!("Processing file: {}", path_str);
    if sqlx::query_scalar::<_, i64>("SELECT 1 FROM tracks WHERE path = ?")
        .bind(&path_str)
        .fetch_optional(pool)
        .await?
        .is_some()
    {
        // println!("Track already exists in database: {}", path_str);
        return Err(
            std::io::Error::new(std::io::ErrorKind::AlreadyExists, "Track already exists").into(),
        );
    }

    let mut tx = pool.begin().await?;

    let tagged_file = Probe::open(&path)?.read()?;
    let tag = tagged_file.primary_tag();
    let properties = tagged_file.properties();
    let duration = properties.duration().as_secs() as u32;

    let file_stem = path.file_stem().unwrap_or_default().to_string_lossy();
    // println!("File stem: {}", file_stem);

    if let Some(tag) = tag {
        let title = tag.title().map(|s| s.to_string()).unwrap_or_else(|| {
            ARTIST_TITLE_RE
                .captures(&file_stem)
                .and_then(|c| c.name("title").map(|m| m.as_str().to_string()))
                .unwrap_or_else(|| file_stem.to_string())
        });

        let artist_names_str = tag.artist().map(|s| s.to_string()).unwrap_or_else(|| {
            ARTIST_TITLE_RE
                .captures(&file_stem)
                .and_then(|c| c.name("artist").map(|m| m.as_str().to_string()))
                .unwrap_or_default()
        });

        let artist_names: Vec<String> = ARTIST_SPLIT_RE
            .split(&artist_names_str)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let mut artist_ids = Vec::new();
        for name in &artist_names {
            let artist = get_or_create_artist(&mut tx, name).await?;
            artist_ids.push(artist.id);
        }
        // println!("Artist names: {:?}", artist_names);

        // let artist_: Vec<Result<i64, CoreError>>ids = stream::iter(artist_names)
        //     .then(|name| get_or_create_artist(&mut tx, &name)) // FnMut内的mut不能转移出去
        //     .map(|res| res.map(|artist| artist.id))
        //     .collect::<Vec<_>>()
        //     .await;

        let release_name = tag.album().map(|s| s.to_string()).filter(|s| !s.is_empty());
        // let release_name = tag.album().map(|s| s.to_string());
        let art = tag.pictures().first();

        // let release_id = if let Some(name) = release_name {
        //     let release = get_or_create_release(&mut tx, &name, release_art).await?;
        //     for artist_id in &artist_ids {
        //         sqlx::query(
        //             "INSERT OR IGNORE INTO release_artists (release_id, artist_id) VALUES (?, ?)",
        //         )
        //         .bind(release.id)
        //         .bind(artist_id)
        //         .execute(&mut *tx)
        //         .await?;
        //     }
        //     Some(release.id)
        // } else {
        //     None
        // };

        let release_id = if let Some(name) = release_name {
            Some(
                // get_or_create_release(&mut tx, &name, &artist_ids, art)
                //     .await?
                //     .id,
                get_or_create_release_link(&mut tx, &name, &artist_ids)
                    .await?
                    .id,
            )
        } else {
            None
        };

        let art_b64 = art.and_then(|pic| {
            pic.mime_type().map(|mime_str| {
                format!(
                    "data:{};base64,{}",
                    mime_str,
                    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, pic.data())
                )
            })
        });

        // println!(
        //     "Importing: title='{}', artists={:?}, release={:?}, path={}",
        //     title, artist_names, release_id, path_str
        // );

        let track_id = sqlx::query(
            "INSERT INTO tracks (path, title, duration, release_id, art_b64) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(&path_str)
        .bind(&title)
        .bind(duration)
        .bind(release_id)
        .bind(art_b64)
        .execute(&mut *tx)
        .await?
        .last_insert_rowid();

        for artist_id in &artist_ids {
            sqlx::query("INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)")
                .bind(track_id)
                .bind(artist_id)
                .execute(&mut *tx)
                .await?;
        }
        // 现在的思路是 没有 release name 就不创建 release 即 track 的 release_id 为空
        // 直接将 art_b64 附加在 track 上
        // 而 artist 不是 track 的一个字段 更像依附于 track 和 release 的存在
        // 所以没有 artist name 就不创建 artist
    } else {
        // println!(
        //     "No tags found for file: {}. Using filename to infer title and artist.",
        //     path_str
        // );

        // nah tags, predict
        let title = ARTIST_TITLE_RE
            .captures(&file_stem)
            .and_then(|c| c.name("title").map(|m| m.as_str().to_string()))
            .unwrap_or_else(|| file_stem.to_string());

        let artist_names_str = ARTIST_TITLE_RE
            .captures(&file_stem)
            .and_then(|c| c.name("artist").map(|m| m.as_str().to_string()))
            .unwrap_or_default();

        let artist_names: Vec<String> = ARTIST_SPLIT_RE
            .split(&artist_names_str)
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        let mut artist_ids = Vec::new();
        for name in &artist_names {
            let artist = get_or_create_artist(&mut tx, name).await?;
            artist_ids.push(artist.id);
        }

        let track_id = sqlx::query("INSERT INTO tracks (path, title, duration) VALUES (?, ?, ?)")
            .bind(&path_str)
            .bind(&title)
            .bind(duration)
            .execute(&mut *tx)
            .await?
            .last_insert_rowid();

        for artist_id in &artist_ids {
            sqlx::query("INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)")
                .bind(track_id)
                .bind(artist_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;
    Ok(())
}

async fn get_or_create_artist(
    tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    name: &str,
) -> CoreResult<Artist> {
    if let Some(artist) = sqlx::query_as("SELECT * FROM artists WHERE name = ?")
        .bind(name)
        .fetch_optional(&mut **tx)
        .await?
    {
        return Ok(artist);
    }
    let id = sqlx::query("INSERT INTO artists (name) VALUES (?)")
        .bind(name)
        .execute(&mut **tx)
        .await?
        .last_insert_rowid();
    Ok(Artist {
        id,
        name: name.to_string(),
    })
}

async fn get_or_create_release_link(
    tx: &mut Transaction<'_, Sqlite>,
    name: &str,
    track_artist_ids: &[i64],
    // art: Option<&Picture>,
) -> CoreResult<Release> {
    if track_artist_ids.is_empty() {
        if let Some(release) = sqlx::query_as("SELECT * FROM releases WHERE name = ? LIMIT 1")
            .bind(name)
            .fetch_optional(&mut **tx)
            .await?
        {
            return Ok(release);
        }
    } else {
        let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
            "SELECT re.id, re.name FROM releases re
             JOIN release_artists ra ON re.id = ra.release_id
             WHERE re.name = ",
        );
        qb.push_bind(name);
        qb.push(" AND ra.artist_id IN (");

        let mut separated = qb.separated(", ");
        for id in track_artist_ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");
        qb.push(" LIMIT 1");

        if let Some(existing_release) = qb
            .build_query_as::<Release>()
            .fetch_optional(&mut **tx)
            .await?
        {
            for artist_id in track_artist_ids {
                sqlx::query(
                    "INSERT OR IGNORE INTO release_artists (release_id, artist_id) VALUES (?, ?)",
                )
                .bind(existing_release.id)
                .bind(artist_id)
                .execute(&mut **tx)
                .await?;
            }
            return Ok(existing_release);
        }
    }

    // let art_b64 = art.and_then(|pic| {
    //     pic.mime_type().map(|mime_str| {
    //         format!(
    //             "data:{};base64,{}",
    //             mime_str,
    //             base64::Engine::encode(&base64::engine::general_purpose::STANDARD, pic.data())
    //         )
    //     })
    // });

    let new_release_id = sqlx::query("INSERT INTO releases (name,) VALUES (?,)")
        .bind(name)
        .execute(&mut **tx)
        .await?
        .last_insert_rowid();

    for artist_id in track_artist_ids {
        sqlx::query("INSERT OR IGNORE INTO release_artists (release_id, artist_id) VALUES (?, ?)")
            .bind(new_release_id)
            .bind(artist_id)
            .execute(&mut **tx)
            .await?;
    }

    Ok(Release {
        id: new_release_id,
        name: name.to_string(),
        // art_b64,
    })
}

// async fn get_or_create_release(
//     tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
//     name: &str,
//     art: Option<&Picture>,
// ) -> Result<Album, CoreError> {
//     if let Some(release) = sqlx::query_as("SELECT * FROM releases WHERE name = ?")
//         .bind(name)
//         .fetch_optional(&mut **tx)
//         .await?
//     {
//         return Ok(release);
//     }
//     let art_b64 = art.and_then(|pic| {
//         pic.mime_type().map(|mime_str| {
//             format!(
//                 "data:{};base64,{}",
//                 mime_str,
//                 base64::Engine::encode(&base64::engine::general_purpose::STANDARD, pic.data())
//             )
//         })
//     });
//     let id = sqlx::query("INSERT INTO releases (name, art_b64) VALUES (?, ?)")
//         .bind(name)
//         .bind(&art_b64)
//         .execute(&mut **tx)
//         .await?
//         .last_insert_rowid();
//     Ok(Album {
//         id,
//         name: name.to_string(),
//         art_b64,
//     })
// }

pub async fn update_track(track_update: TrackView, pool: &SqlitePool) -> CoreResult<()> {
    let mut tx = pool.begin().await?;

    let old_release_id: Option<i64> =
        sqlx::query_scalar("SELECT release_id FROM tracks WHERE id = ?")
            .bind(track_update.id)
            .fetch_one(&mut *tx)
            .await?;

    let old_artist_ids: Vec<i64> =
        sqlx::query_scalar("SELECT artist_id FROM track_artists WHERE track_id = ?")
            .bind(track_update.id)
            .fetch_all(&mut *tx)
            .await?;

    sqlx::query(
        r#"
        UPDATE tracks
        SET
            title = ?,
            score = ?
        WHERE id = ?
        "#,
    )
    .bind(&track_update.title)
    .bind(track_update.score)
    .bind(track_update.id)
    .execute(&mut *tx)
    .await?;

    sqlx::query("DELETE FROM track_artists WHERE track_id = ?")
        .bind(track_update.id)
        .execute(&mut *tx)
        .await?;

    let mut new_artist_ids = Vec::new();
    if let Some(artist_names_str) = track_update.artist_name {
        let artist_names: Vec<&str> = artist_names_str.split(',').map(|s| s.trim()).collect();
        for name in artist_names {
            if !name.is_empty() {
                let artist = get_or_create_artist(&mut tx, name).await?;
                sqlx::query("INSERT INTO track_artists (track_id, artist_id) VALUES (?, ?)")
                    .bind(track_update.id)
                    .bind(artist.id)
                    .execute(&mut *tx)
                    .await?;
                new_artist_ids.push(artist.id);
            }
        }
    }

    let new_release_id =
        if let Some(release_name) = track_update.release_name.filter(|s| !s.is_empty()) {
            // let release = get_or_create_release(&mut tx, &release_name, &[], None).await?;
            // ?
            let release = get_or_create_release(&mut tx, &release_name, &new_artist_ids).await?;
            sqlx::query("UPDATE tracks SET release_id = ? WHERE id = ?")
                .bind(release.id)
                .bind(track_update.id)
                .execute(&mut *tx)
                .await?;
            Some(release.id)
        } else {
            sqlx::query("UPDATE tracks SET release_id = NULL WHERE id = ?")
                .bind(track_update.id)
                .execute(&mut *tx)
                .await?;
            None
        };

    if let Some(release_id) = new_release_id {
        for artist_id in &new_artist_ids {
            sqlx::query(
                "INSERT OR IGNORE INTO release_artists (release_id, artist_id) VALUES (?, ?)",
            )
            .bind(release_id)
            .bind(artist_id)
            .execute(&mut *tx)
            .await?;
        }
    }

    if let Some(old_release_id_val) = old_release_id {
        if Some(old_release_id_val) != new_release_id {
            let old_release_artists: Vec<(i64,)> =
                sqlx::query_as("SELECT artist_id FROM release_artists WHERE release_id = ?")
                    .bind(old_release_id_val)
                    .fetch_all(&mut *tx)
                    .await?;

            for (artist_id,) in old_release_artists {
                let count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM tracks t JOIN track_artists ta ON t.id = ta.track_id WHERE t.release_id = ? AND ta.artist_id = ?"
                )
                .bind(old_release_id_val)
                .bind(artist_id)
                .fetch_one(&mut *tx)
                .await?;

                if count.0 == 0 {
                    sqlx::query(
                        "DELETE FROM release_artists WHERE release_id = ? AND artist_id = ?",
                    )
                    .bind(old_release_id_val)
                    .bind(artist_id)
                    .execute(&mut *tx)
                    .await?;
                }
            }
        }
    }

    if let Some(old_release_id_val) = old_release_id {
        if Some(old_release_id_val) != new_release_id {
            let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tracks WHERE release_id = ?")
                .bind(old_release_id_val)
                .fetch_one(&mut *tx)
                .await?;

            if count.0 == 0 {
                sqlx::query("DELETE FROM releases WHERE id = ?")
                    .bind(old_release_id_val)
                    .execute(&mut *tx)
                    .await?;
            }
        }
    }

    let removed_artist_ids: Vec<i64> = old_artist_ids
        .into_iter()
        .filter(|id| !new_artist_ids.contains(id))
        .collect();

    for artist_id in removed_artist_ids {
        let track_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM track_artists WHERE artist_id = ?")
                .bind(artist_id)
                .fetch_one(&mut *tx)
                .await?;

        let release_count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM release_artists WHERE artist_id = ?")
                .bind(artist_id)
                .fetch_one(&mut *tx)
                .await?;

        // 这里感觉二选一其实就行
        if track_count.0 == 0 && release_count.0 == 0 {
            sqlx::query("DELETE FROM artists WHERE id = ?")
                .bind(artist_id)
                .execute(&mut *tx)
                .await?;
        }
    }

    tx.commit().await?;
    Ok(())
}

async fn get_or_create_release(
    tx: &mut Transaction<'_, Sqlite>,
    name: &str,
    track_artist_ids: &[i64],
    // art: Option<&Picture>,
) -> CoreResult<Release> {
    if track_artist_ids.is_empty() {
        if let Some(release) = sqlx::query_as("SELECT * FROM releases WHERE name = ? LIMIT 1")
            .bind(name)
            .fetch_optional(&mut **tx)
            .await?
        {
            return Ok(release);
        }
    } else {
        let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
            "SELECT re.id, re.name FROM releases re
             JOIN release_artists ra ON re.id = ra.release_id
             WHERE re.name = ",
        );
        qb.push_bind(name);
        qb.push(" AND ra.artist_id IN (");

        let mut separated = qb.separated(", ");
        for id in track_artist_ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");
        qb.push(" LIMIT 1");

        if let Some(existing_release) = qb
            .build_query_as::<Release>()
            .fetch_optional(&mut **tx)
            .await?
        {
            return Ok(existing_release);
        }
    }

    let new_release_id = sqlx::query("INSERT INTO releases (name) VALUES (?)")
        .bind(name)
        .execute(&mut **tx)
        .await?
        .last_insert_rowid();

    Ok(Release {
        id: new_release_id,
        name: name.to_string(),
    })
}
