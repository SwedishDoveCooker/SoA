import { useTranslation } from "react-i18next";
import { useScanProgress } from "@/hooks/useScanProgress";
import { Progress } from "@/components/ui/progress";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanProgressIndicatorProps {
  className?: string;
}

export function ScanProgressIndicator({
  className,
}: ScanProgressIndicatorProps) {
  const { t } = useTranslation();
  const { isScanning, processed, total, progress } = useScanProgress();

  if (!isScanning && progress === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg",
        "p-4 w-80",
        "animate-in slide-in-from-bottom-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          <Music className="h-4 w-4 text-primary animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {isScanning ? t("Scanning library...") : t("Scan complete")}
            </p>
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>

          <Progress value={progress} className="h-2" />

          <p className="text-xs text-muted-foreground">
            {isScanning
              ? `${processed} / ${total} files`
              : `${processed} songs loaded`}
          </p>
        </div>
      </div>
    </div>
  );
}
