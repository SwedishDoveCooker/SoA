import React, { useEffect, useState, useRef, useCallback } from "react";
import { listen, Event as TauriEvent } from "@tauri-apps/api/event";
import {
  getCurrentWindow,
  DragDropEvent,
  PhysicalPosition,
} from "@tauri-apps/api/window";
import { api } from "@/lib/api";
import { useLibraryStore } from "@/stores/libraryStore";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useAlistStore } from "@/stores/alistStore";
import { useSettingsStore } from "@/stores/settingStore";
import type { Song, Artist, Release, Playlist, Recent } from "@/types";
import { info, error as logError } from "@tauri-apps/plugin-log";
import { useDndStore } from "@/stores/dndStore";
import { toast } from "sonner";

type DropTarget =
  | { type: "playlist"; name: string }
  | { type: "library" }
  | null;

export function LibraryLoader({ children }: { children: React.ReactNode }) {
  const {
    setSongs,
    setArtists,
    setReleases,
    setLoading: setLibraryLoading,
  } = useLibraryStore();
  const { setPlaylists, setRecents } = usePlaylistStore();
  const { setAlists, setLoading: setAlistLoading } = useAlistStore();
  const { setWatchedDirs, setLoading: setSettingsLoading } = useSettingsStore();

  const [hasLoaded, setHasLoaded] = useState(false);
  const { clearDropTarget, setIsDragging, setDropTarget } = useDndStore();

  const isProcessingDropRef = useRef(false);
  const lastOverTimeRef = useRef(0);

  const loadAllData = useCallback(async () => {
    console.log("LibraryLoader: Loading all library data...");
    setLibraryLoading(true);
    setSettingsLoading(true);
    setAlistLoading(true);

    try {
      const [songs, artists, releases, playlists, recents, dirs, alists] =
        await Promise.all([
          api.getAllSongs(),
          api.getAllArtists(),
          api.getAllReleases(),
          api.getAllPlaylists(),
          api.getAllRecents(),
          api.getGlobDirs(),
          api.getAllAlists(),
        ]);

      setSongs(songs as Song[]);
      setArtists(artists as Artist[]);
      setReleases(releases as Release[]);
      setPlaylists(playlists as Playlist[]);
      setRecents(recents as Recent[]);
      setWatchedDirs(dirs as string[]);
      setAlists(alists);

      info(
        `LibraryLoader: Loaded (${songs.length} songs, ${artists.length} artists, ${releases.length} releases, ${dirs.length} directories)`
      );
    } catch (err) {
      console.error("LibraryLoader: Failed to load data", err);
      logError(`LibraryLoader: Failed to load data - ${err}`);
    } finally {
      setLibraryLoading(false);
      setSettingsLoading(false);
      setAlistLoading(false);
    }
  }, [
    setSongs,
    setArtists,
    setReleases,
    setPlaylists,
    setRecents,
    setWatchedDirs,
    setAlists,
    setLibraryLoading,
    setSettingsLoading,
    setAlistLoading,
  ]);

  useEffect(() => {
    if (!hasLoaded) {
      loadAllData();
      setHasLoaded(true);
    }
  }, [hasLoaded, loadAllData]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    async function setupListener() {
      unlisten = await listen<void>("lib_updated", (event) => {
        console.log(
          'LibraryLoader: Received "lib_updated" event, refreshing all data...',
          event
        );
        info('LibraryLoader: Received "lib_updated" event');
        loadAllData();
      });
    }

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [loadAllData]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let scaleFactorCache = 1.0;

    function getTargetFromPosition(
      position: PhysicalPosition,
      scaleFactor: number
    ): DropTarget {
      const logicalX = position.x / scaleFactor;
      const logicalY = position.y / scaleFactor;

      const element = document.elementFromPoint(logicalX, logicalY);

      if (!element) return null;

      const targetElement = element.closest(
        "[data-droptarget-type]"
      ) as HTMLElement | null;

      if (!targetElement) return null;

      const type = targetElement.dataset.droptargetType;
      const name = targetElement.dataset.droptargetName;

      if (type === "playlist" && name) {
        return { type: "playlist", name: name };
      } else if (type === "library") {
        return { type: "library" };
      }
      return null;
    }

    async function handleFileDrop(paths: string[], dropTarget: DropTarget) {
      console.log("handleFileDrop: Received", paths);
      info(`handleFileDrop: Received ${paths.length} files`);

      if (!paths || paths.length === 0) {
        setIsDragging(false);
        clearDropTarget();
        return;
      }

      console.log("Current drop target:", dropTarget);

      try {
        if (dropTarget?.type === "playlist") {
          const playlistName = dropTarget.name;
          console.log(`Adding to playlist: ${playlistName}`);
          info(`Adding ${paths.length} files to playlist "${playlistName}"`);

          toast.promise(
            async () => {
              console.log("Step 1: Adding files to library...");
              const results = await Promise.allSettled(
                paths.map((p) => {
                  console.log(`  Add: ${p}`);
                  return api.addSingleSong(p);
                })
              );

              const successfulPaths = paths.filter((_, index) => {
                const result = results[index];
                if (result.status === "fulfilled") return true;
                if (
                  result.status === "rejected" &&
                  String(result.reason).includes("already exists")
                ) {
                  console.log(
                    `File ${paths[index]} already exists, adding to playlist`
                  );
                  return true;
                }
                logError(
                  `Adding ${paths[index]} failed:`,
                  (result as PromiseRejectedResult).reason
                );
                return false;
              });

              if (successfulPaths.length === 0) {
                throw new Error("No valid songs to add to playlist.");
              }

              console.log("Step 2: Fetching song info for playlist...");
              const songs = await api.getSongsByFiles(successfulPaths);
              console.log(`Fetched ${songs.length} songs`);

              console.log("Step 3: Adding to playlist...");
              await api.addSongsToPlaylist(playlistName, songs);
              console.log("Complete!");
            },
            {
              loading: `Adding to "${playlistName}"...`,
              success: () =>
                `Successfully added ${paths.length} songs to "${playlistName}"!`,
              error: (err) => {
                console.error("Failed to add to playlist:", err);
                logError(
                  `Failed to add to playlist: ${err.message || String(err)}`
                );
                return `Failed to add : ${err.message || String(err)}`;
              },
            }
          );
        } else {
          console.log(
            `Adding to library... (target: ${dropTarget?.type || "null"})`
          );
          info(`Adding ${paths.length} files to library`);

          toast.promise(
            async () => {
              const results = await Promise.allSettled(
                paths.map((p) => {
                  console.log(`  Add to library: ${p}`);
                  return api.addSingleSong(p);
                })
              );

              const errors = results.filter(
                (r) =>
                  r.status === "rejected" &&
                  !String(r.reason).includes("already exists")
              );

              if (errors.length > 0) {
                throw new Error(
                  String((errors[0] as PromiseRejectedResult).reason)
                );
              }
            },
            {
              loading: "Adding to library...",
              success: `Successfully added ${paths.length} songs to library!`,
              error: (err) => {
                console.error("Failed to add to library:", err);
                logError(
                  `Failed to add to library: ${err.message || String(err)}`
                );
                return `Failed to add: ${err.message || String(err)}`;
              },
            }
          );
        }
      } catch (error) {
        console.error("❌ File drop error:", error);
        logError(`File drop error: ${error}`);
      } finally {
        console.log("Cleaning up drag state...");
        setIsDragging(false);
        clearDropTarget();
      }
    }

    async function setupDragListeners() {
      console.log("LibraryLoader: Setting up Tauri API drag listeners...");

      try {
        const appWindow = getCurrentWindow();
        scaleFactorCache = await appWindow.scaleFactor();

        unlisten = await appWindow.onDragDropEvent(
          async (event: TauriEvent<DragDropEvent>) => {
            switch (event.payload.type) {
              case "enter":
                console.log("  -> enter the window");
                setIsDragging(true);
                break;

              case "over": {
                const now = Date.now();
                if (now - lastOverTimeRef.current < 100) {
                  break;
                }
                lastOverTimeRef.current = now;

                if (!isProcessingDropRef.current) {
                  setIsDragging(true);
                }

                const newTarget = getTargetFromPosition(
                  event.payload.position,
                  scaleFactorCache
                );

                if (
                  JSON.stringify(newTarget) !==
                  JSON.stringify(useDndStore.getState().dropTarget)
                ) {
                  console.log("  -> Hovering, new target:", newTarget);
                  setDropTarget(newTarget);
                }
                break;
              }

              case "drop":
                console.log("  -> drop files, paths:", event.payload.paths);

                if (isProcessingDropRef.current) {
                  console.log(
                    "  -> Drop is already being processed, ignoring."
                  );
                  return;
                }

                try {
                  isProcessingDropRef.current = true;
                  const finalDropTarget = getTargetFromPosition(
                    event.payload.position,
                    scaleFactorCache
                  );
                  console.log("  -> Final drop target:", finalDropTarget);

                  await handleFileDrop(
                    event.payload.paths || [],
                    finalDropTarget
                  );
                } catch (e) {
                  console.error(
                    "handleFileDrop raised an uncaught exception:",
                    e
                  );
                  logError(`handleFileDrop raised an uncaught exception: ${e}`);
                } finally {
                  isProcessingDropRef.current = false;
                }
                break;

              case "leave":
                console.log("  -> leave the window");
                setIsDragging(false);
                clearDropTarget();
                break;
            }
          }
        );

        console.log("LibraryLoader: Drag listeners set up ✅");
        info("LibraryLoader: Drag listeners set up");
      } catch (err) {
        console.error("❌ Drag listeners setup failed:", err);
        logError(`Drag listeners setup failed: ${err}`);
      }
    }

    setupDragListeners().catch((err) => {
      console.error("❌ setupDragListeners exception:", err);
      logError(`setupDragListeners exception: ${err}`);
    });

    return () => {
      if (unlisten) {
        unlisten();
        console.log("✅ LibraryLoader: Drag listeners torn down");
      }
    };
  }, [clearDropTarget, setIsDragging, setDropTarget]);

  return <>{children}</>;
}
