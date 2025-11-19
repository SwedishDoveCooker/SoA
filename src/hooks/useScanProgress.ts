import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export interface ScanProgress {
  isScanning: boolean;
  processed: number;
  total: number;
  progress: number;
}

export function useScanProgress() {
  const [scanStatus, setScanStatus] = useState<ScanProgress>({
    isScanning: false,
    processed: 0,
    total: 0,
    progress: 0,
  });

  useEffect(() => {
    let progressUnlisten: (() => void) | null = null;
    let completeUnlisten: (() => void) | null = null;

    const setupListeners = async () => {
      progressUnlisten = await listen<{
        processed: number;
        total: number;
        progress: number;
      }>("scan_progress", (event) => {
        const { processed, total, progress } = event.payload;

        setScanStatus({
          isScanning: true,
          processed,
          total,
          progress,
        });
      });

      completeUnlisten = await listen<{
        total: number;
        loaded: number;
      }>("scan_complete", (event) => {
        const { total, loaded } = event.payload;

        setScanStatus({
          isScanning: false,
          processed: loaded,
          total,
          progress: 100,
        });

        setTimeout(() => {
          setScanStatus({
            isScanning: false,
            processed: 0,
            total: 0,
            progress: 0,
          });
        }, 5000);
      });
    };

    setupListeners();

    return () => {
      if (progressUnlisten) progressUnlisten();
      if (completeUnlisten) completeUnlisten();
    };
  }, []);

  return scanStatus;
}
