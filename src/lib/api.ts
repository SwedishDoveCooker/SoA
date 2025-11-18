
import { invoke } from "@tauri-apps/api/core";
import type {
  Song,
  Artist,
  Release,
  Playlist,
  Recent,
  Alist,
  Aelement,
} from "@/types";

export const api = {
  ping: () => invoke<string>("ping"),

  getAllSongs: () => invoke<Song[]>("get_all_songs"),
  getAllReleases: () => invoke<Release[]>("get_all_releases"),
  getAllArtists: () => invoke<Artist[]>("get_all_artists"),
  getAllPlaylists: () => invoke<Playlist[]>("get_all_playlists"),
  getAllAlists: () => invoke<Alist[]>("get_all_alists"),
  getAllRecents: () => invoke<Recent[]>("get_all_recents"),
  getGlobDirs: () => invoke<string[]>("get_glob_dirs"),
  getSongByFile: (file: string) => invoke<Song>("get_song_by_file", { file }),
  getSongsByFiles: (files: string[]) =>
    invoke<Song[]>("get_songs_by_files", { files }),
  get_cover_art_path: (song: Song) =>
    invoke<string | null>("get_cover_art_path", { song }),
  get_lyric: (song: Song) => invoke<string | null>("get_lyric", { song }),

  refreshLibrary: () => invoke<void>("refresh_library"),
  addDir: (dir: string) => invoke<void>("add_dir", { dir }),
  removeDir: (dir: string) => invoke<void>("remove_dir", { dir }),
  addSingleSong: (file: string) => invoke<void>("add_single_song", { file }),

  modify: (song: Song) => invoke<void>("modify", { song }),
  modifyMultiple: (songs: Song[]) => invoke<void>("modify_multiple", { songs }),
  update_song_tags: (song: Song, newCoverPath: string | null) =>
    invoke<void>("update_song_tags", { song, newCoverPath }),

  delete_song_file: (song: string) =>
    invoke<void>("delete_song_file", { song }),
  delete_song_files: (songs: string[]) =>
    invoke<void>("delete_song_files", { songs }),

  createPlaylist: (playlistName: string) =>
    invoke<void>("create_playlist", { playlistName }),

  deletePlaylist: (playlistName: string) =>
    invoke<void>("delete_playlist", { playlistName }),

  addSongToPlaylist: (playlistName: string, song: Song) =>
    invoke<void>("add_song_to_playlist", { playlistName, song }),

  addSongsToPlaylist: (playlistName: string, songs: Song[]) =>
    invoke<void>("add_songs_to_playlist", { playlistName, songs }),

  removeSongFromPlaylistAll: (playlistName: string, song: Song) =>
    invoke<void>("remove_song_from_playlist_all", { playlistName, song }),

  removeSongsFromPlaylistByIndex: (playlistName: string, index: number[]) =>
    invoke<void>("remove_songs_from_playlist_by_index", {
      playlistName,
      index,
    }),

  renamePlaylist: (oldName: string, newName: string) =>
    invoke<void>("rename_playlist", { oldName, newName }),

  clearPlaylist: (playlistName: string) =>
    invoke<void>("clear_playlist", { playlistName }),

  createAlist: (alistName: string) =>
    invoke<void>("create_alist", { alistName }),
  deleteAlist: (alistName: string) =>
    invoke<void>("delete_alist", { alistName }),
  renameAlist: (oldName: string, newName: string) =>
    invoke<void>("rename_alist", { oldName, newName }),
  clearAlistElements: (alistName: string) =>
    invoke<void>("clear_alist_elements", { alistName }),
  freezeAlist: (alistName: string) =>
    invoke<void>("freeze_alist", { alistName }),
  addElementToAlist: (alistName: string, element: Aelement) =>
    invoke<void>("add_element_to_alist", { alistName, element }),
  addElementsToAlist: (alistName: string, elements: Aelement[]) =>
    invoke<void>("add_elements_to_alist", { alistName, elements }),
  removeElementFromAlistByIndex: (alistName: string, index: number) =>
    invoke<void>("remove_element_from_alist_by_index", { alistName, index }),
  removeElementsFromAlistByIndices: (alistName: string, indices: number[]) =>
    invoke<void>("remove_elements_from_alist_by_indices", {
      alistName,
      indices,
    }),
  listAllAlistSongs: (alistName: string) =>
    invoke<string[]>("list_all_alist_songs", { alistName }),
  listAllAlistElements: (alistName: string) =>
    invoke<Aelement[]>("list_all_alist_elements", { alistName }),

  addRecents: (recent: Recent) => invoke<void>("add_recents", { recent }),

  removeRecentsBySongAll: (song: Song) =>
    invoke<void>("remove_recents_by_song_all", { song }),

  removeRecentsByIndex: (index: number) =>
    invoke<void>("remove_recents_by_index", { index }),

  clearRecents: () => invoke<void>("clear_recents"),

  player_play_file: (path: string) =>
    invoke<void>("player_play_file", { path }),
  player_play: () => invoke<void>("player_play"),
  player_pause: () => invoke<void>("player_pause"),
  player_stop: () => invoke<void>("player_stop"),
  player_seek: (positionSeconds: number) =>
    invoke<void>("player_seek", { positionSeconds }),
  player_set_volume: (volume: number) =>
    invoke<void>("player_set_volume", { volume }),
};
