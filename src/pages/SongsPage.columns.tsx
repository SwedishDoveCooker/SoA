
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Song, Score } from "@/types";
import { ArrowUpDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { TableMeta } from "./SongsPage.datatable";

function formatDuration(seconds: number | null): string {
  if (seconds === null || isNaN(seconds)) return "-";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const groupedScoreOptions = [
  {
    label: "😉 Super Big Cup",
    scores: [
      { value: Score.SuperBigCupUp, label: "🥰 Super Big Cup Up" },
      { value: Score.SuperBigCup, label: "😋 Super Big Cup" },
      { value: Score.SuperBigCupDown, label: "☺️ Super Big Cup Down" },
    ],
  },
  {
    label: "🥹 Big Cup",
    scores: [
      { value: Score.BigCupUp, label: "😏 Big Cup Up" },
      { value: Score.BigCup, label: "🥺 Big Cup" },
      { value: Score.BigCupDown, label: "🤔 Big Cup Down" },
    ],
  },
  {
    label: "🤨 Med Cup",
    scores: [
      { value: Score.MedCupUp, label: "🫣 Med Cup Up" },
      { value: Score.MedCup, label: "🤓 Med Cup" },
      { value: Score.MedCupDown, label: "😓 Med Cup Down" },
    ],
  },
  {
    label: "😅 Others",
    scores: [
      { value: Score.HardToSay, label: "🤔 Hard to Say" },
      { value: Score.SuperSmallCup, label: "😁 Super Small Cup" },
    ],
  },
  {
    label: "🧐 No Score",
    scores: [{ value: "none", label: "🙌 No Score" }],
  },
];
const flatScores = groupedScoreOptions.flatMap((g) => g.scores);

function formatScore(score: Score | null): string {
  if (!score) return "-";
  return flatScores.find((s) => s.value === score)?.label || "-";
}

function getScoreValue(score: Score | null): number {
  if (!score) return 0;
  const scoreValues: Record<Score, number> = {
    [Score.SuperBigCupUp]: 11,
    [Score.SuperBigCup]: 10,
    [Score.SuperBigCupDown]: 9,
    [Score.BigCupUp]: 8,
    [Score.BigCup]: 7,
    [Score.BigCupDown]: 6,
    [Score.MedCupUp]: 5,
    [Score.MedCup]: 4,
    [Score.MedCupDown]: 3,
    [Score.HardToSay]: 2,
    [Score.SuperSmallCup]: 1,
  };
  return scoreValues[score] || 0;
}

function getScoreStyling(score: Score | null) {
  const styling = {
    colorClass: "border-muted text-muted-foreground",
  };

  if (!score) return styling;

  switch (score) {
    case Score.SuperBigCupUp:
    case Score.SuperBigCup:
    case Score.SuperBigCupDown:
      styling.colorClass =
        "border-red-500/50 text-red-500 font-medium bg-red-500/10";
      break;
    case Score.BigCupUp:
    case Score.BigCup:
    case Score.BigCupDown:
      styling.colorClass =
        "border-orange-500/50 text-orange-500 bg-orange-500/10";
      break;
    case Score.MedCupUp:
    case Score.MedCup:
    case Score.MedCupDown:
      styling.colorClass =
        "border-yellow-500/50 text-yellow-600 dark:text-yellow-500 bg-yellow-500/10";
      break;
    case Score.HardToSay:
    case Score.SuperSmallCup:
      styling.colorClass = "border-gray-500/50 text-gray-500 bg-gray-500/10";
      break;
    default:
      break;
  }
  return styling;
}

const titleColumn: ColumnDef<Song> = {
  accessorKey: "title",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  },
  cell: ({ row }) => (
    <div className="pl-4">{row.getValue("title") || "Unknown Title"}</div>
  ),
};

const artistColumn: ColumnDef<Song> = {
  accessorKey: "artist",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Artist
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  },
  cell: ({ row }) => <div>{row.getValue("artist") || "Unknown Artist"}</div>,
};

const releaseColumn: ColumnDef<Song> = {
  accessorKey: "release",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Release
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  },
  cell: ({ row }) => <div>{row.getValue("release") || "Unknown Release"}</div>,
};

const scoreColumn: ColumnDef<Song> = {
  accessorKey: "score",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <Star className="mr-2 h-4 w-4" />
        Score
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  },
  cell: ({ row, table }) => {
    const song = row.original;
    const score = row.getValue("score") as Score | null;
    const { colorClass } = getScoreStyling(score);

    const handleScoreChange = (table.options.meta as TableMeta)
      ?.handleScoreChange;

    const handleValueChange = (value: string) => {
      const newScore = value === "none" ? null : (value as Score);
      if (handleScoreChange) {
        handleScoreChange(song, newScore);
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start text-left font-normal h-8 px-2"
            title={`Modify score: ${formatScore(score)}`}
          >
            {}
            <div
              className={cn(
                "rounded-md border px-2 py-0.5",
                "text-xs",
                score ? colorClass : "border-muted text-muted-foreground"
              )}
            >
              {formatScore(score)} {}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {groupedScoreOptions.map((group) =>
            group.label === "🧐 No Score" ? (
              <DropdownMenuItem
                key={group.scores[0].value}
                onSelect={() => handleValueChange(group.scores[0].value)}
                className={cn(!score && "bg-accent/50")}
              >
                {group.scores[0].label}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuSub key={group.label}>
                <DropdownMenuSubTrigger>{group.label}</DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {group.scores.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => handleValueChange(option.value)}
                        className={cn(score === option.value && "bg-accent/50")}
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
    );
  },
  sortingFn: (rowA, rowB) => {
    const scoreA = getScoreValue(rowA.getValue("score"));
    const scoreB = getScoreValue(rowB.getValue("score"));
    return scoreA - scoreB;
  },
};
const durationColumn: ColumnDef<Song> = {
  accessorKey: "duration",
  header: ({ column }) => {
    return (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Duration
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    );
  },
  cell: ({ row }) => (
    <div className="text-right pr-4">
      {formatDuration(row.getValue("duration"))}
    </div>
  ),
};

export const columns: ColumnDef<Song>[] = [
  titleColumn,
  artistColumn,
  releaseColumn,
  scoreColumn,
  durationColumn,
];

export const detailPageColumns: ColumnDef<Song>[] = [
  titleColumn,
  scoreColumn,
  durationColumn,
];
