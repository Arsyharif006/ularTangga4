'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Menu, Home, Volume2, VolumeX, Dices } from 'lucide-react';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import { useGameStore } from '@/stores/gameStore';
import { BOARD_THEMES } from '@/data/boardThemes';
import { supabaseGameService } from '@/lib/supabase/gameService';
import { supabaseRealtimeService } from '@/lib/supabase/realtimeService';
import { GameBoard } from '@/components/board/GameBoard';
import { Inventory } from '@/components/ui/Inventory';
import { GameModals } from '@/components/ui/GameModals';
import Countdown from '@/components/ui/Countdown';
import type { GameRoom, OnlinePlayer } from '@/types/online';
import type { Player } from '@/types/game';

// ── Design tokens (sama dengan Main Menu, Settings & mode offline) ───────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

const COLOR_MAP: Record<string, string> = {
  red: 'bg-rose-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
};

const COLOR_GLOW: Record<string, string> = {
  red: 'shadow-[0_0_12px_rgba(244,63,94,0.5)]',
  blue: 'shadow-[0_0_12px_rgba(59,130,246,0.5)]',
  green: 'shadow-[0_0_12px_rgba(52,211,153,0.5)]',
  yellow: 'shadow-[0_0_12px_rgba(251,191,36,0.5)]',
};

