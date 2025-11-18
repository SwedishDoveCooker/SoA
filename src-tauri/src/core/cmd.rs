use super::window;
use super::{
    library::{
        self, Aelement, Alist, Artist, CoreResult, Library, Playlist, Recent, Release, Song,
    },
    pic,
    playback::PlaybackService,
};
use log::debug;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::State;

#[tauri::command]
pub fn ping() -> String {
    debug!("Received ping command");
    "pong".to_string()
}

#[tauri::command]
pub fn delete_song_file(library: State<'_, Arc<Mutex<Library>>>, song: PathBuf) -> CoreResult<()> {
    debug!("Received delete_song_file command");
    library::delete_song_file(library, song)
}

#[tauri::command]
pub fn delete_song_files(
    library: State<'_, Arc<Mutex<Library>>>,
    songs: Vec<PathBuf>,
) -> CoreResult<()> {
    debug!("Received delete_song_files command");
    library::delete_song_files(library, songs)
}

#[tauri::command]
pub fn get_all_songs(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Song> {
    debug!("Received get_all_songs command");
    library::get_all_songs(library)
}

#[tauri::command]
pub fn get_all_releases(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Release> {
    debug!("Received get_all_releases command");
    library::get_all_releases(library)
}

#[tauri::command]
pub fn get_all_artists(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Artist> {
    debug!("Received get_all_artists command");
    library::get_all_artists(library)
}

#[tauri::command]
pub fn get_all_playlists(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Playlist> {
    debug!("Received get_all_playlists command");
    library::get_all_playlists(library)
}

#[tauri::command]
pub fn get_all_alists(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Alist> {
    debug!("Received get_all_alists command");
    library::get_all_alists(library)
}

#[tauri::command]
pub fn get_all_recents(library: State<'_, Arc<Mutex<Library>>>) -> Vec<Recent> {
    debug!("Received get_all_recents command");
    library::get_all_recents(library)
}

#[tauri::command]
pub fn get_glob_dirs(library: State<'_, Arc<Mutex<Library>>>) -> Vec<PathBuf> {
    debug!("Received get_glob_dirs command");
    library::get_glob_dirs(library)
}

#[tauri::command]
pub fn refresh_library(library: State<'_, Arc<Mutex<Library>>>) -> CoreResult<()> {
    debug!("Received refresh_library command");
    library::refresh_library(library)
}

#[tauri::command]
pub fn add_dir(library: State<'_, Arc<Mutex<Library>>>, dir: PathBuf) -> CoreResult<()> {
    debug!("Received add_dir command");
    library::add_dir(library, dir)
}

#[tauri::command]
pub fn remove_dir(library: State<'_, Arc<Mutex<Library>>>, dir: PathBuf) -> CoreResult<()> {
    debug!("Received remove_dir command");
    library::remove_dir(library, dir)
}

#[tauri::command]
pub fn modify(library: State<'_, Arc<Mutex<Library>>>, song: Song) -> CoreResult<()> {
    debug!("Received modify command");
    library::modify(library, song)
}

#[tauri::command]
pub fn modify_multiple(
    library: State<'_, Arc<Mutex<Library>>>,
    songs: Vec<Song>,
) -> CoreResult<()> {
    debug!("Received modify_multiple command");
    library::modify_multiple(library, songs)
}

#[tauri::command]
pub fn update_song_tags(
    library: State<'_, Arc<Mutex<Library>>>,
    song: Song,
    new_cover_path: Option<PathBuf>,
) -> CoreResult<()> {
    debug!("Received update_song_tags command");
    library::update_song_tags(library, song, new_cover_path)
}

#[tauri::command]
pub fn add_single_song(library: State<'_, Arc<Mutex<Library>>>, file: PathBuf) -> CoreResult<()> {
    debug!("Received add_single_song command");
    library::add_single_song(library, file)
}

#[tauri::command]
pub fn add_single_songs(
    library: State<'_, Arc<Mutex<Library>>>,
    files: Vec<PathBuf>,
) -> CoreResult<()> {
    debug!("Received add_single_songs command");
    library::add_single_songs(library, files)
}

#[tauri::command]
pub fn get_song_by_file(
    library: State<'_, Arc<Mutex<Library>>>,
    file: PathBuf,
) -> CoreResult<Song> {
    debug!("Received get_song_by_file command");
    library::get_song_by_file(library, file)
}

#[tauri::command]
pub fn get_songs_by_files(
    library: State<'_, Arc<Mutex<Library>>>,
    files: Vec<PathBuf>,
) -> CoreResult<Vec<Song>> {
    debug!("Received get_songs_by_files command");
    library::get_songs_by_files(library, files)
}

#[tauri::command]
pub fn create_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
) -> CoreResult<()> {
    debug!("Received create_playlist command");
    library::create_playlist(library, playlist_name)
}

#[tauri::command]
pub fn delete_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
) -> CoreResult<()> {
    debug!("Received delete_playlist command");
    library::delete_playlist(library, playlist_name)
}

#[tauri::command]
pub fn add_song_to_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    song: Song,
) -> CoreResult<()> {
    debug!("Received add_song_to_playlist command");
    library::add_song_to_playlist(library, playlist_name, song)
}

#[tauri::command]
pub fn add_songs_to_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    songs: Vec<Song>,
) -> CoreResult<()> {
    debug!("Received add_songs_to_playlist command");
    library::add_songs_to_playlist(library, playlist_name, songs)
}

#[tauri::command]
pub fn remove_song_from_playlist_all(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    song: Song,
) -> CoreResult<()> {
    debug!("Received remove_song_from_playlist_all command");
    library::remove_song_from_playlist_all(library, playlist_name, song)
}

#[tauri::command]
pub fn remove_songs_from_playlist_by_index(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
    index: Vec<usize>,
) -> CoreResult<()> {
    debug!("Received remove_songs_from_playlist_by_index command");
    library::remove_songs_from_playlist_by_index(library, playlist_name, index)
}

#[tauri::command]
pub fn rename_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    old_name: String,
    new_name: String,
) -> CoreResult<()> {
    debug!("Received rename_playlist command");
    library::rename_playlist(library, old_name, new_name)
}

