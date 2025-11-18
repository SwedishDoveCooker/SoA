
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Song, Score } from "@/types";
import { useTranslation } from "react-i18next";

interface SongViewDialogProps {
  song: Song | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || isNaN(seconds)) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatScore(
  score: Score | null | undefined,
  t: (key: string) => string
): string {
  if (!score) return t("songViewDialog.score.noScore");

  const scoreMap: Record<Score, string> = {
    [Score.SuperBigCupUp]: t("songViewDialog.score.superBigCupUp"),
    [Score.SuperBigCup]: t("songViewDialog.score.superBigCup"),
    [Score.SuperBigCupDown]: t("songViewDialog.score.superBigCupDown"),
    [Score.BigCupUp]: t("songViewDialog.score.bigCupUp"),
    [Score.BigCup]: t("songViewDialog.score.bigCup"),
    [Score.BigCupDown]: t("songViewDialog.score.bigCupDown"),
    [Score.MedCupUp]: t("songViewDialog.score.medCupUp"),
    [Score.MedCup]: t("songViewDialog.score.medCup"),
    [Score.MedCupDown]: t("songViewDialog.score.medCupDown"),
    [Score.HardToSay]: t("songViewDialog.score.hardToSay"),
    [Score.SuperSmallCup]: t("songViewDialog.score.superSmallCup"),
  };
  return scoreMap[score] || "-";
}

function DescriptionItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground text-right">
        {label}
      </span>
      <span className="col-span-2 text-sm wrap-break-word min-w-0">
        {value || "-"}
      </span>
    </div>
  );
}

export function SongViewDialog({
  song,
  open,
  onOpenChange,
}: SongViewDialogProps) {
  const { t } = useTranslation();

  if (!song) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{t("songViewDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("songViewDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          <DescriptionItem
            label={t("songViewDialog.fields.title")}
            value={song.title}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.artist")}
            value={song.artist}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.release")}
            value={song.release}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.score")}
            value={formatScore(song.score, t)}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.duration")}
            value={formatDuration(song.duration)}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.createdAt")}
            value={new Date(song.created_at).toLocaleString()}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.updatedAt")}
            value={new Date(song.updated_at).toLocaleString()}
          />
          <DescriptionItem
            label={t("songViewDialog.fields.filePath")}
            value={song.path}
          />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t("songViewDialog.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
