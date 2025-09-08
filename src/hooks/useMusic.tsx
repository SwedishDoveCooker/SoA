import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

export enum TrackScore {
  SuperBigCupUp = "SuperBigCupUp",
  SuperBigCup = "SuperBigCup",
  SuperBigCupDown = "SuperBigCupDown",

  BigCupUp = "BigCupUp",
  BigCup = "BigCup",
  BigCupDown = "BigCupDown",

  MedCupUp = "MedCupUp",
  MedCup = "MedCup",
  MedCupDown = "MedCupDown",
}

export interface Track {
  id: number;
  path: string;
  title: string;
  duration: number;
  lyrics?: string;
  artist_name?: string;
  release_name?: string;
  art_b64?: string;
  score?: TrackScore;
}

interface MusicContextType {
  playlist: Track[];
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: "none" | "one" | "all";

  updateTrack: (updatedTrack: Track) => Promise<void>;
  setPlaylist: (tracks: Track[]) => void;
  playTrack: (index: number, visiblePlaylist: Track[]) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const [playQueue, setPlayQueue] = useState<number[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number | null>(
    null
  );
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"none" | "all" | "one">("none");
  const [shuffledQueue, setShuffledQueue] = useState<number[]>([]);
  const [playHistory, setPlayHistory] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrack =
    currentQueueIndex !== null && playQueue[currentQueueIndex] !== undefined
      ? playlist.find((t) => t.id === playQueue[currentQueueIndex]) || null
      : null;

  useEffect(() => {
    const loadInitialTracks = async () => {
      try {
        const tracks = await invoke<Track[]>("get_all_tracks");
        console.log("Initial tracks:", tracks);
        setPlaylist(tracks);
      } catch (error) {
        console.error("Init track list err:", error);
      }
    };
    loadInitialTracks();
  }, []);

  useEffect(() => {
    if (isShuffled && playQueue.length > 0) {
      const queueToShuffle = [...playQueue];
      for (let i = queueToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queueToShuffle[i], queueToShuffle[j]] = [
          queueToShuffle[j],
          queueToShuffle[i],
        ];
      }
      setShuffledQueue(queueToShuffle);
      setPlayHistory([]);
    } else {
      setShuffledQueue([]);
    }
  }, [isShuffled, playQueue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch((e) => console.error("Play failed:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      const assetUrl = convertFileSrc(currentTrack.path);
      audioRef.current.src = assetUrl;
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      }
    } else if (!currentTrack) {
      setIsPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  }, []);

  const playNext = useCallback(() => {
    if (playQueue.length === 0 || currentQueueIndex === null) return;
    const currentTrackId = playQueue[currentQueueIndex];

    if (repeatMode === "one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (isShuffled) {
      const currentHistoryIndex = playHistory.indexOf(currentTrackId);
      if (
        currentHistoryIndex > -1 &&
        currentHistoryIndex < playHistory.length - 1
      ) {
        const nextTrackId = playHistory[currentHistoryIndex + 1];
        const nextQueueIndex = playQueue.indexOf(nextTrackId);
        setCurrentQueueIndex(nextQueueIndex);
        return;
      }
      const nextShuffledTrack = shuffledQueue.find(
        (id) => !playHistory.includes(id)
      );
      if (nextShuffledTrack !== undefined) {
        const nextQueueIndex = playQueue.indexOf(nextShuffledTrack);
        setCurrentQueueIndex(nextQueueIndex);
        setPlayHistory((prev) => [...prev, nextShuffledTrack]);
      } else if (repeatMode === "all") {
        setPlayHistory([]);
        playNext();
      } else {
        setIsPlaying(false);
      }
      return;
    }

    const isLastTrack = currentQueueIndex === playQueue.length - 1;
    if (!isLastTrack) {
      setCurrentQueueIndex(currentQueueIndex + 1);
    } else {
      if (repeatMode === "all") {
        setCurrentQueueIndex(0);
      } else {
        setIsPlaying(false);
      }
    }
  }, [
    currentQueueIndex,
    isShuffled,
    repeatMode,
    playQueue,
    shuffledQueue,
    playHistory,
  ]);

  const playTrack = (trackId: number, visiblePlaylist: Track[]) => {
    const newPlayQueue = visiblePlaylist.map((track) => track.id);
    setPlayQueue(newPlayQueue);

    const queueIndex = newPlayQueue.findIndex((id) => id === trackId);
    if (queueIndex !== -1) {
      setCurrentQueueIndex(queueIndex);
      setIsPlaying(true);
      setPlayHistory([trackId]);
    }
  };

  const togglePlayPause = () => {
    if (currentTrack) setIsPlaying(!isPlaying);
  };

  const playPrev = useCallback(() => {
    if (playQueue.length === 0 || currentQueueIndex === null) return;

    if (isShuffled) {
      const currentHistoryIndex = playHistory.indexOf(
        playQueue[currentQueueIndex]
      );
      if (currentHistoryIndex > 0) {
        const prevTrackId = playHistory[currentHistoryIndex - 1];
        const prevQueueIndex = playQueue.indexOf(prevTrackId);
        setCurrentQueueIndex(prevQueueIndex);
      }
      return;
    }

    const isFirstTrack = currentQueueIndex === 0;
    setCurrentQueueIndex(
      isFirstTrack ? playQueue.length - 1 : currentQueueIndex - 1
    );
  }, [currentQueueIndex, isShuffled, playQueue, playHistory]);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const toggleShuffle = () => setIsShuffled((prev) => !prev);

  const updateTrack = async (updatedTrack: Track) => {
    try {
      await invoke("modify", { track: updatedTrack });
      setPlaylist((prevPlaylist) =>
        prevPlaylist.map((track) =>
          track.id === updatedTrack.id ? updatedTrack : track
        )
      );
    } catch (error) {
      console.error("Failed to update track in backend:", error);
      throw error;
    }
  };

  const cycleRepeatMode = () => {
    const modes: ("none" | "one" | "all")[] = ["all", "one", "none"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const value = {
    playlist,
    setPlaylist,
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffled,
    repeatMode,
    updateTrack,
    playTrack,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeatMode,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={updateProgress}
        onEnded={playNext}
        onVolumeChange={() => {
          if (audioRef.current) setVolume(audioRef.current.volume);
        }}
      />
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error("useMusic must be used within MusicProvider");
  return context;
};
