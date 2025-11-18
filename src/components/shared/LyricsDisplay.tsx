import { FC, useLayoutEffect } from "react";
import { useAtomValue } from "jotai";
import {
  PrebuiltLyricPlayer,
  isLyricPageOpenedAtom,
  musicIdAtom,
} from "@applemusic-like-lyrics/react-full";
import { cn } from "@/lib/utils";

import "@applemusic-like-lyrics/react-full/style.css";
import "@/styles/LyricsDisplay.css";

interface LyricsDisplayProps {
  className?: string;
}

export const LyricsDisplay: FC<LyricsDisplayProps> = ({ className }) => {
  const isLyricPageOpened = useAtomValue(isLyricPageOpenedAtom);
  const musicId = useAtomValue(musicIdAtom);

  useLayoutEffect(() => {
    if (isLyricPageOpened) {
      document.body.dataset.amllLyricsOpen = "";
      console.log("[LyricsDisplay] Page opened, musicId:", musicId);
    } else {
      delete document.body.dataset.amllLyricsOpen;
      console.log("[LyricsDisplay] Page closed");
    }
  }, [isLyricPageOpened, musicId]);

  if (!isLyricPageOpened) {
    return null;
  }

  return (
    <PrebuiltLyricPlayer
      key={musicId}
      id="amll-lyric-player"
      className={cn("amll-lyric-page", "amll-lyric-page-opened", className)}
    />
  );
};
