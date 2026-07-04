'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Users,
  Globe,
  Settings,
  Trophy,
  Cpu,
  Play,
  HelpCircle,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────
   DESIGN TOKENS — shared with the help page: cream cardboard
   board, wood-brown frame, classic pawn colors.
   ────────────────────────────────────────────────────────── */
const BOARD = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD = '#7A4A26';
const WOOD_DARK = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';
const INK = '#3A2814';

/* single accent reserved for the primary action / active state only —
   matches the gold used in the SNAKE PAWNS title */
const ACCENT = { base: '#FFD34D', hover: '#FFC107', deep: '#8C5E00', tint: '#FBEACB' };

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

export const MainMenu = () => {
  const [username, setUsername] = useState('Guest');
  const [avatarEmoji, setAvatarEmoji] = useState('🎮');
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const supabase = (await import('@/lib/supabase/client')).default;
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user;
        if (!mounted) return;
        if (user) {
          const fallback = (user.user_metadata as any)?.full_name || user.email?.split('@')[0] || 'Guest';
          try {
            const { data: stats } = await supabase.from('user_stats').select('username, avatar, name, coins').eq('user_id', user.id).maybeSingle();
            const dbUsername = (stats as any)?.username || (stats as any)?.name;
            const dbAvatar = (stats as any)?.avatar;
            const dbCoins = (stats as any)?.coins ?? 0;
            const finalName = dbUsername || fallback;
            setUsername(finalName);
            if (dbAvatar) setAvatarEmoji(dbAvatar);
            else setAvatarEmoji(getAnimalEmojiForName(finalName));
            setCoins(dbCoins);
          } catch {
            setUsername(fallback);
            setAvatarEmoji(getAnimalEmojiForName(fallback));
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const router = useRouter();

  const [selectedMode, setSelectedMode] = useState('offline');
  const [showOnlineModal, setShowOnlineModal] = useState(false);

  const menuItems = [
    {
      key: 'offline',
      title: 'Bermain Offline',
      subtitle: 'Multiplayer Lokal',
      icon: Users,
    },
    
    {
      key: 'online',
      title: 'Bermain Online',
      subtitle: 'Beta',
      icon: Globe,
      badge: 'BETA',
    },
    {
      key: 'computer',
      title: 'Vs Komputer',
      subtitle: 'Lawan AI',
      icon: Cpu,
    },
    {
      key: 'leaderboard',
      title: 'Papan Peringkat',
      subtitle: 'Leaderboard',
      icon: Trophy,
    },
  ];

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: '#2B1B0F' }}>
      {/* wood-grain ambient backdrop, matching the help page */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)`,
          }}
        />
      </div>

      {/* Top bar */}
      <div
        className="relative z-10 flex items-center justify-between px-4 pt-6 pb-3"
        style={{ borderBottom: `4px solid ${WOOD}`, background: WOOD_DARK }}
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => router.push('/settings')}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg overflow-hidden shrink-0"
            style={{ background: BOARD, border: `2px solid ${WOOD}` }}
          >
            <span className="leading-none">{avatarEmoji}</span>
          </div>
          <span className="text-white font-extrabold text-sm tracking-wide group-hover:opacity-80 transition">
            {username}
          </span>
        </motion.div>

        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2"
            style={{ background: BOARD, border: `2px solid ${WOOD}`, color: WOOD_DARK }}
          >
            <span className="text-lg">🪙</span>
            <span className="tabular-nums">{coins}</span>
          </div>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: `2px solid ${WOOD}`, color: 'white' }}
            onClick={() => router.push('/settings')}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.25)', color: 'white' }}
            onClick={() => router.push('/help')}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Konten utama */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-6 pt-6 pb-8">
        {/* Judul */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center mb-2"
        >
          <h1
            className="text-6xl font-black tracking-tight"
            style={{
              color: '#FFD34D',
              WebkitTextStroke: `2px ${WOOD_DARK}`,
              textShadow: `0 4px 0 ${WOOD}, 0 8px 18px rgba(0,0,0,0.45)`,
            }}
          >
            SNAKE PAWNS
          </h1>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] mt-1" style={{ color: WOOD_LIGHT }}>
            Ular tangga edukasi
          </p>
        </motion.div>

        {/* Mascot — ular kayu di atas papan, sama gaya dengan hero help page */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative w-36 h-36 my-4 flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full opacity-25 blur-2xl" style={{ background: WOOD }} />
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-40 h-36 flex items-center justify-center"
            style={{
              background: BOARD,
              border: `4px solid ${WOOD}`,
              borderRadius: 22,
              boxShadow: `4px 4px 0 ${WOOD_DARK}`,
            }}
          >
            <Image
              src="/image/Snake.png"
              alt="Snake mascot"
              width={128}
              height={125}
              style={{ objectFit: 'contain' }}
            />
          </motion.div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-bold mb-6 mt-3 uppercase tracking-wider"
          style={{ color: BOARD }}
        >
          Selamat Datang! {username}
        </motion.p>

        {/* Menu grid — tiap item jadi kotak papan bernomor pion seperti pada help page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="w-full max-w-sm grid grid-cols-2 gap-3 mb-6"
        >
          {menuItems.map((item, idx) => {
            const IconComponent = item.icon;
            const isMode = item.key === 'offline' || item.key === 'online' || item.key === 'computer';
            const selected = isMode && selectedMode === item.key;

            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + idx * 0.06 }}
                onClick={() => {
                  if (isMode) {
                    setSelectedMode(item.key);
                  } else if (item.key === 'leaderboard') {
                    router.push('/leaderboard');
                  }
                }}
                className="relative p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:brightness-105"
                style={{
                  background: selected ? ACCENT.tint : BOARD,
                  border: `3px solid ${selected ? ACCENT.deep : WOOD}`,
                  borderRadius: 14,
                  boxShadow: selected ? `4px 4px 0 ${ACCENT.deep}` : `4px 4px 0 ${WOOD_DARK}`,
                }}
              >
                {item.badge && (
                  <span
                    className="absolute -top-2 -right-2 text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: WOOD, color: BOARD, border: `2px solid ${WOOD_DARK}` }}
                  >
                    {item.badge}
                  </span>
                )}
                <div
                  className="mb-2 w-11 h-11 flex items-center justify-center"
                  style={{
                    background: selected ? ACCENT.base : BOARD_DARK,
                    color: selected ? ACCENT.deep : WOOD_DARK,
                    border: `2px solid ${selected ? ACCENT.deep : WOOD}`,
                    borderRadius: 10,
                  }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-xs uppercase tracking-wide leading-tight" style={{ color: INK }}>
                  {item.title}
                </h3>
                <p className="text-[10px] mt-1 font-medium uppercase tracking-wider" style={{ color: INK, opacity: 0.6 }}>
                  {item.subtitle}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Play button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          onClick={() => {
            if (selectedMode === 'offline') {
              router.push('/offline');
            } else if (selectedMode === 'computer') {
              router.push('/vs-ai');
            } else if (selectedMode === 'online') {
              setShowOnlineModal(true);
            }
          }}
          onMouseEnter={(e) => {
            if (selectedMode) (e.currentTarget as HTMLButtonElement).style.background = ACCENT.hover;
          }}
          onMouseLeave={(e) => {
            if (selectedMode) (e.currentTarget as HTMLButtonElement).style.background = ACCENT.base;
          }}
          disabled={!selectedMode}
          className="w-full max-w-sm py-4 font-extrabold text-lg uppercase tracking-wider transform transition-all active:scale-[0.98]"
          style={
            selectedMode
              ? {
                  background: ACCENT.base,
                  color: WOOD_DARK,
                  border: `3px solid ${WOOD}`,
                  borderRadius: 14,
                  boxShadow: `4px 4px 0 ${WOOD_DARK}`,
                }
              : {
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.35)',
                  border: `3px solid ${WOOD}`,
                  borderRadius: 14,
                  cursor: 'not-allowed',
                }
          }
        >
          <span className="flex items-center justify-center gap-2">
            <Play className="w-4 h-4" fill="currentColor" />
            Mulai Game
          </span>
        </motion.button>
      </div>

      {/* Modal: online mode */}
      {showOnlineModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <div
            className="p-6 max-w-sm w-full text-center"
            style={{
              background: BOARD,
              border: `4px solid ${WOOD}`,
              borderRadius: 18,
              boxShadow: `6px 6px 0 ${WOOD_DARK}`,
            }}
          >
            <h3 className="text-lg font-bold mb-3" style={{ color: INK }}>Bermain Online</h3>
            <p className="mb-6 text-sm" style={{ color: INK, opacity: 0.75 }}>
              Pilih untuk membuat room baru atau bergabung dengan room yang sudah ada.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="px-5 py-2.5 font-bold text-sm"
                style={{ background: ACCENT.base, color: WOOD_DARK, border: `2px solid ${WOOD}`, borderRadius: 10 }}
                onClick={() => {
                  setShowOnlineModal(false);
                  router.push('/online/mode');
                }}
              >
                Lanjut
              </button>
              <button
                className="px-5 py-2.5 font-bold text-sm"
                style={{ background: 'rgba(0,0,0,0.06)', color: INK, border: `2px solid ${WOOD}`, borderRadius: 10 }}
                onClick={() => setShowOnlineModal(false)}
              >
                Batal
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MainMenu;
