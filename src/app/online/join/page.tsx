'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertCircle, Hash, UserRound, Crown, Lock } from 'lucide-react';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import { generatePlayerId, createPlayerObject } from '@/lib/onlineRoomUtils';
import { supabaseGameService } from '@/lib/supabase/gameService';
import supabase from '@/lib/supabase/client';
import type { PlayerColor } from '@/types/game';

// ── Design tokens (matches Create Room) ─────────────────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

// Online mode: max 2 players only
const MAX_PLAYERS_ONLINE = 2;

const AVAILABLE_COLORS: { color: PlayerColor; from: string; to: string; ring: string; label: string }[] = [
  { color: 'red',    from: 'from-rose-400',    to: 'to-rose-600',    ring: 'ring-rose-300',    label: 'Merah'  },
  { color: 'blue',   from: 'from-sky-400',     to: 'to-blue-600',    ring: 'ring-sky-300',     label: 'Biru'   },
  { color: 'green',  from: 'from-emerald-400', to: 'to-emerald-600', ring: 'ring-emerald-300', label: 'Hijau'  },
  { color: 'yellow', from: 'from-amber-300',   to: 'to-amber-500',   ring: 'ring-amber-200',   label: 'Kuning' },
];

const TOKENS = [
  { bg: 'from-amber-300/60 to-amber-500/60',     size: 28, top: '8%',  left: '5%',  duration: 8,   delay: 0   },
  { bg: 'from-sky-400/60 to-blue-600/60',         size: 22, top: '16%', left: '92%', duration: 9.5, delay: 0.4 },
  { bg: 'from-rose-500/60 to-rose-700/60',        size: 26, top: '84%', left: '90%', duration: 7.5, delay: 0.8 },
  { bg: 'from-emerald-400/60 to-emerald-600/60',  size: 20, top: '90%', left: '6%',  duration: 10,  delay: 1.1 },
];

const ANIMAL_EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐢','🐍','🐴','🦄','🐝','🐙','🦋','🦀','🐬'];

const getAnimalEmojiForName = (name?: string | null) => {
  if (!name) return '🎮';
  const s = String(name).trim();
  if (!s) return '🎮';
  const ch = s[0].toLowerCase();
  if (ch >= 'a' && ch <= 'z') return ANIMAL_EMOJIS[(ch.charCodeAt(0) - 97) % ANIMAL_EMOJIS.length];
  return ANIMAL_EMOJIS[s.charCodeAt(0) % ANIMAL_EMOJIS.length];
};

