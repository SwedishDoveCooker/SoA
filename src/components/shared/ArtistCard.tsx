import { Skeleton } from "@/components/ui/skeleton";
import { Artist, Song } from "@/types";
import { Mic, Music, MoreHorizontal, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getArtistCover } from "@/lib/cover";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SongViewDialog } from "@/components/shared/SongViewDialog";
import { Button } from "@/components/ui/button";
import { useAlistStore } from "@/stores/alistStore";
import { usePlayerStore } from "@/stores/playerStore";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface ArtistCardProps extends React.HTMLAttributes<HTMLDivElement> {
  artist: Artist;
  songs: Song[];
}

export function ArtistCard({
  artist,
  songs,
  className,
  ...props
}: ArtistCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const { alists } = useAlistStore();
  const playerActions = usePlayerStore((state) => state.actions);

  useEffect(() => {
    setIsLoading(true);
    getArtistCover(artist.name, artist.songs, songs)
      .then(setCoverUrl)
      .finally(() => setIsLoading(false));
  }, [artist, songs]);

  const handleCardClick = () => {
    navigate(`/artist/${encodeURIComponent(artist.name)}`);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (artist.songs.length > 0) {
      playerActions.playQueue(artist.songs, 0);
    }
  };

  const handleOpenMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    const firstSong = songs.find((s) => artist.songs.includes(s.path));
    setViewingSong(firstSong || null);
  };

  const handleAddToAlist = async (alistName: string) => {
    try {
      await api.addElementToAlist(alistName, { Artist: artist });
      toast.success(t("Added"), {
        description: t('Artist added to "{{alistName}}"', { alistName }),
      });
    } catch (error) {
      toast.error(t("Failed to add"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <>
      <div
        className={cn(
          "w-full transition-all duration-300",
          "cursor-pointer",
          className
        )}
        onClick={handleCardClick}
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
              alt={artist.name}
              className="h-full w-full object-cover transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <Mic className="h-1/2 w-1/2 text-muted-foreground/30" />
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
                <DropdownMenuItem
                  onClick={handleOpenMetadata}
                  disabled={artist.songs.length === 0}
                >
                  {t("View Meta")}
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
                            key={`${artist.name}-${alist.name}`}
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-3">
          <h3 className="truncate text-sm" title={artist.name}>
            {artist.name}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Music className="h-3 w-3" />
            <span>
              {artist.songs.length}{" "}
              {artist.songs.length === 1 ? "song" : "songs"}
            </span>
          </p>
        </div>
      </div>

      <SongViewDialog
        song={viewingSong}
        open={!!viewingSong}
        onOpenChange={(open) => !open && setViewingSong(null)}
      />
    </>
  );
}

export function ArtistCardSkeleton() {
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
