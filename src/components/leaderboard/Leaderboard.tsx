'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Crown, Medal, Star, Dices, Flame, Swords, User } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import supabase from '@/lib/supabase/client';

// ── Design tokens (sama dengan Main Menu & Settings) ───────────────────
const BOARD      = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD       = '#7A4A26';
const WOOD_DARK  = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';
const INK        = '#3A2814';
const ACCENT     = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';
const ACCENT_TINT = '#FBEACB';

type StatRow = {
  user_id: string;
  email?: string | null;
  name?: string | null;
  wins: number;
  games: number;
  win_rate: number;
};

const fallbackPlayers = [
  { rank: 1, name: 'ShadowBlade', avatar: '🐉', wins: 48, games: 55, winRate: 87, streak: 7 },
  { rank: 2, name: 'LunaStrike', avatar: '🦊', wins: 41, games: 50, winRate: 82, streak: 3 },
  { rank: 3, name: 'IronClaw', avatar: '🐺', wins: 37, games: 47, winRate: 79, streak: 5 },
  { rank: 4, name: 'Zephyr', avatar: '🦅', wins: 30, games: 40, winRate: 75, streak: 1 },
  { rank: 5, name: 'NovaStar', avatar: '🐱', wins: 27, games: 38, winRate: 71, streak: 2 },
  { rank: 6, name: 'DriftKing', avatar: '🐸', wins: 22, games: 34, winRate: 65, streak: 0 },
  { rank: 7, name: 'PixelFox', avatar: '🐻', wins: 18, games: 30, winRate: 60, streak: 0 },
  { rank: 8, name: 'Guest', avatar: '🎮', wins: 12, games: 22, winRate: 55, streak: 1 },
];

const podiumConfig = [
  { place: 2, heightClass: 'h-20', delay: 0.3, color: 'from-slate-400 to-slate-300', crown: false },
  { place: 1, heightClass: 'h-28', delay: 0.1, color: 'from-amber-400 to-yellow-300', crown: true },
  { place: 3, heightClass: 'h-14', delay: 0.5, color: 'from-orange-500 to-amber-400', crown: false },
];

const getRankIcon = (rank: number): ReactNode => {
  if (rank === 1) return <Crown className="w-4 h-4 text-amber-300" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-slate-300" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-orange-400" />;
  return null;
};

const ANIMAL_EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐢','🐍','🐴','🦄','🐝','🐙','🦋','🦀','🐬'];

const getAnimalEmojiForName = (name?: string | null) => {
  if (!name) return '🎮';
  const s = String(name).trim();
  if (!s) return '🎮';
  const ch = s[0].toLowerCase();
  if (ch >= 'a' && ch <= 'z') {
    const idx = ch.charCodeAt(0) - 97;
    return ANIMAL_EMOJIS[idx % ANIMAL_EMOJIS.length];
  }
  const idx = s.charCodeAt(0) % ANIMAL_EMOJIS.length;
  return ANIMAL_EMOJIS[idx];
};

