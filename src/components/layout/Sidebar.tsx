import { NavLink, useNavigate, NavLinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Music,
  Disc,
  Mic,
  ListMusic,
  History,
  Settings,
  Star,
  Home,
  ListChecks,
} from "lucide-react";
import SoAIcon from "../shared/soa-icon";
import React, { useState, useCallback } from "react";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useAlistStore } from "@/stores/alistStore";
import { Playlist } from "@/types";
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
import { AlistEditDialog } from "@/components/shared/AlistEditDialog";
import { Alist } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useDndStore } from "@/stores/dndStore";
import { useTranslation } from "react-i18next";

interface NavItemProps extends NavLinkProps {
  icon: React.ElementType;
  children: React.ReactNode;
  isDraggable?: boolean;
  playlistName?: string;
}

const NavItem = React.forwardRef<HTMLAnchorElement, NavItemProps>(
  (
    {
      icon: Icon,
      children,
      to,
      className,
      isDraggable = false,
      playlistName,
      ...props
    },
    ref
  ) => {
    const { dropTarget, setDropTarget } = useDndStore();

    const isDropTarget =
      isDraggable &&
      playlistName &&
      dropTarget?.type === "playlist" &&
      dropTarget.name === playlistName;

    const handleDragEnter = (e: React.DragEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      if (isDraggable && playlistName) {
        setDropTarget({ type: "playlist", name: playlistName });
      }
    };

    const handleDragOver = (e: React.DragEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    };

    return (
      <NavLink
        to={to}
        ref={ref}
        {...props}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        className={({ isActive }) =>
          cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start font-normal",
            "pl-6 transition-all",
            isActive && "bg-primary/10 text-primary font-semibold",
            isDropTarget && "bg-primary/20 ring-2 ring-primary ring-inset",
            typeof className === "function"
              ? className({
                  isActive,
                  isPending: false,
                  isTransitioning: false,
                })
              : className
          )
        }
      >
        <Icon className="mr-2 h-4 w-4" />
        {children}
      </NavLink>
    );
  }
);
NavItem.displayName = "NavItem";

