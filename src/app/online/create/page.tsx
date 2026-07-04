'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Copy, RefreshCw, Lock, Check, Hash, Tag, Sparkles, UserRound, Crown, Dices, AlertCircle } from 'lucide-react';
import { useOnlineGameStore } from '@/stores/onlineGameStore';
import { createRoomObject, generateRoomCode, formatRoomCode, generatePlayerId, createPlayerObject } from '@/lib/onlineRoomUtils';
import { supabaseGameService } from '@/lib/supabase/gameService';
import supabase from '@/lib/supabase/client';
import type { QuestionTheme, PlayerColor } from '@/types/game';

// ── Design tokens ────────────────────────────────────────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

const MAX_PLAYERS_ONLINE = 2;

const AVAILABLE_COLORS: { color: PlayerColor; from: string; to: string; ring: string; label: string }[] = [
  { color: 'red',    from: 'from-rose-400',    to: 'to-rose-600',    ring: 'ring-rose-300',    label: 'Merah'  },
  { color: 'blue',   from: 'from-sky-400',     to: 'to-blue-600',    ring: 'ring-sky-300',     label: 'Biru'   },
  { color: 'green',  from: 'from-emerald-400', to: 'to-emerald-600', ring: 'ring-emerald-300', label: 'Hijau'  },
  { color: 'yellow', from: 'from-amber-300',   to: 'to-amber-500',   ring: 'ring-amber-200',   label: 'Kuning' },
];

const THEMES: { value: QuestionTheme; label: string }[] = [
  { value: 'general',        label: 'Umum'           },
  { value: 'programming',    label: 'Pemrograman'    },
  { value: 'sistem_digital', label: 'Sistem Digital' },
  { value: 'logika_mtk',     label: 'Logika MTK'     },
  { value: 'matematika',     label: 'Matematika'     },
  { value: 'english',        label: 'Bahasa Inggris' },
  { value: 'history',        label: 'Sejarah'        },
];