// ─── Loading fallback ─────────────────────────────────────────────────────────
function GameLoading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: '#2B1B0F' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-6xl mb-4"
      >
        🎲
      </motion.div>
      <p className="font-bold text-lg" style={{ color: BOARD }}>Memuat permainan...</p>
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────
function OnlineGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = searchParams.get('roomCode') || '';
  const roomId = searchParams.get('roomId') || `room_${roomCode}`;
  const normalizedRoomCode = roomId.replace(/^room_/, '');

  const { room, localPlayer, setRoom } = useOnlineGameStore();

  const {
    players,
    currentPlayerIndex,
    phase,
    diceValue,
    turnCount,
    movementStepsRemaining,
    currentQuestion,
    rollDice: offlineRollDice,
    movePlayerStep,
    answerQuestion,
    initGame,
    boardTheme,
  } = useGameStore();

  const activeTheme = BOARD_THEMES[boardTheme] || BOARD_THEMES.classic;

  const showQuestion = useGameStore((state) => state.currentQuestion !== null);

  const [isConnected, setIsConnected] = useState(true);
  const [notifQueue, setNotifQueue] = useState<Array<{ id: string; name: string; kind: 'join' | 'leave' }>>([]);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [recordedGameFinish, setRecordedGameFinish] = useState(false);
  const initialCountdown = Number(searchParams.get('countdown') || 0);
  const [showCountdown, setShowCountdown] = useState(initialCountdown > 0);

  const onlineIdToOfflineIdx = useRef<Record<string, number>>({});
  const lastProcessedEventId = useRef<number>(-1);
  const prevPlayersRef = useRef<Player[] | null>(null);
  const prevRoomRef = useRef<GameRoom | null>(room ?? null);
  const broadcastPositionTimer = useRef<NodeJS.Timeout | null>(null);

  // ── suppressServerSync ref ───────────────────────────────────────────────────
  // Digunakan HANYA oleh Effect #5 (sync dari server).
  // Di-set true oleh:
  //   • Effect #1 (initGame) — agar Effect #5 tidak menimpa index awal
  //   • Event dice_rolled remote — agar Effect #5 tidak menimpa saat remote roll masuk
  // Effect #6 (persist ke server) TIDAK menggunakan ref ini — Effect #6 SELALU
  // menjalankan updateCurrentTurnPlayer setiap kali currentPlayerIndex berubah,
  // karena itulah satu-satunya cara server tahu giliran sudah berpindah.
  const suppressServerSync = useRef(false);

  // ─── 1. Initialize game from room ────────────────────────────────────────────
  useEffect(() => {
    if (!room || !localPlayer) {
      router.push('/online/mode');
      return;
    }
    if (gameInitialized) return;

    const offlinePlayers: Player[] = room.players.map((online, idx) => ({
      id: idx + 1,
      name: online.name,
      color: online.color,
      position: online.position,
      previousPosition: online.previousPosition,
      inventory: Array.isArray(online.inventory) ? online.inventory : [],
      correctStreak: online.correctStreak || 0,
      totalCorrect: online.totalCorrect || 0,
      totalWrong: online.totalWrong || 0,
      skipNextTurn: online.skipNextTurn || false,
      hasFinished: online.hasFinished || false,
      usedSkillThisTurn: online.usedSkillThisTurn || [],
    }));

    initGame(offlinePlayers, room.theme, undefined, room.grade || 'smp');

    const map: Record<string, number> = {};
    room.players.forEach((online, idx) => {
      map[String(online.id)] = idx;
    });
    onlineIdToOfflineIdx.current = map;
    prevPlayersRef.current = offlinePlayers;

    // Terapkan giliran dari server jika ada, tapi suppress agar Effect #5
    // tidak langsung menimpa lagi di render berikutnya.
    if (room.currentTurnPlayerId) {
      const serverIdx = room.players.findIndex(
        (p) => String(p.id) === String(room.currentTurnPlayerId)
      );
      if (serverIdx !== -1) {
        suppressServerSync.current = true;
        useGameStore.setState({ currentPlayerIndex: serverIdx, phase: 'rolling' });
      }
    }

    setGameInitialized(true);
  }, [room, localPlayer, gameInitialized, initGame, router]);

  // Short beep for join/leave using WebAudio
  const playJoinLeaveSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 740;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      o.stop(now + 0.17);
      setTimeout(() => { try { ctx.close(); } catch {} }, 800);
    } catch {
      // ignore
    }
  };

  const announceLeave = async () => {
    try {
      if (!localPlayer || !normalizedRoomCode) return;
      await supabaseGameService.postEvent(normalizedRoomCode, String(localPlayer.id), 'player_left', { name: localPlayer.name }).catch(() => {});
      try {
        await supabaseGameService.leaveRoom(normalizedRoomCode, String(localPlayer.id)).catch(() => {});
      } catch {}
    } catch {
      // ignore
    }
  };

  // ─── 2. Auto step-by-step movement ───────────────────────────────────────────
  useEffect(() => {
    if (phase === 'moving' && movementStepsRemaining > 0) {
      const timer = setTimeout(() => movePlayerStep(), 450);
      return () => clearTimeout(timer);
    }
  }, [phase, movementStepsRemaining, movePlayerStep]);

  useEffect(() => {
    if (!localPlayer || !normalizedRoomCode) return;
    const beforeunload = () => {
      try { announceLeave(); } catch {}
    };
    window.addEventListener('beforeunload', beforeunload);
    return () => window.removeEventListener('beforeunload', beforeunload);
  }, [localPlayer, normalizedRoomCode]);

  // ─── 3. Subscribe to room ────────────────────────────────────────────────────
  useEffect(() => {
    if (!normalizedRoomCode || phase === 'finished') return;
    let mounted = true;

    const applyRoom = (updatedRoom: GameRoom | null) => {
      if (!updatedRoom || !mounted) return;

      try {
        const prev = prevRoomRef.current?.players || [];
        const next = updatedRoom.players || [];
        const prevIds = new Set(prev.map((p) => String(p.id)));
        const nextIds = new Set(next.map((p) => String(p.id)));

        const added = next.filter((p) => !prevIds.has(String(p.id)));
        if (added.length > 0) {
          const who = added[added.length - 1];
          setNotifQueue((q) => {
            const n = q.concat({ id: String(who.id), name: who.name, kind: 'join' as const });
            if (n.length > 6) n.splice(0, n.length - 6);
            return n;
          });
          try { playJoinLeaveSound(); } catch {}
        }

        const removed = prev.filter((p) => !nextIds.has(String(p.id)));
        if (removed.length > 0) {
          const who = removed[removed.length - 1];
          setNotifQueue((q) => {
            const n = q.concat({ id: `left-${String(who.id)}`, name: who.name || 'Seseorang', kind: 'leave' as const });
            if (n.length > 6) n.splice(0, n.length - 6);
            return n;
          });
          try { playJoinLeaveSound(); } catch {}
        }
      } catch {}

      prevRoomRef.current = updatedRoom;
      setRoom(updatedRoom);
      setIsConnected(true);
    };

    let unsub: (() => void) | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      unsub = supabaseRealtimeService.subscribeToRoomUpdates(normalizedRoomCode, applyRoom);
    } catch {
      unsub = null;
    }

    if (!unsub) {
      const poll = async () => {
        try {
          const r = await supabaseGameService.getRoom(normalizedRoomCode);
          if (mounted) applyRoom(r);
        } catch {
          if (mounted) setIsConnected(false);
        }
      };
      poll();
      pollTimer = setInterval(poll, 2000);
    }

    return () => {
      mounted = false;
      if (unsub) unsub();
      if (pollTimer) clearInterval(pollTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedRoomCode, phase === 'finished']);

  // ─── 4. Sync remote player positions ─────────────────────────────────────────
  useEffect(() => {
    if (!gameInitialized || !room || !localPlayer) return;

    const localIdx = onlineIdToOfflineIdx.current[String(localPlayer.id)] ?? -1;
    const currentPlayers = useGameStore.getState().players;
    let changed = false;
    const next = [...currentPlayers];

    room.players.forEach((online) => {
      const offlineIdx = onlineIdToOfflineIdx.current[String(online.id)];
      if (offlineIdx === undefined || offlineIdx === localIdx) return;
      if (offlineIdx < 0 || offlineIdx >= next.length) return;

      const offline = next[offlineIdx];
      if (offline.position !== online.position) {
        next[offlineIdx] = { ...offline, position: online.position, previousPosition: offline.position };
        changed = true;
      }
    });

    if (changed) {
      // @ts-ignore
      useGameStore.setState({ players: next });
    }
  }, [room, gameInitialized, localPlayer]);

  // ─── 5. Sync current turn dari server ────────────────────────────────────────
  //
  // Effect ini hanya untuk CLIENT LAIN yang tidak sedang jalan (isRemote).
  // Tugasnya: sinkronkan giliran dari server ketika klien menerima room update.
  //
  // MASALAH LAMA:
  //   • Kode lama menggunakan suppressNextTurnPersist ref yang diset SETELAH
  //     setState, sehingga Effect #6 bisa berjalan sebelum flag diset.
  //   • Versi perbaikan pertama menggunakan store flag + phaseIsIdle, yang
  //     justru menyebabkan Effect #5 selalu menimpa giliran lokal karena
  //     setiap transisi ke 'rolling' memicunya, sementara server belum update.
  //
  // SOLUSI:
  //   • suppressServerSync ref diset true SEBELUM setiap setState yang mengubah
  //     currentPlayerIndex secara lokal (initGame, remote dice_rolled).
  //   • Effect #5 tidak lagi bergantung pada phase — hanya bergantung pada
  //     [gameInitialized, room] seperti semula.
  //   • Guard fase (moving/dice_rolling/question/item_awarded) tetap ada untuk
  //     mencegah interupsi di tengah giliran.
  //   • suppressServerSync hanya dikonsumsi jika kondisi override memenuhi
  //     syarat, sehingga flag tidak hilang sia-sia.
  useEffect(() => {
    if (!gameInitialized || !room?.currentTurnPlayerId) return;

    // Jangan ganggu turn yang sedang berjalan
    const currentPhase = useGameStore.getState().phase;
    if (
      currentPhase === 'moving' ||
      currentPhase === 'dice_rolling' ||
      currentPhase === 'question' ||
      currentPhase === 'item_awarded'
    ) return;

    const serverIdx = room.players.findIndex(
      (p) => String(p.id) === String(room.currentTurnPlayerId)
    );
    if (serverIdx === -1) return;

    const storeIdx = useGameStore.getState().currentPlayerIndex;
    if (storeIdx === serverIdx) return; // sudah sinkron, tidak perlu apa-apa

    // Ada perbedaan antara lokal dan server. Cek apakah kita baru saja
    // melakukan perubahan lokal yang belum sempat dipersist ke server.
    if (suppressServerSync.current) {
      // Lokal baru saja diset secara sengaja — jangan timpa.
      // Bersihkan flag agar update server berikutnya diproses normal.
      suppressServerSync.current = false;
      return;
    }

    // Server berbeda dan tidak ada suppress — ini berarti giliran berubah
    // dari klien lain. Terapkan ke lokal.
    useGameStore.setState({ currentPlayerIndex: serverIdx, phase: 'rolling' });
  }, [gameInitialized, room]);

  // ─── 6. Persist turn change ke server ────────────────────────────────────────
  //
  // Effect ini selalu berjalan ketika currentPlayerIndex berubah.
  // Tidak ada suppress di sini — setiap perubahan index harus dipersist,
  // karena itulah cara klien lain mengetahui giliran telah berpindah.
  //
  // Satu-satunya pengecualian: saat gameInitialized belum true (mount pertama),
  // karena index awal sudah ada di server dari saat room dibuat.
  useEffect(() => {
    if (!gameInitialized) return;

    const currentRoom = useOnlineGameStore.getState().room;
    if (!currentRoom || currentPlayerIndex < 0 || currentPlayerIndex >= currentRoom.players.length) return;

    const onlinePlayerAtIndex = currentRoom.players[currentPlayerIndex];
    if (!onlinePlayerAtIndex) return;

    supabaseGameService
      .updateCurrentTurnPlayer(normalizedRoomCode, String(onlinePlayerAtIndex.id))
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayerIndex]);

  // ─── 7. Broadcast local player position ──────────────────────────────────────
  useEffect(() => {
    if (!gameInitialized || !localPlayer || phase === 'moving' || phase === 'dice_rolling') return;

    const localIdx = onlineIdToOfflineIdx.current[String(localPlayer.id)] ?? -1;
    if (localIdx < 0 || localIdx >= players.length) return;

    const currentPos = players[localIdx]?.position;
    const prevPos = prevPlayersRef.current?.[localIdx]?.position;

    if (prevPos !== undefined && currentPos !== undefined && prevPos !== currentPos) {
      if (broadcastPositionTimer.current) clearTimeout(broadcastPositionTimer.current);
      broadcastPositionTimer.current = setTimeout(() => {
        supabaseGameService
          .updatePlayerPosition(normalizedRoomCode, String(localPlayer.id), currentPos, prevPos)
          .catch(() => { });
      }, 100);
    }

    prevPlayersRef.current = [...players];
  }, [players, phase, gameInitialized, localPlayer, normalizedRoomCode]);

  // ─── 8. Subscribe to game events ─────────────────────────────────────────────
  useEffect(() => {
    if (!gameInitialized || !normalizedRoomCode) return;

    let unsub: (() => void) | null = null;

    supabaseGameService
      .getRecentEvents(normalizedRoomCode, 10)
      .then((events) => {
        if (events.length > 0) {
          const latestId = Number((events[0] as any).id ?? 0);
          lastProcessedEventId.current = latestId;
        }
        try {
          if (!showCountdown && events.some((e: any) => e.type === 'game_started')) {
            setShowCountdown(true);
          }
        } catch { /* ignore */ }
      })
      .catch(() => { });

    const processEvent = async (evt: any) => {
      if (!evt) return;

      const evtId = Number(evt.id ?? -1);
      if (evtId > 0 && evtId <= lastProcessedEventId.current) return;
      if (evtId > 0) lastProcessedEventId.current = evtId;

      if (evt.type === 'player_left') {
        try {
          const whoName = String(evt.data?.name ?? evt.playerName ?? 'Seseorang');
          const whoId = String(evt.playerId ?? evt.data?.playerId ?? evt.data?.id ?? '');
          setNotifQueue((q) => {
            const n = q.concat({ id: `left-event-${whoId}`, name: whoName, kind: 'leave' as const });
            if (n.length > 6) n.splice(0, n.length - 6);
            return n;
          });
          try { playJoinLeaveSound(); } catch {}
        } catch {}
        return;
      }

      if (evt.type === 'dice_rolled') {
        const evtPlayerId = String(evt.playerId);
        if (localPlayer && evtPlayerId === String(localPlayer.id)) return;

        let offlineIdx = onlineIdToOfflineIdx.current[evtPlayerId];
        if (offlineIdx === undefined) {
          try {
            const latestRoom = await supabaseGameService.getRoom(normalizedRoomCode);
            if (latestRoom) {
              setRoom(latestRoom);
              const map: Record<string, number> = {};
              latestRoom.players.forEach((p: any, i: number) => { map[String(p.id)] = i; });
              onlineIdToOfflineIdx.current = map;
              offlineIdx = map[evtPlayerId];
            }
          } catch { /* ignore */ }
        }

        if (offlineIdx === undefined || offlineIdx < 0) return;

        const currentStorePhase = useGameStore.getState().phase;
        if (
          currentStorePhase === 'question' ||
          currentStorePhase === 'item_awarded' ||
          currentStorePhase === 'moving'
        ) return;

        // Suppress Effect #5 agar tidak langsung menimpa index yang baru di-set ini.
        // Effect #6 akan berjalan dan persist ke server (benar, karena remote roll
        // memang mengubah currentPlayerIndex di klien ini untuk animasi).
        suppressServerSync.current = true;
        useGameStore.setState({
          currentPlayerIndex: offlineIdx,
          phase: 'rolling',
          diceValue: null,
          diceIsRolling: false,
          movementStepsRemaining: 0,
        });

        const value = typeof evt.data?.value === 'number' ? evt.data.value : undefined;
        setTimeout(() => {
          useGameStore.getState().rollDice(value as any, true);
        }, 0);
      }

      if (evt.type === 'game_started') {
        try {
          setShowCountdown(true);
        } catch { /* ignore */ }
        return;
      }

      if (evt.type === 'game_finished') {
        try {
          const winnerOnlineId = String(evt.playerId ?? evt.data?.winnerId ?? evt.data?.winner);
          let offlineIdx = onlineIdToOfflineIdx.current[winnerOnlineId];
          if (offlineIdx === undefined) {
            const latestRoom = await supabaseGameService.getRoom(normalizedRoomCode);
            if (latestRoom) {
              setRoom(latestRoom);
              const map: Record<string, number> = {};
              latestRoom.players.forEach((p: any, i: number) => { map[String(p.id)] = i; });
              onlineIdToOfflineIdx.current = map;
              offlineIdx = map[winnerOnlineId];
            }
          }

          if (offlineIdx !== undefined && offlineIdx !== -1) {
            const winnerOfflineId = offlineIdx + 1;
            useGameStore.setState({ currentPlayerIndex: offlineIdx, phase: 'finished', winnerId: winnerOfflineId });
            setRecordedGameFinish(true);
          }
        } catch { /* ignore */ }
        return;
      }

      if (evt.type === 'item_used') {
        try {
          const actorOnlineId = String(evt.playerId);
          const itemType = String(evt.data?.itemType ?? evt.data?.item);
          const targetOnlineId = String(evt.data?.targetId ?? evt.data?.target);

          const actorIdx = onlineIdToOfflineIdx.current[actorOnlineId];
          const targetIdx = onlineIdToOfflineIdx.current[targetOnlineId];

          if (itemType === 'powerup_swap_position' || itemType === 'swap_position') {
            if (typeof actorIdx === 'number' && typeof targetIdx === 'number' && actorIdx >= 0 && targetIdx >= 0) {
              const gs = useGameStore.getState();
              const curPlayers = gs.players.slice();
              const actor = curPlayers[actorIdx];
              const target = curPlayers[targetIdx];
              if (actor && target) {
                const actorOldPos = actor.position;
                const targetOldPos = target.position;
                curPlayers[actorIdx] = { ...actor, previousPosition: actorOldPos, position: targetOldPos };
                curPlayers[targetIdx] = { ...target, previousPosition: targetOldPos, position: actorOldPos };
                useGameStore.setState({ players: curPlayers });
              }
            }
          } else if (itemType === 'push_back' || itemType === 'powerup_push_back') {
            if (typeof targetIdx === 'number' && targetIdx >= 0) {
              const gs = useGameStore.getState();
              const curPlayers = gs.players.slice();
              const t = curPlayers[targetIdx];
              if (t) {
                curPlayers[targetIdx] = { ...t, position: t.previousPosition ?? t.position };
                useGameStore.setState({ players: curPlayers });
              }
            }
          } else if (itemType === 'skip_turn' || itemType === 'powerup_skip_turn') {
            if (typeof targetIdx === 'number' && targetIdx >= 0) {
              const gs = useGameStore.getState();
              const curPlayers = gs.players.slice();
              curPlayers[targetIdx] = { ...curPlayers[targetIdx], skipNextTurn: true };
              useGameStore.setState({ players: curPlayers });
            }
          }
        } catch { /* ignore */ }
        return;
      }
    };

    try {
      unsub = supabaseRealtimeService.subscribeToGameEvents(normalizedRoomCode, processEvent);
    } catch { /* ignore */ }

    return () => { if (unsub) unsub(); };
  }, [gameInitialized, normalizedRoomCode, localPlayer, setRoom]);

  // ─── Derived state ────────────────────────────────────────────────────────────
  const localOfflineIdx = localPlayer
    ? (onlineIdToOfflineIdx.current[String(localPlayer.id)] ?? -1)
    : -1;

  const isLocalTurn =
    localOfflineIdx !== -1 &&
    currentPlayerIndex >= 0 &&
    currentPlayerIndex < players.length &&
    currentPlayerIndex === localOfflineIdx;

  const handleRollDice = useCallback(async () => {
    if (!isLocalTurn) return;
    if (showCountdown) return;
    if (phase !== 'rolling' && phase !== 'golden_dice') return;
    const { turnActionLock, diceIsRolling } = useGameStore.getState();
    if (turnActionLock || diceIsRolling) return;

    try {
      const finalValue = (Math.floor(Math.random() * 6) + 1) as any;
      offlineRollDice(finalValue);

      if (localPlayer) {
        await supabaseGameService
          .postEvent(normalizedRoomCode, localPlayer.id, 'dice_rolled', { value: finalValue })
          .catch(() => { });
      }
    } catch {
      setError('Gagal lempar dadu');
    }
  }, [isLocalTurn, phase, offlineRollDice, normalizedRoomCode, localPlayer, showCountdown]);

  const handleAnswerQuestion = useCallback(
    async (isCorrect: boolean) => {
      try {
        answerQuestion(isCorrect);
        if (localPlayer) {
          await supabaseGameService
            .postEvent(normalizedRoomCode, localPlayer.id, 'question_answered', { isCorrect })
            .catch(() => { });
        }
      } catch {
        setError('Gagal menyimpan jawaban');
      }
    },
    [answerQuestion, normalizedRoomCode, localPlayer]
  );

  // When game finishes, post a single 'game_finished' event and record user stats once
  useEffect(() => {
    if (!gameInitialized || phase !== 'finished' || recordedGameFinish) return;

    let mounted = true;
    (async () => {
      try {
        const recent = await supabaseGameService.getRecentEvents(normalizedRoomCode, 50);
        if (!recent.some((e) => e.type === 'game_finished')) {
          const winnerOnlineId = room?.players?.[currentPlayerIndex]?.id;
          if (winnerOnlineId) {
            await supabaseGameService.postEvent(normalizedRoomCode, String(winnerOnlineId), 'game_finished', { winnerId: String(winnerOnlineId) });
            try {
              await supabaseGameService.recordGameResult(normalizedRoomCode, String(winnerOnlineId));
            } catch (e) {
              // ignore failures here — UI shouldn't block on stats update
            }
          }
        }
      } catch (err) {
        // ignore
      }
      if (mounted) setRecordedGameFinish(true);
    })();

    return () => { mounted = false; };
  }, [phase, gameInitialized, normalizedRoomCode, currentPlayerIndex, recordedGameFinish, room]);

  const handleHome = () => router.push('/');

  const handleLeaveToHome = async () => {
    try {
      await announceLeave();
    } catch {}
    router.push('/');
  };

  const NotificationToasts = () => (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex flex-col items-center gap-2">
      {notifQueue.map((t, i) => (
        <motion.div
          key={t.id + '-' + i}
          initial={{ y: -30, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.28, delay: i * 0.04 }}
          className="font-bold px-5 py-2 rounded-2xl shadow-lg max-w-md w-full mx-4"
          style={{
            background: t.kind === 'join' ? 'rgba(143,166,110,0.95)' : 'rgba(199,123,94,0.95)',
            color: '#FFFFFF',
            border: `2px solid ${WOOD_DARK}`,
          }}
          onAnimationComplete={() => {
            setTimeout(() => setNotifQueue((q) => q.filter((x) => x.id !== t.id)), 2000 + i * 80);
          }}
        >
          {t.kind === 'join' ? `${t.name} bergabung ke dalam arena` : `${t.name} meninggalkan arena`}
        </motion.div>
      ))}
    </div>
  );

  if (!room || !localPlayer || !gameInitialized) {
    return <GameLoading />;
  }

  const currentPlayer = players[currentPlayerIndex];

  return (
    <div
      className={`min-h-screen flex flex-col overflow-hidden bg-gradient-to-br ${activeTheme.bgGradient}`}
    >
      <NotificationToasts />
      {/* Wood-grain ambient backdrop, tinted to overlay the theme gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'rgba(20,12,5,0.35)' }} />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, #000 0px, #000 2px, transparent 2px, transparent 14px)`,
          }}
        />
      </div>

      {/* Header */}
      <div
        className="relative z-10 flex justify-between items-center px-5 pt-6 pb-4"
        style={{ background: WOOD_DARK, borderBottom: `4px solid ${activeTheme.accentColor}` }}
      >
        <div>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              color: ACCENT,
              WebkitTextStroke: `1px ${WOOD_DARK}`,
              textShadow: `0 2px 0 ${WOOD}, 0 6px 16px rgba(0,0,0,0.5)`,
            }}
          >
            ULAR TANGGA ONLINE
          </h1>
          <p
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            Putaran {turnCount}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowMenu(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center transition ml-2"
          style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', color: BOARD }}
        >
          <Menu className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Error & Status */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 p-3 text-center font-semibold mb-3 rounded-xl mx-4 border-2"
          style={{ background: '#F3DCD3', borderColor: '#C77B5E', color: '#7A3420' }}
        >
          {error}
        </motion.div>
      )}
      {!isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 p-3 text-center font-semibold mb-3 rounded-xl mx-4 flex items-center justify-center gap-2 border-2"
          style={{ background: ACCENT_TINT, borderColor: ACCENT_DEEP, color: ACCENT_DEEP }}
        >
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: ACCENT_DEEP }} />
          Menyambung kembali...
        </motion.div>
      )}

      {/* Main layout */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-3 px-3 pt-4 pb-4 min-h-0">
        {/* Left Sidebar */}
        <div className="hidden md:flex md:w-44 flex-shrink-0 flex-col gap-2">
          <p
            className="text-[10px] uppercase tracking-widest font-black mb-1 px-1"
            style={{ color: WOOD_LIGHT }}
          >
            Pemain
          </p>
          {players.map((p, idx) => {
            const isMe = idx === localOfflineIdx;
            return (
              <motion.div
                key={p.id}
                animate={idx === currentPlayerIndex ? { scale: [1, 1.02, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="rounded-2xl p-3 transition-all"
                style={{
                  background: idx === currentPlayerIndex ? ACCENT_TINT : BOARD,
                  border: `3px solid ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD}`,
                  boxShadow: `3px 3px 0 ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD_DARK}`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${COLOR_MAP[p.color] || 'bg-gray-500'} ${idx === currentPlayerIndex ? COLOR_GLOW[p.color] || '' : ''}`} />
                  <p className="text-xs font-black truncate" style={{ color: INK }}>{p.name}</p>
                  {isMe && <span className="text-[10px] font-bold ml-auto" style={{ color: ACCENT_DEEP }}>(Anda)</span>}
                </div>
                <div className="flex justify-between">
                  <p className="text-[10px]" style={{ color: WOOD_LIGHT }}>
                    Pos: <span className="font-bold" style={{ color: INK }}>{p.position}</span>
                  </p>
                  <p className="text-[10px] font-bold text-emerald-700">✓{p.totalCorrect || 0}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Center: board */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Mobile player tabs */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
            {players.map((p, idx) => (
              <div
                key={p.id}
                className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all"
                style={{
                  background: idx === currentPlayerIndex ? ACCENT_TINT : BOARD,
                  border: `2px solid ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD}`,
                  boxShadow: `2px 2px 0 ${idx === currentPlayerIndex ? activeTheme.accentColor : WOOD_DARK}`,
                }}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP[p.color] || 'bg-gray-500'}`} />
                <span className="text-[11px] font-bold" style={{ color: INK }}>{p.name}</span>
                {idx === currentPlayerIndex && (
                  <span className="text-[10px]" style={{ color: activeTheme.accentColor }}>▲</span>
                )}
              </div>
            ))}
          </div>

          {/* Board */}
          <div className="flex items-center justify-center">
            <div
              className="w-full max-w-sm md:max-w-2xl aspect-square rounded-3xl overflow-hidden"
              style={{ boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 3px ${activeTheme.accentColor}` }}
            >
              <GameBoard />
            </div>
          </div>

          {/* Mobile dice + inventory */}
          <div className="md:hidden space-y-3">
            <Inventory isLocalTurn={isLocalTurn} />

            <DicePanel
              mobile
              currentPlayerName={currentPlayer?.name}
              phase={phase}
              diceValue={diceValue}
              isLocalTurn={isLocalTurn}
              onRoll={handleRollDice}
              countdownActive={showCountdown}
              accentColor={activeTheme.accentColor}
            />
          </div>
        </div>

        {/* Right sidebar — Desktop */}
        <div className="hidden md:flex md:w-52 flex-shrink-0 flex-col gap-3">
          <DicePanel
            currentPlayerName={currentPlayer?.name}
            phase={phase}
            diceValue={diceValue}
            isLocalTurn={isLocalTurn}
            onRoll={handleRollDice}
            countdownActive={showCountdown}
            accentColor={activeTheme.accentColor}
          />
          <div className="flex-1 overflow-y-auto">
            <Inventory isLocalTurn={isLocalTurn} />
          </div>
        </div>
      </div>

      {showCountdown && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <Countdown seconds={initialCountdown || 3} onComplete={() => setShowCountdown(false)} />
        </div>
      )}

      {/* Game End Modal */}
      {phase === 'finished' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ y: 80, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{ background: BOARD, border: `4px solid ${WOOD}`, boxShadow: `6px 6px 0 ${WOOD_DARK}` }}
          >
            <div className="text-5xl mb-4">🏆</div>
            <h2
              className="text-3xl font-black mb-3"
              style={{ color: ACCENT_DEEP, textShadow: `0 2px 0 ${ACCENT}` }}
            >
              SELESAI!
            </h2>
            <p className="font-bold mb-6" style={{ color: INK }}>
              Pemenang: <span className="font-black text-emerald-700">{players[currentPlayerIndex]?.name}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/online/mode')}
                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm"
                style={{ background: ACCENT, color: WOOD_DARK, border: `2px solid ${WOOD_DARK}`, boxShadow: `3px 3px 0 ${ACCENT_DEEP}` }}
              >
                Main Lagi
              </button>
              <button
                onClick={handleHome}
                className="flex-1 py-3 rounded-2xl font-black uppercase text-sm"
                style={{ background: BOARD_DARK, color: INK, border: `2px solid ${WOOD}` }}
              >
                Menu
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Settings Menu Modal */}
      {showMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setShowMenu(false)}
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl p-6"
            style={{ background: BOARD, border: `4px solid ${WOOD}`, boxShadow: `6px 6px 0 ${WOOD_DARK}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-2xl font-black mb-6 uppercase tracking-wider text-center"
              style={{ color: ACCENT_DEEP }}
            >
              Menu
            </h2>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-full py-3 px-4 rounded-2xl font-bold uppercase tracking-wider flex items-center justify-between text-sm"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
              >
                <span className="flex items-center gap-3">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-700" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-rose-600" />
                  )}
                  Suara
                </span>
                <span className={`text-xs font-black ${soundEnabled ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {soundEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={async () => { setShowMenu(false); try { await announceLeave(); } catch {} router.push('/'); }}
                className="w-full py-3 px-4 rounded-2xl font-bold uppercase tracking-wider flex items-center gap-3 text-sm"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
              >
                <Home className="w-4 h-4" style={{ color: WOOD }} />
                Menu Utama
              </button>
            </div>

            <button
              onClick={() => setShowMenu(false)}
              className="w-full py-3 rounded-2xl font-black uppercase tracking-wider text-sm"
              style={{ background: ACCENT, color: WOOD_DARK, border: `2px solid ${WOOD_DARK}`, boxShadow: `3px 3px 0 ${ACCENT_DEEP}` }}
            >
              Lanjutkan
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Question Modal */}
      <GameModals onAnswerQuestion={handleAnswerQuestion} />
    </div>
  );
}

// ─── DicePanel sub-component ──────────────────────────────────────────────────
interface DicePanelProps {
  mobile?: boolean;
  currentPlayerName?: string;
  phase: string;
  diceValue: number | null;
  isLocalTurn: boolean;
  onRoll: () => void;
  countdownActive?: boolean;
  accentColor: string;
}

function DicePanel({ mobile, currentPlayerName, phase, diceValue, isLocalTurn, onRoll, countdownActive, accentColor }: DicePanelProps) {
  const canRoll = isLocalTurn && (phase === 'rolling' || phase === 'golden_dice') && !countdownActive;

  const wrapper = mobile ? 'md:hidden' : '';

  return (
    <div
      className={`${wrapper} rounded-2xl p-4`}
      style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
    >
      <p
        className="text-[10px] uppercase tracking-widest font-black mb-2"
        style={{ color: WOOD_LIGHT }}
      >
        Giliran
      </p>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-3 h-3 rounded-full" style={{ background: accentColor }} />
        <p className="font-black text-lg" style={{ color: INK }}>{currentPlayerName}</p>
      </div>

      <div
        className="h-24 flex items-center justify-center rounded-2xl mb-4"
        style={{ background: BOARD_DARK, border: `2px solid ${WOOD}` }}
      >
        {phase === 'dice_rolling' ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}>
            <Dices className="w-10 h-10" style={{ color: accentColor }} />
          </motion.div>
        ) : diceValue ? (
          <motion.span
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className="text-6xl font-black"
            style={{ color: accentColor }}
          >
            {diceValue}
          </motion.span>
        ) : (
          <p className="text-sm font-bold text-center px-3" style={{ color: WOOD_LIGHT }}>Lempar Dadu</p>
        )}
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onRoll}
        disabled={!canRoll}
        className="w-full py-3 rounded-2xl font-black uppercase tracking-wider text-sm relative overflow-hidden"
        style={
          canRoll
            ? {
                background: accentColor,
                border: `2px solid ${WOOD_DARK}`,
                boxShadow: `0 4px 0 ${WOOD_DARK}, 3px 3px 0 ${WOOD_DARK}`,
                color: '#FFFFFF',
              }
            : {
                background: BOARD_DARK,
                border: `2px solid ${WOOD}`,
                color: WOOD_LIGHT,
                cursor: 'not-allowed',
              }
        }
      >
        <span className="flex items-center justify-center gap-2">
          Lempar
        </span>
        {canRoll && (
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        )}
      </motion.button>
    </div>
  );
}

// ─── Default export — dibungkus Suspense ──────────────────────────────────────
export default function OnlineGamePage() {
  return (
    <Suspense fallback={<GameLoading />}>
      <OnlineGameContent />
    </Suspense>
  );
}