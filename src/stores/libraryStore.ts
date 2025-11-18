
import { create } from "zustand";
import type { Song, Artist, Release } from "@/types";

interface LibraryState {
  songs: Song[];
  artists: Artist[];
  releases: Release[];
  isLoading: boolean;
  setSongs: (songs: Song[]) => void;
  setArtists: (artists: Artist[]) => void;
  setReleases: (releases: Release[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  songs: [],
  artists: [],
  releases: [],
  isLoading: true,
  setSongs: (songs) => set({ songs }),
  setArtists: (artists) => set({ artists }),
  setReleases: (releases) => set({ releases }),
  setLoading: (isLoading) => set({ isLoading }),
}));
