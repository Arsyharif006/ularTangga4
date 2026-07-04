// ============================================================
// Online Multiplayer Types
// ============================================================

export interface GameRoom {
  roomId: string;
  roomName: string;
  createdBy: string;
  password?: string;
  players: OnlinePlayer[];
  theme: 'general'
  | 'programming'
  | 'sistem_digital'
  | 'logika_mtk'
  | 'matematika'
  | 'english'
  | 'history';
  status: 'waiting' | 'playing' | 'finished';
  currentTurnPlayerId: string; // ← number → string
  createdAt: number;
  updatedAt: number;
  maxPlayers: number;
}

export interface OnlinePlayer {
  id: string;
  name: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number;
  previousPosition: number;
  inventory: any[];
  correctStreak: number;
  totalCorrect: number;
  totalWrong: number;
  skipNextTurn: boolean;
  hasFinished: boolean;
  usedSkillThisTurn: string[];
  deviceId: string;
  lastHeartbeat: number;
  isActive: boolean;
}

export interface OnlineGameState {
  roomId: string | null;
  room: GameRoom | null;
  localPlayer: OnlinePlayer | null;
  otherPlayers: OnlinePlayer[];
  gameStatus: 'idle' | 'waiting_for_players' | 'playing' | 'finished';
  error: string | null;
  isConnected: boolean;
}

export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
  password?: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
}

export interface CreateRoomRequest {
  roomName: string;
  theme: string;
  password?: string;
  maxPlayers?: number;
}

export type RoomEvent =
  | {
      type: 'dice_rolled';
      playerId: string;
      diceValue: number;
      timestamp: number;
      turnCount: number;
    }
  | {
      type: 'question_answered';
      playerId: string;
      questionId: string;
      isCorrect: boolean;
      timestamp: number;
      correctAnswer: number;
      playerAnswer: number;
    }
  | {
      type: 'position_changed';
      playerId: string;
      oldPosition: number;
      newPosition: number;
      timestamp: number;
      reason: 'movement' | 'snake' | 'ladder' | 'bomb';
    }
  | {
      type: 'turn_changed';
      currentTurnPlayerId: string; // ← number → string
      timestamp: number;
    }
  | { type: 'player_joined'; player: OnlinePlayer }
  | { type: 'player_left'; playerId: string }
  | { type: 'game_started'; gameState: any }
  | { type: 'item_used'; playerId: string; itemType: string }
  | { type: 'game_finished'; winnerId: string }
  | { type: 'heartbeat'; playerId: string };

export interface GameEvent {
  id: string;
  roomId: string;
  event: RoomEvent;
  createdAt: number;
  processedAt?: number;
}