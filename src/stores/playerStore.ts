
import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/api";
import {
  RepeatMode,
  PlaybackStatePayload,
  PlaybackTrackLoadedPayload,
  PlaybackProgressPayload,
  PlaybackEndedPayload,
} from "@/types";
import { toast } from "sonner";


enum InternalPlaybackMode {
  SEQUENTIAL,
  LOOP,
  CURRENT_ITEM_IN_LOOP,
  RANDOM,
}
function getInternalPlaybackMode(
  isShuffling: boolean,
  repeatMode: RepeatMode
): InternalPlaybackMode {
  if (repeatMode === RepeatMode.CURRENT_ITEM_IN_LOOP) {
    return InternalPlaybackMode.CURRENT_ITEM_IN_LOOP;
  }
  if (isShuffling) {
    return InternalPlaybackMode.RANDOM;
  }
  if (repeatMode === RepeatMode.LOOP) {
    return InternalPlaybackMode.LOOP;
  }
  return InternalPlaybackMode.SEQUENTIAL;
}
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function generateShuffleQueue(
  queueLength: number,
  firstIndex: number
): number[] {
  const indices = Array.from({ length: queueLength }, (_, i) => i);
  if (firstIndex >= 0 && firstIndex < queueLength) {
    indices.splice(firstIndex, 1);
  }
  const shuffledRest = shuffleArray(indices);
  if (firstIndex >= 0 && firstIndex < queueLength) {
    return [firstIndex, ...shuffledRest];
  } else {
    return shuffledRest;
  }
}


interface PlayerState {
  isShuffling: boolean;
  repeatMode: RepeatMode;
  queue: string[];
  shuffleQueue: number[];
  currentIndex: number;
  currentShuffleIndex: number;
  currentPath: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isSeeking: boolean;
  seekRequestTime: number | null;
  isLyricsVisible: boolean;

  actions: {
    playSong: (songPath: string) => void;
    playQueue: (songPaths: string[], startIndex: number) => void;
    togglePlayPause: () => void;
    toggleShuffle: () => void;
    cycleRepeatMode: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    _setIsSeeking: (isSeeking: boolean) => void;
    _setLocalCurrentTime: (time: number) => void;
    _setSeekRequestTime: (time: number | null) => void;
    _handleTrackEnded: () => void;
    _handleRustStateChange: (payload: PlaybackStatePayload) => void;
    _handleTrackLoaded: (payload: PlaybackTrackLoadedPayload) => void;
    _handleProgress: (payload: PlaybackProgressPayload) => void;
    toggleLyrics: () => void;
  };
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isShuffling: false,
  repeatMode: RepeatMode.SEQUENTIAL,
  queue: [],
  shuffleQueue: [],
  currentIndex: -1,
  currentShuffleIndex: -1,
  currentPath: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.75,
  isSeeking: false,
  seekRequestTime: null,
  isLyricsVisible: false,

