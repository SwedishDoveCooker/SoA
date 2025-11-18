import { FC, useEffect, useRef } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { isLyricPageOpenedAtom } from "@applemusic-like-lyrics/react-full";
import { AMLLContext } from "@/stores/amllStore";
import { LyricsDisplay } from "./LyricsDisplay";

interface LyricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LyricsDialog: FC<LyricsDialogProps> = ({ open, onOpenChange }) => {
  const setIsLyricPageOpened = useSetAtom(isLyricPageOpenedAtom);
  const isLyricPageOpened = useAtomValue(isLyricPageOpenedAtom);
  const prevIsLyricPageOpened = useRef(isLyricPageOpened);

  useEffect(() => {
    setIsLyricPageOpened(open);
  }, [open, setIsLyricPageOpened]);

  useEffect(() => {
    if (prevIsLyricPageOpened.current && !isLyricPageOpened) {
      onOpenChange(false);
    }
    prevIsLyricPageOpened.current = isLyricPageOpened;
  }, [isLyricPageOpened, onOpenChange]);

  return (
    <>
      {}
      <AMLLContext />

      {}
      <LyricsDisplay />
    </>
  );
};
