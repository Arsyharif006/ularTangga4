// ============================================================
// Online Multiplayer Game Store (Zustand) — Fixed
// ============================================================

import { create } from 'zustand';
import type { GameRoom, OnlinePlayer, OnlineGameState } from '@/types/online';

/**
 * Normalize the players field from the DB/API into a plain array.
 * The server always returns an array, but guard against object-map shape just in case.
 * NOTE: DO NOT sort — insertion order == room join order == offline player index mapping.
 */
const normalizePlayers = (players: any): OnlinePlayer[] => {
  if (!players) return [];
  if (Array.isArray(players)) return players as OnlinePlayer[];
  return Object.values(players) as OnlinePlayer[];
};

interface OnlineGameStoreState extends OnlineGameState {
  // ── Setters ──────────────────────────────────────────────────────────────────
  setLocalPlayer: (player: OnlinePlayer) => void;
  /**
   * Replace the entire room snapshot (called on every realtime / poll update).
   * Player array order must be preserved — it is the source of truth for the
   * offline-index mapping built in OnlineGamePage.
   */
  setRoom: (room: GameRoom | null) => void;
  setGameStatus: (status: OnlineGameState['gameStatus']) => void;
  setError: (error: string | null) => void;
  setConnected: (connected: boolean) => void;

  // ── Player updates (local optimistic updates only — server is authoritative) ─
  updatePlayerPosition: (playerId: string, newPosition: number, previousPosition?: number) => void;
  updatePlayerStats: (playerId: string, totalCorrect: number, totalWrong: number) => void;
  updatePlayerInventory: (playerId: string, inventory: any[]) => void;

  // ── Room mutations ────────────────────────────────────────────────────────────
  addPlayerToRoom: (player: OnlinePlayer) => void;
  removePlayerFromRoom: (playerId: string) => void;
  /**
   * Update current turn player by their ONLINE player ID (string).
   * Previously this accepted a `number` which caused silent type mismatches
   * because OnlinePlayer.id is always a string.
   */
  updateCurrentTurn: (playerId: string) => void;

  // ── Game lifecycle ────────────────────────────────────────────────────────────
  startGame: () => void;
  finishGame: (winnerId: string) => void;
  resetOnlineGame: () => void;
}

export const useOnlineGameStore = create<OnlineGameStoreState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────────────────────────
  roomId: null,
  room: null,
  localPlayer: null,
  otherPlayers: [],
  gameStatus: 'idle',
  error: null,
  isConnected: false,

  // ── Setters ───────────────────────────────────────────────────────────────────

  setLocalPlayer: (player) => set({ localPlayer: player }),

  setRoom: (room) => {
    if (!room) {
      set({ room: null, otherPlayers: [] });
      return;
    }

    // Normalise player array (guard against object-map from DB)
    const playersArray = normalizePlayers((room as any).players);
    const normalizedRoom: GameRoom = { ...room, players: playersArray };

    const { localPlayer } = get();
    const otherPlayers = playersArray.filter((p) => p.id !== localPlayer?.id);

    set({ room: normalizedRoom, otherPlayers });
  },

  setGameStatus: (status) => set({ gameStatus: status }),

  setError: (error) => set({ error }),

  setConnected: (connected) => set({ isConnected: connected }),

  // ── Player updates ────────────────────────────────────────────────────────────

  updatePlayerPosition: (playerId, newPosition, previousPosition) => {
    const { localPlayer, room, otherPlayers } = get();

    const applyToPlayer = (p: OnlinePlayer): OnlinePlayer =>
      p.id === playerId
        ? {
            ...p,
            position: newPosition,
            previousPosition: previousPosition ?? p.position,
          }
        : p;

    if (localPlayer?.id === playerId) {
      set({ localPlayer: applyToPlayer(localPlayer) });
    } else {
      set({ otherPlayers: otherPlayers.map(applyToPlayer) });
    }

    if (room) {
      set({ room: { ...room, players: room.players.map(applyToPlayer) } });
    }
  },

  updatePlayerStats: (playerId, totalCorrect, totalWrong) => {
    const { localPlayer, room, otherPlayers } = get();

    const applyToPlayer = (p: OnlinePlayer): OnlinePlayer =>
      p.id === playerId ? { ...p, totalCorrect, totalWrong } : p;

    if (localPlayer?.id === playerId) {
      set({ localPlayer: applyToPlayer(localPlayer) });
    } else {
      set({ otherPlayers: otherPlayers.map(applyToPlayer) });
    }

    if (room) {
      set({ room: { ...room, players: room.players.map(applyToPlayer) } });
    }
  },

  updatePlayerInventory: (playerId, inventory) => {
    const { localPlayer, room, otherPlayers } = get();

    const applyToPlayer = (p: OnlinePlayer): OnlinePlayer =>
      p.id === playerId ? { ...p, inventory } : p;

    if (localPlayer?.id === playerId) {
      set({ localPlayer: applyToPlayer(localPlayer) });
    } else {
      set({ otherPlayers: otherPlayers.map(applyToPlayer) });
    }

    if (room) {
      set({ room: { ...room, players: room.players.map(applyToPlayer) } });
    }
  },

  // ── Room mutations ────────────────────────────────────────────────────────────

  addPlayerToRoom: (player) => {
    const { room, localPlayer } = get();
    if (!room) return;

    // Avoid duplicates (realtime may fire twice)
    const existing = normalizePlayers((room as any).players);
    if (existing.some((p) => p.id === player.id)) return;

    const updatedPlayers = [...existing, player];
    const updatedRoom: GameRoom = { ...room, players: updatedPlayers, updatedAt: Date.now() };
    const otherPlayers = updatedPlayers.filter((p) => p.id !== localPlayer?.id);

    set({ room: updatedRoom, otherPlayers });
  },

  removePlayerFromRoom: (playerId) => {
    const { room, localPlayer } = get();
    if (!room) return;

    // If local player left, clear everything
    if (localPlayer?.id === playerId) {
      set({
        room: null,
        localPlayer: null,
        otherPlayers: [],
        gameStatus: 'idle',
        roomId: null,
      });
      return;
    }

    const existing = normalizePlayers((room as any).players);
    const updatedPlayers = existing.filter((p) => p.id !== playerId);
    const updatedRoom: GameRoom = { ...room, players: updatedPlayers, updatedAt: Date.now() };
    const otherPlayers = updatedPlayers.filter((p) => p.id !== localPlayer?.id);

    set({ room: updatedRoom, otherPlayers });
  },

  /**
   * FIX: parameter changed from `number` → `string` to match OnlinePlayer.id type.
   * The old signature `(playerId: number)` caused silent coercion bugs when
   * compared against string IDs like "player_1234_abc".
   */
  updateCurrentTurn: (playerId: string) => {
    const { room } = get();
    if (!room) return;

    set({
      room: {
        ...room,
        currentTurnPlayerId: playerId,
        updatedAt: Date.now(),
      },
    });
  },

  // ── Game lifecycle ────────────────────────────────────────────────────────────

  startGame: () => {
    const { room } = get();
    if (!room) return;
    set({
      room: { ...room, status: 'playing', updatedAt: Date.now() },
      gameStatus: 'playing',
    });
  },

  finishGame: (_winnerId: string) => {
    const { room } = get();
    if (!room) return;
    set({
      room: { ...room, status: 'finished', updatedAt: Date.now() },
      gameStatus: 'finished',
    });
  },

  resetOnlineGame: () => {
    set({
      roomId: null,
      room: null,
      localPlayer: null,
      otherPlayers: [],
      gameStatus: 'idle',
      error: null,
      isConnected: false,
    });
  },
}));