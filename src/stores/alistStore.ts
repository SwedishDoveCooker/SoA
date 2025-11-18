import { create } from "zustand";
import type { Alist } from "@/types";

interface AlistState {
  alists: Alist[];
  isLoading: boolean;
  setAlists: (alists: Alist[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAlistStore = create<AlistState>((set) => ({
  alists: [],
  isLoading: true,
  setAlists: (alists) => set({ alists }),
  setLoading: (isLoading) => set({ isLoading }),
}));
