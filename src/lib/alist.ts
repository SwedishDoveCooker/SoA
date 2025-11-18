import type {
  Aelement,
  AelementKind,
  Alist,
  Artist,
  Playlist,
  Release,
  Song,
} from "@/types";

interface AlistExpansionContext {
  songs: Song[];
  playlists: Playlist[];
  releases: Release[];
  artists: Artist[];
}

const releaseKey = (release: Release) =>
  `${release.title}@@${release.artist ?? ""}`;

export function getElementKind(element: Aelement): AelementKind {
  if ("Song" in element) return "song";
  if ("Playlist" in element) return "playlist";
  if ("Release" in element) return "release";
  return "artist";
}

export function summarizeElements(alist: Alist) {
  return alist.elements.reduce(
    (acc, element) => {
      const kind = getElementKind(element);
      acc[kind] += 1;
      return acc;
    },
    { song: 0, playlist: 0, release: 0, artist: 0 } as Record<
      AelementKind,
      number
    >
  );
}

export function expandAlistSongs(
  alist: Alist,
  context: AlistExpansionContext
): Song[] {
  const songMap = new Map(context.songs.map((song) => [song.path, song]));
  const playlistMap = new Map(context.playlists.map((pl) => [pl.name, pl]));
  const releaseMap = new Map(
    context.releases.map((rel) => [releaseKey(rel), rel])
  );
  const artistMap = new Map(
    context.artists.map((artist) => [artist.name, artist])
  );
  const seen = new Set<string>();
  const result: Song[] = [];

  const pushSong = (path: string) => {
    const song = songMap.get(path);
    if (song && !seen.has(song.path)) {
      seen.add(song.path);
      result.push(song);
    }
  };

  alist.elements.forEach((element) => {
    if ("Song" in element) {
      pushSong(element.Song.path);
      return;
    }

    if ("Playlist" in element) {
      const playlist =
        playlistMap.get(element.Playlist.name) ?? element.Playlist;
      playlist.songs.forEach(pushSong);
      return;
    }

    if ("Release" in element) {
      const release =
        releaseMap.get(releaseKey(element.Release)) ?? element.Release;
      release.songs.forEach(pushSong);
      return;
    }

    if ("Artist" in element) {
      const artist = artistMap.get(element.Artist.name) ?? element.Artist;
      artist.songs.forEach(pushSong);
    }
  });

  return result;
}

export function getAlistCoverCandidates(
  alist: Alist,
  context: AlistExpansionContext
): string[] {
  return expandAlistSongs(alist, context).map((song) => song.path);
}

export function getElementLabel(element: Aelement): string {
  if ("Song" in element) {
    const song = element.Song;
    if (song.title) return song.title;
    const parts = song.path.split("/");
    return parts[parts.length - 1] || song.path;
  }
  if ("Playlist" in element) {
    return element.Playlist.name;
  }
  if ("Release" in element) {
    return element.Release.title;
  }
  return element.Artist.name;
}

export function getElementKey(element: Aelement): string {
  if ("Song" in element) {
    return `song:${element.Song.path}`;
  }
  if ("Playlist" in element) {
    return `playlist:${element.Playlist.name}`;
  }
  if ("Release" in element) {
    return `release:${releaseKey(element.Release)}`;
  }
  return `artist:${element.Artist.name}`;
}
