import { Skeleton } from "@/components/ui/skeleton";
import { Playlist, Song } from "@/types";
import { ListMusic, Music, MoreHorizontal, Play } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { getPlaylistCover } from "@/lib/cover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useDndStore } from "@/stores/dndStore";
import { useAlistStore } from "@/stores/alistStore";
import { usePlayerStore } from "@/stores/playerStore";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useCustomCoverUrl } from "@/stores/customCoverStore";

interface PlaylistCardProps extends React.HTMLAttributes<HTMLDivElement> {
  playlist: Playlist;
  songs: Song[];
  onRename: (playlist: Playlist) => void;
  onClear: (playlist: Playlist) => void;
  onDelete: (playlist: Playlist) => void;
  onEditCover: (playlist: Playlist) => void;
}

export function PlaylistCard({
  playlist,
  songs,
  className,
  onRename,
  onClear,
  onDelete,
  onEditCover,
  ...props
}: PlaylistCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const customCoverUrl = useCustomCoverUrl("playlist", playlist.name);
  const { alists } = useAlistStore();
  const playerActions = usePlayerStore((state) => state.actions);

  const { dropTarget, setDropTarget } = useDndStore();

  const isDropTarget =
    dropTarget?.type === "playlist" && dropTarget.name === playlist.name;

  useEffect(() => {
    if (customCoverUrl) {
      setCoverUrl(customCoverUrl);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getPlaylistCover(playlist.songs, songs)
      .then(setCoverUrl)
      .finally(() => setIsLoading(false));
  }, [playlist, songs, customCoverUrl]);

  const handleClick = () => {
    navigate(`/playlist/${encodeURIComponent(playlist.name)}`);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    setDropTarget({ type: "playlist", name: playlist.name });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.songs.length > 0) {
      playerActions.playQueue(playlist.songs, 0);
    }
  };

  const handleAddToAlist = async (alistName: string) => {
    try {
      await api.addElementToAlist(alistName, { Playlist: playlist });
      toast.success(t("Added"), {
        description: t('Playlist added to "{{alistName}}"', { alistName }),
      });
    } catch (error) {
      toast.error(t("Failed to add"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div
      className={cn(
        "w-full transition-all duration-300",
        "cursor-pointer",
        isDropTarget && "ring-2 ring-primary ring-offset-2",
        className
      )}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      {...props}
    >
      <div
        className={cn(
          "group relative w-full aspect-square overflow-hidden",
          "rounded-sm",
          "bg-card text-card-foreground",
          "shadow-md hover:shadow-lg transition-shadow"
        )}
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt={playlist.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <ListMusic className="h-1/2 w-1/2 text-muted-foreground/30" />
          </div>
        )}

        <div
          className={cn(
            "absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 left-2 h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
            onClick={handlePlay}
          >
            <Play className="h-5 w-5 fill-white" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onRename(playlist)}>
                {t("Rename")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClear(playlist)}>
                {t("Clear")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditCover(playlist)}>
                {t("Change Cover")}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {t("Add to Alist")}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {alists.length > 0 ? (
                      alists.map((alist) => (
                        <DropdownMenuItem
                          key={alist.name}
                          onClick={() => handleAddToAlist(alist.name)}
                        >
                          {alist.name}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>
                        {t("No Alists")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => onDelete(playlist)}
              >
                {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="pt-2 px-1">
        <h3 className="truncate text-sm" title={playlist.name}>
          {playlist.name}
        </h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Music className="h-3 w-3" />
          <span>
            {playlist.songs.length}{" "}
            {playlist.songs.length === 1 ? "song" : "songs"}
          </span>
        </p>
      </div>
    </div>
  );
}

export function PlaylistCardSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-square w-full rounded-sm" />
      <div className="pt-2 px-1">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2 mt-1" />
      </div>
    </div>
  );
}
