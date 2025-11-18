
"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Score, Song } from "@/types";
import { SongEditDialog } from "@/components/shared/SongEditDialog";
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useAlistStore } from "@/stores/alistStore";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { SongViewDialog } from "@/components/shared/SongViewDialog";
import { usePlayerStore } from "@/stores/playerStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { useTranslation } from "react-i18next";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumn?: string;
  showBorder?: boolean;
  enableContextMenu?: boolean;
  onSongSaved?: () => void;
  showTableHeader?: boolean;
  playlistName?: string;
}

export interface TableMeta {
  handleScoreChange?: (song: Song, score: Score | null) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumn = "title",
  showBorder = false,
  enableContextMenu = false,
  onSongSaved,
  showTableHeader = true,
  playlistName,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const [editingSong, setEditingSong] = React.useState<Song | null>(null);
  const [viewingSong, setViewingSong] = React.useState<Song | null>(null);
  const [songToRemove, setSongToRemove] = React.useState<Song | null>(null);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [itemToRemoveByIndex, setItemToRemoveByIndex] = React.useState<{
    song: Song;
    index: number;
  } | null>(null);
  const [isRemovingByIndex, setIsRemovingByIndex] = React.useState(false);
  const [songToDeleteFromDisk, setSongToDeleteFromDisk] =
    React.useState<Song | null>(null);
  const [isDeletingFromDisk, setIsDeletingFromDisk] = React.useState(false);

  const { playlists, setPlaylists } = usePlaylistStore();
  const { alists } = useAlistStore();
  const playerActions = usePlayerStore((state) => state.actions);
  const allSongs = useLibraryStore((state) => state.songs);

  const handleScoreChange = async (song: Song, newScore: Score | null) => {
    const updatedSong: Song = {
      ...song,
      score: newScore,
      updated_at: new Date().toISOString(),
    };

    try {
      await api.update_song_tags(updatedSong, null);

      toast.success(t("Score Updated"), {
        description: t(`Song "{{title}}" has been updated.`, {
          title: song.title || "Unknown",
        }),
      });
      onSongSaved?.();
    } catch (e) {
      toast.error(t("Score Update Failed"), { description: String(e) });
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    meta: {
      editingSong: editingSong,
      setEditingSong: setEditingSong,
      viewingSong: viewingSong,
      setViewingSong: setViewingSong,
      handleScoreChange: handleScoreChange,
    },
  });

  const handleRowDoubleClick = (row: Row<TData>) => {
    const songPath = (row.original as Song).path;
    if (!songPath) return;

    let songPaths: string[] = [];

    if (playlistName) {
      songPaths = table
        .getRowModel()
        .rows.map((r) => (r.original as Song).path);
    } else {

      songPaths = allSongs.map((s) => s.path);
    }

    const startIndex = songPaths.indexOf(songPath);

    if (startIndex !== -1) {
      playerActions.playQueue(songPaths, startIndex);
    } else {
      playerActions.playSong(songPath);
    }
  };

  const handleDialogSaved = () => {
    onSongSaved?.();
    setEditingSong(null);
  };

  const handleAddToPlaylist = async (playlistName: string, song: Song) => {
    try {
      await api.addSongToPlaylist(playlistName, song);
      toast.success(t("Added to Playlist"), {
        description: t(`Added "{{songTitle}}" to "{{playlistName}}"`, {
          songTitle: song.title || "Unknown",
          playlistName,
        }),
      });
      const updatedPlaylists = await api.getAllPlaylists();
      setPlaylists(updatedPlaylists);
    } catch (e) {
      toast.error(t("Failed to Add"), { description: String(e) });
    }
  };

  const handleAddToAlist = async (alistName: string, song: Song) => {
    try {
      await api.addElementToAlist(alistName, { Song: song });
      toast.success(t("Added to Alist"), {
        description: t(`Added "{{songTitle}}" to "{{alistName}}"`, {
          songTitle: song.title || "Unknown",
          alistName,
        }),
      });
    } catch (e) {
      toast.error(t("Failed to Add"), { description: String(e) });
    }
  };

  const confirmRemoveFromPlaylistAll = async () => {
    if (!playlistName || !songToRemove) return;
    setIsRemoving(true);
    try {
      await api.removeSongFromPlaylistAll(playlistName, songToRemove);
      toast.success(t("Removed from Playlist"), {
        description: t(`Removed all "{{title}}" from "{{playlistName}}"`, {
          title: songToRemove.title || "Unknown",
          playlistName,
        }),
      });
      onSongSaved?.();
    } catch (e) {
      toast.error(t("Failed to Remove"), { description: String(e) });
    } finally {
      setIsRemoving(false);
      setSongToRemove(null);
    }
  };

  const confirmRemoveFromPlaylistByIndex = async () => {
    if (!playlistName || itemToRemoveByIndex === null) return;
    setIsRemovingByIndex(true);
    try {
      await api.removeSongsFromPlaylistByIndex(playlistName, [
        itemToRemoveByIndex.index,
      ]);
      toast.success(t("Removed from Playlist"), {
        description: t(`Removed song "{{title}}" from "{{playlistName}}"`, {
          title: itemToRemoveByIndex.song.title || "Unknown",
          playlistName,
        }),
      });
      onSongSaved?.();
    } catch (e) {
      toast.error(t("Failed to Remove"), { description: String(e) });
    } finally {
      setIsRemovingByIndex(false);
      setItemToRemoveByIndex(null);
    }
  };

