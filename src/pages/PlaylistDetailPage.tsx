import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLibraryStore } from "@/stores/libraryStore";
import { usePlaylistStore } from "@/stores/playlistStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Play,
  Shuffle,
  ListMusic,
  MoreHorizontal,
} from "lucide-react";
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
import { DataTable } from "@/pages/SongsPage.datatable";
import { detailPageColumns } from "@/pages/SongsPage.columns";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Song } from "@/types";
import { PlaylistEditDialog } from "@/components/shared/PlaylistEditDialog";
import { usePlayerStore } from "@/stores/playerStore";
import { getPlaylistCover } from "@/lib/cover";
import { cn } from "@/lib/utils";
import { useDndStore } from "@/stores/dndStore";
import { CoverEditDialog } from "@/components/shared/CoverEditDialog";
import { useCustomCoverUrl } from "@/stores/customCoverStore";
import { useTranslation } from "react-i18next";

export function PlaylistDetailPage() {
  const { t } = useTranslation();
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const { songs, isLoading: isLibraryLoading } = useLibraryStore();
  const { playlists, setPlaylists } = usePlaylistStore();
  const playerActions = usePlayerStore((state) => state.actions);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [coverTarget, setCoverTarget] = useState<{
    kind: "playlist";
    name: string;
  } | null>(null);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState(true);

  const { dropTarget, setDropTarget } = useDndStore();

  const refreshPlaylists = useCallback(async () => {
    try {
      const updatedPlaylists = await api.getAllPlaylists();
      setPlaylists(updatedPlaylists);
    } catch (e) {
      toast.error("Failed to refresh playlists", { description: String(e) });
    }
  }, [setPlaylists]);

  const handleRenameSaved = (newName: string) => {
    refreshPlaylists();
    navigate(`/playlist/${encodeURIComponent(newName)}`, { replace: true });
  };

  const handleConfirmDelete = async () => {
    if (!playlist) return;
    setIsDeleting(true);
    try {
      await api.deletePlaylist(playlist.name);
      toast.success("Deleted", {
        description: `Deleted playlist "${playlist.name}"`,
      });
      refreshPlaylists();
      navigate("/playlists");
    } catch (e) {
      toast.error("Failed to delete", { description: String(e) });
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  };

  const handleConfirmClear = async () => {
    if (!playlist) return;
    setIsClearing(true);
    try {
      await api.clearPlaylist(playlist.name);
      toast.success("Cleared", {
        description: `Cleared playlist "${playlist.name}"`,
      });
      refreshPlaylists();
    } catch (e) {
      toast.error("Failed to clear", { description: String(e) });
    } finally {
      setIsClearing(false);
      setIsClearOpen(false);
    }
  };

  const playlist = useMemo(() => {
    if (!name) return null;
    return playlists.find((p) => p.name === decodeURIComponent(name));
  }, [playlists, name]);

  const customCoverUrl = useCustomCoverUrl("playlist", playlist?.name ?? null);

  const playlistSongs = useMemo(() => {
    if (!playlist) return [];
    const songMap = new Map(songs.map((s) => [s.path, s]));
    return playlist.songs
      .map((songPath) => songMap.get(songPath))
      .filter((song): song is Song => !!song);
  }, [playlist, songs]);

  useEffect(() => {
    if (!playlist) return;
    if (customCoverUrl) {
      setCoverUrl(customCoverUrl);
      setIsCoverLoading(false);
      return;
    }
    setIsCoverLoading(true);
    getPlaylistCover(playlist.songs, songs)
      .then(setCoverUrl)
      .finally(() => setIsCoverLoading(false));
  }, [playlist, songs, customCoverUrl]);

  const isDropTarget =
    playlist &&
    dropTarget?.type === "playlist" &&
    dropTarget.name === playlist.name;

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (playlist) {
      setDropTarget({ type: "playlist", name: playlist.name });
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  if (isLibraryLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!playlist) {
    return <div>Playlist not found</div>;
  }

  return (
    <div
      className={cn(
        "space-y-6 rounded-lg transition-all",
        isDropTarget &&
          "outline-dashed outline-2 outline-primary outline-offset-8"
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      <Button
        onClick={() => navigate("/playlists")}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t("Back")}
      </Button>

      <div className="flex gap-6">
        <div className="relative h-64 w-64 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {isCoverLoading ? (
            <Skeleton className="h-full w-full" />
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt={playlist.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ListMusic className="h-24 w-24 text-muted-foreground/30" />
          )}
        </div>

        <div className="flex flex-col justify-end space-y-4 flex-1">
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("Playlist")}
            </p>
            <h1 className="text-5xl font-bold mt-2">{playlist.name}</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {playlistSongs.length} songs • Created on{" "}
            {new Date(Number(playlist.created_at) * 1000).toLocaleDateString()}
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="lg"
              className="rounded-full px-8"
              onClick={() =>
                playerActions.playQueue(
                  playlistSongs.map((s) => s.path),
                  0
                )
              }
              disabled={playlistSongs.length === 0}
            >
              <Play className="mr-2 h-5 w-5" fill="currentColor" />
              {t("Play")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8"
              onClick={() => {
                const shuffled = [...playlistSongs].sort(
                  () => Math.random() - 0.5
                );
                playerActions.playQueue(
                  shuffled.map((s) => s.path),
                  0
                );
              }}
              disabled={playlistSongs.length === 0}
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
                  {t("Rename")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsClearOpen(true)}>
                  {t("Clear")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setCoverTarget({ kind: "playlist", name: playlist.name })
                  }
                >
                  {t("Change Cover")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  {t("Delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="pt-6">
        <h2 className="text-2xl font-bold mb-4">{t("Songs")}</h2>
        <DataTable
          columns={detailPageColumns}
          data={playlistSongs}
          showBorder={false}
          enableContextMenu={true}
          onSongSaved={refreshPlaylists}
          showTableHeader={false}
          playlistName={playlist.name}
        />
      </div>

      <PlaylistEditDialog
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
        playlist={playlist}
        onSaved={handleRenameSaved}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Are you sure you want to delete?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete the playlist")}
              <span className="font-bold text-foreground">
                {playlist?.name}
              </span>
              {t("? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t("Deleting...") : t("Confirm Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Are you sure you want to clear?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to clear the playlist")}
              <span className="font-bold text-foreground">
                {playlist?.name}
              </span>
              {t("? This action will remove all songs and cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmClear}
              disabled={isClearing}
            >
              {isClearing ? t("Clearing...") : t("Confirm Clear")}
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
