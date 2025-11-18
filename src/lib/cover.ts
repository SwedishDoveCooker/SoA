
import { debug } from "@tauri-apps/plugin-log";
import { Song } from "@/types";
import { api } from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";


export async function getCoverArt(
  song: Song | undefined
): Promise<string | null> {
  if (!song) {
    return null;
  }
  try {
    const path = await api.get_cover_art_path(song);

    if (path) {
      return convertFileSrc(path);
    }
    return null;
  } catch (e) {
    return null;
  }
}


export async function getArtistCover(
  artistName: string,
  songPaths: string[],
  songs: Song[]
): Promise<string | null> {
  for (const songPath of songPaths) {
    const song = songs.find((s) => s.path === songPath);
    if (song) {
      const cover = await getCoverArt(song);
      if (cover) {
        debug(
          `Found cover art for artist ${artistName} from song ${
            song.title || "unknown"
          }`
        );
        return cover;
      }
    }
  }
  return null;
}


export async function getReleaseCover(
  artist: string | null,
  songPaths: string[],
  allSongs: Song[]
): Promise<string | null> {
  for (const songPath of songPaths) {
    const song = allSongs.find((s) => s.path === songPath);
    if (song) {
      const cover = await getCoverArt(song);
      if (cover) {
        debug(
          `Found cover art for release ${artist}-${
            song.release || "unknown"
          } from song ${song.title || "unknown"}`
        );
        return cover;
      }
    }
  }
  return null;
}


export async function getPlaylistCover(
  songPaths: string[],
  songs: Song[]
): Promise<string | null> {
  if (songPaths.length === 0) {
    return null;
  }

  for (const songPath of songPaths) {
    const song = songs.find((s) => s.path === songPath);
    if (song) {
      const cover = await getCoverArt(song);
      if (cover) {
        debug(
          `Found cover art for playlist from song ${song.title || "unknown"}`
        );
        return cover;
      }
    }
  }
  return null;
}
