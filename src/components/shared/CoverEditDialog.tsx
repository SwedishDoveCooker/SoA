import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  COVER_FILE_FILTERS,
  type CoverKind,
  assignCustomCover,
  resetCustomCover,
  useCustomCoverUrl,
} from "@/stores/customCoverStore";
import { toast } from "sonner";

interface CoverEditDialogProps {
  target: { kind: CoverKind; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoverEditDialog({
  target,
  open,
  onOpenChange,
}: CoverEditDialogProps) {
  const { t } = useTranslation();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const effectiveKind = target?.kind ?? "playlist";
  const currentCoverUrl = useCustomCoverUrl(
    effectiveKind,
    target?.name ?? null
  );
  const displayPreview = preview ?? currentCoverUrl;
  const title = target
    ? target.kind === "playlist"
      ? t("Change Playlist Cover")
      : t("Change Alist Cover")
    : t("Change Cover");

  useEffect(() => {
    if (open) {
      setSelectedPath(null);
      setPreview(null);
    }
  }, [open, target?.name]);

  const description = useMemo(() => {
    if (!target)
      return t("Select a new image to override the generated cover.");
    return `Upload a custom image for "${target.name}". We'll cache it locally.`;
  }, [target, t]);

  const handlePick = async () => {
    try {
      const result = await openDialog({
        multiple: false,
        directory: false,
        filters: COVER_FILE_FILTERS,
        title,
      });
      const filePath = Array.isArray(result) ? result?.[0] : result;
      if (!filePath) return;
      setSelectedPath(filePath);
      setPreview(convertFileSrc(filePath));
    } catch (error) {
      toast.error(t("Failed to select image"), {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSave = async () => {
    if (!target || !selectedPath) return;
    setIsSaving(true);
    try {
      await assignCustomCover(target.kind, target.name, selectedPath);
      toast.success(t("Cover updated"), {
        description: `Applied new cover for "${target.name}"`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(t("Failed to update cover"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!target) return;
    setIsSaving(true);
    try {
      await resetCustomCover(target.kind, target.name);
      toast.success(t("Cover reset"), {
        description: `Reverted to auto-cover for "${target.name}"`,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(t("Failed to reset cover"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-col items-center gap-3">
            <div className="h-40 w-40 overflow-hidden rounded-md border bg-muted">
              {displayPreview ? (
                <img
                  src={displayPreview}
                  alt={target?.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  {t("No cover selected")}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Supported")}: {IMAGE_EXTENSIONS.join(", ")}
            </p>
            <Button variant="outline" size="sm" onClick={handlePick}>
              {t("Choose Image…")}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={isSaving || !target}
          >
            {t("Reset to Auto")}
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !selectedPath || !target}
            >
              {isSaving ? t("Saving…") : t("Apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "bmp", "webp"];
