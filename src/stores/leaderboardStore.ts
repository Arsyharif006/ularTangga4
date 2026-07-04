import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QuestionTheme } from '@/types/game';

export interface LeaderboardEntry {
  id: string;
  name: string;
  theme: QuestionTheme;
  turnCount: number;
  date: string;
  playerCount: number;
}

interface LeaderboardState {
  entries: LeaderboardEntry[];
  addEntry: (entry: Omit<LeaderboardEntry, 'id'>) => void;
  clearLeaderboard: () => void;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set) => ({
      entries: [],

      addEntry: (entryData) => set((state) => {
        const newEntry: LeaderboardEntry = {
          ...entryData,
          id: Math.random().toString(36).substring(2, 9),
        };
        const newEntries = [...state.entries, newEntry]
          .sort((a, b) => a.turnCount - b.turnCount) // Sort by fewest turns
          .slice(0, 10); // Keep top 10

        return { entries: newEntries };
      }),

      clearLeaderboard: () => set({ entries: [] }),
    }),
    {
      name: 'ular-tangga-leaderboard',
    }
  )
);
