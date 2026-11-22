import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getDefaultGlobalPrices } from '@/engine/catalog';
import { safeGetItem, safeSetItem } from '@/utils/storage';

export interface PricesStoreState {
  globalPrices: Record<string, number>;
  isPricesModalOpen: boolean;

  // Actions
  setPrice: (key: string, value: number) => void;
  setPrices: (prices: Record<string, number>) => void;
  resetDefaults: () => void;
  openPricesModal: () => void;
  closePricesModal: () => void;
  getEffectivePrice: (key: string, projectPrices?: Record<string, number>) => number;
}

const STORAGE_KEY = 'ecad_global_prices';

function loadStoredPrices(): Record<string, number> {
  const defaults = getDefaultGlobalPrices();
  const saved = safeGetItem<Record<string, number>>(STORAGE_KEY, {});
  return { ...defaults, ...saved };
}

export const usePricesStore = create<PricesStoreState>()(
  immer((set, get) => ({
    globalPrices: loadStoredPrices(),
    isPricesModalOpen: false,

    setPrice: (key, value) =>
      set((state) => {
        state.globalPrices[key] = Math.max(0, value);
        safeSetItem(STORAGE_KEY, state.globalPrices);
      }),

    setPrices: (newPrices) =>
      set((state) => {
        state.globalPrices = { ...state.globalPrices, ...newPrices };
        safeSetItem(STORAGE_KEY, state.globalPrices);
      }),

    resetDefaults: () =>
      set((state) => {
        state.globalPrices = getDefaultGlobalPrices();
        safeSetItem(STORAGE_KEY, state.globalPrices);
      }),

    openPricesModal: () =>
      set((state) => {
        state.isPricesModalOpen = true;
      }),

    closePricesModal: () =>
      set((state) => {
        state.isPricesModalOpen = false;
        safeSetItem(STORAGE_KEY, state.globalPrices);
      }),

    getEffectivePrice: (key, projectPrices) => {
      if (projectPrices && typeof projectPrices[key] === 'number') {
        return projectPrices[key];
      }
      const storePrices = get().globalPrices;
      if (typeof storePrices[key] === 'number') {
        return storePrices[key];
      }
      const defaults = getDefaultGlobalPrices();
      return defaults[key] || 0;
    }
  }))
);
