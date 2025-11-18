
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecentWithSong } from "./RecentsPage";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export const recentsColumnsFixed: ColumnDef<RecentWithSong>[] = [
  {
    accessorKey: "songData.title",
    header: "Title",
    cell: ({ row }) => (
      <div className="pl-4">
        {row.original.songData?.title || "Unknown Title"}
      </div>
    ),
  },
  {
    accessorKey: "songData.artist",
    header: "Artist",
    cell: ({ row }) => (
      <div>{row.original.songData?.artist || "Unknown Artist"}</div>
    ),
  },
  {
    accessorKey: "songData.release",
    header: "Release",
    cell: ({ row }) => (
      <div>{row.original.songData?.release || "Unknown Release"}</div>
    ),
  },
  {
    accessorKey: "accessed_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Played At
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div>{formatDate(row.getValue("accessed_at"))}</div>,
  },
];
