import { useEffect } from "react";
import { usePlayerStore } from "@/stores/playerStore";


export function usePlayKeyShortcut(
  playKey: string,
  nextKey: string,
  prevKey: string
) {
  const togglePlayPause = usePlayerStore((s) => s.actions.togglePlayPause);
  const nextTrack = usePlayerStore((s) => s.actions.nextTrack);
  const prevTrack = usePlayerStore((s) => s.actions.prevTrack);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (playKey && key === playKey.toLowerCase()) {
        event.preventDefault();
        togglePlayPause();
      } else if (nextKey && key === nextKey.toLowerCase()) {
        event.preventDefault();
        nextTrack();
      } else if (prevKey && key === prevKey.toLowerCase()) {
        event.preventDefault();
        prevTrack();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [playKey, nextKey, prevKey, togglePlayPause, nextTrack, prevTrack]);
}
