import { create } from "zustand";
import { load } from "@tauri-apps/plugin-store";
import type { Store as TauriStore } from "@tauri-apps/plugin-store";

export type Theme = "dark" | "light" | "system";
export type StartPage =
  | "songs"
  | "releases"
  | "artists"
  | "playlists"
  | "alists"
  | "recents";

export interface FrontendConfig {
  theme: Theme;
  pinToTop: boolean;
  playKey: string;
  nextKey: string;
  prevKey: string;
  startPage: StartPage;
}

const DEFAULT_CONFIG: FrontendConfig = {
  theme: "system",
  pinToTop: false,
  playKey: "p",
  nextKey: ">",
  prevKey: "<",
  startPage: "songs",
};

interface FrontendConfigStore {
  config: FrontendConfig;
  isLoading: boolean;
  store: TauriStore | null;
  setConfig: (config: FrontendConfig) => void;
  setLoading: (loading: boolean) => void;
  setStore: (store: TauriStore) => void;
  updateConfig: <K extends keyof FrontendConfig>(
    key: K,
    value: FrontendConfig[K]
  ) => Promise<void>;
  updateMultipleConfig: (updates: Partial<FrontendConfig>) => Promise<void>;
  resetConfig: () => Promise<void>;
  initStore: () => Promise<void>;
}

export const useFrontendConfigStore = create<FrontendConfigStore>(
  (set, get) => ({
    config: DEFAULT_CONFIG,
    isLoading: true,
    store: null,
    setConfig: (config) => set({ config }),
    setLoading: (loading) => set({ isLoading: loading }),
    setStore: (store) => set({ store }),

    initStore: async () => {
      try {
        const storeInstance = await load("frontend-config.json", {
          autoSave: false,
          defaults: {} as Record<string, unknown>,
        });
        set({ store: storeInstance });

        const theme =
          (await storeInstance.get<Theme>("theme")) ?? DEFAULT_CONFIG.theme;
        const pinToTop =
          (await storeInstance.get<boolean>("pinToTop")) ??
          DEFAULT_CONFIG.pinToTop;
        const playKey =
          (await storeInstance.get<string>("playKey")) ??
          DEFAULT_CONFIG.playKey;
        const nextKey =
          (await storeInstance.get<string>("nextKey")) ??
          DEFAULT_CONFIG.nextKey;
        const prevKey =
          (await storeInstance.get<string>("prevKey")) ??
          DEFAULT_CONFIG.prevKey;
        const startPage =
          (await storeInstance.get<StartPage>("startPage")) ??
          DEFAULT_CONFIG.startPage;

        set({
          config: { theme, pinToTop, playKey, nextKey, prevKey, startPage },
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to initialize frontend config store:", error);
        set({ isLoading: false });
      }
    },

    updateConfig: async (key, value) => {
      const { store, config } = get();
      if (!store) return;

      try {
        await store.set(key, value);
        await store.save();
        set({ config: { ...config, [key]: value } });
      } catch (error) {
        console.error(`Failed to update ${String(key)}:`, error);
        throw error;
      }
    },

    updateMultipleConfig: async (updates) => {
      const { store, config } = get();
      if (!store) return;

      try {
        for (const [key, value] of Object.entries(updates)) {
          await store.set(key, value);
        }
        await store.save();
        set({ config: { ...config, ...updates } });
      } catch (error) {
        console.error("Failed to update config:", error);
        throw error;
      }
    },

    resetConfig: async () => {
      const { store } = get();
      if (!store) return;

      try {
        for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
          await store.set(key, value);
        }
        await store.save();
        set({ config: DEFAULT_CONFIG });
      } catch (error) {
        console.error("Failed to reset config:", error);
        throw error;
      }
    },
  })
);

useFrontendConfigStore.getState().initStore();

export function useFrontendConfig() {
  return useFrontendConfigStore();
}

export function useStartPage() {
  return useFrontendConfigStore((state) => state.config.startPage);
}

export function usePinToTop() {
  return useFrontendConfigStore((state) => state.config.pinToTop);
}

export function usePlayKeys() {
  return useFrontendConfigStore((state) => ({
    playKey: state.config.playKey,
    nextKey: state.config.nextKey,
    prevKey: state.config.prevKey,
  }));
}

export function useIsConfigLoading() {
  return useFrontendConfigStore((state) => state.isLoading);
}
