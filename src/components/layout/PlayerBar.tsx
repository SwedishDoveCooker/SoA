
import { cn } from "@/lib/utils";
import React, { useEffect, useMemo, useState } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayerStore } from "@/stores/playerStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { Song, RepeatMode, Recent } from "@/types";
import { getCoverArt } from "@/lib/cover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { LyricsDialog } from "@/components/shared/LyricsDialog";

function formatTime(seconds: number): string {
  const validSeconds = Math.round(
    isNaN(seconds) || !isFinite(seconds) ? 0 : seconds
  );
  const m = Math.floor(validSeconds / 60);
  const s = Math.floor(validSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const PlayerBar = ({ className }: { className?: string }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    currentPath,
    isShuffling,
    repeatMode,
    volume,
    actions,
  } = usePlayerStore();

  const { seek, _setIsSeeking, _setLocalCurrentTime, _setSeekRequestTime } =
    actions;

  const allSongs = useLibraryStore((state) => state.songs);

  const [currentSong, setCurrentSong] = React.useState<Song | null>(null);
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = React.useState(false);
  const [, setIsHovering] = React.useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);

  const roundedCurrentTime = Math.round(currentTime);
  const roundedDuration = Math.round(duration);

  useEffect(() => {
    if (currentPath) {
      const song = allSongs.find((s) => s.path === currentPath) || null;
      setCurrentSong(song);

      if (song) {
        setIsCoverLoading(true);
        getCoverArt(song)
          .then(setCoverUrl)
          .finally(() => setIsCoverLoading(false));

        const recent: Recent = {
          song: song.path,
          accessed_at: new Date().toISOString(),
        };
        api.addRecents(recent).catch(console.error);
      } else {
        setCoverUrl(null);
      }
    } else {
      setCurrentSong(null);
      setCoverUrl(null);
    }
  }, [currentPath, allSongs]);

  const RepeatIcon = useMemo(() => {
    if (repeatMode === RepeatMode.CURRENT_ITEM_IN_LOOP) return Repeat1;
    if (repeatMode === RepeatMode.LOOP) return Repeat;
    return Repeat;
  }, [repeatMode]);

  const VolumeIcon = useMemo(() => {
    if (volume === 0) return VolumeX;
    if (volume < 0.5) return Volume1;
    return Volume2;
  }, [volume]);

  const handleSeekPreview = (value: number[]) => {
    _setIsSeeking(true);
    _setLocalCurrentTime(value[0]);
  };

  const handleSeekCommit = (value: number[]) => {
    const newTime = value[0];
    _setIsSeeking(false);
    _setSeekRequestTime(newTime);
    seek(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    actions.setVolume(value[0]);
  };

  return (
    <>
      <footer
        className={cn(
          "h-20 bg-background border-t p-4 flex items-center justify-between",
          "group",
          className
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {}
        <div className="flex w-1/4 justify-start items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              isShuffling && "text-primary hover:text-primary"
            )}
            onClick={actions.toggleShuffle}
          >
            <Shuffle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={actions.prevTrack}
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={actions.togglePlayPause}
            disabled={!currentSong}
          >
            {}
            {isPlaying ? (
              <Pause className="h-6 w-6 fill-current" />
            ) : (
              <Play className="h-6 w-6 fill-current" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={actions.nextTrack}
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9",
              repeatMode !== RepeatMode.SEQUENTIAL &&
                "text-primary hover:text-primary"
            )}
            onClick={actions.cycleRepeatMode}
          >
            <RepeatIcon className="h-5 w-5" />
          </Button>
        </div>

        {}
        <div
          className={cn(
            "relative w-1/2 max-w-lg h-14",
            "bg-card border rounded",
            "flex items-stretch gap-0",
            "overflow-hidden"
          )}
        >
          {}
          {}
          {isCoverLoading ? (
            <Skeleton
              className="h-full w-14 rounded-none shrink-0 cursor-pointer"
              onClick={() => setIsLyricsOpen(true)}
            />
          ) : coverUrl ? (
            <img
              src={coverUrl}
              alt="cover"
              className="h-full w-14 object-cover rounded-none shrink-0 cursor-pointer"
              onClick={() => setIsLyricsOpen(true)}
            />
          ) : (
            <div
              className="h-full w-14 bg-muted rounded-none shrink-0 cursor-pointer"
              onClick={() => setIsLyricsOpen(true)}
            />
          )}

          {}
          <div
            className={cn(
              "flex flex-col justify-start items-center min-w-0",
              "pl-2.5 pr-2.5 pt-1.5",
              "flex-1"
            )}
          >
            <h3 className="font-normal truncate text-xs">
              {}
              {currentSong?.title || ""}
            </h3>
            <p className="text-[11px] leading-tight text-muted-foreground truncate">
              {}
              {currentSong?.artist || ""}
            </p>
          </div>

          {}
          <div
            className={cn(
              "absolute bottom-0 left-14 right-0",
              "px-2.5 pb-0.5"
            )}
          >
            {}
            <div
              className={cn(
                "flex justify-between text-[11px] text-muted-foreground",
                "transition-opacity opacity-0 group-hover:opacity-100",
                "px-0.5"
              )}
            >
              {}
              <span>{formatTime(roundedCurrentTime)}</span>
              <span>
                -{formatTime(Math.max(0, roundedDuration - roundedCurrentTime))}
              </span>
            </div>

            {}
            <Slider
              value={[currentTime]}
              max={duration || 1}
              step={0.1}
              onValueChange={handleSeekPreview}
              onValueCommit={handleSeekCommit}
              disabled={!currentSong}
              className={cn(
                "w-full",
                "[&>span[role=slider]]:opacity-0 group-hover:[&>span[role=slider]]:opacity-100 transition-opacity"
              )}
            />
          </div>
        </div>

        {}
        <div className="flex items-center justify-end w-1/4 gap-2">
          {}

          <Button variant="ghost" size="icon" className="h-9 w-9">
            <VolumeIcon className="h-5 w-5" />
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            orientation="horizontal"
            className={cn(
              "w-28"
            )}
          />
        </div>
      </footer>

      {}
      <LyricsDialog open={isLyricsOpen} onOpenChange={setIsLyricsOpen} />
    </>
  );
};