export default function JoinRoomPage() {
  const router = useRouter();
  const { setRoom, setLocalPlayer, setGameStatus } = useOnlineGameStore();
  const reduceMotion = useReducedMotion();

  const [roomCode,      setRoomCode]      = useState('');
  const [codeFocused,   setCodeFocused]   = useState(false);
  const [playerName,    setPlayerName]    = useState('');
  const [authUserId,    setAuthUserId]    = useState<string | null>(null);
  const [avatarEmoji,   setAvatarEmoji]   = useState('🎮');
  const [selectedColor, setSelectedColor] = useState<PlayerColor>('red');
  const [password,      setPassword]      = useState('');
  const [usePassword,   setUsePassword]   = useState(false);
  const [error,         setError]         = useState('');
  const [isJoining,     setIsJoining]     = useState(false);

  const handleRoomCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setRoomCode(cleaned);
    setError('');
  };

  const handleFormatRoomCode = (code: string): string => {
    if (code.length === 6) {
      return `${code.slice(0, 3)}-${code.slice(3)}`;
    }
    return code;
  };

  const handleJoinRoom = async () => {
    try {
      setError('');
      setIsJoining(true);

      if (!roomCode || roomCode.length !== 6) {
        setError('Kode room harus 6 digit');
        setIsJoining(false);
        return;
      }

      if (!playerName.trim()) {
        setError('Nama pemain harus diisi');
        setIsJoining(false);
        return;
      }

      const existingRoom = await supabaseGameService.getRoom(roomCode);

      if (!existingRoom) {
        setError(`Room ${roomCode} tidak ditemukan. Pastikan kode sudah benar.`);
        setIsJoining(false);
        return;
      }

      // Prevent join if game already started
      if (existingRoom.status === 'playing') {
        setError('Permainan sudah dimulai, tidak dapat bergabung.');
        setIsJoining(false);
        return;
      }

      const playersInRoom = existingRoom.players || [];
      if (playersInRoom.length >= MAX_PLAYERS_ONLINE) {
        setError('Room sudah penuh (maksimal 2 pemain)');
        setIsJoining(false);
        return;
      }

      if (playersInRoom.some((p) => p.color === selectedColor)) {
        setError('Warna sudah diambil, pilih warna lain');
        setIsJoining(false);
        return;
      }

      // ensure user is authenticated and use their supabase user id as player id
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;
      if (!userId) {
        setError('Anda harus login dengan Google untuk bergabung ke room online');
        setIsJoining(false);
        return;
      }

      const playerId = generatePlayerId();
      const deviceId = generatePlayerId();

      const player = createPlayerObject(
        {
          roomId: roomCode,
          playerName,
          color: selectedColor,
          password: usePassword ? password : undefined,
        },
        playerId,
        deviceId
      );

      await supabaseGameService.joinRoom(roomCode, playerName, selectedColor, userId);

      // ensure user_stats row exists with email
      try {
        await supabase.from('user_stats').upsert({ user_id: userId, email: sessionData?.session?.user?.email || null });
      } catch {
        // ignore
      }

      const updatedRoom = await supabaseGameService.getRoom(roomCode);
      if (updatedRoom) {
        setRoom(updatedRoom);

        const existingIds = (playersInRoom || []).map((p: any) => p.id);
        const newPlayer = updatedRoom.players.find((p) => !existingIds.includes(p.id)) ||
          updatedRoom.players.find((p) => p.name === playerName && p.color === selectedColor);

        if (newPlayer) {
          setLocalPlayer(newPlayer as any);
        } else {
          setLocalPlayer(player);
        }
      } else {
        setLocalPlayer(player);
      }
      setGameStatus('waiting_for_players');

      router.push(`/online/waiting?roomId=${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung room');
      setIsJoining(false);
    }
  };

  // Prefill playerName & avatar from Google session
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (mounted && user) {
        setAuthUserId(user.id);
        try {
          const { data: stats } = await supabase.from('user_stats').select('username, name, avatar').eq('user_id', user.id).maybeSingle();
          const nameFromDb = (stats as any)?.username || (stats as any)?.name;
          const dbAvatar = (stats as any)?.avatar;
          const fallback = user.email?.split('@')[0] || '';
          const finalName = nameFromDb || fallback;
          setPlayerName(finalName);
          setAvatarEmoji(dbAvatar || getAnimalEmojiForName(finalName));
        } catch {
          const fallback = user.email?.split('@')[0] || '';
          setPlayerName(fallback);
          setAvatarEmoji(getAnimalEmojiForName(fallback));
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const cells = Array.from({ length: 6 }, (_, i) => roomCode[i] ?? '');
  const nextEmptyIndex = roomCode.length;

  const labelStyle = { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: WOOD_LIGHT, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#2B1B0F' }}>
      {/* Ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,211,77,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(122,74,38,0.18) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)` }} />
        {TOKENS.map((t, i) => (
          <motion.div key={i}
            className={`absolute rounded-lg bg-gradient-to-br ${t.bg}`}
            style={{ width: t.size, height: t.size, top: t.top, left: t.left }}
            animate={reduceMotion ? undefined : { y: [0, -14, 0], rotate: [0, 8, -6, 0] }}
            transition={{ duration: t.duration, repeat: Infinity, ease: 'easeInOut', delay: t.delay }}
          />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="relative z-10 flex flex-col flex-1 p-6">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-3">
            <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => router.back()}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition"
              style={{ background: 'rgba(122,74,38,0.18)', border: `1px solid rgba(122,74,38,0.35)`, color: ACCENT }}>
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
            <div className="flex-1 text-center pr-10">
              <h1 className="text-4xl font-black tracking-tight"
                style={{ color: ACCENT, WebkitTextStroke: `1.5px ${WOOD_DARK}`, textShadow: `0 3px 0 ${ACCENT_DEEP}, 0 6px 14px rgba(0,0,0,0.45)` }}>
                BERGABUNG ROOM
              </h1>
            </div>
          </div>
          <p className="text-center text-sm font-medium" style={{ color: WOOD_LIGHT }}>Input kode yang Anda terima</p>
        </div>

        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3.5 rounded-2xl text-sm font-semibold flex items-start gap-2.5"
                style={{ background: 'rgba(239,68,68,0.09)', border: '2px solid rgba(239,68,68,0.35)', color: '#dc2626' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Room Code Box */}
          <div className="mb-6 p-5 rounded-[26px]"
            style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `4px 4px 0 ${WOOD_DARK}` }}>
            {/* Top stripe */}
            <div className="h-[3px] w-full rounded-full mb-4"
              style={{ background: `linear-gradient(90deg, ${WOOD}, ${ACCENT}, ${WOOD})` }} />

            <label style={labelStyle}><Hash className="w-3.5 h-3.5" /> Kode Room</label>

            <div className="relative rounded-2xl py-4 px-2 sm:px-4 transition-colors"
              style={{ background: BOARD_DARK, border: `2px solid ${codeFocused ? ACCENT_DEEP : WOOD}`, boxShadow: codeFocused ? `0 0 0 2px rgba(140,94,0,0.15)` : 'none' }}>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                {cells.map((ch, i) => (
                  <Fragment key={i}>
                    {i === 3 && <span className="font-bold mx-0.5" style={{ color: WOOD_LIGHT }}>–</span>}
                    <div
                      className="w-9 h-11 sm:w-11 sm:h-[3.25rem] rounded-lg flex items-center justify-center text-lg sm:text-2xl font-bold tabular-nums transition-colors"
                      style={{
                        background: BOARD,
                        border: `1.5px solid ${codeFocused && i === nextEmptyIndex ? ACCENT_DEEP : WOOD}`,
                        color: INK,
                        boxShadow: codeFocused && i === nextEmptyIndex ? `0 0 0 3px rgba(140,94,0,0.18)` : 'none',
                      }}>
                      {ch}
                      {codeFocused && i === nextEmptyIndex && !reduceMotion && (
                        <motion.span
                          className="inline-block w-[2px] h-5 ml-0.5"
                          style={{ background: ACCENT_DEEP }}
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                      )}
                    </div>
                  </Fragment>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={handleFormatRoomCode(roomCode)}
                onChange={(e) => handleRoomCodeChange(e.target.value)}
                onFocus={() => setCodeFocused(true)}
                onBlur={() => setCodeFocused(false)}
                maxLength={7}
                aria-label="Kode Room"
                className="absolute inset-0 w-full h-full opacity-0 cursor-text"
              />
            </div>
            <p className="text-xs mt-3 text-center" style={{ color: WOOD_LIGHT }}>Contoh: 123-456</p>
          </div>

          {/* Player Name */}
          <div className="mb-5">
            <label style={labelStyle}><UserRound className="w-3.5 h-3.5" /> Nama Pemain</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center overflow-hidden">
                <span className="leading-none text-sm">{avatarEmoji}</span>
              </div>
              <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} disabled maxLength={15}
                placeholder="Masukkan nama Anda"
                className="w-full rounded-xl p-3 pl-12 font-semibold focus:outline-none"
                style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }} />
            </div>
            <p className="text-xs mt-2" style={{ color: WOOD_LIGHT }}>Nama diambil dari profil akun Anda. Ubah di Pengaturan jika perlu.</p>
          </div>

          {/* Color Selection */}
          <div className="mb-5">
            <label style={labelStyle}>Pilih Warna</label>
            <div className="flex gap-4">
              {AVAILABLE_COLORS.map(({ color, from, to, ring, label }) => {
                const isSelected = selectedColor === color;
                return (
                  <motion.button key={color} whileHover={{ scale: 1.1, y: -2 }} whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(color)} title={label}
                    className="relative flex flex-col items-center gap-1.5 focus-visible:outline-none">
                    <motion.span
                      animate={isSelected && !reduceMotion ? { y: [0, -5, 0] } : { y: 0 }}
                      transition={{ duration: 0.45 }}
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${from} ${to} shadow-[inset_0_2px_2px_rgba(255,255,255,0.45),0_4px_10px_rgba(0,0,0,0.35)] flex items-center justify-center ${isSelected ? `ring-[3px] ${ring} ring-offset-2 ring-offset-[#2B1B0F]` : ''}`}>
                      {isSelected && <Crown className="w-4 h-4 text-white drop-shadow" />}
                    </motion.span>
                    <span className="text-[10px] font-bold uppercase tracking-wide"
                      style={{ color: isSelected ? ACCENT_DEEP : WOOD_LIGHT }}>{label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Password Section */}
          <div className="mb-7 p-4 rounded-2xl" style={{ background: BOARD, border: `2px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="font-semibold flex items-center gap-2" style={{ color: INK }}>
                <Lock className="w-4 h-4" style={{ color: WOOD }} /> Ada Password?
              </span>
              <button type="button" role="switch" aria-checked={usePassword}
                onClick={() => setUsePassword(!usePassword)}
                className="relative w-12 h-7 rounded-full transition-colors duration-200 focus-visible:outline-none"
                style={{ background: usePassword ? '#22c55e' : BOARD_DARK, border: `2px solid ${usePassword ? 'rgba(34,197,94,0.6)' : WOOD}` }}>
                <motion.span className="absolute top-[3px] w-5 h-5 rounded-full shadow-md"
                  style={{ background: BOARD, left: usePassword ? 'calc(100% - 23px)' : '3px' }}
                  animate={{ left: usePassword ? 'calc(100% - 23px)' : '3px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </button>
            </label>
            <AnimatePresence>
              {usePassword && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} maxLength={20}
                    placeholder="Enter password"
                    className="w-full rounded-xl p-3 font-semibold mt-3 focus:outline-none transition-all"
                    style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK }}
                    onFocus={e => { e.currentTarget.style.borderColor = ACCENT_DEEP; }}
                    onBlur={e => { e.currentTarget.style.borderColor = WOOD; }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Join Button */}
          <motion.button
            whileHover={!isJoining ? { scale: 1.015 } : undefined}
            whileTap={!isJoining ? { scale: 0.97, y: 2 } : undefined}
            onClick={handleJoinRoom} disabled={isJoining}
            className="relative overflow-hidden w-full py-4 px-6 rounded-2xl font-extrabold uppercase tracking-wider text-base transition-all flex items-center justify-center gap-2"
            style={!isJoining ? {
              background: `linear-gradient(135deg, ${ACCENT}, #e8b820)`,
              color: INK,
              boxShadow: `0 4px 20px rgba(255,211,77,0.30), 0 2px 0 ${ACCENT_DEEP}`,
            } : {
              background: BOARD_DARK,
              color: WOOD_LIGHT,
              cursor: 'not-allowed',
              border: `2px solid ${WOOD}`,
            }}>
            {isJoining ? 'Bergabung...' : 'Bergabung'}
          </motion.button>

          <p className="text-center text-sm mt-6" style={{ color: WOOD_LIGHT }}>
            Minta teman untuk membagikan kode room mereka
          </p>
        </div>
      </motion.div>
    </div>
  );
}