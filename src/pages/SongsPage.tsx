
import { useLibraryStore } from "@/stores/libraryStore";
import { columns } from "./SongsPage.columns";
import { DataTable } from "./SongsPage.datatable";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useTranslation } from "react-i18next";

export function SongsPage() {
  const { t } = useTranslation();
  const { songs, isLoading, setSongs, setArtists, setReleases } =
    useLibraryStore();

  const handleSongSaved = React.useCallback(async () => {
    toast.info(t("Refreshing library..."), {
      description: t("Song metadata has been updated."),
    });
    try {
      const [songs, artists, releases] = await Promise.all([
        api.getAllSongs(),
        api.getAllArtists(),
        api.getAllReleases(),
      ]);
      setSongs(songs);
      setArtists(artists);
      setReleases(releases);
      toast.success(t("Library refreshed successfully."));
    } catch (e) {
      toast.error(t("Failed to refresh"), { description: String(e) });
    }
  }, [setSongs, setArtists, setReleases, t]);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-4">{t("Songs")}</h1>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        {t("Songs")} ({songs.length})
      </h1>
      <DataTable
        columns={columns}
        data={songs}
        enableContextMenu={true}
        onSongSaved={handleSongSaved}
      />
    </div>
  );
}
