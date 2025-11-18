
import { useLibraryStore } from "@/stores/libraryStore";
import { ArtistCard, ArtistCardSkeleton } from "@/components/shared/ArtistCard";
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

export function ArtistsPage() {
  const { t } = useTranslation();
  const artists = useLibraryStore((state) => state.artists);
  const songs = useLibraryStore((state) => state.songs);
  const isLoading = useLibraryStore((state) => state.isLoading);

  const [viewingSong, setViewingSong] = useState<Song | null>(null);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        {t("Artists")} ({artists.length})
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
        {isLoading
          ? Array.from({ length: 14 }).map((_, i) => (
              <ArtistCardSkeleton key={i} />
            ))
          : artists.map((artist) => (
              <ContextMenu key={artist.name}>
                <ContextMenuTrigger asChild>
                  <ArtistCard artist={artist} songs={songs} />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() => {
                      const firstSong = songs.find((s) =>
                        artist.songs.includes(s.path)
                      );
                      setViewingSong(firstSong || null);
                    }}
                    disabled={artist.songs.length === 0}
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
