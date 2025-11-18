
import { useLibraryStore } from "@/stores/libraryStore";
import {
  ReleaseCard,
  ReleaseCardSkeleton,
} from "@/components/shared/ReleaseCard";
import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { SongViewDialog } from "@/components/shared/SongViewDialog";
import { Song } from "@/types";
import { useTranslation } from "react-i18next";

export function ReleasesPage() {
  const { t } = useTranslation();
  const releases = useLibraryStore((state) => state.releases);
  const songs = useLibraryStore((state) => state.songs);
  const isLoading = useLibraryStore((state) => state.isLoading);

  const [viewingSong, setViewingSong] = useState<Song | null>(null);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        {t("Release")} ({isLoading ? "..." : releases.length})
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
        {isLoading
          ? Array.from({ length: 14 }).map((_, i) => (
              <ReleaseCardSkeleton key={i} />
            ))
          : releases.map((release, index) => (
              <ContextMenu
                key={`${release.title || "Unknown Release"}-${
                  release.artist || "Unknown Artist"
                }-${index}`}
              >
                <ContextMenuTrigger asChild>
                  <ReleaseCard release={release} songs={songs} />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => {
                      const firstSong = songs.find((s) =>
                        release.songs.includes(s.path)
                      );
                      setViewingSong(firstSong || null);
                    }}
                    disabled={release.songs.length === 0}
                  >
                    {t("View Meta")}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
      </div>

      {}
      <SongViewDialog
        song={viewingSong}
        open={!!viewingSong}
        onOpenChange={(open) => !open && setViewingSong(null)}
      />
    </div>
  );
}
