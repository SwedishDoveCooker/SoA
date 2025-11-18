import { FC, useEffect, useRef } from "react";
import { useStore } from "jotai";
import type { LyricLine as CoreLyricLine } from "@applemusic-like-lyrics/core";
import { MeshGradientRenderer } from "@applemusic-like-lyrics/core";
import {
  musicIdAtom,
  musicNameAtom,
  musicAlbumNameAtom,
  musicArtistsAtom,
  musicCoverAtom,
  musicCoverIsVideoAtom,
  musicDurationAtom,
  musicPlayingPositionAtom,
  musicPlayingAtom,
  musicVolumeAtom,
  musicLyricLinesAtom,
  hideLyricViewAtom,
  currentPlaylistAtom,
  currentPlaylistMusicIndexAtom,
  onPlayOrResumeAtom,
  onRequestNextSongAtom,
  onRequestPrevSongAtom,
  onSeekPositionAtom,
  onLyricLineClickAtom,
  onChangeVolumeAtom,
  onClickControlThumbAtom,
  fftDataAtom,
  lowFreqVolumeAtom,
  isLyricPageOpenedAtom,
  lyricBackgroundRendererAtom,
} from "@applemusic-like-lyrics/react-full";
import { usePlayerStore } from "@/stores/playerStore";
import { useLibraryStore } from "@/stores/libraryStore";
import { api } from "@/lib/api";
import { parseLyrics, type LyricFormat } from "@/lib/lyric";
import { getCoverArt } from "@/lib/cover";

