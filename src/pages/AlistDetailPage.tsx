import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Disc,
  ListMusic,
  Mic,
  MoreHorizontal,
  Music,
  Play,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getPlaylistCover } from "@/lib/cover";
import { useAlistStore } from "@/stores/alistStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { usePlaylistStore } from "@/stores/playlistStore";
import { api } from "@/lib/api";
import { DataTable } from "@/pages/SongsPage.datatable";
import { detailPageColumns } from "@/pages/SongsPage.columns";
import { AlistEditDialog } from "@/components/shared/AlistEditDialog";
import { CoverEditDialog } from "@/components/shared/CoverEditDialog";
import { useCustomCoverUrl } from "@/stores/customCoverStore";
import { usePlayerStore } from "@/stores/playerStore";
import type { AelementKind, Song } from "@/types";
import {
  expandAlistSongs,
  getAlistCoverCandidates,
  getElementKind,
  getElementLabel,
  summarizeElements,
} from "@/lib/alist";
import { useTranslation } from "react-i18next";
const KIND_ICON: Record<AelementKind, ReactNode> = {
  song: <Music className="h-3.5 w-3.5" />,
  playlist: <ListMusic className="h-3.5 w-3.5" />,
  release: <Disc className="h-3.5 w-3.5" />,
  artist: <Mic className="h-3.5 w-3.5" />,
};

