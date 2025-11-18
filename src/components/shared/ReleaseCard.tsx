
import { Skeleton } from "@/components/ui/skeleton";
import { Release, Song } from "@/types";
import { Disc, MoreHorizontal, Play } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReleaseCover } from "@/lib/cover";
import { getReleaseRoute, getArtistRoute } from "@/lib/releaseUtils";
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

interface ReleaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  release: Release;
  songs: Song[];
}

export function ReleaseCard({
  release,
  songs,
  className,
  ...props
}: ReleaseCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingSong, setViewingSong] = useState<Song | null>(null);
  const { alists } = useAlistStore();
  const playerActions = usePlayerStore((state) => state.actions);

  useEffect(() => {
    setIsLoading(true);
    getReleaseCover(release.artist, release.songs, songs)
      .then(setCoverUrl)
      .finally(() => setIsLoading(false));
  }, [release, songs]);

  const handleCardClick = () => {
    const params = getReleaseRoute(release);
    navigate(`/${params}`);
  };

  const handleArtistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const route = getArtistRoute(release.artist);
    navigate(route);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (release.songs.length > 0) {
      playerActions.playQueue(release.songs, 0);
    }
  };

  const handleOpenMetadata = (e: React.MouseEvent) => {
    e.stopPropagation();
    const firstSong = songs.find((s) => release.songs.includes(s.path));
    setViewingSong(firstSong || null);
  };

  const handleAddToAlist = async (alistName: string) => {
    try {
      await api.addElementToAlist(alistName, { Release: release });
      toast.success(t("Added"), {
        description: t('Release added to "{{alistName}}"', { alistName }),
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
              alt={release.title}
              className="h-full w-full object-cover transition-transform duration-300"
            />
          ) : (
            <div className="h-full w-full bg-muted flex items-center justify-center">
              <Disc className="h-1/2 w-1/2 text-muted-foreground/30" />
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
                  disabled={release.songs.length === 0}
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
                            key={`${release.title}-${alist.name}`}
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
          <h3
            className="truncate text-sm"
            title={release.title || t("Unknown Release")}
          >
            {release.title || t("Unknown Release")}
          </h3>
          <p
            className="text-xs text-muted-foreground truncate hover:underline"
            onClick={handleArtistClick}
            title={release.artist || t("Unknown Artist")}
          >
            {release.artist || t("Unknown Artist")}
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

export function ReleaseCardSkeleton() {
  return (
    <div className="w-full">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="p-3">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2 mt-2" />
        <Skeleton className="h-3 w-1/3 mt-1" />
      </div>
    </div>
  );
}
