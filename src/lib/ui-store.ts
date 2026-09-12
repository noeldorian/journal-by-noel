import { create } from "zustand";

interface UiState {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  tradeModal: { open: boolean; tradeId: string | null };
  openAddTrade: () => void;
  openEditTrade: (tradeId: string) => void;
  closeTradeModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  tradeModal: { open: false, tradeId: null },
  openAddTrade: () => set({ tradeModal: { open: true, tradeId: null } }),
  openEditTrade: (tradeId) => set({ tradeModal: { open: true, tradeId } }),
  closeTradeModal: () => set({ tradeModal: { open: false, tradeId: null } }),
}));
