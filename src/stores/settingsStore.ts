import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuestionTheme } from '@/types/game';

interface SettingsState {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0.0 to 1.0
  track: number; // index of selected music track
  theme: QuestionTheme;
  playerCount: number;
  
  toggleSfx: () => void;
  toggleMusic: () => void;
  setVolume: (v: number) => void;
  setTrack: (i: number) => void;
  setTheme: (t: QuestionTheme) => void;
  setPlayerCount: (c: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sfxEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      track: 0,
      theme: 'general',
      playerCount: 2,

      toggleSfx: () => set((state) => ({ sfxEnabled: !state.sfxEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      setVolume: (volume) => set({ volume }),
      setTrack: (i) => set({ track: i }),
      setTheme: (theme) => set({ theme }),
      setPlayerCount: (playerCount) => set({ playerCount }),
    }),
    {
      name: 'ular-tangga-settings',
    }
  )
);