#[tauri::command]
pub fn clear_playlist(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_name: String,
) -> CoreResult<()> {
    debug!("Received clear_playlist command");
    library::clear_playlist(library, playlist_name)
}

#[tauri::command]
pub fn add_recents(library: State<'_, Arc<Mutex<Library>>>, recent: Recent) -> CoreResult<()> {
    debug!("Received add_recents command");
    library::add_recents(library, recent)
}

#[tauri::command]
pub fn remove_recents_by_song_all(
    library: State<'_, Arc<Mutex<Library>>>,
    song: Song,
) -> CoreResult<()> {
    debug!("Received remove_recents_by_song_all command");
    library::remove_recents_by_song_all(library, song)
}

#[tauri::command]
pub fn remove_recents_by_index(
    library: State<'_, Arc<Mutex<Library>>>,
    index: usize,
) -> CoreResult<()> {
    debug!("Received remove_recents_by_index command");
    library::remove_recents_by_index(library, index)
}

#[tauri::command]
pub fn clear_recents(library: State<'_, Arc<Mutex<Library>>>) -> CoreResult<()> {
    debug!("Received clear_recents command");
    library::clear_recents(library)
}

#[tauri::command]
pub fn clear_songs_multi(
    library: State<'_, Arc<Mutex<Library>>>,
    playlist_names: Vec<String>,
) -> CoreResult<()> {
    debug!("Received clear_songs_multi command");
    library::clear_songs_multi(library, playlist_names)
}

#[tauri::command]
pub fn window_pin(app: tauri::AppHandle, pin: bool) {
    debug!("Received window_pin command");
    window::window_pin(app, pin);
}

#[tauri::command]
pub fn get_cover_art_path(song: Song) -> CoreResult<Option<PathBuf>> {
    debug!("Received get_cover_art_path command");
    pic::get_cover_art_path(song)
}

#[tauri::command]
pub fn get_lyric(
    library: State<'_, Arc<Mutex<Library>>>,
    song: Song,
) -> CoreResult<Option<String>> {
    debug!("Received get_lyric command");
    library::get_lyric(library, song)
}

#[tauri::command]
pub fn player_play_file(
    path: PathBuf,
    playback_service: State<'_, Arc<Mutex<PlaybackService>>>,
) -> CoreResult<()> {
    debug!("Received player_play_file command");
    playback_service.lock().unwrap().play_file(path)
}

#[tauri::command]
pub fn player_play(playback_service: State<'_, Arc<Mutex<PlaybackService>>>) -> CoreResult<()> {
    debug!("Received player_play command");
    playback_service.lock().unwrap().play();
    Ok(())
}

