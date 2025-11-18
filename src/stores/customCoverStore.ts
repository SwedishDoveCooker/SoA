import { create } from "zustand";
import { load, type Store as TauriStore } from "@tauri-apps/plugin-store";
import { appDataDir, join } from "@tauri-apps/api/path";
import { copyFile, mkdir, remove, stat } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";

export type CoverKind = "playlist" | "alist";

type CoverMap = Record<string, string>;

interface CustomCoverState {
  ready: boolean;
  initializing: boolean;
  playlist: CoverMap;
  alist: CoverMap;
  init: () => Promise<void>;
  setCover: (
    kind: CoverKind,
    name: string,
    sourcePath: string
  ) => Promise<void>;
  removeCover: (kind: CoverKind, name: string) => Promise<void>;
  renameCover: (
    kind: CoverKind,
    oldName: string,
    newName: string
  ) => Promise<void>;
}

const COVER_DIR = "custom-covers";
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "bmp"] as const;

let storePromise: Promise<TauriStore> | null = null;

const getStore = async () => {
  if (!storePromise) {
    storePromise = load("custom-covers.json", {
      autoSave: false,
      defaults: {},
    });
  }
  return storePromise;
};

const getExtension = (filePath: string) => {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filePath);
  const ext = match?.[1]?.toLowerCase();
  if (!ext) return "png";
  if (IMAGE_EXTENSIONS.includes(ext as (typeof IMAGE_EXTENSIONS)[number])) {
    return ext;
  }
  return "png";
};

const ensureCoverDir = async () => {
  const dataDir = await appDataDir();
  const dir = await join(dataDir, COVER_DIR);
  await mkdir(dir, { recursive: true });
  return dir;
};

const hashInput = async (input: string) => {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const buildCoverPath = async (kind: CoverKind, name: string, ext: string) => {
  const dir = await ensureCoverDir();
  const prefix = kind === "playlist" ? "playlist-" : "alist-";
  const hashed = await hashInput(`${prefix}${name}`);
  const filename = `${hashed}.${ext}`;
  return join(dir, filename);
};

const ensureVacant = async (path: string) => {
  try {
    await stat(path);
    await remove(path);
  } catch {
    void 0;
  }
};

const safeRemove = async (path: string | undefined) => {
  if (!path) return;
  try {
    const dir = await ensureCoverDir();
    if (!path.startsWith(dir)) return;
    await remove(path);
  } catch {
    void 0;
  }
};

type MapKey = "playlist" | "alist";

const getMapKey = (kind: CoverKind): MapKey =>
  kind === "playlist" ? "playlist" : "alist";

const ensureReady = async (state: CustomCoverState) => {
  if (state.ready) return;
  await state.init();
};

export const useCustomCoverStore = create<CustomCoverState>((set, get) => ({
  ready: false,
  initializing: false,
  playlist: {},
  alist: {},
  init: async () => {
    const { ready, initializing } = get();
    if (ready || initializing) return;
    set({ initializing: true });
    try {
      const store = await getStore();
      const playlist = (await store.get<CoverMap>("playlist")) ?? {};
      const alist = (await store.get<CoverMap>("alist")) ?? {};
      set({ playlist, alist, ready: true, initializing: false });
    } catch (error) {
      console.error("Failed to initialize custom cover store", error);
      set({ ready: true, initializing: false });
    }
  },
  setCover: async (kind, name, sourcePath) => {
    await ensureReady(get());
    const ext = getExtension(sourcePath);
    const dest = await buildCoverPath(kind, name, ext);
    await ensureVacant(dest);
    await copyFile(sourcePath, dest);

    const mapKey = getMapKey(kind);
    const currentMap = { ...get()[mapKey] };
    await safeRemove(currentMap[name]);
    currentMap[name] = dest;
    set({ [mapKey]: currentMap } as Partial<CustomCoverState>);

    const store = await getStore();
    await store.set(mapKey, currentMap);
    await store.save();
  },
  removeCover: async (kind, name) => {
    await ensureReady(get());
    const mapKey = getMapKey(kind);
    const currentMap = { ...get()[mapKey] };
    if (!currentMap[name]) return;
    await safeRemove(currentMap[name]);
    delete currentMap[name];
    set({ [mapKey]: currentMap } as Partial<CustomCoverState>);

    const store = await getStore();
    await store.set(mapKey, currentMap);
    await store.save();
  },
  renameCover: async (kind, oldName, newName) => {
    if (oldName === newName) return;
    await ensureReady(get());
    const mapKey = getMapKey(kind);
    const currentMap = { ...get()[mapKey] };
    const existingPath = currentMap[oldName];
    if (!existingPath) return;

    const ext = getExtension(existingPath);
    const dest = await buildCoverPath(kind, newName, ext);
    await ensureVacant(dest);
    await copyFile(existingPath, dest);
    await safeRemove(existingPath);

    delete currentMap[oldName];
    currentMap[newName] = dest;
    set({ [mapKey]: currentMap } as Partial<CustomCoverState>);

    const store = await getStore();
    await store.set(mapKey, currentMap);
    await store.save();
  },
}));

useCustomCoverStore.getState().init();

export const COVER_FILE_FILTERS = [
  {
    name: "Images",
    extensions: [...IMAGE_EXTENSIONS],
  },
];

export const useCustomCoverUrl = (kind: CoverKind, name?: string | null) =>
  useCustomCoverStore((state) => {
    const map = kind === "playlist" ? state.playlist : state.alist;
    const raw = name ? map[name] : undefined;
    return raw ? convertFileSrc(raw) : null;
  });

export const assignCustomCover = async (
  kind: CoverKind,
  name: string,
  sourcePath: string
) => {
  await useCustomCoverStore.getState().setCover(kind, name, sourcePath);
};

export const resetCustomCover = async (kind: CoverKind, name: string) => {
  await useCustomCoverStore.getState().removeCover(kind, name);
};

export const renameCustomCover = async (
  kind: CoverKind,
  oldName: string,
  newName: string
) => {
  await useCustomCoverStore.getState().renameCover(kind, oldName, newName);
};
