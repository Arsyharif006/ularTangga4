// ============================================================
// Online Room Management Utilities
// ============================================================

import type { GameRoom, OnlinePlayer, CreateRoomRequest, JoinRoomRequest } from '@/types/online';

export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

export function generatePlayerId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${random}`;
}

export function isRoomFull(room: GameRoom): boolean {
  return room.players.length >= room.maxPlayers;
}

export function isColorTaken(room: GameRoom, color: string): boolean {
  return room.players.some(p => p.color === color);
}

export function getAvailableColors(room: GameRoom): Array<'red' | 'blue' | 'green' | 'yellow'> {
  const allColors: Array<'red' | 'blue' | 'green' | 'yellow'> = ['red', 'blue', 'green', 'yellow'];
  return allColors.filter(color => !isColorTaken(room, color));
}

export function createRoomObject(request: CreateRoomRequest, createdByPlayerId: string): GameRoom {
  return {
    roomId: generateRoomCode(),
    roomName: request.roomName,
    createdBy: createdByPlayerId,
    password: request.password || undefined,
    players: [],
    theme: (request.theme as any) || 'general',
    grade: request.grade || 'smp',
    status: 'waiting',
    currentTurnPlayerId: '0', // ← sekarang valid karena tipe sudah string
    createdAt: Date.now(),
    updatedAt: Date.now(),
    maxPlayers: request.maxPlayers || 4,
  };
}

export function createPlayerObject(
  request: JoinRoomRequest,
  playerId: string,
  deviceId: string
): OnlinePlayer {
  return {
    id: playerId,
    name: request.playerName,
    color: request.color,
    position: 1,
    previousPosition: 1,
    inventory: [],
    correctStreak: 0,
    totalCorrect: 0,
    totalWrong: 0,
    skipNextTurn: false,
    hasFinished: false,
    usedSkillThisTurn: [],
    deviceId,
    lastHeartbeat: Date.now(),
    isActive: true,
  };
}

export function verifyRoomPassword(room: GameRoom, password: string | undefined): boolean {
  if (!room.password) return true;
  return room.password === password;
}

export function isRoomExpired(room: GameRoom, expiryHours: number = 24): boolean {
  const hourInMs = 60 * 60 * 1000;
  return Date.now() - room.updatedAt > expiryHours * hourInMs;
}

export function isPlayerActive(player: OnlinePlayer, timeoutSeconds: number = 60): boolean {
  return Date.now() - player.lastHeartbeat < timeoutSeconds * 1000;
}

export function removeInactivePlayers(room: GameRoom, timeoutSeconds: number = 60): OnlinePlayer[] {
  return room.players.filter(p => isPlayerActive(p, timeoutSeconds));
}

export function getRoomDisplayInfo(room: GameRoom) {
  return {
    ...room,
    password: room.password ? '***' : undefined,
  };
}

export function formatRoomCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function parseRoomCode(formatted: string): string {
  return formatted.replace('-', '');
}

export function areAllPlayersReady(room: GameRoom): boolean {
  return room.players.length > 1 && room.players.length <= room.maxPlayers;
}