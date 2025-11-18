pub mod model;
pub use model::*;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::State;

// pub fn library_init(app: &tauri::AppHandle) {
//     let _ = Library::init(app);
// }

pub fn get_all_songs(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Song> {
    library.lock().unwrap().song_info.clone()
}

pub fn delete_song_file(library: State<'_, Arc<Mutex<Library>>>, song: PathBuf) -> CoreResult<()> {
    library
        .lock()
        .unwrap()
        .song_controller
        .delete_song_file(&song)
}

pub fn delete_song_files(
    library: State<'_, Arc<Mutex<Library>>>,
    songs: Vec<PathBuf>,
) -> CoreResult<()> {
    library
        .lock()
        .unwrap()
        .song_controller
        .delete_song_files(songs)
}

pub fn get_all_releases(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Release> {
    library.lock().unwrap().release_info.clone()
}

pub fn get_all_artists(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Artist> {
    library.lock().unwrap().artist_info.clone()
}

pub fn get_all_playlists(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Playlist> {
    library.lock().unwrap().playlist.clone()
}

pub fn get_all_alists(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Alist> {
    library.lock().unwrap().alist.clone()
}

pub fn get_all_recents(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Recent> {
    library.lock().unwrap().recent.clone()
}

pub fn get_glob_dirs(library: State<'_, Arc<Mutex<Library>>>) -> Vec<PathBuf> {
    library.lock().unwrap().dir_path.clone()
}

pub fn refresh_library(library: State<'_, Arc<Mutex<Library>>>) -> CoreResult<()> {
    library.lock().unwrap().load()
}

pub fn add_dir(library: State<'_, Arc<Mutex<Library>>>, dir: PathBuf) -> CoreResult<()> {
    library.lock().unwrap().add_dir(dir)
}

pub fn remove_dir(library: State<'_, Arc<Mutex<Library>>>, dir: PathBuf) -> CoreResult<()> {
    library.lock().unwrap().remove_dir(dir)
}

pub fn modify(library: State<'_, Arc<Mutex<Library>>>, song: Song) -> CoreResult<()> {
    library.lock().unwrap().update_song_info(&song)
}

pub fn modify_multiple(
    library: State<'_, Arc<Mutex<Library>>>,
    songs: Vec<Song>,
) -> CoreResult<()> {
    library.lock().unwrap().update_multi_song_info(&songs)
}

pub fn update_song_tags(
    library: State<'_, Arc<Mutex<Library>>>,
    song: Song,
    new_cover_path: Option<PathBuf>,
) -> CoreResult<()> {
    library
        .lock()
        .unwrap()
        .update_song_tags(&song, new_cover_path)
}

pub fn add_single_song(library: State<'_, Arc<Mutex<Library>>>, file: PathBuf) -> CoreResult<()> {
    library.lock().unwrap().add_single_song(file)
}

pub fn add_single_songs(
    library: State<'_, Arc<Mutex<Library>>>,
    files: Vec<PathBuf>,
) -> CoreResult<()> {
    library.lock().unwrap().add_single_songs(files)
}

pub fn get_song_by_file(
    library: State<'_, Arc<Mutex<Library>>>,
    file: PathBuf,
) -> CoreResult<Song> {
    library
        .lock()
        .unwrap()
        .song_info
        .iter()
        .find(|s| s.path == file)
        .cloned()
        .ok_or_else(|| CoreError::FsError("Song not found".to_string()))
}

pub fn get_songs_by_files(
    library: State<'_, Arc<Mutex<Library>>>,
    files: Vec<PathBuf>,
) -> CoreResult<Vec<Song>> {
    let lib = library.lock().unwrap();
    let songs: Vec<Song> = files
        .iter()
        .filter_map(|file| lib.song_info.iter().find(|s| s.path == *file).cloned())
        .collect();
    Ok(songs)
}

pub fn create_playlist(library: State<'_, Arc<Mutex<Library>>>, name: String) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.create_playlist(name.clone())?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn delete_playlist(library: State<'_, Arc<Mutex<Library>>>, name: String) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.del(name.clone())?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn add_song_to_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    song: Song,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.add_song(playlist_name, song)?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn add_songs_to_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    songs: Vec<Song>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.add_songs(playlist_name, songs)?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn remove_song_from_playlist_all(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    song: Song,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller
        .remove_song_all(playlist_name, song)?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn remove_songs_from_playlist_by_index(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    index: Vec<usize>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.remove_songs(playlist_name, index)?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn rename_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    old_name: String,
    new_name: String,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.rename(old_name, new_name)?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn clear_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller.clear_songs(playlist_name.clone())?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn clear_songs_multi(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_names: Vec<String>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.playlist_controller
        .clear_songs_multi(playlist_names.clone())?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    Ok(())
}

pub fn add_recents(library: State<'_, Arc<Mutex<Library>>>, recent: Recent) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.recent_controller.insert(&recent)?;
    lib.recent = lib.recent_controller.get_all_recents()?;
    Ok(())
}

pub fn remove_recents_by_song_all(
    library: State<'_, Arc<Mutex<Library>>>,
    song: Song,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.recent_controller.remove_by_song_all(song)?;
    lib.recent = lib.recent_controller.get_all_recents()?;
    Ok(())
}

pub fn remove_recents_by_index(
    library: State<'_, Arc<Mutex<Library>>>,
    index: usize,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.recent_controller.remove_by_index(index)?;
    lib.recent = lib.recent_controller.get_all_recents()?;
    Ok(())
}

pub fn clear_recents(library: State<'_, Arc<Mutex<Library>>>) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.recent_controller.clear()?;
    lib.recent = lib.recent_controller.get_all_recents()?;
    Ok(())
}

pub fn get_lyric(
    library: State<'_, Arc<Mutex<Library>>>,
    song: Song,
) -> CoreResult<Option<String>> {
    library.lock().unwrap().lyric_controller.get_lyric(&song)
}

pub fn create_alist(library: State<'_, Arc<Mutex<Library>>>, name: String) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.create_alist(name.clone())?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn delete_alist(library: State<'_, Arc<Mutex<Library>>>, name: String) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.del(name.clone())?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn remove_alists(
    library: State<'_, Arc<Mutex<Library>>>,
    names: Vec<String>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    names
        .iter()
        .try_for_each(|name| lib.alist_controller.del(name.clone()))?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn add_element_to_alist(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    element: Aelement,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.add_element(alist_name, element)?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn add_elements_to_alist(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    elements: Vec<Aelement>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    elements.iter().try_for_each(|element| {
        lib.alist_controller
            .add_element(alist_name.clone(), element.clone())
    })?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn remove_element_from_alist_by_index(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    index: usize,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.remove_element(alist_name, index)?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}
pub fn remove_elements_from_alist_by_indices(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    indices: Vec<usize>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.remove_elements(alist_name, indices)?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}
pub fn remove_element_from_alist_all(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    element: Aelement,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller
        .remove_element_all(alist_name, element)?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}
pub fn remove_elements_from_alist_all(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    elements: Vec<Aelement>,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller
        .remove_elements_all(alist_name, elements)?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}
pub fn clear_alist_elements(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.clear_elements(alist_name.clone())?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn rename_alist(
    library: State<'_, Arc<Mutex<Library>>>,
    old_name: String,
    new_name: String,
) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    lib.alist_controller.rename(old_name, new_name)?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}

pub fn list_all_alist_elements(
    library: State<'_, Arc<Mutex<Library>>>,
    name: String,
) -> CoreResult<Vec<Aelement>> {
    library
        .lock()
        .unwrap()
        .alist_controller
        .list_all_elements(name)
}

pub fn list_all_alist_songs(
    library: State<'_, Arc<Mutex<Library>>>,
    name: String,
) -> CoreResult<Vec<PathBuf>> {
    library
        .lock()
        .unwrap()
        .alist_controller
        .list_all_songs(name)
}

pub fn freeze_alist(library: State<'_, Arc<Mutex<Library>>>, name: String) -> CoreResult<()> {
    let mut lib = library.lock().unwrap();
    let playlist = lib.alist_controller.freeze(name)?;
    lib.playlist_controller.add(&playlist)?;
    lib.playlist = lib.playlist_controller.get_all_playlists()?;
    lib.alist = lib.alist_controller.get_all_alists()?;
    Ok(())
}