export function AlistDetailPage() {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { alists, setAlists, isLoading: isAlistLoading } = useAlistStore();
  const {
    songs,
    artists,
    releases,
    isLoading: isLibraryLoading,
  } = useLibraryStore();
  const { playlists, setPlaylists } = usePlaylistStore();

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [freezeDialogOpen, setFreezeDialogOpen] = useState(false);
  const [coverTarget, setCoverTarget] = useState<{
    kind: "alist";
    name: string;
  } | null>(null);
  const playerActions = usePlayerStore((state) => state.actions);

  const context = useMemo(
    () => ({ songs, playlists, releases, artists }),
    [songs, playlists, releases, artists]
  );

  const alist = useMemo(() => {
    if (!name) return null;
    return alists.find((a) => a.name === decodeURIComponent(name));
  }, [alists, name]);

  const customCoverUrl = useCustomCoverUrl("alist", alist?.name ?? null);

  const alistSongs = useMemo(() => {
    if (!alist) return [] as Song[];
    return expandAlistSongs(alist, context);
  }, [alist, context]);

  const elementSummary = useMemo(() => {
    if (!alist) {
      return { song: 0, playlist: 0, release: 0, artist: 0 };
    }
    return summarizeElements(alist);
  }, [alist]);

  const refreshAlists = useCallback(async () => {
    try {
      const data = await api.getAllAlists();
      setAlists(data);
    } catch (error) {
      toast.error("Failed to refresh Alists", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [setAlists]);

  const refreshPlaylists = useCallback(async () => {
    try {
      const data = await api.getAllPlaylists();
      setPlaylists(data);
    } catch (error) {
      toast.error("Failed to refresh playlists", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [setPlaylists]);

  useEffect(() => {
    let isMounted = true;
    if (!alist) return;
    if (customCoverUrl) {
      setCoverUrl(customCoverUrl);
      setIsCoverLoading(false);
      return () => {
        isMounted = false;
      };
    }
    setIsCoverLoading(true);
    const candidates = getAlistCoverCandidates(alist, context);
    getPlaylistCover(candidates, songs)
      .then((cover) => {
        if (isMounted) setCoverUrl(cover);
      })
      .finally(() => {
        if (isMounted) setIsCoverLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [alist, context, songs, customCoverUrl]);

  const handleRenameSaved = async (newName: string) => {
    await refreshAlists();
    navigate(`/alist/${encodeURIComponent(newName)}`, { replace: true });
  };

  const handleDelete = async () => {
    if (!alist) return;
    setIsMutating(true);
    try {
      await api.deleteAlist(alist.name);
      toast.success("Deleted", {
        description: `Removed Alist "${alist.name}"`,
      });
      await refreshAlists();
      navigate("/alists");
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsMutating(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleClear = async () => {
    if (!alist) return;
    setIsMutating(true);
    try {
      await api.clearAlistElements(alist.name);
      toast.success("Cleared", {
        description: `Cleared elements from "${alist.name}"`,
      });
      await refreshAlists();
    } catch (error) {
      toast.error("Clear failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsMutating(false);
      setClearDialogOpen(false);
    }
  };

  const handleFreeze = async () => {
    if (!alist) return;
    setIsMutating(true);
    try {
      await api.freezeAlist(alist.name);
      toast.success("Frozen", {
        description: `Converted "${alist.name}" into a playlist`,
      });
      await Promise.all([refreshAlists(), refreshPlaylists()]);
    } catch (error) {
      toast.error("Freeze failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsMutating(false);
      setFreezeDialogOpen(false);
    }
  };

  if (isLibraryLoading || isAlistLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!alist) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/alists")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
          Alist not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        onClick={() => navigate("/alists")}
        variant="ghost"
        size="sm"
        className="mb-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> {t("Back")}
      </Button>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="relative h-64 w-64 shrink-0 overflow-hidden rounded-lg bg-muted">
          {isCoverLoading ? (
            <Skeleton className="h-full w-full" />
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt={alist.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ListMusic className="h-24 w-24 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-end space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("Dynamic Playlist")}
            </p>
            <h1 className="mt-2 text-5xl font-bold">{alist.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {alistSongs.length} {t("songs")} • {alist.elements.length}{" "}
            {t("elements")} •{t("Created on")}{" "}
            {new Date(Number(alist.created_at) * 1000).toLocaleDateString()}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={() => {
                if (alistSongs.length > 0) {
                  const songPaths = alistSongs.map((song) => song.path);
                  playerActions.playQueue(songPaths, 0);
                }
              }}
              disabled={alistSongs.length === 0}
            >
              <Play className="mr-2 h-5 w-5" fill="currentColor" />
              {t("Play")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => {
                if (alistSongs.length > 0) {
                  const shuffledIndices = [
                    ...Array(alistSongs.length).keys(),
                  ].sort(() => Math.random() - 0.5);
                  const shuffledSongs = shuffledIndices.map(
                    (i) => alistSongs[i].path
                  );
                  playerActions.playQueue(shuffledSongs, 0);
                }
              }}
              disabled={alistSongs.length === 0}
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
                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                  {t("Edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFreezeDialogOpen(true)}>
                  {t("Freeze to Playlist")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setClearDialogOpen(true)}>
                  {t("Clear Elements")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setCoverTarget({ kind: "alist", name: alist.name })
                  }
                >
                  {t("Change Cover")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">{t("Elements")}</h2>
        <div className="flex flex-wrap gap-2">
          {alist.elements.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t(
                "This Alist is empty. Add songs, playlists, releases, or artists from other views."
              )}
            </p>
          )}
          {alist.elements.map((element, index) => {
            const kind = getElementKind(element);
            return (
              <span
                key={`${kind}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
              >
                <span className="text-muted-foreground">{KIND_ICON[kind]}</span>
                <span>{getElementLabel(element)}</span>
              </span>
            );
          })}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          {elementSummary.song} {t("songs")} • {elementSummary.playlist}{" "}
          {t("playlists")} • {elementSummary.release} {t("releases")} •{" "}
          {elementSummary.artist} {t("artists")}
        </div>
      </div>

      <div className="pt-2">
        <h2 className="mb-4 text-2xl font-bold">{t("Songs")}</h2>
        <DataTable
          columns={detailPageColumns}
          data={alistSongs}
          filterColumn="title"
          showBorder={false}
          enableContextMenu={false}
          showTableHeader={false}
        />
      </div>

      <AlistEditDialog
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        alist={alist}
        onSaved={handleRenameSaved}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Alist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will permanently delete")}
              <span className="font-semibold"> {alist.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isMutating}
            >
              {isMutating ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Clear Elements")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Remove all items from")}
              <span className="font-semibold"> {alist.name}</span>?{" "}
              {t("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} disabled={isMutating}>
              {isMutating ? t("Clearing...") : t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={freezeDialogOpen} onOpenChange={setFreezeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Freeze to Playlist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Convert")}
              <span className="font-semibold"> {alist.name}</span>{" "}
              {t("into a static playlist?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleFreeze} disabled={isMutating}>
              {isMutating ? t("Freezing...") : t("Freeze")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CoverEditDialog
        target={coverTarget}
        open={!!coverTarget}
        onOpenChange={(open) => !open && setCoverTarget(null)}
      />
    </div>
  );
}
