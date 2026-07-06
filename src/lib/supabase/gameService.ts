// ============================================================
// Supabase PostgreSQL Game Service (Complete)
// ============================================================

import supabase from './client';
import type { GameRoom, OnlinePlayer, RoomEvent } from '@/types/online';
import { generateRoomCode } from '@/lib/onlineRoomUtils';

/**
 * Supabase PostgreSQL Integration with Supabase SDK
 * Tables:
 * - game_rooms (id, room_id, room_name, created_by, password, theme, status, current_turn_player_id, max_players, created_at, updated_at)
 * - game_players (id, room_id, player_id, name, color, position, previous_position, inventory, correct_streak, total_correct, total_wrong, skip_next_turn, has_finished, used_skill_this_turn, device_id, is_active, last_heartbeat)
 * - game_events (id, room_id, player_id, event_type, event_data, created_at)
 */

export class SupabaseGameService {
  private normalizeRoomCode(roomCode: string) {
    return roomCode.replace(/^room_/, '');
  }
  constructor() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      // Supabase credentials not configured
    }
  }

  /**
   * Create a new room with creator as first player
   */
  async createRoom(
    roomName: string,
    theme: string,
    creatorName: string,
    creatorColor: string,
    providedRoomCode?: string,
    providedPlayerId?: string,
    grade?: 'sd' | 'smp' | 'sma_smk'
  ): Promise<GameRoom> {
    try {
      const roomCode = this.normalizeRoomCode(providedRoomCode || generateRoomCode());
      const creatorPlayerId = providedPlayerId ?? `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Creating room: ${roomCode}

      const nowISO = new Date().toISOString();

      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          room_id: roomCode,
          room_name: roomName,
          created_by: creatorName,
          theme,
          grade: grade || 'smp',
          status: 'waiting',
          current_turn_player_id: creatorPlayerId,
          max_players: 4,
          created_at: nowISO,
          updated_at: nowISO,
        })
        .select()
        .single();

      if (roomError) {
        throw roomError;
      }

      // Add creator as first player (seat_index = 1)
      const { error: playerError } = await supabase
        .from('game_players')
        .insert({
          room_id: roomCode,
          player_id: creatorPlayerId,
          name: creatorName,
          color: creatorColor as any,
          position: 1,
          previous_position: 1,
          inventory: [],
          correct_streak: 0,
          total_correct: 0,
          total_wrong: 0,
          skip_next_turn: false,
          has_finished: false,
          used_skill_this_turn: [],
          device_id: '',
          is_active: true,
          last_heartbeat: Date.now(),
          seat_index: 1,
        });

      if (playerError) {
        throw playerError;
      }

      // Room created successfully: ${roomCode}

      // Return room object matching GameRoom type
      return {
        roomId: roomCode,
        roomName,
        createdBy: creatorName,
        theme,
        grade: 'smp' as const,
        status: 'waiting',
        currentTurnPlayerId: creatorPlayerId,
        maxPlayers: 4,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        players: [
          {
            id: creatorPlayerId,
            name: creatorName,
            color: creatorColor as any,
            position: 1,
            previousPosition: 1,
            inventory: [],
            correctStreak: 0,
            totalCorrect: 0,
            totalWrong: 0,
            skipNextTurn: false,
            hasFinished: false,
            usedSkillThisTurn: [],
            deviceId: '',
            isActive: true,
            lastHeartbeat: Date.now(),
          },
        ],
      } as GameRoom;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get room by code with all players
   */
  async getRoom(roomCode: string): Promise<GameRoom | null> {
    try {
      const code = this.normalizeRoomCode(roomCode);

      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_id', code)
        .single();

      if (roomError) {
        if (roomError.code === 'PGRST116') {
          return null;
        }
        throw roomError;
      }

      const { data: playersData, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', code)
        .order('seat_index', { ascending: true });

      if (playersError) {
        throw playersError;
      }

      const players = (playersData || []).map((p: any) => ({
        id: p.player_id,
        name: p.name,
        color: p.color as any,
        position: p.position,
        previousPosition: p.previous_position,
        inventory: p.inventory || [],
        correctStreak: p.correct_streak,
        totalCorrect: p.total_correct,
        totalWrong: p.total_wrong,
        skipNextTurn: p.skip_next_turn,
        hasFinished: p.has_finished,
        usedSkillThisTurn: p.used_skill_this_turn || [],
        deviceId: p.device_id,
        isActive: p.is_active,
        lastHeartbeat: p.last_heartbeat,
        seatIndex: p.seat_index,
      }));

      // Room found: ${roomCode}

      return {
        roomId: roomData.room_id,
        roomName: roomData.room_name,
        createdBy: roomData.created_by,
        theme: roomData.theme,
        grade: 'smp' as const,
        status: roomData.status,
        currentTurnPlayerId: roomData.current_turn_player_id,
        maxPlayers: roomData.max_players,
        createdAt: new Date(roomData.created_at).getTime(),
        updatedAt: new Date(roomData.updated_at).getTime(),
        password: roomData.password,
        players,
      } as GameRoom;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Join existing room
   */
  async joinRoom(roomCode: string, playerName: string, playerColor: string, providedPlayerId?: string): Promise<GameRoom> {
    try {
      const playerId = providedPlayerId ?? `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const code = this.normalizeRoomCode(roomCode);

      const room = await this.getRoom(code);
      if (!room) {
        throw new Error(`Room ${roomCode} not found`);
      }

      if (room.players.length >= room.maxPlayers) {
        throw new Error(`Room ${roomCode} is full`);
      }

      if (room.players.some((p) => p.color === playerColor)) {
        throw new Error(`Color ${playerColor} is already taken`);
      }

      // Determine seat index as current number of players + 1
      const seatIndex = (room.players?.length || 0) + 1;
      const { error: playerError } = await supabase.from('game_players').insert({
        room_id: roomCode,
        player_id: playerId,
        name: playerName,
        color: playerColor,
        position: 1,
        previous_position: 1,
        inventory: [],
        correct_streak: 0,
        total_correct: 0,
        total_wrong: 0,
        skip_next_turn: false,
        has_finished: false,
        used_skill_this_turn: [],
        device_id: '',
        is_active: true,
        last_heartbeat: Date.now(),
        seat_index: seatIndex,
      });

      if (playerError) throw playerError;

      return (await this.getRoom(code))!;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record game result into `user_stats` table for online accounts only.
   * Only updates stats for players whose `player_id` does NOT start with 'player_' (i.e. real auth user ids).
   */
  async recordGameResult(roomCode: string, winnerPlayerId: string): Promise<void> {
    try {
      const room = await this.getRoom(roomCode);
      if (!room) return;

      const players = room.players || [];

      for (const p of players) {
        const uid = String(p.id);
        // Skip anonymous generated ids
        if (uid.startsWith('player_')) continue;

        const isWinner = uid === String(winnerPlayerId);

        // Fetch existing stats
        const { data: existing, error: fetchErr } = await supabase.from('user_stats').select('*').eq('user_id', uid).maybeSingle();
        if (fetchErr) {
          // continue to next
          continue;
        }

        if (existing) {
          const wins = (existing.wins || 0) + (isWinner ? 1 : 0);
          const games = (existing.games || 0) + 1;
          const win_rate = games > 0 ? Math.round((wins / games) * 10000) / 100 : 0;
          const reward = isWinner ? 2 : 1;
          const newCoins = (existing.coins || 0) + reward;
          await supabase.from('user_stats').update({ wins, games, win_rate, coins: newCoins }).eq('user_id', uid);
        } else {
          const wins = isWinner ? 1 : 0;
          const games = 1;
          const win_rate = wins / games * 100;
          const coins = isWinner ? 2 : 1;
          const unlocked_avatars = ['🐶','🐱','🐭','🐹','🐰','🦊'];
          const unlocked_boards = ['classic','winter'];
          await supabase.from('user_stats').insert({ user_id: uid, wins, games, win_rate, coins, unlocked_avatars, unlocked_boards }).select();
        }
      }
    } catch (error) {
      // swallow errors for now
      console.error('recordGameResult error', error);
    }
  }

  /**
   * Update room status
   */
  async updateRoomStatus(roomCode: string, status: string): Promise<void> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { error } = await supabase
        .from('game_rooms')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', code);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Promote a player to host (update created_by)
   */
  async promoteToHost(roomCode: string, newHostName: string): Promise<void> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { error } = await supabase
        .from('game_rooms')
        .update({
          created_by: newHostName,
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', code);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update player position
   */
  async updatePlayerPosition(
    roomCode: string,
    playerId: string,
    position: number,
    previousPosition: number
  ): Promise<void> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { error } = await supabase
        .from('game_players')
        .update({
          position,
          previous_position: previousPosition,
        })
        .eq('room_id', code)
        .eq('player_id', playerId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update player stats
   */
  async updatePlayerStats(roomCode: string, playerId: string, stats: any): Promise<void> {
    try {
      const updateData: any = {};
      if (stats.correctStreak !== undefined)
        updateData.correct_streak = stats.correctStreak;
      if (stats.totalCorrect !== undefined)
        updateData.total_correct = stats.totalCorrect;
      if (stats.totalWrong !== undefined)
        updateData.total_wrong = stats.totalWrong;
      if (stats.skipNextTurn !== undefined)
        updateData.skip_next_turn = stats.skipNextTurn;
      if (stats.hasFinished !== undefined)
        updateData.has_finished = stats.hasFinished;
      if (stats.usedSkillThisTurn !== undefined)
        updateData.used_skill_this_turn = stats.usedSkillThisTurn;
      if (stats.inventory !== undefined)
        updateData.inventory = stats.inventory;
      if (stats.position !== undefined)
        updateData.position = stats.position;
      if (stats.previousPosition !== undefined)
        updateData.previous_position = stats.previousPosition;

      const code = this.normalizeRoomCode(roomCode);
      const { error } = await supabase
        .from('game_players')
        .update(updateData)
        .eq('room_id', code)
        .eq('player_id', playerId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update current turn player
   */
  async updateCurrentTurnPlayer(roomCode: string, playerId: string): Promise<void> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { error } = await supabase
        .from('game_rooms')
        .update({
          current_turn_player_id: playerId,
          updated_at: new Date().toISOString(),
        })
        .eq('room_id', code);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Post event to game
   */
  async postEvent(
    roomCode: string,
    playerId: string,
    eventType: string,
    eventData: any
  ): Promise<RoomEvent> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { data, error } = await supabase
        .from('game_events')
        .insert({
          room_id: code,
          player_id: playerId,
          event_type: eventType,
          event_data: eventData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        type: eventType,
        playerId,
        data: eventData,
        timestamp: data.created_at,
      } as RoomEvent;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent events
   */
  async getRecentEvents(roomCode: string, limit: number = 50): Promise<RoomEvent[]> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { data, error } = await supabase
        .from('game_events')
        .select('*')
        .eq('room_id', code)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((evt: any) => ({
        id: evt.id,
        type: evt.event_type,
        playerId: evt.player_id,
        data: evt.event_data,
        timestamp: evt.created_at,
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete room
   */
  async deleteRoom(roomCode: string): Promise<void> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      await supabase.from('game_players').delete().eq('room_id', code);
      await supabase.from('game_events').delete().eq('room_id', code);
      await supabase.from('game_rooms').delete().eq('room_id', code);
      // Room deleted: ${roomCode}
    } catch (error) {
      throw error;
    }
  }

  /**
   * Leave room (remove player)
   */
  async leaveRoom(roomCode: string, playerId: string): Promise<void> {
    try {
      const code = this.normalizeRoomCode(roomCode);
      const { error } = await supabase
        .from('game_players')
        .delete()
        .eq('room_id', code)
        .eq('player_id', playerId);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
}

export const supabaseGameService = new SupabaseGameService();
