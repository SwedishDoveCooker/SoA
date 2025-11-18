
export enum Score {
  SuperBigCupUp = "SuperBigCupUp",
  SuperBigCup = "SuperBigCup",
  SuperBigCupDown = "SuperBigCupDown",
  BigCupUp = "BigCupUp",
  BigCup = "BigCup",
  BigCupDown = "BigCupDown",
  MedCupUp = "MedCupUp",
  MedCup = "MedCup",
  MedCupDown = "MedCupDown",
  HardToSay = "HardToSay",
  SuperSmallCup = "SuperSmallCup",
}

export interface Song {
  path: string;
  title: string | null;
  artist: string | null;
  release: string | null;
  duration: number | null;
  score: Score | null;
  created_at: string;
  updated_at: string;
}

export interface Release {
  title: string;
  artist: string | null;
  songs: string[];
}

export interface Artist {
  name: string;
  songs: string[];
}

export interface Playlist {
  name: string;
  songs: string[];
  created_at: string;
}

export type Aelement =
  | { Song: Song }
  | { Playlist: Playlist }
  | { Release: Release }
  | { Artist: Artist };

export type AelementKind = "song" | "playlist" | "release" | "artist";

export interface Alist {
  name: string;
  created_at: string;
  elements: Aelement[];
}

export interface Recent {
  song: string;
  accessed_at: string | null;
}

export interface RecentWithSong extends Recent {
  songData?: Song;
}






export enum RepeatMode {
  
  SEQUENTIAL = "SEQUENTIAL",
  
  LOOP = "LOOP",
  
  CURRENT_ITEM_IN_LOOP = "CURRENT_ITEM_IN_LOOP",
}



export interface PlaybackStatePayload {
  state: "playing" | "paused" | "stopped";
}


export interface PlaybackTrackLoadedPayload {
  duration: number;
  path: string;
}


export interface PlaybackProgressPayload {
  currentTime: number;
}


export interface PlaybackEndedPayload {
  path: string;
}