#[tauri::command]
pub fn player_pause(playback_service: State<'_, Arc<Mutex<PlaybackService>>>) -> CoreResult<()> {
    debug!("Received player_pause command");
    playback_service.lock().unwrap().pause();
    Ok(())
}

#[tauri::command]
pub fn player_stop(playback_service: State<'_, Arc<Mutex<PlaybackService>>>) -> CoreResult<()> {
    debug!("Received player_stop command");
    playback_service.lock().unwrap().stop();
    Ok(())
}

#[tauri::command]
pub fn player_seek(
    position_seconds: f32,
    playback_service: State<'_, Arc<Mutex<PlaybackService>>>,
) -> CoreResult<()> {
    debug!("Received player_seek command");
    playback_service.lock().unwrap().seek(position_seconds)
}

#[tauri::command]
pub fn player_set_volume(
    volume: f32,
    playback_service: State<'_, Arc<Mutex<PlaybackService>>>,
) -> CoreResult<()> {
    debug!("Received player_set_volume command");
    playback_service.lock().unwrap().set_volume(volume);
    Ok(())
}

#[tauri::command]
pub fn create_alist(library: State<'_, Arc<Mutex<Library>>>, alist_name: String) -> CoreResult<()> {
    debug!("Received create_alist command");
    library::create_alist(library, alist_name)
}

#[tauri::command]
pub fn delete_alist(library: State<'_, Arc<Mutex<Library>>>, alist_name: String) -> CoreResult<()> {
    debug!("Received delete_alist command");
    library::delete_alist(library, alist_name)
}

#[tauri::command]
pub fn remove_alists(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_names: Vec<String>,
) -> CoreResult<()> {
    debug!("Received remove_alists command");
    library::remove_alists(library, alist_names)
}

#[tauri::command]
pub fn add_element_to_alist(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    element: Aelement,
) -> CoreResult<()> {
    debug!("Received add_element_to_alist command");
    library::add_element_to_alist(library, alist_name, element)
}

#[tauri::command]
pub fn add_elements_to_alist(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    elements: Vec<Aelement>,
) -> CoreResult<()> {
    debug!("Received add_elements_to_alist command");
    library::add_elements_to_alist(library, alist_name, elements)
}

#[tauri::command]
pub fn remove_element_from_alist_by_index(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    index: usize,
) -> CoreResult<()> {
    debug!("Received remove_element_from_alist_by_index command");
    library::remove_element_from_alist_by_index(library, alist_name, index)
}

#[tauri::command]
pub fn remove_elements_from_alist_by_indices(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    indices: Vec<usize>,
) -> CoreResult<()> {
    debug!("Received remove_elements_from_alist_by_indices command");
    library::remove_elements_from_alist_by_indices(library, alist_name, indices)
}

#[tauri::command]
pub fn remove_element_from_alist_all(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    element: Aelement,
) -> CoreResult<()> {
    debug!("Received remove_element_from_alist_all command");
    library::remove_element_from_alist_all(library, alist_name, element)
}

#[tauri::command]
pub fn remove_elements_from_alist_all(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
    elements: Vec<Aelement>,
) -> CoreResult<()> {
    debug!("Received remove_elements_from_alist_all command");
    library::remove_elements_from_alist_all(library, alist_name, elements)
}

#[tauri::command]
pub fn clear_alist_elements(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
) -> CoreResult<()> {
    debug!("Received clear_alist_elements command");
    library::clear_alist_elements(library, alist_name)
}

#[tauri::command]
pub fn rename_alist(
    library: State<'_, Arc<Mutex<Library>>>,
    old_name: String,
    new_name: String,
) -> CoreResult<()> {
    debug!("Received rename_alist command");
    library::rename_alist(library, old_name, new_name)
}

#[tauri::command]
pub fn list_all_alist_elements(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
) -> CoreResult<Vec<Aelement>> {
    debug!("Received list_all_alist_elements command");
    library::list_all_alist_elements(library, alist_name)
}

#[tauri::command]
pub fn list_all_alist_songs(
    library: State<'_, Arc<Mutex<Library>>>,
    alist_name: String,
) -> CoreResult<Vec<PathBuf>> {
    debug!("Received list_all_alist_songs command");
    library::list_all_alist_songs(library, alist_name)
}

#[tauri::command]
pub fn freeze_alist(library: State<'_, Arc<Mutex<Library>>>, alist_name: String) -> CoreResult<()> {
    debug!("Received freeze_alist command");
    library::freeze_alist(library, alist_name)
}
