import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLibraryStore } from "@/stores/libraryStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Shuffle, Disc, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getReleaseCover } from "@/lib/cover";
import { parseReleaseFromRoute, matchRelease } from "@/lib/releaseUtils";
import { DataTable } from "@/pages/SongsPage.datatable";
import { detailPageColumns } from "@/pages/SongsPage.columns";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Song } from "@/types";
import { SongViewDialog } from "@/components/shared/SongViewDialog";
import { usePlayerStore } from "@/stores/playerStore";
import { useTranslation } from "react-i18next";

export function ReleaseDetailPage() {
  const { t } = useTranslation();
  const { title: titleParam, artist: artistParam } = useParams<{
    title: string;
    artist: string;
  }>();
  const navigate = useNavigate();
  const { releases, songs, isLoading, setSongs, setArtists, setReleases } =
    useLibraryStore();

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState(true);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const playerActions = usePlayerStore((state) => state.actions);

  const handleSongSaved = useCallback(async () => {
    toast.info(t("Refreshing..."), { description: t("Refreshing library...") });
    try {
      const [songs, artists, releases] = await Promise.all([
        api.getAllSongs(),
        api.getAllArtists(),
        api.getAllReleases(),
      ]);
      setSongs(songs);
      setArtists(artists);
      setReleases(releases);
      toast.success(t("Library refreshed"));
    } catch (e) {
      toast.error(t("Failed to refresh"), { description: String(e) });
    }
  }, [setSongs, setArtists, setReleases, t]);

  const { title, artist } = parseReleaseFromRoute(titleParam, artistParam);

  const release = useMemo(() => {
    return releases.find((r) => matchRelease(r, title, artist));
  }, [releases, title, artist]);

  const releaseSongs = useMemo(() => {
    if (!release) return [];
    return songs.filter((song) => release.songs.includes(song.path));
  }, [release, songs]);

  useEffect(() => {
    if (release) {
      setIsCoverLoading(true);
      getReleaseCover(release.artist, release.songs, songs)
        .then(setCoverUrl)
        .finally(() => setIsCoverLoading(false));
    }
  }, [release, songs]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!release) {
    return <div>{t("Release not found")}</div>;
  }

  return (
    <div className="space-y-6">
      <Button
        onClick={() => navigate("/releases")}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("Back")}
      </Button>

      {}
      <div className="flex gap-6">
        <div className="relative h-64 w-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {isCoverLoading ? (
            <Skeleton className="h-full w-full" />
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt={release.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <Disc className="h-24 w-24 text-muted-foreground/30" />
          )}
        </div>

        {}
        <div className="flex flex-col justify-end space-y-4 flex-1">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("Release")}
            </p>
            <h1 className="text-5xl font-bold mt-2">{release.title}</h1>
            {release.artist && (
              <p className="text-xl text-muted-foreground mt-2">
                {release.artist}
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {releaseSongs.length} {t("songs")}
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={() => {
                if (release.songs.length > 0) {
                  playerActions.playQueue(release.songs, 0);
                }
              }}
              disabled={release.songs.length === 0}
            >
              <Play className="mr-2 h-5 w-5" fill="currentColor" />
              {t("Play")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => {
                if (release.songs.length > 0) {
                  const shuffledIndices = [
                    ...Array(release.songs.length).keys(),
                  ].sort(() => Math.random() - 0.5);
                  const shuffledSongs = shuffledIndices.map(
                    (i) => release.songs[i]
                  );
                  playerActions.playQueue(shuffledSongs, 0);
                }
              }}
              disabled={release.songs.length === 0}
            >
              <Shuffle className="mr-2 h-5 w-5" />
              {t("Shuffle")}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() => setViewingSong(releaseSongs[0] || null)}
                  disabled={releaseSongs.length === 0}
                >
                  {t("View Meta")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {}
      <div className="pt-6">
        <h2 className="text-2xl font-bold mb-4">{t("songs")}</h2>
        <DataTable
          columns={detailPageColumns}
          data={releaseSongs}
          showBorder={false}
          enableContextMenu={true}
          onSongSaved={handleSongSaved}
          showTableHeader={false}
        />
      </div>

      <SongViewDialog
        song={viewingSong}
        open={!!viewingSong}
        onOpenChange={(open) => !open && setViewingSong(null)}
      />
    </div>
  );
}
