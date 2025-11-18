
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
import { Playlist } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { renameCustomCover } from "@/stores/customCoverStore";

interface PlaylistEditDialogProps {
  playlist?: Playlist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (newName: string) => void;
}

export function PlaylistEditDialog({
  playlist,
  open,
  onOpenChange,
  onSaved,
}: PlaylistEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!playlist;
  const title = isEditMode ? t("renamePlaylist") : t("createPlaylist");
  const description = isEditMode
    ? t("enterNewNameFor", { name: playlist.name })
    : t("enterNameForNewPlaylist");
  const buttonText = isEditMode ? t("save") : t("create");

  useEffect(() => {
    if (open) {
      setName(isEditMode ? playlist.name : "");
    }
  }, [open, playlist, isEditMode]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("nameCannotBeEmpty"));
      return;
    }

    setIsSaving(true);
    try {
      if (isEditMode && playlist) {
        await api.renamePlaylist(playlist.name, name);
        try {
          await renameCustomCover("playlist", playlist.name, name);
        } catch (err) {
          console.error("Failed to migrate playlist cover", err);
        }
        toast.success(t("renameSuccessful"), {
          description: t("renamedToast", {
            oldName: playlist.name,
            newName: name,
          }),
        });
      } else {
        await api.createPlaylist(name);
        toast.success(t("createSuccessful"), {
          description: t("createdPlaylistToast", { name }),
        });
      }
      onSaved(name);
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? t("renameFailed") : t("createFailed"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t("name")}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t("saving") : buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
