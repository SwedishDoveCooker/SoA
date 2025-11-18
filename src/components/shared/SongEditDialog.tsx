
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ChevronDown, Disc, ImagePlus } from "lucide-react";
import { Song, Score } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCoverArt } from "@/lib/cover";
import { Skeleton } from "@/components/ui/skeleton";
import { convertFileSrc } from "@tauri-apps/api/core";

interface SongEditDialogProps {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const getGroupedScoreOptions = (t: (key: string) => string) => [
  {
    label: t("songEdit.score.superBigCup"),
    scores: [
      { value: Score.SuperBigCupUp, label: t("songEdit.score.superBigCupUp") },
      { value: Score.SuperBigCup, label: t("songEdit.score.superBigCup") },
      {
        value: Score.SuperBigCupDown,
        label: t("songEdit.score.superBigCupDown"),
      },
    ],
  },
  {
    label: t("songEdit.score.bigCup"),
    scores: [
      { value: Score.BigCupUp, label: t("songEdit.score.bigCupUp") },
      { value: Score.BigCup, label: t("songEdit.score.bigCup") },
      { value: Score.BigCupDown, label: t("songEdit.score.bigCupDown") },
    ],
  },
  {
    label: t("songEdit.score.medCup"),
    scores: [
      { value: Score.MedCupUp, label: t("songEdit.score.medCupUp") },
      { value: Score.MedCup, label: t("songEdit.score.medCup") },
      { value: Score.MedCupDown, label: t("songEdit.score.medCupDown") },
    ],
  },
  {
    label: t("songEdit.score.others"),
    scores: [
      { value: Score.HardToSay, label: t("songEdit.score.hardToSay") },
      { value: Score.SuperSmallCup, label: t("songEdit.score.superSmallCup") },
    ],
  },
  {
    label: t("songEdit.score.noScore"),
    scores: [{ value: "none", label: t("songEdit.score.noScore") }],
  },
];

function formatScore(
  score: Score | null | undefined,
  t: (key: string) => string
): string {
  if (!score) return t("songEdit.score.noScore");

  const scoreMap: Record<Score, string> = {
    [Score.SuperBigCupUp]: t("songEdit.score.superBigCupUp"),
    [Score.SuperBigCup]: t("songEdit.score.superBigCup"),
    [Score.SuperBigCupDown]: t("songEdit.score.superBigCupDown"),
    [Score.BigCupUp]: t("songEdit.score.bigCupUp"),
    [Score.BigCup]: t("songEdit.score.bigCup"),
    [Score.BigCupDown]: t("songEdit.score.bigCupDown"),
    [Score.MedCupUp]: t("songEdit.score.medCupUp"),
    [Score.MedCup]: t("songEdit.score.medCup"),
    [Score.MedCupDown]: t("songEdit.score.medCupDown"),
    [Score.HardToSay]: t("songEdit.score.hardToSay"),
    [Score.SuperSmallCup]: t("songEdit.score.superSmallCup"),
  };
  return scoreMap[score] || "-";
}

export function SongEditDialog({
  song,
  open,
  onOpenChange,
  onSaved,
}: SongEditDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Song>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null);
  const [isCoverLoading, setIsCoverLoading] = useState(true);
  const [newCoverPath, setNewCoverPath] = useState<string | null>(null);
  const [newCoverUrl, setNewCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (song && open) {
      setIsCoverLoading(true);
      setNewCoverPath(null);
      setNewCoverUrl(null);
      setFormData({
        path: song.path,
        title: song.title,
        artist: song.artist,
        release: song.release,
        score: song.score,
        duration: song.duration,
        created_at: song.created_at,
        updated_at: song.updated_at,
      });

      getCoverArt(song)
        .then(setCurrentCoverUrl)
        .finally(() => setIsCoverLoading(false));
    }
  }, [song, open]);

  const handleSelectCover = async () => {
    try {
      const result = await openDialog({
        multiple: false,
        filters: [
          {
            name: t("songEdit.coverDialog.filterName"),
            extensions: ["png", "jpg", "jpeg", "webp"],
          },
        ],
        title: t("songEdit.coverDialog.title"),
      });
      if (typeof result === "string" && result.trim() !== "") {
        setNewCoverPath(result);
        setNewCoverUrl(convertFileSrc(result));
      }
    } catch (e) {
      toast.error(t("songEdit.toast.selectFileError"), {
        description: String(e),
      });
    }
  };

  const handleSave = async () => {
    if (!song) return;

    setIsSaving(true);
    try {
      const updatedSong: Song = {
        ...song,
        ...formData,
      };

      await api.update_song_tags(updatedSong, newCoverPath);

      toast.success(t("songEdit.toast.saveSuccess"), {
        description: `${t("songEdit.toast.updatedSong")}: ${
          updatedSong.title || t("songEdit.toast.unknownTitle")
        }`,
      });

      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(t("songEdit.toast.saveError"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreChange = (value: string) => {
    setFormData({
      ...formData,
      score: value === "none" ? null : (value as Score),
    });
  };

  if (!song) return null;

  const displayCoverUrl = newCoverUrl || currentCoverUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {}
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{t("songEdit.dialog.title")}</DialogTitle>
          <DialogDescription>
            {t("songEdit.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        {}
        <div className="flex gap-6 py-4">
          {}
          <div className="flex flex-col items-center gap-2 w-1/3 shrink-0">
            <div
              className={cn(
                "relative w-full aspect-square rounded-md overflow-hidden",
                "bg-muted flex items-center justify-center"
              )}
            >
              {isCoverLoading ? (
                <Skeleton className="h-full w-full" />
              ) : displayCoverUrl ? (
                <img
                  src={displayCoverUrl}
                  alt="cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Disc className="h-16 w-16 text-muted-foreground/30" />
              )}

              {}
              <div
                className={cn(
                  "absolute inset-0 bg-black/50 flex items-center justify-center",
                  "opacity-0 hover:opacity-100 transition-opacity"
                )}
              >
                <Button variant="outline" size="sm" onClick={handleSelectCover}>
                  <ImagePlus className="mr-2" />
                  {t("songEdit.cover.modify")}
                </Button>
              </div>
            </div>
            {newCoverUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setNewCoverPath(null);
                  setNewCoverUrl(null);
                }}
              >
                {t("songEdit.cover.revert")}
              </Button>
            )}
          </div>

          {}
          <div className="grid gap-4 flex-1">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                {t("songEdit.form.title")}
              </Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="artist" className="text-right">
                {t("songEdit.form.artist")}
              </Label>
              <Input
                id="artist"
                value={formData.artist || ""}
                onChange={(e) =>
                  setFormData({ ...formData, artist: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="release" className="text-right">
                {t("songEdit.form.release")}
              </Label>
              <Input
                id="release"
                value={formData.release || ""}
                onChange={(e) =>
                  setFormData({ ...formData, release: e.target.value })
                }
                className="col-span-3"
              />
            </div>

            {}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="score" className="text-right">
                {t("songEdit.form.score")}
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "col-span-3 justify-between font-normal",
                      !formData.score && "text-muted-foreground"
                    )}
                  >
                    <span>{formatScore(formData.score, t)}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width)">
                  {getGroupedScoreOptions(t).map((group) =>
                    group.label === "None" ? (
                      <DropdownMenuItem
                        key={group.scores[0].value}
                        onSelect={() =>
                          handleScoreChange(group.scores[0].value)
                        }
                        className={cn(
                          (!formData.score || formData.score === null) &&
                            "bg-accent/50"
                        )}
                      >
                        {group.scores[0].label}
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuSub key={group.label}>
                        <DropdownMenuSubTrigger>
                          {group.label}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                          <DropdownMenuSubContent>
                            {group.scores.map((option) => (
                              <DropdownMenuItem
                                key={option.value}
                                onSelect={() => handleScoreChange(option.value)}
                                className={cn(
                                  formData.score === option.value &&
                                    "bg-accent/50"
                                )}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label
                htmlFor="path"
                className="text-right text-muted-foreground"
              >
                {t("songEdit.form.filePath")}
              </Label>
              <Input
                id="path"
                value={song.path}
                disabled
                className="col-span-3 text-muted-foreground text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("songEdit.button.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("songEdit.button.saving") : t("songEdit.button.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