function NavGroup({ title }: { title: string }) {
  return (
    <h4 className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h4>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { playlists, setPlaylists } = usePlaylistStore();
  const { alists, setAlists } = useAlistStore();
  const navigate = useNavigate();

  const [dialogMode, setDialogMode] = useState<"rename" | null>(null);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [playlistToClear, setPlaylistToClear] = useState<Playlist | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const [alistDialogMode, setAlistDialogMode] = useState<"rename" | null>(null);
  const [alistToEdit, setAlistToEdit] = useState<Alist | null>(null);
  const [alistToDelete, setAlistToDelete] = useState<Alist | null>(null);
  const [alistToClear, setAlistToClear] = useState<Alist | null>(null);
  const [isAlistDeleting, setIsAlistDeleting] = useState(false);
  const [isAlistClearing, setIsAlistClearing] = useState(false);

  const refreshPlaylists = useCallback(async () => {
    try {
      const updatedPlaylists = await api.getAllPlaylists();
      setPlaylists(updatedPlaylists);
    } catch (e) {
      toast.error(t("Err refreshing playlists"), { description: String(e) });
    }
  }, [setPlaylists, t]);

  const refreshAlists = useCallback(async () => {
    try {
      const updatedAlists = await api.getAllAlists();
      setAlists(updatedAlists);
    } catch (e) {
      toast.error(t("Err refreshing alists"), { description: String(e) });
    }
  }, [setAlists, t]);

  const handleAddToAlist = async (playlistName: string, alistName: string) => {
    const playlist = playlists.find((p) => p.name === playlistName);
    if (!playlist) return;

    try {
      await api.addElementToAlist(alistName, { Playlist: playlist });
      toast.success(t("Added"), {
        description: t('Playlist added to "{name}"', { name: alistName }),
      });
    } catch (error) {
      toast.error(t("Failed to add"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
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
      toast.success(t("Del success"), {
        description: t('Deleted playlist "{name}"', {
          name: playlistToDelete.name,
        }),
      });
      refreshPlaylists();
      if (
        location.pathname ===
        `/playlist/${encodeURIComponent(playlistToDelete.name)}`
      ) {
        navigate("/playlists");
      }
    } catch (e) {
      toast.error(t("Del failed"), { description: String(e) });
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
      toast.success(t("Empty success"), {
        description: t('Cleared playlist "{name}"', {
          name: playlistToClear.name,
        }),
      });
      refreshPlaylists();
    } catch (e) {
      toast.error(t("Empty failed"), { description: String(e) });
    } finally {
      setIsClearing(false);
      setPlaylistToClear(null);
    }
  };

  const handleRenameSaved = (newName: string) => {
    refreshPlaylists();
    if (
      playlistToEdit &&
      location.pathname ===
        `/playlist/${encodeURIComponent(playlistToEdit.name)}`
    ) {
      navigate(`/playlist/${encodeURIComponent(newName)}`, { replace: true });
    }
  };

  const handleOpenAlistRenameDialog = (alist: Alist) => {
    setAlistToEdit(alist);
    setAlistDialogMode("rename");
  };

  const handleOpenAlistDeleteDialog = (alist: Alist) => {
    setAlistToDelete(alist);
  };

  const handleOpenAlistClearDialog = (alist: Alist) => {
    setAlistToClear(alist);
  };

  const handleConfirmAlistDelete = async () => {
    if (!alistToDelete) return;
    setIsAlistDeleting(true);
    try {
      await api.deleteAlist(alistToDelete.name);
      toast.success(t("Del success"), {
        description: t('Deleted alist "{name}"', {
          name: alistToDelete.name,
        }),
      });
      refreshAlists();
      if (
        location.pathname === `/alist/${encodeURIComponent(alistToDelete.name)}`
      ) {
        navigate("/alists");
      }
    } catch (e) {
      toast.error(t("Del failed"), { description: String(e) });
    } finally {
      setIsAlistDeleting(false);
      setAlistToDelete(null);
    }
  };

  const handleConfirmAlistClear = async () => {
    if (!alistToClear) return;
    setIsAlistClearing(true);
    try {
      await api.clearAlistElements(alistToClear.name);
      toast.success(t("Empty success"), {
        description: t('Cleared alist "{name}"', {
          name: alistToClear.name,
        }),
      });
      refreshAlists();
    } catch (e) {
      toast.error(t("Empty failed"), { description: String(e) });
    } finally {
      setIsAlistClearing(false);
      setAlistToClear(null);
    }
  };

  const handleAlistRenameSaved = (newName: string) => {
    refreshAlists();
    if (
      alistToEdit &&
      location.pathname === `/alist/${encodeURIComponent(alistToEdit.name)}`
    ) {
      navigate(`/alist/${encodeURIComponent(newName)}`, { replace: true });
    }
  };

  return (
    <>
      <aside
        className={cn(
          "w-60 border-r bg-background flex flex-col p-3",
          className
        )}
      >
        <div
          className="px-3 py-2 mb-4 flex items-center space-x-2"
          data-tauri-drag-region
        >
          {}
          <SoAIcon className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">SoA</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          <nav className="space-y-0.5">
            <NavGroup title={t("Home")} />
            <NavItem to="/songs" icon={Home}>
              {t("Songs")}
            </NavItem>
          </nav>

          <nav className="space-y-0.5">
            <NavGroup title={t("Library")} />
            <NavItem to="/artists" icon={Mic}>
              {t("Artists")}
            </NavItem>
            <NavItem to="/releases" icon={Disc}>
              {t("Releases")}
            </NavItem>
            <NavItem to="/score" icon={Star}>
              {t("Score")}
            </NavItem>
            <NavItem to="/recents" icon={History}>
              {t("Recents")}
            </NavItem>
          </nav>

          <nav className="space-y-0.5">
            <NavGroup title={t("Playlists")} />
            <NavItem to="/playlists" icon={ListMusic}>
              {t("All Playlists")}
            </NavItem>

            {playlists.length > 0 ? (
              playlists.map((pl) => (
                <ContextMenu key={pl.name}>
                  <ContextMenuTrigger asChild>
                    <NavItem
                      to={`/playlist/${encodeURIComponent(pl.name)}`}
                      icon={Music}
                      isDraggable={true}
                      playlistName={pl.name}
                    >
                      {pl.name}
                    </NavItem>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => handleOpenRenameDialog(pl)}>
                      {t("Rename")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleOpenClearDialog(pl)}>
                      {t("Clear")}
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
                                key={`${pl.name}-${alist.name}`}
                                onClick={() =>
                                  handleAddToAlist(pl.name, alist.name)
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
                      onClick={() => handleOpenDeleteDialog(pl)}
                    >
                      {t("Delete")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <p className="px-7 py-2 text-xs text-muted-foreground">
                {t("(No playlists yet)")}
              </p>
            )}
          </nav>

          <nav className="space-y-0.5">
            <NavGroup title={t("Alists")} />
            <NavItem to="/alists" icon={ListChecks}>
              {t("All Alists")}
            </NavItem>

            {alists.length > 0 ? (
              alists.map((al) => (
                <ContextMenu key={al.name}>
                  <ContextMenuTrigger asChild>
                    <NavItem
                      to={`/alist/${encodeURIComponent(al.name)}`}
                      icon={ListChecks}
                    >
                      {al.name}
                    </NavItem>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleOpenAlistRenameDialog(al)}
                    >
                      {t("Edit")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleOpenAlistClearDialog(al)}
                    >
                      {t("Clear Elements")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={() => handleOpenAlistDeleteDialog(al)}
                    >
                      {t("Delete")}
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <p className="px-7 py-2 text-xs text-muted-foreground">
                {t("(No alists yet)")}
              </p>
            )}
          </nav>
        </div>

        <nav className="space-y-0.5">
          <NavItem to="/settings" icon={Settings}>
            {t("Settings")}
          </NavItem>
        </nav>
      </aside>

      <PlaylistEditDialog
        open={!!dialogMode}
        onOpenChange={(open) => !open && setDialogMode(null)}
        playlist={dialogMode === "rename" ? playlistToEdit : null}
        onSaved={handleRenameSaved}
      />

      <AlertDialog
        open={!!playlistToDelete}
        onOpenChange={(open) => !open && setPlaylistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Confirm Deletion")}</AlertDialogTitle>
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
              {isDeleting ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!playlistToClear}
        onOpenChange={(open) => !open && setPlaylistToClear(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Confirm Clear")}</AlertDialogTitle>
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

      <AlistEditDialog
        open={!!alistDialogMode}
        onOpenChange={(open) => !open && setAlistDialogMode(null)}
        alist={alistDialogMode === "rename" ? alistToEdit : null}
        onSaved={handleAlistRenameSaved}
      />

      <AlertDialog
        open={!!alistToDelete}
        onOpenChange={(open) => !open && setAlistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Confirm Deletion")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete the alist")}
              <span className="font-bold text-foreground">
                {alistToDelete?.name}
              </span>
              ? {t("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAlistDeleting}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmAlistDelete}
              disabled={isAlistDeleting}
            >
              {isAlistDeleting ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!alistToClear}
        onOpenChange={(open) => !open && setAlistToClear(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Confirm Clear")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to clear the alist")}
              <span className="font-bold text-foreground">
                {alistToClear?.name}
              </span>
              ?{" "}
              {t("This action will remove all elements and cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAlistClearing}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmAlistClear}
              disabled={isAlistClearing}
            >
              {isAlistClearing ? t("Clearing...") : t("Confirm Clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
