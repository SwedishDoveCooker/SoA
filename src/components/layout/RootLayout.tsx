
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { PlayerBar } from "@/components/layout/PlayerBar";
import { useDndStore } from "@/stores/dndStore";
import { cn } from "@/lib/utils";

export function RootLayout() {
  const { isDragging } = useDndStore();


  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
    >
      <Sidebar className="h-full" />

      <div className="flex flex-1 flex-col overflow-hidden">
        {}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-6 transition-colors",
            isDragging && "bg-primary/5"
          )}
          data-droptarget-type="library"
        >
          <Outlet />
        </main>

        <PlayerBar className="shrink-0" />
      </div>
    </div>
  );
}
