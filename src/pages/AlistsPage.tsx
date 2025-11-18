import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAlistStore } from "@/stores/alistStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { usePlaylistStore } from "@/stores/playlistStore";
import { AlistEditDialog } from "@/components/shared/AlistEditDialog";
import { AlistCard, AlistCardSkeleton } from "@/components/shared/AlistCard";
import type { Alist } from "@/types";
import { CoverEditDialog } from "@/components/shared/CoverEditDialog";
import { useTranslation } from "react-i18next";

export function AlistsPage() {
  const { t } = useTranslation();
  const { alists, setAlists, isLoading } = useAlistStore();
  const { songs, artists, releases } = useLibraryStore();
  const { playlists, setPlaylists } = usePlaylistStore();

  const [dialogMode, setDialogMode] = useState<"create" | "rename" | null>(
    null
  );
  const [targetAlist, setTargetAlist] = useState<Alist | null>(null);
  const [alistToDelete, setAlistToDelete] = useState<Alist | null>(null);
  const [alistToClear, setAlistToClear] = useState<Alist | null>(null);
  const [alistToFreeze, setAlistToFreeze] = useState<Alist | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [coverTarget, setCoverTarget] = useState<{
    kind: "alist";
    name: string;
  } | null>(null);

  const refreshAlists = useCallback(async () => {
    try {
      const next = await api.getAllAlists();
      setAlists(next);
    } catch (error) {
      toast.error("Failed to refresh Alists", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [setAlists]);

  const refreshPlaylists = useCallback(async () => {
    try {
      const updated = await api.getAllPlaylists();
      setPlaylists(updated);
    } catch (error) {
      toast.error("Failed to refresh playlists", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [setPlaylists]);

  const handleOpenCreate = () => {
    setTargetAlist(null);
    setDialogMode("create");
  };

  const handleOpenEdit = (alist: Alist) => {
    setTargetAlist(alist);
    setDialogMode("rename");
  };

  const handleSaved = async () => {
    await refreshAlists();
  };

  const handleConfirmDelete = async () => {
    if (!alistToDelete) return;
    setIsMutating(true);
    try {
      await api.deleteAlist(alistToDelete.name);
      toast.success("Deleted", {
        description: `Removed Alist "${alistToDelete.name}"`,
      });
      await refreshAlists();
    } catch (error) {
      toast.error("Delete failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsMutating(false);
      setAlistToDelete(null);
    }
  };

  const handleConfirmClear = async () => {
    if (!alistToClear) return;
    setIsMutating(true);
    try {
      await api.clearAlistElements(alistToClear.name);
      toast.success("Cleared", {
        description: `Cleared elements from "${alistToClear.name}"`,
      });
      await refreshAlists();
    } catch (error) {
      toast.error("Clear failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsMutating(false);
      setAlistToClear(null);
    }
  };

  const handleConfirmFreeze = async () => {
    if (!alistToFreeze) return;
    setIsMutating(true);
    try {
      await api.freezeAlist(alistToFreeze.name);
      toast.success("Frozen", {
        description: `Created playlist from "${alistToFreeze.name}"`,
      });
      await Promise.all([refreshAlists(), refreshPlaylists()]);
    } catch (error) {
      toast.error("Freeze failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsMutating(false);
      setAlistToFreeze(null);
    }
  };

  return (
    <>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            {t("Alists")} ({isLoading ? "..." : alists.length})
          </h1>
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" /> {t("New Alist")}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <AlistCardSkeleton key={`alist-skeleton-${index}`} />
              ))
            : alists.map((alist) => (
                <AlistCard
                  key={alist.name}
                  alist={alist}
                  songs={songs}
                  artists={artists}
                  releases={releases}
                  playlists={playlists}
                  onEdit={handleOpenEdit}
                  onClear={setAlistToClear}
                  onDelete={setAlistToDelete}
                  onFreeze={setAlistToFreeze}
                  onEditCover={(current) =>
                    setCoverTarget({ kind: "alist", name: current.name })
                  }
                />
              ))}
        </div>
      </div>

      <AlistEditDialog
        open={!!dialogMode}
        onOpenChange={(open) => !open && setDialogMode(null)}
        alist={dialogMode === "rename" ? targetAlist : null}
        onSaved={handleSaved}
      />
      <CoverEditDialog
        target={coverTarget}
        open={!!coverTarget}
        onOpenChange={(open) => !open && setCoverTarget(null)}
      />

      <AlertDialog
        open={!!alistToDelete}
        onOpenChange={(open) => !open && setAlistToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Alist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete")}
              <span className="font-semibold"> {alistToDelete?.name}</span>?
              {t("This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isMutating}
            >
              {isMutating ? t("Deleting...") : t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!alistToClear}
        onOpenChange={(open) => !open && setAlistToClear(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Clear Alist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Remove all elements from")}
              <span className="font-semibold"> {alistToClear?.name}</span>?{" "}
              {t("This only resets the Alist structure.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClear}
              disabled={isMutating}
            >
              {isMutating ? t("Clearing...") : t("Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!alistToFreeze}
        onOpenChange={(open) => !open && setAlistToFreeze(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Freeze Alist")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This will convert")}
              <span className="font-semibold"> {alistToFreeze?.name}</span>{" "}
              {t("into a static playlist. Continue?")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFreeze}
              disabled={isMutating}
            >
              {isMutating ? t("Freezing...") : t("Freeze")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
