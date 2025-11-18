
import { Skeleton } from "@/components/ui/skeleton";
import { Song } from "@/types";
import { Disc, MoreHorizontal, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCoverArt } from "@/lib/cover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/playerStore";
import { useTranslation } from "react-i18next";

interface SongCoverCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onContextMenu"> {
  song: Song;
  onContextMenu?: (song: Song, e: React.MouseEvent<HTMLDivElement>) => void;
}

export function SongCoverCard({
  song,
  className,
  onContextMenu,
  ...props
}: SongCoverCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const playerActions = usePlayerStore((state) => state.actions);

  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getCoverArt(song)
      .then(setCoverUrl)
      .finally(() => setIsLoading(false));
  }, [song]);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (song.release && song.artist) {
      navigate(
        `/release/${encodeURIComponent(song.release)}/${encodeURIComponent(
          song.artist
        )}`
      );
    } else {
      console.log("Cannot navigate, missing release or artist");
    }
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playerActions.playSong(song.path);
    console.log("Play song:", song.title);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(song, e as React.MouseEvent<HTMLDivElement>);
  };

  return (
    <div
      className={cn(
        "w-full transition-all duration-300",
        "cursor-pointer",
        className
      )}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      {...props}
    >
      <div
        className={cn(
          "group relative w-full aspect-square overflow-hidden",
          "rounded-md",
          "bg-card text-card-foreground",
          "shadow-md hover:shadow-lg transition-shadow"
        )}
      >
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : coverUrl ? (
          <img
            src={coverUrl}
            alt={song.title || "Song cover"}
            className="h-full w-full object-cover transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full bg-muted flex items-center justify-center">
            <Disc className="h-1/2 w-1/2 text-muted-foreground/30" />
          </div>
        )}

        {}
        <div
          className={cn(
            "absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          )}
        >
          {}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 left-2 h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
            onClick={handlePlay}
          >
            <Play className="h-5 w-5 fill-white" />
          </Button>

          {}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-9 w-9 rounded-full text-white hover:bg-white/20 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu?.(
                song,
                e as unknown as React.MouseEvent<HTMLDivElement>
              );
            }}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {}
      <div className="p-3">
        <h3
          className="truncate text-sm"
          title={song.title || t("Unknown Title")}
        >
          {song.title || t("Unknown Title")}
        </h3>
        <p
          className="text-xs text-muted-foreground truncate"
          title={song.artist || t("Unknown Artist")}
        >
          {song.artist || t("Unknown Artist")}
        </p>
      </div>
    </div>
  );
}

export function SongCoverCardSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="p-3">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2 mt-2" />
      </div>
    </div>
  );
}
