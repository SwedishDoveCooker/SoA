
import { useState, useCallback } from "react";
import { usePlaylistStore } from "@/stores/playlistStore";
import {
  PlaylistCard,
  PlaylistCardSkeleton,
} from "@/components/shared/PlaylistCard";
import { useLibraryStore } from "@/stores/libraryStore";
import { useAlistStore } from "@/stores/alistStore";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
import { PlaylistEditDialog } from "@/components/shared/PlaylistEditDialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Playlist } from "@/types";
import { CoverEditDialog } from "@/components/shared/CoverEditDialog";
import { useTranslation } from "react-i18next";

export function PlaylistsPage() {
  const { t } = useTranslation();
  const { playlists, setPlaylists } = usePlaylistStore();
  const { songs, isLoading: isLibraryLoading } = useLibraryStore();
  const { alists } = useAlistStore();

  const [dialogMode, setDialogMode] = useState<"create" | "rename" | null>(
    null
  );
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [playlistToClear, setPlaylistToClear] = useState<Playlist | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [coverTarget, setCoverTarget] = useState<{
    kind: "playlist";
    name: string;
  } | null>(null);

  const refreshPlaylists = useCallback(async () => {
    try {
      const updatedPlaylists = await api.getAllPlaylists();
      setPlaylists(updatedPlaylists);
    } catch (e) {
      toast.error(t("Failed to refresh playlists"), { description: String(e) });
    }
  }, [setPlaylists, t]);

  const handleOpenNewDialog = () => {
    setPlaylistToEdit(null);
    setDialogMode("create");
  };

  const handleOpenRenameDialog = (playlist: Playlist) => {
    setPlaylistToEdit(playlist);
    setDialogMode("rename");
  };

  const handleOpenDeleteDialog = (playlist: Playlist) => {
    setPlaylistToDelete(playlist);
  };

  const handleOpenClearDialog = (playlist: Playlist) => {
    setPlaylistToClear(playlist);
  };

  const handleConfirmDelete = async () => {
    if (!playlistToDelete) return;

    setIsDeleting(true);
    try {
      await api.deletePlaylist(playlistToDelete.name);
      toast.success(t("Deleted"), {
        description: `${t("Deleted playlist")} "${playlistToDelete.name}"`,
      });
      refreshPlaylists();
    } catch (e) {
      toast.error(t("Failed to delete"), { description: String(e) });
    } finally {
      setIsDeleting(false);
      setPlaylistToDelete(null);
    }
  };

  const handleConfirmClear = async () => {
    if (!playlistToClear) return;

    setIsClearing(true);
    try {
      await api.clearPlaylist(playlistToClear.name);
      toast.success(t("Cleared"), {
        description: `${t("Cleared playlist")} "${playlistToClear.name}"`,
      });
      refreshPlaylists();
    } catch (e) {
      toast.error(t("Failed to clear"), { description: String(e) });
    } finally {
      setIsClearing(false);
      setPlaylistToClear(null);
    }
  };

  const handleAddPlaylistToAlist = async (
    alistName: string,
    playlist: Playlist
  ) => {
    try {
      await api.addElementToAlist(alistName, { Playlist: playlist });
      toast.success(t("Added"), {
        description: `${t("Playlist added to")} "${alistName}"`,
      });
    } catch (error) {
      toast.error(t("Failed to add"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">
            {}
            {t("Playlists")} ({isLibraryLoading ? "..." : playlists.length})
          </h1>
          <Button onClick={handleOpenNewDialog}>
            <Plus className="mr-2 h-4 w-4" /> {t("New Playlist")}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-8 gap-4">
          {}
          {isLibraryLoading
            ? Array.from({ length: 7 }).map((_, i) => (
                <PlaylistCardSkeleton key={i} />
              ))
            : playlists.map((playlist) => (
                <ContextMenu key={playlist.name}>
                  <ContextMenuTrigger asChild>
                    {}
                    <PlaylistCard
                      playlist={playlist}
                      songs={songs}
                      onRename={handleOpenRenameDialog}
                      onClear={handleOpenClearDialog}
                      onDelete={handleOpenDeleteDialog}
                      onEditCover={(pl) =>
                        setCoverTarget({ kind: "playlist", name: pl.name })
                      }
                    />
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleOpenRenameDialog(playlist)}
                    >
                      {t("Rename")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleOpenClearDialog(playlist)}
                    >
                      {t("Clear")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        setCoverTarget({
                          kind: "playlist",
                          name: playlist.name,
                        })
                      }
                    >
                      {t("Change Cover")}
                    </ContextMenuItem>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        {t("Add to Alist")}
                      </ContextMenuSubTrigger>
                      <ContextMenuPortal>
                        <ContextMenuSubContent>
                          {alists.length > 0 ? (
                            alists.map((alist) => (
                              <ContextMenuItem
                                key={`${playlist.name}-${alist.name}`}
                                onClick={() =>
                                  handleAddPlaylistToAlist(alist.name, playlist)
                                }
                              >
                                {alist.name}
                              </ContextMenuItem>
                            ))
                          ) : (
                            <ContextMenuItem disabled>
                              {t("No Alists")}
                            </ContextMenuItem>
                          )}
                        </ContextMenuSubContent>
                      </ContextMenuPortal>
                    </ContextMenuSub>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => handleOpenDeleteDialog(playlist)}
                    >
                      {t("Delete")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))}
        </div>
      </div>

      {}

      {}
      <PlaylistEditDialog
        open={!!dialogMode}
        onOpenChange={(open) => !open && setDialogMode(null)}
        playlist={dialogMode === "rename" ? playlistToEdit : null}
        onSaved={refreshPlaylists}
      />

      {}
      <AlertDialog
        open={!!playlistToDelete}
        onOpenChange={(open) => !open && setPlaylistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Playlist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete the playlist")}
              <span className="font-bold text-foreground">
                {playlistToDelete?.name}
              </span>
              ? {t("This action cannot be undone.")}
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

      {}
      <AlertDialog
        open={!!playlistToClear}
        onOpenChange={(open) => !open && setPlaylistToClear(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Clear Playlist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to clear the playlist")}
              <span className="font-bold text-foreground">
                {playlistToClear?.name}
              </span>
              ? {t("This action will remove all songs and cannot be undone.")}
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
    </>
  );
}
