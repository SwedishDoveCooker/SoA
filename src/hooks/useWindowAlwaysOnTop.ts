import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";


export function useWindowAlwaysOnTop(pinToTop: boolean) {
  useEffect(() => {
    const appWindow = getCurrentWindow();

    appWindow.setAlwaysOnTop(pinToTop).catch((error) => {
      console.error("Failed to set always on top:", error);
    });
  }, [pinToTop]);
}
