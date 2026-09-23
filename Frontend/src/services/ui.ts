import { create } from 'zustand';
export const useUi = create<{
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  toast: string;
  notify: (message: string) => void;
}>((set) => ({
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  toast: '',
  notify: (toast) => set({ toast }),
}));