  actions: {
    playSong: (songPath) => {
      const queue = [songPath];
      set({
        queue: queue,
        shuffleQueue: [0],
        currentIndex: 0,
        currentShuffleIndex: 0,
        isSeeking: false,
        seekRequestTime: null,
      });
      api.player_play_file(songPath);
    },
    toggleLyrics: () =>
      set((state) => ({ isLyricsVisible: !state.isLyricsVisible })),
    playQueue: (songPaths, startIndex) => {
      const { isShuffling } = get();
      if (songPaths.length === 0) return;

      const validIndex = Math.max(
        0,
        Math.min(startIndex, songPaths.length - 1)
      );

      if (isShuffling) {
        const shuffleQueue = generateShuffleQueue(songPaths.length, validIndex);
        set({
          queue: songPaths,
          shuffleQueue: shuffleQueue,
          currentIndex: validIndex,
          currentShuffleIndex: 0,
          isSeeking: false,
          seekRequestTime: null,
        });
        api.player_play_file(songPaths[validIndex]);
      } else {
        set({
          queue: songPaths,
          shuffleQueue: [],
          currentIndex: validIndex,
          currentShuffleIndex: -1,
          isSeeking: false,
          seekRequestTime: null,
        });
        api.player_play_file(songPaths[validIndex]);
      }
    },
    togglePlayPause: () => {
      const { isPlaying, currentPath } = get();
      if (!currentPath) return;

      if (isPlaying) {
        api.player_pause();
      } else {
        api.player_play();
      }
    },
    toggleShuffle: () => {
      const { isShuffling, queue, currentIndex } = get();
      const newIsShuffling = !isShuffling;

      if (newIsShuffling) {
        const newShuffleQueue = generateShuffleQueue(
          queue.length,
          currentIndex
        );
        set({
          isShuffling: true,
          shuffleQueue: newShuffleQueue,
          currentShuffleIndex: 0,
        });
      } else {
        set({ isShuffling: false });
      }
      toast.info(newIsShuffling ? "Shuffle enabled" : "Shuffle disabled");
    },
    cycleRepeatMode: () => {
      const { repeatMode } = get();
      let newRepeatMode: RepeatMode;
      let toastMessage = "";

      if (repeatMode === RepeatMode.SEQUENTIAL) {
        newRepeatMode = RepeatMode.LOOP;
        toastMessage = "Loop enabled";
      } else if (repeatMode === RepeatMode.LOOP) {
        newRepeatMode = RepeatMode.CURRENT_ITEM_IN_LOOP;
        toastMessage = "Repeat one enabled";
      } else {
        newRepeatMode = RepeatMode.SEQUENTIAL;
        toastMessage = "Sequential playback enabled";
      }
      set({ repeatMode: newRepeatMode });
      toast.info(toastMessage);
    },

    
    nextTrack: () => {
      const wasPaused = !get().isPlaying;
      const {
        queue,
        currentIndex,
        isShuffling,
        repeatMode,
        shuffleQueue,
        currentShuffleIndex,
      } = get();

      if (queue.length === 0) return;

      if (repeatMode === RepeatMode.CURRENT_ITEM_IN_LOOP) {
        const nextIndex = (currentIndex + 1) % queue.length;
        const nextPath = queue[nextIndex];
        api.player_play_file(nextPath);
        if (wasPaused) {
          api.player_pause();
        }
        const newShuffleIndex = shuffleQueue.indexOf(nextIndex);
        set({
          currentIndex: nextIndex,
          currentShuffleIndex: newShuffleIndex !== -1 ? newShuffleIndex : 0,
          isSeeking: false,
          seekRequestTime: null,
        });
        return;
      }

      const internalMode = getInternalPlaybackMode(isShuffling, repeatMode);

      if (internalMode === InternalPlaybackMode.RANDOM) {
        const nextShuffleIndex = currentShuffleIndex + 1;
        if (nextShuffleIndex >= shuffleQueue.length) {
          if (repeatMode === RepeatMode.LOOP) {
            const newShuffleQueue = generateShuffleQueue(queue.length, -1);
            const nextIndex = newShuffleQueue[0];
            api.player_play_file(queue[nextIndex]);
            if (wasPaused) {
              api.player_pause();
            }
            set({
              shuffleQueue: newShuffleQueue,
              currentShuffleIndex: 0,
              currentIndex: nextIndex,
              isSeeking: false,
              seekRequestTime: null,
            });
          } else {
            api.player_stop();
          }
        } else {
          const nextIndex = shuffleQueue[nextShuffleIndex];
          api.player_play_file(queue[nextIndex]);
          if (wasPaused) {
            api.player_pause();
          }
          set({
            currentShuffleIndex: nextShuffleIndex,
            currentIndex: nextIndex,
            isSeeking: false,
            seekRequestTime: null,
          });
        }
      } else {
        let nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          if (repeatMode === RepeatMode.LOOP) {
            nextIndex = 0;
            api.player_play_file(queue[nextIndex]);
            if (wasPaused) {
              api.player_pause();
            }
            set({
              currentIndex: nextIndex,
              isSeeking: false,
              seekRequestTime: null,
            });
          } else {
            api.player_stop();
          }
        } else {
          api.player_play_file(queue[nextIndex]);
          if (wasPaused) {
            api.player_pause();
          }
          set({
            currentIndex: nextIndex,
            isSeeking: false,
            seekRequestTime: null,
          });
        }
      }
    },

    
    prevTrack: () => {
      const wasPaused = !get().isPlaying;
      const {
        queue,
        currentIndex,
        isShuffling,
        repeatMode,
        shuffleQueue,
        currentShuffleIndex,
        currentTime,
      } = get();

      if (queue.length === 0) return;

      if (currentTime > 3) {
        api.player_seek(0);
        return;
      }

      if (repeatMode === RepeatMode.CURRENT_ITEM_IN_LOOP) {
        const nextIndex = (currentIndex - 1 + queue.length) % queue.length;
        const nextPath = queue[nextIndex];
        api.player_play_file(nextPath);
        if (wasPaused) {
          api.player_pause();
        }
        const newShuffleIndex = shuffleQueue.indexOf(nextIndex);
        set({
          currentIndex: nextIndex,
          currentShuffleIndex: newShuffleIndex !== -1 ? newShuffleIndex : 0,
          isSeeking: false,
          seekRequestTime: null,
        });
        return;
      }

      const internalMode = getInternalPlaybackMode(isShuffling, repeatMode);

      if (internalMode === InternalPlaybackMode.RANDOM) {
        const nextShuffleIndex = currentShuffleIndex - 1;
        if (nextShuffleIndex < 0) {
          if (repeatMode === RepeatMode.LOOP) {
            const newShuffleQueue = generateShuffleQueue(queue.length, -1);
            const nextIndex = newShuffleQueue[newShuffleQueue.length - 1];
            api.player_play_file(queue[nextIndex]);
            if (wasPaused) {
              api.player_pause();
            }
            set({
              shuffleQueue: newShuffleQueue,
              currentShuffleIndex: newShuffleQueue.length - 1,
              currentIndex: nextIndex,
              isSeeking: false,
              seekRequestTime: null,
            });
          } else {
            api.player_stop();
          }
        } else {
          const nextIndex = shuffleQueue[nextShuffleIndex];
          api.player_play_file(queue[nextIndex]);
          if (wasPaused) {
            api.player_pause();
          }
          set({
            currentShuffleIndex: nextShuffleIndex,
            currentIndex: nextIndex,
            isSeeking: false,
            seekRequestTime: null,
          });
        }
      } else {
        let nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          if (repeatMode === RepeatMode.LOOP) {
            nextIndex = queue.length - 1;
            api.player_play_file(queue[nextIndex]);
            if (wasPaused) {
              api.player_pause();
            }
            set({
              currentIndex: nextIndex,
              isSeeking: false,
              seekRequestTime: null,
            });
          } else {
            api.player_stop();
          }
        } else {
          api.player_play_file(queue[nextIndex]);
          if (wasPaused) {
            api.player_pause();
          }
          set({
            currentIndex: nextIndex,
            isSeeking: false,
            seekRequestTime: null,
          });
        }
      }
    },

    seek: (time) => {
      api.player_seek(time);
    },
    setVolume: (volume) => {
      api.player_set_volume(volume);
      set({ volume: volume });
    },
    _setLocalCurrentTime: (time: number) => {
      set({ currentTime: time });
    },
    _setIsSeeking: (isSeeking) => {
      set({ isSeeking });
    },
    _setSeekRequestTime: (time) => {
      set({ seekRequestTime: time });
    },


    _handleTrackEnded: () => {
      const { queue, currentIndex, isShuffling, repeatMode } = get();
      const internalMode = getInternalPlaybackMode(isShuffling, repeatMode);

      if (internalMode === InternalPlaybackMode.CURRENT_ITEM_IN_LOOP) {
        const currentPath = queue[currentIndex];
        api.player_play_file(currentPath);
        return;
      }
      get().actions.nextTrack();
    },

    
    _handleRustStateChange: (payload) => {
      set({
        isPlaying: payload.state === "playing",
        currentTime: payload.state === "stopped" ? 0 : get().currentTime,
        currentPath: payload.state === "stopped" ? null : get().currentPath,
        duration: payload.state === "stopped" ? 0 : get().duration,
      });
    },

    _handleTrackLoaded: (payload) => {
      set({
        currentPath: payload.path,
        duration: payload.duration,
        currentTime: 0,
        isPlaying: true,
      });
    },

    _handleProgress: (payload) => {
      const { isSeeking, seekRequestTime } = get();
      const newTime = payload.currentTime;

      if (isSeeking) {
        return;
      }

      if (seekRequestTime !== null) {
        if (Math.abs(newTime - seekRequestTime) < 1.0) {
          set({ currentTime: newTime, seekRequestTime: null });
        } else {
          return;
        }
      } else {
        set({ currentTime: newTime });
      }
    },
  },
}));


listen<PlaybackStatePayload>("playback-state-changed", (event) => {
  usePlayerStore.getState().actions._handleRustStateChange(event.payload);
});
listen<PlaybackTrackLoadedPayload>("playback-track-loaded", (event) => {
  usePlayerStore.getState().actions._handleTrackLoaded(event.payload);
});
listen<PlaybackProgressPayload>("playback-progress", (event) => {
  usePlayerStore.getState().actions._handleProgress(event.payload);
});
listen<PlaybackEndedPayload>("playback-ended", (event) => {
  console.log("Track ended, triggering next track logic:", event.payload.path);
  usePlayerStore.getState().actions._handleTrackEnded();
});
