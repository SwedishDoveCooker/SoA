import { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SongCoverCard } from "@/components/shared/SongCoverCard";
import { useLibraryStore } from "@/stores/libraryStore";
import { Score, Song } from "@/types";
import { cn } from "@/lib/utils";
import { Shuffle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getCoverArt } from "@/lib/cover";
import { Skeleton } from "@/components/ui/skeleton";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useTranslation } from "react-i18next";

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

const scoreValues: Record<Score, number> = {
  [Score.SuperSmallCup]: 1,
  [Score.HardToSay]: 2,
  [Score.MedCupDown]: 3,
  [Score.MedCup]: 4,
  [Score.MedCupUp]: 5,
  [Score.BigCupDown]: 6,
  [Score.BigCup]: 7,
  [Score.BigCupUp]: 8,
  [Score.SuperBigCupDown]: 9,
  [Score.SuperBigCup]: 10,
  [Score.SuperBigCupUp]: 11,
};

function formatScore(score: Score): string {
  return flatScores.find((s) => s.value === score)?.label || "-";
}

function StatCard({
  title,
  value,
  description,
  valueClassName,
}: {
  title: string;
  value: string | number;
  description: string;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className={cn("text-4xl", valueClassName)}>
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function HistogramBar({
  label,
  percentage,
  onClick,
}: {
  label: string;
  value: number;
  maxValue: number;
  percentage: number;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1 text-sm truncate group-hover:opacity-80 transition-opacity">
        {}
        {label} ({percentage.toFixed(0)}%)
      </div>
      {}
      {}
    </div>
  );
}

export function ScorePage() {
  const { t } = useTranslation();
  const { songs, isLoading, setSongs, setArtists, setReleases } =
    useLibraryStore();
  const [activeAccordionItem, setActiveAccordionItem] = useState<string | null>(
    Score.SuperBigCup
  );
  const [reviewSong, setReviewSong] = useState<Song | null>(null);
  const [reviewCover, setReviewCover] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  const stats = useMemo(() => {
    const totalSongs = songs.length;
    if (totalSongs === 0) {
      return {
        totalSongs: 0,
        ratedCount: 0,
        unratedCount: 0,
        ratedPercent: 0,
        distribution: new Map(),
        averageScore: "-",
        modeScore: null,
        modeScoreLabel: "-",
        maxDistributionCount: 0,
        unratedSongs: [],
      };
    }
    const ratedSongs = songs.filter((s) => s.score !== null);
    const unratedSongs = songs.filter((s) => s.score === null);
    const ratedPercent = (ratedSongs.length / totalSongs) * 100;
    const distribution = new Map<Score, Song[]>();
    flatScores.forEach((s) => distribution.set(s.value as Score, []));
    let totalScoreValue = 0;
    let modeScore: Score | null = null;
    let maxCount = 0;
    for (const song of ratedSongs) {
      if (song.score) {
        distribution.get(song.score)?.push(song);
        totalScoreValue += scoreValues[song.score];
        const count = distribution.get(song.score)!.length;
        if (count > maxCount) {
          maxCount = count;
          modeScore = song.score;
        }
      }
    }
    const maxDistributionCount = Math.max(maxCount, unratedSongs.length);
    const averageScoreValue =
      ratedSongs.length > 0 ? totalScoreValue / ratedSongs.length : 0;
    const averageScoreLabel = (Object.keys(scoreValues) as Score[]).find(
      (key) => scoreValues[key] >= Math.round(averageScoreValue)
    );

    return {
      totalSongs,
      ratedCount: ratedSongs.length,
      unratedCount: unratedSongs.length,
      ratedPercent,
      distribution,
      averageScore: averageScoreLabel ? formatScore(averageScoreLabel) : "-",
      modeScore,
      modeScoreLabel: modeScore ? formatScore(modeScore) : "-",
      maxDistributionCount,
      unratedSongs,
    };
  }, [songs]);

  const { chartData, chartConfig } = useMemo(() => {
    const getSortValue = (value: string) => {
      if (value === "none") return 0;
      return scoreValues[value as Score] || 99;
    };

    const sortedScoreDefs = [...flatScores].sort(
      (a, b) => getSortValue(a.value) - getSortValue(b.value)
    );

    const chartData = sortedScoreDefs.map((scoreDef) => ({
      name: scoreDef.label,
      count: stats.distribution.get(scoreDef.value as Score)?.length || 0,
    }));

    const chartConfig: ChartConfig = {
      count: {
        label: "Number of Songs",
        color: "var(--chart-1)",
      },
    };

    return { chartData, chartConfig };
  }, [stats.distribution]);

  const handleSongRated = useCallback(async () => {
    try {
      const [songs, artists, releases] = await Promise.all([
        api.getAllSongs(),
        api.getAllArtists(),
        api.getAllReleases(),
      ]);
      setSongs(songs);
      setArtists(artists);
      setReleases(releases);
    } catch (e) {
      toast.error(t("Failed to refresh"), { description: String(e) });
    }
  }, [setSongs, setArtists, setReleases, t]);

  const startReview = useCallback(
    (excludePath?: string) => {
      const availableSongs = stats.unratedSongs.filter(
        (s) => s.path !== excludePath
      );

      if (availableSongs.length === 0) {
        toast.info(t("🌟 Congrads!"), {
          description: t("All songs have been rated."),
        });
        setReviewSong(null);
        setIsReviewLoading(false);
        return;
      }

      setIsReviewLoading(true);
      const randomIndex = Math.floor(Math.random() * availableSongs.length);
      const song = availableSongs[randomIndex];
      setReviewSong(song);
      getCoverArt(song).then((cover) => {
        setReviewCover(cover);
        setIsReviewLoading(false);
      });
    },
    [stats.unratedSongs, t]
  );

  const handleReviewRate = async (score: Score | null) => {
    if (isReviewLoading || !reviewSong) return;

    setIsReviewLoading(true);
    const ratedSong = reviewSong;

    startReview(ratedSong.path);

    if (score !== null) {
      const updatedSong = { ...ratedSong, score: score };
      try {
        await api.update_song_tags(updatedSong, null);
        toast.success(`${t("🥳 Rating")}: ${formatScore(score)}`, {
          description: updatedSong.title || t("Unknown Title"),
        });
        await handleSongRated();
      } catch (e) {
        toast.error(t("Failed to save rating"), { description: String(e) });
        setIsReviewLoading(false);
      }
    } else {
      await handleSongRated();
      if (stats.unratedSongs.length <= 1) {
        setIsReviewLoading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold mb-4">{t("🤗 Rating Summary")}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <StatCard
            title={t("Rated Songs")}
            value={`${stats.ratedCount} / ${stats.totalSongs}`}
            description={`${t(
              "☺️ You've completed"
            )} ${stats.ratedPercent.toFixed(0)}% ${t("of the songs!")}`}
          />
          {}
          <StatCard
            title={t("Average Score")}
            value={stats.averageScore}
            description={t("🤓 The average score of your rated songs.")}
            valueClassName="text-3xl"
          />

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t("👾 Rating Activity")}</CardTitle>
              <CardDescription>
                {t("🙂‍↔️ Number of songs rated at each score level")}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <LineChart
                  accessibilityLayer
                  data={chartData}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value: string) => value.split(" ")[0]}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  {}
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[150px]"
                        labelFormatter={(label) => `${label}`}
                      />
                    }
                  />
                  <Line
                    dataKey="count"
                    type="monotone"
                    stroke="var(--color-count)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>{t("🤩 Quick Review Mode")}</CardTitle>
            <CardDescription>
              {t("🎉 Quickly rate your unrated songs.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              onClick={() => startReview()}
              disabled={stats.unratedSongs.length === 0}
            >
              <Shuffle className="mr-2 h-5 w-5" />
              {stats.unratedSongs.length > 0
                ? `${t("⏰ Start quickreviewing, (")}${stats.unratedCount} ${t(
                    "unrated songs)"
                  )}`
                : t("😋 All songs have been rated!")}
            </Button>
          </CardContent>
        </Card>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{t("😇 Rating Distribution")}</CardTitle>
              <CardDescription>
                {t("💥 Click on an item to quickly jump to the list below.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {groupedScoreOptions.map((group) => (
                <div key={group.label} className="space-y-1">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-2">
                    {group.label}
                  </h4>
                  {group.scores.map((s) => (
                    <HistogramBar
                      key={s.value}
                      label={s.label}
                      value={
                        stats.distribution.get(s.value as Score)?.length || 0
                      }
                      maxValue={stats.maxDistributionCount}
                      percentage={
                        ((stats.distribution.get(s.value as Score)?.length ||
                          0) /
                          (stats.totalSongs > 0 ? stats.totalSongs : 1)) *
                        100
                      }
                      onClick={() => setActiveAccordionItem(s.value)}
                    />
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>

          {}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>{t("🎵 Song Wall")}</CardTitle>
              <CardDescription>
                {t("👨‍💻 Browse your songs by rating.")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion
                type="single"
                collapsible
                className="w-full"
                value={activeAccordionItem || ""}
                onValueChange={setActiveAccordionItem}
              >
                {groupedScoreOptions.flatMap((group) =>
                  group.scores.map((s) => (
                    <AccordionItem key={s.value} value={s.value}>
                      <AccordionTrigger
                        className={cn(
                          "text-lg font-semibold",
                          "hover:no-underline hover:opacity-80"
                        )}
                      >
                        {s.label} (
                        {stats.distribution.get(s.value as Score)?.length || 0})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {}
                          {stats.distribution
                            .get(s.value as Score)
                            ?.sort((a: Song, b: Song) =>
                              (a.title ?? "").localeCompare(b.title ?? "")
                            )
                            .map((song: Song) => (
                              <SongCoverCard key={song.path} song={song} />
                            ))}
                          {stats.distribution.get(s.value as Score)?.length ===
                            0 && (
                            <p className="text-sm text-muted-foreground col-span-full">
                              {t("No songs available for this rating.")}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
                )}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>

      {}
      <Dialog
        open={!!reviewSong}
        onOpenChange={(open) => {
          if (!open) {
            setReviewSong(null);
            setIsReviewLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("Quick Review Mode")}</DialogTitle>
            <DialogDescription>
              {isReviewLoading && !reviewCover
                ? t("Loading...")
                : reviewSong?.title || t("Unknown Song")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-4 relative">
            {isReviewLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                <Shuffle className="h-8 w-8 animate-pulse" />
              </div>
            )}
            {reviewCover ? (
              <img
                src={reviewCover}
                alt="cover"
                className="h-64 w-64 rounded-md object-cover"
              />
            ) : (
              <Skeleton className="h-64 w-64" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            {groupedScoreOptions.map((group) => (
              <div
                key={group.label}
                className="flex justify-center gap-2 w-full"
              >
                {group.scores.map((s) => (
                  <Button
                    key={s.value}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleReviewRate(s.value as Score)}
                    disabled={isReviewLoading}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              className="ml-auto"
              onClick={() => handleReviewRate(null)}
              disabled={isReviewLoading}
            >
              {t("💩 Skip")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
