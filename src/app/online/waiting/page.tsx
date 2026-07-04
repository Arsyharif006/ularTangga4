'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Copy, Users, Lock, RefreshCw, Hash, Sparkles, Crown, UserPlus, UserMinus, Rocket, Check, Clock3 } from 'lucide-react';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import { formatRoomCode } from '@/lib/onlineRoomUtils';
import { supabaseRealtimeService } from '@/lib/supabase/realtimeService';
import { supabaseGameService } from '@/lib/supabase/gameService';
import type { PlayerColor } from '@/types/game';

// ── Design tokens (matches Create Room / Join Room / Modal) ─────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

const colorMap: Record<PlayerColor, { from: string; to: string; name: string }> = {
  red: { from: 'from-rose-400', to: 'to-rose-600', name: 'Merah' },
  blue: { from: 'from-sky-400', to: 'to-blue-600', name: 'Biru' },
  green: { from: 'from-emerald-400', to: 'to-emerald-600', name: 'Hijau' },
  yellow: { from: 'from-amber-300', to: 'to-amber-500', name: 'Kuning' },
};

export default function WaitingRoomPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [roomId, setRoomId] = useState('');

  // Avoid `useSearchParams()` to prevent CSR bailout during prerender.
  // Read query params from `window.location.search` on client mount.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const rid = sp.get('roomId') || '';
      setRoomId(rid);
    } catch (e) {
      // noop in non-browser environments
    }
  }, []);

  const { room, localPlayer, setRoom, setGameStatus, resetOnlineGame } = useOnlineGameStore();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRefreshingSlots, setIsRefreshingSlots] = useState(false);
  const [startError, setStartError] = useState('');
  const [leaveQueue, setLeaveQueue] = useState<Array<{ id: string; name: string }>>([]);

  // ------------------------------------------------------------------
  // Leave-guard: prevents the leave/promote sequence from running twice.
  // This page also has a separate "auto-leave on unmount" useEffect
  // cleanup (e.g. for refresh/navigation-away handling) that independently
  // calls promoteToHost + leaveRoom. Without a guard, clicking "Kembali"
  // triggers handleBack's leave sequence AND THEN, because router.push()
  // unmounts this component, the cleanup effect's leave sequence fires
  // again — with stale closure values from before resetOnlineGame() ran.
  // Two promote/leave calls racing each other is what causes the host's
  // slot to sometimes still show as occupied after they've left.
  //
  // IMPORTANT: the same `hasLeftRef` instance must be shared with (or the
  // same guard pattern replicated in) whatever effect handles auto-leave
  // on unmount, so that only ONE of the two ever actually executes the
  // promote+leave network calls.
  // ------------------------------------------------------------------
  const hasLeftRef = useRef(false);

  // ------------------------------------------------------------------
  // CRITICAL FIX: room and localPlayer must be read "live" inside the
  // realtime callback via refs, NOT captured directly in the effect's
  // closure with `room`/`localPlayer` in the dependency array.
  //
  // Why this matters: `room` changes on every single realtime update
  // (setRoom() is called every time ANY player joins/leaves/changes turn),
  // and Zustand's `set()` always produces a new object/array reference.
  // If `room` or `localPlayer` were in the subscription effect's
  // dependency array, the effect would tear down and re-create the
  // Supabase channel subscription on every update — and because
  // `prevPlayers` is re-initialised from `room?.players` at the top of
  // the effect every time it re-runs, the join/leave diffing logic loses
  // its history. Worse, rapid resubscribe cycles can leave a stale
  // channel's in-flight fetch callback still resolving after a newer
  // channel has already been created, overwriting fresh state with stale
  // data — which is exactly the "left player's slot doesn't clear"
  // symptom being debugged here.
  //
  // The fix: subscribe ONCE per `roomId`, and read the latest `room` /
  // `localPlayer` from refs (always current, no resubscribe needed).
  // ------------------------------------------------------------------
  const roomRef = useRef(room);
  const localPlayerRef = useRef(localPlayer);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);
  useEffect(() => {
    localPlayerRef.current = localPlayer;
  }, [localPlayer]);

  // Subscribe to real-time room updates
  useEffect(() => {
    if (!roomId) return;

    let mounted = true;

    let roomCode = roomId;
    if (roomCode.startsWith('room_')) {
      roomCode = roomCode.substring(5);
    }
    roomCode = roomCode.replace('-', '');

    let prevPlayers: any[] = roomRef.current?.players || [];
    const unsubscribe = supabaseRealtimeService.subscribeToRoomUpdates(roomCode, (updatedRoom) => {
      if (updatedRoom && mounted) {
        // Detect joins
        const nextPlayers = updatedRoom.players || [];
        if (nextPlayers.length > prevPlayers.length) {
          // Find newly joined players by id
          const prevIds = new Set(prevPlayers.map((p) => String(p.id)));
          const added = nextPlayers.filter((p) => !prevIds.has(String(p.id)));
          if (added.length > 0) {
            const who = added[added.length - 1];
            // push to toast queue
            setJoinQueue((q) => {
              const next = [...q, { id: String(who.id), name: who.name }];
              // cap queue length
              return next.slice(-6);
            });
            playJoinSound();
          }
        }

        // Detect leaves
        if (nextPlayers.length < prevPlayers.length) {
          // Find who left by id — this branch runs for ANY player leaving,
          // host or not. The slot they occupied is freed automatically once
          // setRoom(updatedRoom) below updates `room.players`, since the
          // empty-slot grid is derived from `players.length`.
          const nextIds = new Set(nextPlayers.map((p) => String(p.id)));
          const left = prevPlayers.filter((p) => !nextIds.has(String(p.id)));
          if (left.length > 0) {
            const who = left[left.length - 1];

            // Case 1: WE are the one who left (e.g. left from another tab/
            // device, or our own optimistic leave in handleBack hasn't
            // navigated away yet). Reset and redirect immediately — no
            // "left" toast to ourselves, no slot/host bookkeeping needed
            // since we're leaving the screen entirely.
            if (who.id === localPlayerRef.current?.id) {
              resetOnlineGame();
              router.push('/online/mode');
              return;
            }

            // Case 2: someone ELSE left (applies equally to host or a
            // regular player) — notify everyone still in the room. The
            // empty slot they occupied reappears automatically via the
            // players-derived grid once setRoom() runs below.
            setLeaveQueue((q) => {
              const next = [...q, { id: String(who.id), name: who.name }];
              // cap queue length
              return next.slice(-6);
            });
            playLeaveSound();

            // Case 2a: sub-case — if the player who left happened to be the
            // HOST and others remain, promote the first remaining player.
            // Regular (non-host) players who leave skip this block entirely;
            // their slot is freed by Case 2 above, no promotion needed.
            // This is a fallback for disconnects/crashes where the leaving
            // client couldn't promote before disconnecting (the normal
            // "Kembali" flow already promotes proactively in handleBack
            // before calling leaveRoom).
            if (who.name === roomRef.current?.createdBy && nextPlayers.length > 0) {
              const newHost = nextPlayers[0];
              supabaseGameService.promoteToHost(roomCode, newHost.name).catch(err => {
                console.error('Failed to promote new host:', err);
              });

              // Show notification if local player becomes the new host
              if (localPlayerRef.current?.id === newHost.id) {
                setLeaveQueue((q) => {
                  const next = [...q, { id: 'host-promotion', name: 'Anda menjadi Host' }];
                  return next.slice(-6);
                });
              }
            }
          }
        }

        prevPlayers = nextPlayers;
        setRoom(updatedRoom);

        if (updatedRoom.status === 'playing' && localPlayerRef.current) {
          router.push(`/online/game?roomCode=${roomCode}&roomId=room_${roomCode}`);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
    // IMPORTANT: `room` and `localPlayer` are intentionally NOT in this
    // dependency array. They're read live via roomRef/localPlayerRef
    // instead. Including them here would tear down and recreate the
    // Supabase channel subscription on every single room update (since
    // setRoom() always produces a new object), which is what caused
    // left-player slots to sometimes stay stuck — see the comment above
    // roomRef's declaration for the full explanation.
  }, [roomId, setRoom, resetOnlineGame, router]);

  // Join notification queue (toasts)
  const [joinQueue, setJoinQueue] = useState<Array<{ id: string; name: string }>>([]);

  // Play short UI beep using WebAudio (no external file required)
  const playJoinSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      o.stop(now + 0.19);
      // close context later to avoid suspend on mobile
      setTimeout(() => { try { ctx.close(); } catch {} }, 1000);
    } catch {
      // ignore audio errors
    }
  };

  // Play leave sound (lower pitch than join)
  const playLeaveSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 440;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      o.stop(now + 0.16);
      // close context later to avoid suspend on mobile
      setTimeout(() => { try { ctx.close(); } catch {} }, 1000);
    } catch {
      // ignore audio errors
    }
  };

  // Verify we have room data
  useEffect(() => {
    if (!room || !localPlayer) {
      router.push('/online/mode');
    }
  }, [room, localPlayer, router]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(formatRoomCode(roomId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ------------------------------------------------------------------
  // Manual slot refresh — bypasses Realtime entirely and re-fetches the
  // room snapshot directly via gameService.getRoom() (the same plain
  // two-query path already proven correct elsewhere in the app). This is
  // a safety net for the case where a postgres_changes event doesn't
  // reach this client (dropped websocket message, channel resubscribe
  // window, etc.) — clicking it should immediately reflect the true
  // database state without a full page reload, and without leaving the
  // room (unlike a page refresh, which triggers the auto-leave cleanup).
  // ------------------------------------------------------------------
  const handleRefreshSlots = async () => {
    if (!roomId || isRefreshingSlots) return;
    setIsRefreshingSlots(true);
    try {
      const code = roomId.replace('room_', '').replace('-', '');
      const freshRoom = await supabaseGameService.getRoom(code);
      if (freshRoom) {
        setRoom(freshRoom);
      }
    } catch (err) {
      console.error('Failed to refresh slots:', err);
    } finally {
      setIsRefreshingSlots(false);
    }
  };

  const handleBack = async () => {
    if (isLeaving || hasLeftRef.current) return; // prevent double-click AND double-leave from unmount cleanup
    hasLeftRef.current = true;
    setIsLeaving(true);

    try {
      if (room && localPlayer) {
        const roomCode = roomId.replace('room_', '').replace('-', '');

        // If we are the host and other players remain, promote the next
        // player to host BEFORE removing ourselves, so there's never a
        // window where `createdBy` points at a player who no longer exists.
        const isLeavingHost = room.createdBy === localPlayer.name;
        const remainingPlayers = room.players.filter((p) => p.id !== localPlayer.id);

        if (isLeavingHost && remainingPlayers.length > 0) {
          await supabaseGameService.promoteToHost(roomCode, remainingPlayers[0].name);
        }

        await supabaseGameService.leaveRoom(roomCode, localPlayer.id);
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    } finally {
      // Clear local state optimistically — don't wait for the realtime
      // "leave" event to come back for ourselves, and don't rely on
      // router.back() which can land somewhere unpredictable.
      resetOnlineGame();
      router.push('/online/mode');
    }
  };

  const handleStartGame = async () => {
    if (!room || !localPlayer) return;
    if (!isHost) return;

    try {
      setIsStarting(true);
      setStartError('');

      const roomCode = roomId.replace('room_', '');

      await supabaseGameService.updateRoomStatus(roomCode, 'playing');

      setGameStatus('playing');

      await supabaseGameService.postEvent(roomCode, players[0]?.id || localPlayer.id, 'game_started', {
        startedAt: Date.now(),
        firstPlayerId: players[0]?.id,
      });

      // Redirect host with countdown param; other clients will show countdown
      // when they receive the 'game_started' event.
      router.push(`/online/game?roomCode=${roomCode}&roomId=room_${roomCode}&countdown=3`);
    } catch (err: any) {
      setStartError(err?.message || 'Gagal memulai permainan');
      setIsStarting(false);
    }
  };

  const isHost = room?.createdBy === localPlayer?.name;
  const players = room?.players || [];
  const emptySlots = Math.max(0, (room?.maxPlayers || 4) - players.length);
  const formattedCode = formatRoomCode(roomId);

  const labelStyle = { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: WOOD_LIGHT, display: 'flex', alignItems: 'center', gap: '6px' };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#2B1B0F' }}>
      {/* Top join/leave notification toasts (stacked) */}
      <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {joinQueue.map((t, i) => (
            <motion.div
              key={t.id + '-' + i}
              initial={{ y: -30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.28, delay: i * 0.05 }}
              className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-2xl shadow-lg max-w-md w-full"
              style={{ background: 'rgba(34,197,94,0.95)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }}
              onAnimationComplete={() => {
                // schedule removal after visible duration
                setTimeout(() => {
                  setJoinQueue((q) => q.filter((x) => x.id !== t.id));
                }, 2200 + i * 120);
              }}
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-sm">{t.name} bergabung ke dalam room</span>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {leaveQueue.map((t, i) => (
            <motion.div
              key={t.id + '-leave-' + i}
              initial={{ y: -30, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.28, delay: i * 0.05 }}
              className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-2xl shadow-lg max-w-md w-full"
              style={{
                background: t.id === 'host-promotion' ? 'rgba(245,158,11,0.95)' : 'rgba(225,29,72,0.95)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
              onAnimationComplete={() => {
                // schedule removal after visible duration
                setTimeout(() => {
                  setLeaveQueue((q) => q.filter((x) => x.id !== t.id));
                }, 2200 + i * 120);
              }}
            >
              {t.id === 'host-promotion' ? (
                <Crown className="w-4 h-4 flex-shrink-0" />
              ) : (
                <UserMinus className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="truncate text-sm">{t.id === 'host-promotion' ? t.name : `${t.name} keluar dari room`}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Ambient background — soft glows + wood texture, matches other pages */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,211,77,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(122,74,38,0.18) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)` }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 flex flex-col flex-1 p-6"
      >
        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <motion.button
              whileHover={!isLeaving ? { scale: 1.08 } : undefined}
              whileTap={!isLeaving ? { scale: 0.92 } : undefined}
              onClick={handleBack}
              disabled={isLeaving}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'rgba(122,74,38,0.18)', border: `1px solid rgba(122,74,38,0.35)`, color: ACCENT }}
            >
              {isLeaving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
            </motion.button>
            <div className="flex-1 text-center pr-10">
              <h1 className="text-4xl font-black tracking-tight"
                style={{ color: ACCENT, WebkitTextStroke: `1.5px ${WOOD_DARK}`, textShadow: `0 3px 0 ${ACCENT_DEEP}, 0 6px 14px rgba(0,0,0,0.45)` }}>
                MENUNGGU PEMAIN
              </h1>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full" style={{ background: '#22c55e', opacity: 0.75 }} />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: '#22c55e' }} />
            </span>
            <p className="font-semibold text-sm tracking-wide" style={{ color: '#4ade80' }}>{room?.roomName}</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {/* Room Code Box */}
          <div className="mb-6 p-5 rounded-[26px]"
            style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `4px 4px 0 ${WOOD_DARK}` }}>
            {/* Top stripe */}
            <div className="h-[3px] w-full rounded-full mb-4"
              style={{ background: `linear-gradient(90deg, ${WOOD}, ${ACCENT}, ${WOOD})` }} />

            <div className="flex items-center justify-between mb-4">
              <span style={labelStyle}><Hash className="w-3.5 h-3.5" /> Kode Undangan</span>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleCopyCode}
                className="p-2 rounded-lg transition-all"
                style={{ background: `rgba(122,74,38,0.12)`, border: `2px solid ${WOOD}`, color: WOOD }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {copied ? (
                    <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                      <Check className="w-4 h-4" style={{ color: '#059669' }} />
                    </motion.span>
                  ) : (
                    <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                      <Copy className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <div className="rounded-2xl py-4 px-2 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2"
              style={{ background: BOARD_DARK, border: `2px solid ${WOOD}` }}>
              {formattedCode.split('').map((ch, i) =>
                ch === '-' ? (
                  <span key={i} className="font-bold mx-0.5" style={{ color: WOOD_LIGHT }}>–</span>
                ) : (
                  <motion.div
                    key={i}
                    initial={false}
                    animate={copied ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                    className="w-9 h-11 sm:w-11 sm:h-[3.25rem] rounded-lg flex items-center justify-center text-lg sm:text-2xl font-bold tabular-nums"
                    style={{ background: BOARD, border: `1.5px solid ${WOOD}`, color: INK }}
                  >
                    {ch}
                  </motion.div>
                )
              )}
            </div>

            <AnimatePresence>
              {copied && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center font-semibold text-sm mt-3"
                  style={{ color: '#059669' }}
                >
                  Kode disalin!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Room Info */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl p-4" style={{ background: BOARD, border: `2px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <p style={{ ...labelStyle, marginBottom: '6px' }}><Sparkles className="w-3.5 h-3.5" /> Tema</p>
              <p className="font-bold text-lg capitalize truncate" style={{ color: INK }}>{room?.theme}</p>
            </div>

            <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: BOARD, border: `2px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <Users className="w-4.5 h-4.5" style={{ color: '#059669' }} />
              </div>
              <div>
                <p style={labelStyle}>Pemain</p>
                <p className="font-bold text-lg" style={{ color: INK }}>{players.length}/2</p>
              </div>
            </div>
          </div>

          {/* Players Grid */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold uppercase tracking-wide text-sm" style={{ color: ACCENT }}>Pemain Bergabung</h2>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefreshSlots}
              disabled={isRefreshingSlots}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
              style={{ background: 'rgba(122,74,38,0.18)', border: `1px solid rgba(122,74,38,0.35)`, color: ACCENT }}
              title="Muat ulang status slot pemain tanpa keluar room"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingSlots ? 'animate-spin' : ''}`} />
              {isRefreshingSlots ? 'Memuat...' : 'Refresh'}
            </motion.button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {players.map((player) => {
              const isPlayerHost = player.name === room?.createdBy;
              const isYou = player.id === localPlayer?.id;
              return (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                  className="relative p-4 rounded-2xl text-center transition-all"
                  style={isYou ? {
                    background: ACCENT_TINT,
                    border: `2px solid ${ACCENT_DEEP}`,
                    boxShadow: `0 0 0 3px rgba(140,94,0,0.15), 3px 3px 0 ${WOOD_DARK}`,
                  } : {
                    background: BOARD,
                    border: `2px solid ${WOOD}`,
                    boxShadow: `3px 3px 0 ${WOOD_DARK}`,
                  }}
                >
                  {isPlayerHost && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: ACCENT }}>
                      <Crown className="w-3.5 h-3.5" style={{ color: ACCENT_DEEP }} />
                    </span>
                  )}
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorMap[player.color].from} ${colorMap[player.color].to} shadow-[inset_0_2px_2px_rgba(255,255,255,0.45),0_4px_10px_rgba(0,0,0,0.3)] mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold`}
                  >
                    {player.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <p className="font-bold text-sm truncate" style={{ color: INK }}>{player.name}</p>
                  {isYou && <p className="text-xs font-semibold mt-1" style={{ color: ACCENT_DEEP }}>Anda</p>}
                  <p className="text-xs mt-1" style={{ color: WOOD_LIGHT }}>{colorMap[player.color].name}</p>
                </motion.div>
              );
            })}

            {/* Slot 1 & 2: Open (untuk pemain yang bergabung) */}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, idx) => (
              <div
                key={`open-${idx}`}
                className="p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 min-h-[112px]"
                style={{ borderColor: WOOD_LIGHT, background: 'rgba(122,74,38,0.08)' }}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center motion-safe:animate-pulse" style={{ background: 'rgba(122,74,38,0.18)' }}>
                  <Users className="w-4 h-4" style={{ color: WOOD_LIGHT }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: WOOD_LIGHT }}>Menunggu...</p>
              </div>
            ))}

            {/* Slot 3 & 4: Always Locked */}
            {[2, 3].map((idx) => {
              const colorList: PlayerColor[] = ['red', 'blue', 'green', 'yellow'];
              return (
                <div
                  key={`locked-${idx}`}
                  className="p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative group cursor-not-allowed min-h-[112px]"
                  style={{ borderColor: 'rgba(220,38,38,0.4)', background: 'rgba(220,38,38,0.06)' }}
                >
                  <div className="w-9 h-9 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.15)' }}>
                    <Lock className="w-4 h-4" strokeWidth={2.5} style={{ color: 'rgba(220,38,38,0.6)' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'rgba(220,38,38,0.7)' }}>Terkunci</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(220,38,38,0.5)' }}>Alasan Teknis</p>

                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: 'rgba(124,15,38,0.95)', color: '#fecaca' }}>
                    {colorList[idx]?.charAt(0).toUpperCase() + colorList[idx]?.slice(1)} - Terkunci
                  </div>
                </div>
              );
            })}
          </div>

          {/* Start Game Button (Only for Host) */}
          {isHost && players.length >= 2 && (
            <div className="mb-6">
              <AnimatePresence>
                {startError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-3 rounded-xl text-center font-semibold text-sm"
                    style={{ background: 'rgba(239,68,68,0.09)', border: '2px solid rgba(239,68,68,0.35)', color: '#dc2626' }}
                  >
                    {startError}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={!isStarting ? { scale: 1.015 } : undefined}
                whileTap={!isStarting ? { scale: 0.97, y: 2 } : undefined}
                onClick={handleStartGame}
                disabled={isStarting}
                className="relative overflow-hidden w-full py-4 px-6 rounded-2xl font-extrabold uppercase tracking-wider text-base transition-all flex items-center justify-center gap-2"
                style={!isStarting ? {
                  background: `linear-gradient(135deg, ${ACCENT}, #e8b820)`,
                  color: INK,
                  boxShadow: `0 4px 20px rgba(255,211,77,0.30), 0 2px 0 ${ACCENT_DEEP}`,
                } : {
                  background: BOARD_DARK,
                  color: WOOD_LIGHT,
                  cursor: 'not-allowed',
                  border: `2px solid ${WOOD}`,
                }}
              >
                {!isStarting && !reduceMotion && (
                  <motion.span
                    className="absolute inset-y-0 w-1/3 bg-white/40 blur-sm skew-x-[-20deg]"
                    animate={{ x: ['-120%', '320%'] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                  />
                )}
                {isStarting ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Rocket className="w-5 h-5" />
                )}
                {isStarting ? 'Memulai...' : 'Mulai Permainan'}
              </motion.button>
            </div>
          )}

          {/* Waiting Message */}
          {isHost && players.length < 2 && (
            <div className="flex items-center justify-center gap-2 text-center font-semibold mb-6 text-sm" style={{ color: WOOD_LIGHT }}>
              <Clock3 className="w-4 h-4" />
              Tunggu 1 pemain lagi untuk memulai permainan
            </div>
          )}

          {!isHost && (
            <div className="flex items-center justify-center gap-2 text-center font-semibold mb-6 text-sm" style={{ color: WOOD_LIGHT }}>
              <Clock3 className="w-4 h-4" />
              Menunggu host untuk memulai permainan...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}