  const confirmDeleteFromDisk = async () => {
    if (!songToDeleteFromDisk) return;
    setIsDeletingFromDisk(true);
    try {
      await api.delete_song_file(songToDeleteFromDisk.path);
      toast.success(t("Deleted from Disk"), {
        description: t(`Deleted "{{title}}" from disk`, {
          title: songToDeleteFromDisk.title || "Unknown",
        }),
      });
      onSongSaved?.();
    } catch (e) {
      toast.error(t("Delete Failed"), { description: String(e) });
    } finally {
      setIsDeletingFromDisk(false);
      setSongToDeleteFromDisk(null);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder={t("Filtering songs...")}
          value={
            (table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn(filterColumn)?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className={cn("space-y-2")}>
        <Table>
          {showTableHeader && (
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className={cn(!showBorder && "border-0 hover:bg-transparent")}
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          )}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <ContextMenu key={row.id}>
                  <ContextMenuTrigger asChild disabled={!enableContextMenu}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className={cn(
                        "rounded-lg overflow-hidden mb-2",
                        showBorder ? "border" : "border-0",
                        "h-16 transition-colors cursor-pointer",
                        "even:bg-muted/50",
                        "hover:bg-accent"
                      )}
                      onDoubleClick={() => handleRowDoubleClick(row)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() =>
                        setViewingSong(row.original as unknown as Song)
                      }
                    >
                      {t("View Meta")}
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() =>
                        setEditingSong(row.original as unknown as Song)
                      }
                    >
                      {t("Edit Meta")}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        {t("Add to Playlist")}
                      </ContextMenuSubTrigger>
                      <ContextMenuPortal>
                        <ContextMenuSubContent>
                          {playlists.length > 0 ? (
                            playlists.map((pl) => (
                              <ContextMenuItem
                                key={pl.name}
                                onClick={() =>
                                  handleAddToPlaylist(
                                    pl.name,
                                    row.original as unknown as Song
                                  )
                                }
                              >
                                {pl.name}
                              </ContextMenuItem>
                            ))
                          ) : (
                            <ContextMenuItem disabled>
                              {t("No Playlists")}
                            </ContextMenuItem>
                          )}
                        </ContextMenuSubContent>
                      </ContextMenuPortal>
                    </ContextMenuSub>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        {t("Add to Alist")}
                      </ContextMenuSubTrigger>
                      <ContextMenuPortal>
                        <ContextMenuSubContent>
                          {alists.length > 0 ? (
                            alists.map((alist) => (
                              <ContextMenuItem
                                key={alist.name}
                                onClick={() =>
                                  handleAddToAlist(
                                    alist.name,
                                    row.original as unknown as Song
                                  )
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

                    {playlistName ? (
                      <>
                        <ContextMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() =>
                            setItemToRemoveByIndex({
                              song: row.original as unknown as Song,
                              index: row.index,
                            })
                          }
                        >
                          {t("Remove from Playlist")}
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onClick={() =>
                            setSongToRemove(row.original as unknown as Song)
                          }
                        >
                          {t("Remove All from Playlist")}
                        </ContextMenuItem>
                      </>
                    ) : (
                      <ContextMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onClick={() =>
                          setSongToDeleteFromDisk(
                            row.original as unknown as Song
                          )
                        }
                      >
                        {t("Delete from Disk")}
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            ) : (
              <TableRow
                className={cn(
                  !showBorder && "border-0",
                  "hover:bg-transparent"
                )}
              >
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("No results.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {}
      {enableContextMenu && (
        <SongViewDialog
          song={viewingSong}
          open={!!viewingSong}
          onOpenChange={(open) => !open && setViewingSong(null)}
        />
      )}
      {enableContextMenu && (
        <SongEditDialog
          song={editingSong}
          open={!!editingSong}
          onOpenChange={(open) => !open && setEditingSong(null)}
          onSaved={handleDialogSaved}
        />
      )}

      <AlertDialog
        open={!!songToRemove && !!playlistName}
        onOpenChange={(open) => !open && setSongToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Remove All Instances?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to remove all instances of")}
              <span className="font-bold text-foreground">
                &quot;{songToRemove?.title || "Unknown"}&quot;
              </span>
              {t("from the playlist {{playlistName}}?", { playlistName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmRemoveFromPlaylistAll}
              disabled={isRemoving}
            >
              {isRemoving ? t("Removing...") : t("Confirm Remove All")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!itemToRemoveByIndex && !!playlistName}
        onOpenChange={(open) => !open && setItemToRemoveByIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Remove Specific Entry?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to remove the specific entry:")}
              <span className="font-bold text-foreground">
                &quot;{itemToRemoveByIndex?.song.title || "Unknown"}&quot;
              </span>
              {t("from the playlist {{playlistName}}?", { playlistName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingByIndex}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmRemoveFromPlaylistByIndex}
              disabled={isRemovingByIndex}
            >
              {isRemovingByIndex ? t("Removing...") : t("Confirm Remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!songToDeleteFromDisk}
        onOpenChange={(open) => !open && setSongToDeleteFromDisk(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Are you sure you want to delete from disk?")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to")}
              <span className="font-bold text-red-600">
                {t("permanently delete")}
              </span>
              {t("the song")}
              <span className="font-bold text-foreground">
                &quot;{songToDeleteFromDisk?.title || "Unknown"}&quot;
              </span>
              {t("from disk?")}
              <br />
              <span className="font-bold text-red-600">
                {t("This action cannot be undone.")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingFromDisk}>
              {t("Cancel")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={confirmDeleteFromDisk}
              disabled={isDeletingFromDisk}
            >
              {isDeletingFromDisk ? t("Deleting...") : t("Confirm Delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
