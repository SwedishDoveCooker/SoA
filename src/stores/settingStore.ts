
import { create } from "zustand";

interface SettingsState {
  watchedDirs: string[];
  isLoading: boolean;
  setWatchedDirs: (dirs: string[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  watchedDirs: [],
  isLoading: true,
  setWatchedDirs: (dirs) => set({ watchedDirs: dirs }),
  setLoading: (isLoading) => set({ isLoading }),
}));
