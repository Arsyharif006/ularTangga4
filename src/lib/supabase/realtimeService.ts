// ============================================================
// Supabase Realtime Service
// ============================================================

import supabase from './client';
import type { GameRoom, OnlinePlayer, RoomEvent } from '@/types/online';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export class SupabaseRealtimeService {
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Normalize database data from snake_case to camelCase
   */
  private normalizeRoom(data: any): GameRoom | null {
    if (!data) return null;

    // Handle players array from database
    let players: OnlinePlayer[] = [];
    if (data.game_players) {
      players = Array.isArray(data.game_players)
        ? data.game_players.map((p: any) => this.normalizePlayer(p))
        : [];
    }

    return {
      roomId: data.room_id,
      id: data.id,
      roomName: data.room_name,
      createdBy: data.created_by,
      theme: data.theme,
      grade: data.grade || 'smp' as const,
      status: data.status,
      currentTurnPlayerId: data.current_turn_player_id,
      maxPlayers: data.max_players || 4,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      players: players,
      password: data.password,
    } as GameRoom;
  }

  /**
   * Normalize player data
   */
  private normalizePlayer(data: any): OnlinePlayer {
    const inventory = data.inventory;
    return {
      id: data.player_id || data.id,
      name: data.name,
      color: data.color as 'red' | 'blue' | 'green' | 'yellow',
      position: data.position || 0,
      previousPosition: data.previous_position || data.position || 0,
      inventory: Array.isArray(inventory) ? inventory : [],
      correctStreak: data.correct_streak || 0,
      totalCorrect: data.total_correct || 0,
      totalWrong: data.total_wrong || 0,
      skipNextTurn: data.skip_next_turn || false,
      hasFinished: data.has_finished || false,
      usedSkillThisTurn: data.used_skill_this_turn || [],
      deviceId: data.device_id || '',
      lastHeartbeat: data.last_heartbeat || 0,
      isActive: data.is_active !== false,
    };
  }

  /**
   * Subscribe to room updates (changes to status, turn, etc) + player join/leave
   */
  subscribeToRoomUpdates(roomCode: string, callback: (room: GameRoom | null) => void): () => void {
    const subscriptionKey = `room:${roomCode}`;
    let channel: RealtimeChannel;

    // ------------------------------------------------------------------
    // CRITICAL: prevent duplicate parallel channels for the same room.
    //
    // If subscribeToRoomUpdates() is called twice for the same roomCode
    // before the first call's returned unsubscribe() runs (e.g. React 18
    // StrictMode double-invoking effects in development, fast
    // navigation/remount, or any caller bug), this.subscriptions.set()
    // below would silently overwrite the Map entry — but the FIRST
    // channel's websocket listener keeps running in the background. Its
    // own private `fetchAndNotifyRoom` (with its own fetchSeq/appliedSeq
    // counters, scoped to that closure) keeps firing independently of the
    // second channel's. The two channels race with no shared ordering
    // guarantee, so whichever channel's fetch resolves last "wins" and
    // calls back with its data — even if that data is stale. This is what
    // caused the player grid to intermittently revert to stale state
    // right after correctly updating, requiring a manual refresh to fix.
    //
    // Fix: if a channel is already registered for this exact room, tear
    // it down FIRST before creating the new one, so there is only ever
    // one live channel (and one fetchSeq/appliedSeq counter) per room.
    // ------------------------------------------------------------------
    const existing = this.subscriptions.get(subscriptionKey);
    if (existing) {
      console.warn(`[realtime:${roomCode}] duplicate subscribeToRoomUpdates() call detected — removing previous channel before creating a new one`);
      supabase.removeChannel(existing);
      this.subscriptions.delete(subscriptionKey);
    }

    // ------------------------------------------------------------------
    // Race-condition guard:
    // Every postgres_changes event (room OR player table) triggers an
    // independent async re-fetch of the full room snapshot. Because these
    // fetches run concurrently and network timing isn't guaranteed, it's
    // possible for an OLDER fetch (kicked off first, e.g. right after a
    // host-promotion UPDATE, before the subsequent player DELETE has
    // happened) to RESOLVE LATER than a NEWER fetch (kicked off after the
    // DELETE). Without a guard, the stale "older" result can overwrite the
    // correct "newer" one in the UI — e.g. a player who already left still
    // shows up in the room because the stale fetch (still containing them)
    // lands after the fresh one (correctly without them).
    //
    // Fix: tag every fetch with an incrementing sequence number. Only apply
    // a fetch's result if no newer fetch has already been requested/applied
    // — this makes the final UI state always reflect the most recently
    // triggered fetch, not whichever happened to resolve last by chance.
    // ------------------------------------------------------------------
    let fetchSeq = 0;
    let appliedSeq = 0;

    // Helper function to fetch and notify room changes
    //
    // IMPORTANT: this uses two separate queries (game_rooms, then
    // game_players) instead of an embedded resource query
    // (`select('*, game_players(*)')`). The embedded join relies on
    // PostgREST correctly auto-detecting the FK relationship between
    // game_players.room_id and game_rooms.room_id, which can silently
    // mismatch or use a stale schema cache — causing the player list in
    // the join result to lag behind (e.g. a deleted player row still
    // appearing). Splitting into two plain `.eq('room_id', ...)` queries
    // mirrors gameService.getRoom(), which is known to read fresh data
    // correctly, and removes this entire class of bug.
    const fetchAndNotifyRoom = async () => {
      const mySeq = ++fetchSeq;

      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('room_id', roomCode)
        .single();

      if (roomError) {
        console.error(`[realtime:${roomCode}] room fetch error`, roomError);
        return;
      }

      const { data: playersData, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomCode)
        .order('seat_index', { ascending: true });

      if (playersError) {
        console.error(`[realtime:${roomCode}] players fetch error`, playersError);
        return;
      }


      // If a newer fetch was already requested/applied while this one was
      // in flight, drop this stale result.
      if (mySeq <= appliedSeq) {
        return;
      }

      appliedSeq = mySeq;
      const normalizedRoom = this.normalizeRoom({
        ...roomData,
        game_players: playersData || [],
      });
      callback(normalizedRoom);
    };

    // First, fetch current room state
    fetchAndNotifyRoom();

    // Create a single channel that subscribes to both room AND player changes
    channel = supabase
      .channel(`room:${roomCode}`)
      // Listen to room changes (status, turn update, etc)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `room_id=eq.${roomCode}`,
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          fetchAndNotifyRoom();
        }
      )
      // Listen to player changes (join, leave, stats update)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${roomCode}`,
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          // player table changed — re-fetch room snapshot
          fetchAndNotifyRoom();
        }
      )
      .subscribe((status, err) => {
      });

    this.subscriptions.set(subscriptionKey, channel);

    return () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
    };
  }

  /**
   * Subscribe to player updates (position, stats, etc)
   */
  subscribeToPlayerUpdates(roomCode: string, callback: (players: OnlinePlayer[]) => void): () => void {
    const subscriptionKey = `players:${roomCode}`;

    // If existing channel for players exists, remove it first to avoid duplicates
    const existing = this.subscriptions.get(subscriptionKey);
    if (existing) {
      console.warn(`[realtime:${roomCode}] duplicate subscribeToPlayerUpdates() call detected — removing previous channel before creating a new one`);
      supabase.removeChannel(existing);
      this.subscriptions.delete(subscriptionKey);
    }

    let fetchSeq = 0;
    let appliedSeq = 0;

    const fetchAndApply = async () => {
      const mySeq = ++fetchSeq;

      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('room_id', roomCode);

      if (error) {
        return;
      }

      if (mySeq <= appliedSeq) {
        return;
      }
      appliedSeq = mySeq;

      const players = (data || []).map((p: any) => this.normalizePlayer(p));
      callback(players);
    };

    // First, fetch current players
    fetchAndApply();

    // Subscribe to player changes
    const channel = supabase
      .channel(`players:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${roomCode}`,
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          // player change detected — re-fetch full player list
          fetchAndApply();
        }
      )
      .subscribe(() => {});

    this.subscriptions.set(subscriptionKey, channel);

    return () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
    };
  }

  /**
   * Subscribe to game events (dice rolls, moves, answers, etc)
   */
  subscribeToGameEvents(roomCode: string, callback: (event: any) => void): () => void {
    const subscriptionKey = `events:${roomCode}`;
    const processedIds = new Set<number>();
    // If a previous events channel exists for this room, remove it first
    const existing = this.subscriptions.get(subscriptionKey);
    if (existing) {
      console.warn(`[realtime:${roomCode}] duplicate subscribeToGameEvents() call detected — removing previous channel before creating a new one`);
      supabase.removeChannel(existing);
      this.subscriptions.delete(subscriptionKey);
    }

    // First, fetch recent events (mark them as processed so we don't re-fire)
    supabase
      .from('game_events')
      .select('*')
      .eq('room_id', roomCode)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          return;
        }
        if (data) {
          data.forEach((evt: any) => {
            processedIds.add(evt.id);
            const event = {
              type: evt.event_type,
              playerId: evt.player_id,
              data: evt.event_data,
              timestamp: evt.created_at,
            };
            callback(event);
          });
        }
      });

    // Subscribe to new events
    const channel = supabase
      .channel(`events:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: `room_id=eq.${roomCode}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (processedIds.has(payload.new.id)) {
            return;
          }

          processedIds.add(payload.new.id);

          const event = {
            type: payload.new.event_type,
            playerId: payload.new.player_id,
            data: payload.new.event_data,
            timestamp: payload.new.created_at,
          };

          callback(event);
        }
      )
      .subscribe(() => {});

    this.subscriptions.set(subscriptionKey, channel);

    return () => {
      supabase.removeChannel(channel);
      this.subscriptions.delete(subscriptionKey);
    };
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        this.reconnectAttempts = 0;
      }, delay);
    }
  }

  /**
   * Clean up all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.subscriptions.clear();
    // all subscriptions cleaned up
  }
}

export const supabaseRealtimeService = new SupabaseRealtimeService();