import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListChecks, MoreHorizontal, Play } from "lucide-react";
import type { Alist, Artist, Playlist, Release, Song } from "@/types";
import { cn } from "@/lib/utils";
import { getPlaylistCover } from "@/lib/cover";
import { expandAlistSongs, getAlistCoverCandidates } from "@/lib/alist";
import { useCustomCoverUrl } from "@/stores/customCoverStore";
import { useTranslation } from "react-i18next";
import { usePlayerStore } from "@/stores/playerStore";

interface AlistCardProps extends React.HTMLAttributes<HTMLDivElement> {
  alist: Alist;
  songs: Song[];
  playlists: Playlist[];
  releases: Release[];
  artists: Artist[];
  onEdit: (alist: Alist) => void;
  onClear: (alist: Alist) => void;
  onDelete: (alist: Alist) => void;
  onFreeze: (alist: Alist) => void;
  onEditCover: (alist: Alist) => void;
}

export function AlistCard({
  alist,
  songs,
  playlists,
  releases,
  artists,
  className,
  onEdit,
  onDelete,
  onClear,
  onFreeze,
  onEditCover,
  ...props
}: AlistCardProps) {
  const navigate = useNavigate();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState(true);
  const customCoverUrl = useCustomCoverUrl("alist", alist.name);
  const { t } = useTranslation();
  const playerActions = usePlayerStore((state) => state.actions);

  const context = useMemo(
    () => ({ songs, playlists, releases, artists }),
    [songs, playlists, releases, artists]
  );

  const alistSongs = useMemo(
    () => expandAlistSongs(alist, context),
    [alist, context]
  );

  useEffect(() => {
    let isMounted = true;
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
        if (isMounted) {
          setCoverUrl(cover);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCoverLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [alist, context, songs, customCoverUrl]);

  const handleNavigate = () => {
    navigate(`/alist/${encodeURIComponent(alist.name)}`);
  };

  const handlePlay = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (alistSongs.length > 0) {
      playerActions.playQueue(
        alistSongs.map((s) => s.path),
        0
      );
    }
  };

  return (
    <div
      className={cn(
        "w-full cursor-pointer transition-all duration-300",
        className
      )}
      onClick={handleNavigate}
      {...props}
    >
      <div className="group relative aspect-square w-full overflow-hidden rounded-sm bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg">
        {isCoverLoading ? (
          <Skeleton className="h-full w-full" />
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt={alist.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ListChecks className="h-1/2 w-1/2 text-muted-foreground/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
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
              <DropdownMenuItem onClick={() => onEdit(alist)}>
                {t("Edit Alist")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditCover(alist)}>
                {t("Change Cover")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFreeze(alist)}>
                {t("Freeze to Playlist")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onClear(alist)}>
                {t("Clear Elements")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={() => onDelete(alist)}
              >
                {t("Delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-1 pt-2">
        <h3 className="truncate text-sm" title={alist.name}>
          {alist.name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {alistSongs.length} songs • {alist.elements.length} elements
        </p>
      </div>
    </div>
  );
}

export function AlistCardSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-square w-full rounded-sm" />
      <div className="px-1 pt-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="mt-1 h-3 w-1/2" />
        <Skeleton className="mt-1 h-2 w-2/3" />
      </div>
    </div>
  );
}