export const AMLLContext: FC = () => {
  const store = useStore();
  const playerState = usePlayerStore();
  const allSongs = useLibraryStore((state) => state.songs);
  const prevPathRef = useRef<string | null>(null);
  const prevCoverUrlRef = useRef<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    store.set(lyricBackgroundRendererAtom, { renderer: MeshGradientRenderer });

    store.set(hideLyricViewAtom, false);

    console.log("[AMLLContext] AMLL initialized with default settings");
  }, [store]);

  useEffect(() => {
    store.set(musicPlayingAtom, playerState.isPlaying);
  }, [store, playerState.isPlaying]);

  useEffect(() => {
    const position = Math.round(playerState.currentTime * 1000);
    store.set(musicPlayingPositionAtom, position);
    const isOpen = store.get(isLyricPageOpenedAtom);
    if (isOpen && position % 5000 < 100) {
      console.log("[AMLLContext] Position update:", position, "ms");
    }
  }, [store, playerState.currentTime]);

  useEffect(() => {
    store.set(musicDurationAtom, Math.round(playerState.duration * 1000));
  }, [store, playerState.duration]);

  useEffect(() => {
    store.set(musicVolumeAtom, playerState.volume);
  }, [store, playerState.volume]);

  useEffect(() => {
    const currentPath = playerState.currentPath;

    if (!currentPath) {
      store.set(musicIdAtom, "");
      store.set(musicNameAtom, "");
      store.set(musicAlbumNameAtom, "");
      store.set(musicArtistsAtom, []);
      store.set(musicLyricLinesAtom, []);
      store.set(hideLyricViewAtom, true);

      if (prevCoverUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(prevCoverUrlRef.current);
      }
      store.set(musicCoverAtom, "");
      store.set(musicCoverIsVideoAtom, false);
      prevCoverUrlRef.current = null;
      prevPathRef.current = null;
      return;
    }

    if (currentPath === prevPathRef.current) return;
    prevPathRef.current = currentPath;

    const song = allSongs.find((s) => s.path === currentPath);
    if (!song) {
      console.warn("[AMLLContext] Song not found in library:", currentPath);
      return;
    }

    store.set(musicIdAtom, song.path);
    store.set(musicNameAtom, song.title || "Unknown");
    store.set(musicAlbumNameAtom, song.release || "Unknown Album");
    store.set(
      musicArtistsAtom,
      song.artist
        ? song.artist.split("/").map((name) => ({
            id: name.trim(),
            name: name.trim(),
          }))
        : []
    );

    (async () => {
      try {
        if (prevCoverUrlRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(prevCoverUrlRef.current);
        }

        const coverUrl = await getCoverArt(song);

        if (coverUrl) {
          store.set(musicCoverAtom, coverUrl);
          store.set(musicCoverIsVideoAtom, false);
          prevCoverUrlRef.current = coverUrl;
          console.log("[AMLLContext] Cover art loaded:", coverUrl);
        } else {
          store.set(
            musicCoverAtom,
            "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          );
          store.set(musicCoverIsVideoAtom, false);
          prevCoverUrlRef.current = null;
          console.log("[AMLLContext] No cover art available");
        }
      } catch (err) {
        console.error("[AMLLContext] Failed to load cover art:", err);
        store.set(
          musicCoverAtom,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
        store.set(musicCoverIsVideoAtom, false);
        prevCoverUrlRef.current = null;
      }
    })();

    (async () => {
      try {
        const lyricText = await api.get_lyric(song);

        if (!lyricText) {
          console.log("[AMLLContext] No lyrics available for song:", song.path);
          store.set(musicLyricLinesAtom, []);
          store.set(hideLyricViewAtom, true);
          return;
        }

        let format: LyricFormat = "LRC";

        if (lyricText.includes("[ti:") || lyricText.includes("[ar:")) {
          format = "LRC";
        } else if (lyricText.includes("<?xml") || lyricText.includes("<tt ")) {
          format = "TTML";
        } else if (lyricText.startsWith("W2xv")) {
          format = "QRC_HEX";
        }

        const parsed = await parseLyrics(lyricText, format);

        if (!parsed || !parsed.lines || parsed.lines.length === 0) {
          console.log("[AMLLContext] No lyric lines parsed");
          store.set(musicLyricLinesAtom, []);
          store.set(hideLyricViewAtom, true);
          return;
        }

        const compatibleLyricLines: CoreLyricLine[] = parsed.lines.map(
          (line) => ({
            ...line,
            words: line.words.map((word) => ({
              ...word,
              obscene: false,
            })),
          })
        );

        store.set(musicLyricLinesAtom, compatibleLyricLines);
        store.set(hideLyricViewAtom, compatibleLyricLines.length === 0);

        console.log(
          "[AMLLContext] Loaded",
          compatibleLyricLines.length,
          "lyric lines, hideLyricView:",
          compatibleLyricLines.length === 0
        );
        console.log(
          "[AMLLContext] First 3 lyric lines:",
          compatibleLyricLines.slice(0, 3)
        );
      } catch (err) {
        console.error("[AMLLContext] Failed to load/parse lyrics:", err);
        store.set(musicLyricLinesAtom, []);
        store.set(hideLyricViewAtom, true);
      }
    })();
  }, [store, playerState.currentPath, allSongs]);

  useEffect(() => {
    const toEmit = <T,>(onEmit: T) => ({ onEmit });

    store.set(
      onPlayOrResumeAtom,
      toEmit(() => {
        playerState.actions.togglePlayPause();
      })
    );

    store.set(
      onRequestNextSongAtom,
      toEmit(() => {
        playerState.actions.nextTrack();
      })
    );

    store.set(
      onRequestPrevSongAtom,
      toEmit(() => {
        playerState.actions.prevTrack();
      })
    );

    store.set(
      onSeekPositionAtom,
      toEmit((time: number) => {
        playerState.actions.seek(time / 1000);
      })
    );

    store.set(
      onLyricLineClickAtom,
      toEmit((evt: { line: { getLine: () => { startTime: number } } }) => {
        const line = evt.line.getLine();
        playerState.actions.seek(line.startTime / 1000);
      })
    );

    store.set(
      onChangeVolumeAtom,
      toEmit((volume: number) => {
        playerState.actions.setVolume(volume);
      })
    );

    store.set(
      onClickControlThumbAtom,
      toEmit(() => {
        store.set(isLyricPageOpenedAtom, false);
      })
    );

    return () => {
      const doNothing = toEmit(() => {});
      store.set(onPlayOrResumeAtom, doNothing);
      store.set(onRequestNextSongAtom, doNothing);
      store.set(onRequestPrevSongAtom, doNothing);
      store.set(onSeekPositionAtom, doNothing);
      store.set(onLyricLineClickAtom, doNothing);
      store.set(onChangeVolumeAtom, doNothing);
      store.set(onClickControlThumbAtom, doNothing);
    };
  }, [store, playerState]);

  useEffect(() => {
    store.set(fftDataAtom, [0, 0]);
    store.set(lowFreqVolumeAtom, 0);
  }, [store]);

  useEffect(() => {
    store.set(currentPlaylistAtom, []);
    store.set(currentPlaylistMusicIndexAtom, playerState.currentIndex);
  }, [store, playerState.queue, playerState.currentIndex]);

  return null;
};
