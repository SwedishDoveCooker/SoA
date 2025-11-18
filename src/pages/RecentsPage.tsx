
import React from "react";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { recentsColumnsFixed } from "./RecentsPage.columns";
import { DataTable } from "./SongsPage.datatable";
import { Skeleton } from "@/components/ui/skeleton";
import { Recent, Song } from "@/types";
import { useTranslation } from "react-i18next";

export interface RecentWithSong extends Recent {
  songData: Song | null;
}

function SongsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <div className="rounded-md border">
        <div className="space-y-2 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export function RecentsPage() {
  const { t } = useTranslation();
  const recents = usePlaylistStore((state) => state.recents);
  const songs = useLibraryStore((state) => state.songs);
  const isLoading = useLibraryStore((state) => state.isLoading);

  const recentsWithSongData: RecentWithSong[] = React.useMemo(() => {
    return recents.map((recent) => {
      const songData = songs.find((song) => song.path === recent.song) || null;
      return {
        ...recent,
        songData,
      };
    });
  }, [recents, songs]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        {t("Recents")} ({isLoading ? "..." : recents.length})
      </h1>
      {isLoading ? (
        <SongsLoadingSkeleton />
      ) : (
        <DataTable
          columns={recentsColumnsFixed}
          data={recentsWithSongData}
          filterColumn="songData.title"
        />
      )}
    </div>
  );
}