const TOKENS = [
  { bg: 'from-rose-500/60 to-rose-700/60',       size: 30, top: '6%',  left: '90%', duration: 8,   delay: 0   },
  { bg: 'from-sky-400/60 to-blue-600/60',         size: 24, top: '78%', left: '94%', duration: 9,   delay: 0.5 },
  { bg: 'from-emerald-400/60 to-emerald-600/60',  size: 26, top: '88%', left: '4%',  duration: 7.5, delay: 0.9 },
  { bg: 'from-amber-300/60 to-amber-500/60',      size: 20, top: '14%', left: '3%',  duration: 10,  delay: 1.2 },
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

export default function CreateRoomPage() {
  const router = useRouter();
  const { setRoom, setLocalPlayer, setGameStatus } = useOnlineGameStore();
  const reduceMotion = useReducedMotion();

  const [roomName,       setRoomName]       = useState('My Game Room');
  const [theme,          setTheme]          = useState<QuestionTheme>('general');
  const [password,       setPassword]       = useState('');
  const [usePassword,    setUsePassword]    = useState(false);
  const [roomCode,       setRoomCode]       = useState(generateRoomCode());
  const [playerName,     setPlayerName]     = useState('');
  const [authUserId,     setAuthUserId]     = useState<string | null>(null);
  const [avatarEmoji,    setAvatarEmoji]    = useState('🎮');
  const [selectedColor,  setSelectedColor]  = useState<PlayerColor>('red');
  const [copied,         setCopied]         = useState(false);
  const [isCreating,     setIsCreating]     = useState(false);
  const [errorMsg,       setErrorMsg]       = useState('');

  const handleGenerateNewCode = () => setRoomCode(generateRoomCode());

  const handleCopyCode = () => {
    navigator.clipboard.writeText(formatRoomCode(roomCode));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      setErrorMsg('');
      if (!playerName.trim()) { setErrorMsg('Nama pemain harus diisi'); setIsCreating(false); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;
      if (!userId) { setErrorMsg('Anda harus login dengan Google untuk membuat room online'); setIsCreating(false); return; }

      const playerId = generatePlayerId();
      const room     = createRoomObject({ roomName, theme, password: usePassword ? password : undefined }, playerId);
      room.roomId    = roomCode;
      const player   = createPlayerObject({ roomId: roomCode, playerName, color: selectedColor, password: usePassword ? password : undefined }, playerId, generatePlayerId());
      room.players.push(player);

      try {
        const createdRoom = await supabaseGameService.createRoom(roomName, theme, playerName, selectedColor, roomCode, userId);
        try { await supabase.from('user_stats').upsert({ user_id: userId, email: sessionData?.session?.user?.email || null }); } catch {}
        room.roomId = createdRoom.roomId;
        const serverPlayerId = (createdRoom as any).players?.[0]?.id;
        if (serverPlayerId) { room.players[0].id = serverPlayerId; player.id = serverPlayerId; (room as any).currentTurnPlayerId = serverPlayerId; }
      } catch (err: any) {
        setErrorMsg(`Gagal membuat room: ${err?.message || 'Unknown error'}. Pastikan Supabase sudah dikonfigurasi dengan benar.`);
        setIsCreating(false); return;
      }

      setRoom(room); setLocalPlayer(player); setGameStatus('waiting_for_players');
      router.push(`/online/waiting?roomId=${roomCode}`);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Gagal membuat room');
      setIsCreating(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!mounted) return;
      if (user) {
        setAuthUserId(user.id);
        try {
          const { data: stats } = await supabase.from('user_stats').select('username, name, avatar').eq('user_id', user.id).maybeSingle();
          const nameFromDb = (stats as any)?.username || (stats as any)?.name;
          const dbAvatar   = (stats as any)?.avatar;
          const fallback   = user.email?.split('@')[0] || '';
          const finalName  = nameFromDb || fallback;
          setPlayerName(finalName);
          setAvatarEmoji(dbAvatar || getAnimalEmojiForName(finalName));
        } catch {
          const fallback = user.email?.split('@')[0] || '';
          setPlayerName(fallback); setAvatarEmoji(getAnimalEmojiForName(fallback));
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const codeChars = roomCode.padEnd(6, '•').split('');

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
                BUAT ROOM
              </h1>
            </div>
          </div>
          <p className="text-center text-sm font-medium" style={{ color: WOOD_LIGHT }}>Siapkan room, lalu undang temanmu untuk main</p>
        </div>

        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">

          {/* Error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3.5 rounded-2xl text-sm font-semibold flex items-start gap-2.5"
                style={{ background: 'rgba(239,68,68,0.09)', border: '2px solid rgba(239,68,68,0.35)', color: '#dc2626' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{errorMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Room Code Box */}
          <div className="mb-6 p-5 rounded-[26px]"
            style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `4px 4px 0 ${WOOD_DARK}` }}>
            {/* Top stripe */}
            <div className="h-[3px] w-full rounded-full mb-4"
              style={{ background: `linear-gradient(90deg, ${WOOD}, ${ACCENT}, ${WOOD})` }} />

            <div className="flex items-center justify-between mb-4">
              <label style={labelStyle}><Hash className="w-3.5 h-3.5" /> Kode Undangan</label>
              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} onClick={handleCopyCode}
                className="p-2 rounded-lg transition-all"
                style={{ background: `rgba(122,74,38,0.12)`, border: `2px solid ${WOOD}`, color: WOOD }}>
                <AnimatePresence mode="wait" initial={false}>
                  {copied
                    ? <motion.span key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><Check className="w-4 h-4" style={{ color: '#059669' }} /></motion.span>
                    : <motion.span key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}><Copy className="w-4 h-4" /></motion.span>
                  }
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Digit cells */}
            <div className="rounded-2xl py-4 px-2 sm:px-4 mb-3 flex items-center justify-center gap-1.5 sm:gap-2"
              style={{ background: BOARD_DARK, border: `2px solid ${WOOD}` }}>
              {codeChars.map((ch, i) => (
                <Fragment key={i}>
                  {i === 3 && <span className="font-bold mx-0.5" style={{ color: WOOD_LIGHT }}>–</span>}
                  <motion.div
                    initial={false}
                    animate={copied ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                    className="w-9 h-11 sm:w-11 sm:h-[3.25rem] rounded-lg flex items-center justify-center text-lg sm:text-2xl font-bold tabular-nums"
                    style={{ background: BOARD, border: `1.5px solid ${WOOD}`, color: INK }}>
                    {ch}
                  </motion.div>
                </Fragment>
              ))}
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }} onClick={handleGenerateNewCode}
              className="w-full py-2.5 px-3 rounded-xl font-bold uppercase text-sm tracking-wide flex items-center justify-center gap-2 transition-all"
              style={{ background: BOARD_DARK, border: `2px solid ${WOOD}`, color: INK, boxShadow: `2px 2px 0 ${WOOD_DARK}` }}>
              <motion.span whileTap={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                <RefreshCw className="w-4 h-4" />
              </motion.span>
              Generate Baru
            </motion.button>

            <AnimatePresence>
              {copied && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="text-sm mt-2 text-center font-semibold" style={{ color: '#059669' }}>
                  Kode disalin!
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Room Name */}
          <div className="mb-5">
            <label style={labelStyle}><Tag className="w-3.5 h-3.5" /> Nama Room</label>
            <input type="text" value={roomName} onChange={e => setRoomName(e.target.value)} maxLength={30}
              placeholder="My Game Room"
              className="w-full rounded-xl p-3 font-semibold focus:outline-none transition-all"
              style={{ background: BOARD, border: `2px solid ${WOOD}`, color: INK }}
              onFocus={e => { e.currentTarget.style.borderColor = ACCENT_DEEP; e.currentTarget.style.boxShadow = `0 0 0 2px rgba(140,94,0,0.15)`; }}
              onBlur={e => { e.currentTarget.style.borderColor = WOOD; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Theme Selection */}
          <div className="mb-5">
            <label style={labelStyle}><Sparkles className="w-3.5 h-3.5" /> Tema Pertanyaan</label>
            <div className="relative">
              <select value={theme} onChange={e => setTheme(e.target.value as QuestionTheme)}
                className="w-full appearance-none rounded-xl p-3 pr-10 font-semibold focus:outline-none transition-all"
                style={{ background: BOARD, border: `2px solid ${WOOD}`, color: INK }}>
                {THEMES.map(t => (
                  <option key={t.value} value={t.value} style={{ background: BOARD, color: INK }}>{t.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: WOOD }}>▾</div>
            </div>
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
            <label style={labelStyle}>Pilih Warna Bidak</label>
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
                <Lock className="w-4 h-4" style={{ color: WOOD }} /> Tambahkan Password
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

          {/* Create Button */}
          <motion.button
            whileHover={!isCreating ? { scale: 1.015 } : undefined}
            whileTap={!isCreating ? { scale: 0.97, y: 2 } : undefined}
            onClick={handleCreateRoom} disabled={isCreating}
            className="relative overflow-hidden w-full py-4 px-6 rounded-2xl font-extrabold uppercase tracking-wider text-base transition-all flex items-center justify-center gap-2"
            style={!isCreating ? {
              background: `linear-gradient(135deg, ${ACCENT}, #e8b820)`,
              color: INK,
              boxShadow: `0 4px 20px rgba(255,211,77,0.30), 0 2px 0 ${ACCENT_DEEP}`,
            } : {
              background: BOARD_DARK,
              color: WOOD_LIGHT,
              cursor: 'not-allowed',
              border: `2px solid ${WOOD}`,
            }}>
            {isCreating ? 'Membuat Room...' : 'Buat Room'}
          </motion.button>

          <p className="text-center text-sm mt-6" style={{ color: WOOD_LIGHT }}>
            Bagikan kode dengan teman untuk bergabung!
          </p>
        </div>
      </motion.div>
    </div>
  );
}