const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const Leaderboard = () => {
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>(fallbackPlayers);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  const maskEmail = (email: string) => {
    try {
      const [local, domain] = email.split('@');
      const maskedLocal = local.length <= 2 ? local[0] + '*' : local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local.slice(-1);
      return `${maskedLocal}@${domain}`;
    } catch {
      return email;
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      setFetchError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;
      if (mounted) setCurrentUserId(userId);
      try {
        const { data, error } = await supabase
          .from('user_stats')
          .select('user_id, email, username, avatar, name, wins, games, win_rate')
          .order('wins', { ascending: false })
          .limit(50);
        if (!mounted) return;
        if (error) { setFetchError(error.message || String(error)); setPlayers(fallbackPlayers); return; }
        const rows = (data || []) as StatRow[];
        const mapped = rows.map((r: any, i: number) => {
          const displayName = r.username ? String(r.username) : r.name ? String(r.name) : r.email ? maskEmail(r.email) : r.user_id || 'Guest';
          const isMe = userId !== null && r.user_id === userId;
          const avatar = r.avatar ? String(r.avatar) : getAnimalEmojiForName(displayName);
          return { rank: i + 1, user_id: r.user_id, name: displayName, avatar, wins: r.wins || 0, games: r.games || 0, winRate: Math.round((Number(r.win_rate) || 0) * 100) / 100, streak: 0, isMe };
        });
        const meInList = mapped.find((p) => p.isMe);
        if (meInList) setMyRank(meInList.rank);
        const normalizedFallback = fallbackPlayers.map((p) => ({ ...p, user_id: null as string | null, isMe: false }));
        setPlayers([...mapped, ...normalizedFallback].slice(0, 50));
      } catch (err: any) {
        setFetchError(err?.message || String(err));
        setPlayers(fallbackPlayers);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  const isCurrentUser = (player: any) =>
    player?.isMe === true || (currentUserId === null && player?.name === 'Guest');

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: WOOD_DARK }}>

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl" style={{ background: `${WOOD}33` }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl" style={{ background: `${ACCENT}10` }} />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full blur-3xl" style={{ background: `${ACCENT_DEEP}08` }} />
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-2">
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center transition"
          style={{ background: 'rgba(255,255,255,0.1)', border: `2px solid rgba(255,255,255,0.25)`, color: BOARD }}
        >
          <ArrowLeft className="w-4 h-4" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Trophy style={{ color: ACCENT }} className="w-5 h-5" />
          <h1
            className="text-xl font-black tracking-tight"
            style={{
              color: ACCENT,
              WebkitTextStroke: `1px ${ACCENT_DEEP}`,
              textShadow: `0 2px 0 ${WOOD}, 0 4px 12px rgba(0,0,0,0.45)`,
            }}
          >
            PAPAN PERINGKAT
          </h1>
        </motion.div>

        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `${ACCENT}33`, border: `1px solid ${ACCENT}`, color: ACCENT }}>
          <Star className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Subtitle — FIX: was WOOD_LIGHT (coklat gelap) → sekarang BOARD dengan opacity */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 text-center text-[10px] uppercase tracking-[0.25em] font-semibold mb-4"
        style={{ color: `${BOARD}88` }}
      >
        Multiplayer · Kemenangan Terbanyak
      </motion.p>

      {/* ── My Rank Banner ── */}
      {myRank !== null && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative z-10 mx-5 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3"
          style={{
            background: BOARD,
            border: `3px solid ${ACCENT_DEEP}`,
            boxShadow: `3px 3px 0 ${WOOD_DARK}`,
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${ACCENT}33`, border: `2px solid ${ACCENT_DEEP}` }}>
            <User className="w-4 h-4" style={{ color: ACCENT_DEEP }} />
          </div>
          <div className="flex-1 min-w-0">
            {/* FIX: teks label pakai INK bukan warna semi-transparan */}
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: WOOD_LIGHT }}>Posisi kamu</span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-xl leading-none" style={{ color: ACCENT_DEEP }}>
                #{myRank}
              </span>
              <span className="text-xs font-semibold" style={{ color: INK }}>
                dari {players.length} pemain
              </span>
            </div>
          </div>
          <div className="shrink-0 px-3 py-1.5 rounded-xl" style={{ background: ACCENT, border: `2px solid ${ACCENT_DEEP}`, boxShadow: `2px 2px 0 ${ACCENT_DEEP}` }}>
            <span className="font-black text-sm" style={{ color: WOOD_DARK }}>{getOrdinal(myRank)}</span>
          </div>
        </motion.div>
      )}

      {/* ── Podium Top 3 ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative z-10 flex items-end justify-center gap-3 px-8 mb-6"
      >
        {podiumConfig.map(({ place, heightClass, delay, color, crown }) => {
          const defaultP = { rank: place, name: 'Player', avatar: '🎮', wins: 0, games: 0, winRate: 0, streak: 0 };
          const p = players[place - 1] || fallbackPlayers[place - 1] || defaultP;
          const isMe = isCurrentUser(p);

          return (
            <motion.div
              key={place}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay }}
              className="flex flex-col items-center gap-1 flex-1"
            >
              <div className="relative">
                {crown && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Crown className="w-5 h-5 text-amber-300 drop-shadow-lg" />
                  </div>
                )}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl shadow-lg border-2`}
                  style={isMe ? { borderColor: ACCENT, boxShadow: `0 0 0 3px ${ACCENT}60` } : { borderColor: place === 1 ? '#fecaca' : place === 2 ? '#cbd5e1' : '#fed7aa' }}
                >
                  {p?.avatar ?? '🎮'}
                </div>
                {p.streak > 0 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 border border-[#0c0a2e] flex items-center justify-center">
                    <Flame className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {isMe && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: ACCENT, border: `2px solid ${WOOD_DARK}`, color: INK }}>
                    <User className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>

              {/* FIX: nama pemain podium pakai BOARD (terang) agar terbaca di bg gelap */}
              <span className="text-[11px] font-bold text-center leading-tight max-w-[70px] truncate" style={{ color: isMe ? ACCENT : BOARD }}>
                {p?.name ?? 'Player'}
              </span>

              {isMe && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide -mt-0.5" style={{ color: WOOD_DARK, background: ACCENT, border: `1px solid ${ACCENT_DEEP}` }}>
                  Kamu
                </span>
              )}

              <span className="text-xs font-extrabold" style={{ color: ACCENT }}>{p?.wins ?? 0}W</span>

              <div
                className={`w-full ${heightClass} rounded-t-xl bg-gradient-to-b ${
                  place === 1
                    ? 'from-amber-500/40 to-amber-700/20 border-t-2 border-amber-400/50'
                    : place === 2
                    ? 'from-slate-400/30 to-slate-600/10 border-t-2 border-slate-400/40'
                    : 'from-orange-500/30 to-orange-700/10 border-t-2 border-orange-400/40'
                } flex items-start justify-center pt-2`}
              >
                <span
                  className={`font-black text-lg ${
                    place === 1 ? 'text-amber-300' : place === 2 ? 'text-slate-300' : 'text-orange-400'
                  }`}
                >
                  {place}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Stats strip ── FIX: pakai BOARD background seperti Settings card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 mx-5 mb-4 rounded-2xl flex overflow-hidden"
        style={{ background: BOARD, border: `3px solid ${WOOD}`, boxShadow: `3px 3px 0 ${WOOD_DARK}` }}
      >
        {[
          { label: 'Total Pemain', value: players.length, icon: <Swords className="w-3.5 h-3.5" style={{ color: WOOD }} /> },
          { label: 'Game Terbaik', value: `${players[0]?.wins ?? 0}W`, icon: <Crown className="w-3.5 h-3.5" style={{ color: ACCENT_DEEP }} /> },
          { label: 'Top Win Rate', value: `${players[0]?.winRate ?? 0}%`, icon: <Flame className="w-3.5 h-3.5" style={{ color: ACCENT_DEEP }} /> },
        ].map((stat, idx) => (
          <div
            key={stat.label}
            className="flex-1 py-3 flex flex-col items-center gap-0.5"
            style={{ borderRight: idx < 2 ? `1px solid ${BOARD_DARK}` : 'none' }}
          >
            {stat.icon}
            {/* FIX: value pakai INK (gelap) di atas BOARD (terang) */}
            <span className="font-extrabold text-sm" style={{ color: INK }}>{stat.value}</span>
            {/* FIX: label pakai WOOD_LIGHT di BOARD — kontras cukup */}
            <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: WOOD_LIGHT }}>{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Rank list (4+) ── */}
      <div className="relative z-10 flex-1 px-5 pb-8 space-y-2 overflow-y-auto">

        {/* Column headers — FIX: pakai BOARD semi-transparan bukan WOOD_LIGHT di bg gelap */}
        <div className="flex items-center px-3 mb-1">
          <span className="w-7 text-[9px] uppercase tracking-widest font-bold" style={{ color: `${BOARD}99` }}>#</span>
          <span className="flex-1 text-[9px] uppercase tracking-widest pl-2 font-bold" style={{ color: `${BOARD}99` }}>Pemain</span>
          <span className="w-12 text-center text-[9px] uppercase tracking-widest font-bold" style={{ color: `${BOARD}99` }}>Menang</span>
          <span className="w-12 text-center text-[9px] uppercase tracking-widest font-bold" style={{ color: `${BOARD}99` }}>Game</span>
          <span className="w-14 text-center text-[9px] uppercase tracking-widest font-bold" style={{ color: `${BOARD}99` }}>W/R</span>
        </div>

        {rest.map((player, idx) => {
          const rank = player?.rank ?? idx + 4;
          const name = player?.name ?? 'Player';
          const avatar = player?.avatar ?? '🎮';
          const wins = player?.wins ?? 0;
          const gamesPlayed = player?.games ?? 0;
          const winRate = player?.winRate ?? 0;
          const isMe = isCurrentUser(player);

          return (
            <motion.div
              key={`${rank}-${idx}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.55 + idx * 0.06 }}
              className="flex items-center px-3 py-3 rounded-2xl border transition-all"
              style={
                isMe
                  /* "Kamu" row — latar terang ACCENT_TINT dengan border emas */
                  ? {
                      background: ACCENT_TINT,
                      border: `3px solid ${ACCENT_DEEP}`,
                      boxShadow: `3px 3px 0 ${ACCENT_DEEP}`,
                    }
                  /* Row biasa — FIX: ganti dari ${WOOD}20 (hampir transparan) ke BOARD */
                  : {
                      background: BOARD,
                      border: `3px solid ${WOOD}`,
                      boxShadow: `3px 3px 0 ${WOOD_DARK}`,
                    }
              }
            >
              {/* Rank number */}
              <div className="w-7 flex items-center justify-center">
                {/* FIX: rank biasa pakai INK di atas BOARD */}
                <span className="font-bold text-sm" style={{ color: isMe ? ACCENT_DEEP : WOOD_LIGHT }}>
                  {rank}
                </span>
              </div>

              {/* Avatar + name */}
              <div className="flex-1 flex items-center gap-2.5 pl-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border-2"
                  style={
                    isMe
                      ? { background: `${ACCENT}33`, borderColor: ACCENT_DEEP }
                      : { background: BOARD_DARK, borderColor: WOOD }
                  }
                >
                  {avatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* FIX: nama pemain pakai INK di atas BOARD — terbaca jelas */}
                    <span className="font-bold text-sm truncate" style={{ color: isMe ? ACCENT_DEEP : INK }}>
                      {name}
                    </span>
                    {isMe && (
                      <>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide" style={{ color: WOOD_DARK, background: ACCENT, border: `1px solid ${ACCENT_DEEP}` }}>
                          Kamu
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide" style={{ color: ACCENT_DEEP, background: `${ACCENT}33`, border: `1px solid ${ACCENT_DEEP}` }}>
                          #{rank}
                        </span>
                      </>
                    )}
                  </div>
                  {player?.streak > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Flame className="w-2.5 h-2.5 text-orange-500" />
                      {/* FIX: streak text pakai warna lebih solid */}
                      <span className="text-[9px] font-semibold" style={{ color: '#c2410c' }}>{player!.streak} streak</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Wins — FIX: nilai wins di atas BOARD, pakai ACCENT_DEEP agar kontras */}
              <div className="w-12 text-center">
                <span className="font-extrabold text-sm" style={{ color: ACCENT_DEEP }}>{wins}</span>
              </div>

              {/* Games — FIX: pakai INK bukan ${BOARD}cc */}
              <div className="w-12 text-center">
                <span className="font-semibold text-sm" style={{ color: isMe ? INK : WOOD_LIGHT }}>{gamesPlayed}</span>
              </div>

              {/* Win Rate */}
              <div className="w-14 flex flex-col items-center gap-0.5">
                {/* FIX: % text pakai INK di BOARD */}
                <span className="font-bold text-xs" style={{ color: isMe ? ACCENT_DEEP : INK }}>{winRate}%</span>
                <div className="w-10 h-1.5 rounded-full overflow-hidden" style={{ background: BOARD_DARK }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${winRate}%`, background: `linear-gradient(to right, ${WOOD}, ${ACCENT_DEEP})` }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Divider */}
        <div className="flex items-center gap-3 px-3 pt-2">
          <div className="flex-1 h-px" style={{ background: `${BOARD}30` }} />
          <Dices className="w-3 h-3" style={{ color: `${BOARD}55` }} />
          <div className="flex-1 h-px" style={{ background: `${BOARD}30` }} />
        </div>
        {/* FIX: footer text pakai BOARD semi-transparan, bukan WOOD_LIGHT */}
        <p className="text-center text-[10px] uppercase tracking-widest pb-1 font-semibold" style={{ color: `${BOARD}66` }}>
          Mainkan lebih banyak untuk naik peringkat
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;