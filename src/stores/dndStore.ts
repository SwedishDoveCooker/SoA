
import { create } from "zustand";


type DropTarget =
  | { type: "playlist"; name: string }
  | { type: "library" }
  | null;

interface DndState {
  dropTarget: DropTarget;
  isDragging: boolean;
  setDropTarget: (target: DropTarget) => void;
  clearDropTarget: () => void;
  setIsDragging: (isDragging: boolean) => void;
}

export const useDndStore = create<DndState>((set) => ({
  dropTarget: null,
  isDragging: false,
  setDropTarget: (target) => set({ dropTarget: target }),
  clearDropTarget: () => set({ dropTarget: null }),
  setIsDragging: (isDragging) => set({ isDragging }),
}));
