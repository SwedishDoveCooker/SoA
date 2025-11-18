
import { create } from "zustand";
import type { Playlist, Recent } from "@/types";

interface PlaylistState {
  playlists: Playlist[];
  recents: Recent[];
  setPlaylists: (playlists: Playlist[]) => void;
  setRecents: (recents: Recent[]) => void;
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
  playlists: [],
  recents: [],
  setPlaylists: (playlists) => set({ playlists }),
  setRecents: (recents) => set({ recents }),
}));
