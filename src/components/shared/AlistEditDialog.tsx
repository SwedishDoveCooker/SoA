import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Disc, ListMusic, Mic, Music, X } from "lucide-react";
import type { Alist, Aelement, Artist, Playlist, Release } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { getElementKind, getElementKey, getElementLabel } from "@/lib/alist";
import { renameCustomCover } from "@/stores/customCoverStore";

type QuickSection<T extends Playlist | Release | Artist> = {
  id: "playlists" | "releases" | "artists";
  label: string;
  icon: ReactNode;
  items: T[];
  getSubtitle: (item: T) => string;
  factory: (item: T) => Aelement;
};

type PlaylistSection = QuickSection<Playlist> & { id: "playlists" };
type ReleaseSection = QuickSection<Release> & { id: "releases" };
type ArtistSection = QuickSection<Artist> & { id: "artists" };
type AnySection = PlaylistSection | ReleaseSection | ArtistSection;

interface AlistEditDialogProps {
  alist?: Alist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (newName: string) => void;
}

export function AlistEditDialog({
  alist,
  open,
  onOpenChange,
  onSaved,
}: AlistEditDialogProps) {
  const { t } = useTranslation();
  const { playlists } = usePlaylistStore();
  const { artists, releases } = useLibraryStore();
  const [name, setName] = useState("");
  const [elements, setElements] = useState<Aelement[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!alist;
  const title = isEditMode ? t("editAlist") : t("createAlist");
  const description = isEditMode
    ? t("editAlistDescription")
    : t("createAlistDescription");

  useEffect(() => {
    if (open) {
      setName(alist?.name ?? "");
      setElements(alist ? [...alist.elements] : []);
    }
  }, [open, alist]);

  const selectedKeys = useMemo(
    () => new Set(elements.map((element) => getElementKey(element))),
    [elements]
  );

  const handleAddElement = (element: Aelement) => {
    const key = getElementKey(element);
    if (selectedKeys.has(key)) return;
    setElements((prev) => [...prev, element]);
  };

  const handleRemoveElement = (index: number) => {
    setElements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearElements = () => setElements([]);

  const quickSections = useMemo<AnySection[]>(
    () => [
      {
        id: "playlists",
        label: t("playlists"),
        icon: <ListMusic className="h-4 w-4" />,
        items: playlists,
        getSubtitle: (item) => t("songCount", { count: item.songs.length }),
        factory: (item) => ({ Playlist: item }),
      } satisfies PlaylistSection,
      {
        id: "releases",
        label: t("releases"),
        icon: <Disc className="h-4 w-4" />,
        items: releases,
        getSubtitle: (item) => item.artist || t("unknownArtist"),
        factory: (item) => ({ Release: item }),
      } satisfies ReleaseSection,
      {
        id: "artists",
        label: t("artists"),
        icon: <Mic className="h-4 w-4" />,
        items: artists,
        getSubtitle: (item) => t("songCount", { count: item.songs.length }),
        factory: (item) => ({ Artist: item }),
      } satisfies ArtistSection,
    ],
    [playlists, releases, artists, t]
  );

  const renderTypedSection = <T extends Playlist | Release | Artist>(
    section: QuickSection<T>
  ) => {
    if (section.items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">{t("nothingToShow")}</p>
      );
    }

    return (
      <div className="max-h-64 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {section.items.map((item) => {
            const element = section.factory(item);
            const disabled = selectedKeys.has(getElementKey(element));
            return (
              <QuickAddCard
                key={getSectionItemKey(section.id, item)}
                title={getItemTitle(section.id, item)}
                subtitle={section.getSubtitle(item)}
                icon={section.icon}
                disabled={disabled}
                onClick={() => handleAddElement(element)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderSection = (section: AnySection) => {
    if (section.id === "playlists") return renderTypedSection(section);
    if (section.id === "releases") return renderTypedSection(section);
    return renderTypedSection(section);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(t("nameCannotBeEmpty"));
      return;
    }

    setIsSaving(true);
    try {
      const targetName = trimmedName;
      if (isEditMode && alist) {
        if (alist.name !== targetName) {
          await api.renameAlist(alist.name, targetName);
          try {
            await renameCustomCover("alist", alist.name, targetName);
          } catch (error) {
            console.error("Failed to migrate alist cover", error);
          }
        }
        await api.clearAlistElements(targetName);
      } else {
        await api.createAlist(targetName);
      }

      if (elements.length > 0) {
        await api.addElementsToAlist(targetName, elements);
      }

      toast.success(isEditMode ? t("alistUpdated") : t("alistCreated"), {
        description: isEditMode
          ? t("savedChangesTo", { name: targetName })
          : t("created", { name: targetName }),
      });
      onSaved(targetName);
      onOpenChange(false);
    } catch (error) {
      toast.error(isEditMode ? t("failedToUpdate") : t("failedToCreate"), {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="alist-name" className="text-right">
              {t("name")}
            </Label>
            <Input
              id="alist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">
                {t("elementsCount", { count: elements.length })}
              </p>
              {elements.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClearElements}>
                  {t("clearAll")}
                </Button>
              )}
            </div>
            {elements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noElementsYet")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {elements.map((element, index) => (
                  <ElementChip
                    key={`${getElementKey(element)}-${index}`}
                    element={element}
                    onRemove={() => handleRemoveElement(index)}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold">{t("quickAdd")}</p>
            <Accordion
              type="multiple"
              defaultValue={["playlists", "releases"]}
              className="mt-2 rounded-md border"
            >
              {quickSections.map((section) => (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger>{section.label}</AccordionTrigger>
                  <AccordionContent>{renderSection(section)}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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
            {isSaving
              ? t("saving")
              : isEditMode
              ? t("saveChanges")
              : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ElementChip({
  element,
  onRemove,
}: {
  element: Aelement;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const kind = getElementKind(element);
  const icon = KIND_ICONS[kind];
  return (
    <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs shadow-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="max-w-[160px] truncate text-sm">
        {getElementLabel(element)}
      </span>
      <button
        type="button"
        className="rounded-full p-1 hover:bg-muted"
        onClick={onRemove}
        aria-label={t("removeElement")}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface QuickAddCardProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}

function QuickAddCard({
  title,
  subtitle,
  icon,
  disabled,
  onClick,
}: QuickAddCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 text-left shadow-sm transition hover:border-primary",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </button>
  );
}

const KIND_ICONS = {
  song: <Music className="h-3.5 w-3.5" />,
  playlist: <ListMusic className="h-3.5 w-3.5" />,
  release: <Disc className="h-3.5 w-3.5" />,
  artist: <Mic className="h-3.5 w-3.5" />,
} as const;

function getSectionItemKey(
  sectionId: string,
  item: Playlist | Release | Artist
) {
  if (sectionId === "playlists") return `playlist-${(item as Playlist).name}`;
  if (sectionId === "releases")
    return `release-${(item as Release).title}-${
      (item as Release).artist ?? ""
    }`;
  return `artist-${(item as Artist).name}`;
}

function getItemTitle(sectionId: string, item: Playlist | Release | Artist) {
  if (sectionId === "playlists") return (item as Playlist).name;
  if (sectionId === "releases")
    return (item as Release).title || "Unknown Release";
  return (item as Artist).name;
}
