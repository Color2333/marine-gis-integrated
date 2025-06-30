// src/hooks/useMapManager.ts
import { create } from 'zustand';
import type { SimpleMapManager } from '../services/SimpleMapManager';

interface MapManagerStore {
  mapManager: SimpleMapManager | null;
  setMapManager: (manager: SimpleMapManager | null) => void;
}

export const useMapManagerStore = create<MapManagerStore>((set) => ({
  mapManager: null,
  setMapManager: (manager) => set({ mapManager: manager }),
}));
