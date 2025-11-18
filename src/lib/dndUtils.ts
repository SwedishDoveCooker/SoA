import { Song } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useDndStore } from "@/stores/dndStore";
import { info, error as logError } from "@tauri-apps/plugin-log";

export function createDummySongsFromPaths(paths: string[]): Song[] {
  const now = new Date().toISOString();
  return paths.map(
    (path) =>
      ({
        path,
        title: null,
        artist: null,
        release: null,
        duration: null,
        score: null,
        created_at: now,
        updated_at: now,
      } as Song)
  );
}

export async function handleFileDrop(files: FileList) {
  const { dropTarget, clearDropTarget, setIsDragging } = useDndStore.getState();

  type TauriFile = File & { path?: string };

  const paths: string[] = Array.from(files)
    .map((f) => (f as TauriFile).path as string)
    .filter((p) => typeof p === "string" && p.length > 0);

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
      console.log(`Adding song to playlist: ${playlistName}`);
      info(`Adding ${paths.length} files to playlist "${playlistName}"`);

      toast.promise(
        async () => {
          console.log("Step 1: Adding files to library...");
          const results = await Promise.allSettled(
            paths.map((p) => {
              console.log(`  Adding: ${p}`);
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
                `File ${paths[index]} already exists, adding it to playlist`
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
            throw new Error("All files failed to be added to the library.");
          }

          console.log("Step 2: Getting song information...");
          const songs = await api.getSongsByFiles(successfulPaths);
          console.log(`Retrieved ${songs.length} songs`);

          console.log("Step 3: Adding to playlist...");
          await api.addSongsToPlaylist(playlistName, songs);
          console.log("Complete!");
        },
        {
          loading: `Adding to "${playlistName}"...`,
          success: () =>
            `Successfully added ${paths.length} songs to "${playlistName}"!`,
          error: (err) => {
            console.error("Adding to playlist failed:", err);
            logError(
              `Adding to playlist failed: ${err.message || String(err)}`
            );
            return `Failed to add: ${err.message || String(err)}`;
          },
        }
      );
    } else {
      console.log(`Adding to library...`);
      info(`Adding ${paths.length} files to library`);

      toast.promise(
        async () => {
          const results = await Promise.allSettled(
            paths.map((p) => {
              console.log(`  Adding to library: ${p}`);
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
            console.error("Adding to library failed:", err);
            logError(`Adding to library failed: ${err.message || String(err)}`);
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
