'use client';

import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import supabase from '@/lib/supabase/client';
import { Plus, LogIn, ArrowLeft, Dices, ShieldCheck, Clock3, Users } from 'lucide-react';

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

// Decorative floating board tile tokens
const TOKENS = [
  { bg: 'from-rose-500/70 to-rose-700/70',       size: 46, top: '8%',  left: '6%',  duration: 7,   delay: 0   },
  { bg: 'from-sky-400/70 to-blue-600/70',         size: 34, top: '18%', left: '88%', duration: 8.5, delay: 0.6 },
  { bg: 'from-emerald-400/70 to-emerald-600/70',  size: 38, top: '72%', left: '4%',  duration: 9,   delay: 0.3 },
  { bg: 'from-amber-300/70 to-amber-500/70',      size: 30, top: '82%', left: '90%', duration: 7.5, delay: 1.1 },
  { bg: 'from-violet-400/60 to-fuchsia-500/60',   size: 26, top: '38%', left: '92%', duration: 10,  delay: 0.8 },
  { bg: 'from-rose-400/60 to-amber-400/60',       size: 22, top: '54%', left: '2%',  duration: 8,   delay: 1.4 },
];

const RULES = [
  { icon: Users,      text: 'Real-time untuk 1–2 pemain di device berbeda'   },
  { icon: Dices,      text: 'Setiap room mendapat kode undangan unik 6 digit' },
  { icon: ShieldCheck,text: 'Password tambahan untuk keamanan (opsional)'    },
  { icon: Clock3,     text: 'Room otomatis hilang 24 jam jika tidak aktif'   },
];

export default function OnlineModePage() {
  const router       = useRouter();
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden"
      style={{ background: '#2B1B0F' }}
    >
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,211,77,0.12) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(122,74,38,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(115deg, ${WOOD} 0px, ${WOOD} 2px, transparent 2px, transparent 14px)`,
          }}
        />
        {TOKENS.map((t, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-xl bg-gradient-to-br ${t.bg} shadow-[inset_0_2px_0_rgba(255,255,255,0.35)]`}
            style={{ width: t.size, height: t.size, top: t.top, left: t.left }}
            animate={reduceMotion ? undefined : { y: [0, -16, 0], rotate: [0, 10, -6, 0] }}
            transition={{ duration: t.duration, repeat: Infinity, ease: 'easeInOut', delay: t.delay }}
          />
        ))}
      </div>

      {/* Back button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => router.back()}
        className="absolute top-6 left-6 z-50 w-10 h-10 flex items-center justify-center rounded-xl transition-all"
        style={{
          background: `rgba(122,74,38,0.18)`,
          border:     `1px solid rgba(122,74,38,0.35)`,
          color:       ACCENT,
        }}
      >
        <ArrowLeft className="w-4 h-4" />
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative z-10 text-center mb-10"
      >
        <h1
          className="text-4xl md:text-5xl font-black tracking-tight"
          style={{
            color:            ACCENT,
            WebkitTextStroke: `1.5px ${WOOD_DARK}`,
            textShadow:       `0 3px 0 ${ACCENT_DEEP}, 0 8px 18px rgba(0,0,0,0.5)`,
          }}
        >
          MODE ONLINE
        </h1>
        <p className="text-sm font-medium mt-3" style={{ color: WOOD_LIGHT }}>
          Buat room baru atau masuk dengan kode undangan
        </p>
      </motion.div>

      {/* Action cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="relative z-10 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {/* Buat Room */}
        <motion.button
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const { data } = await supabase.auth.getSession();
            router.push(!data?.session?.user ? '/online/login' : '/online/create');
          }}
          className="relative rounded-[28px] p-7 text-left transition-all focus-visible:outline-none"
          style={{
            background: BOARD,
            border:     `3px solid ${WOOD}`,
            boxShadow:  `4px 4px 0 ${WOOD_DARK}`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = '#059669';
            (e.currentTarget as HTMLElement).style.boxShadow   = `0 0 0 3px rgba(5,150,105,0.2), 4px 4px 0 #065f46`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = WOOD;
            (e.currentTarget as HTMLElement).style.boxShadow   = `4px 4px 0 ${WOOD_DARK}`;
          }}
        >
          <div
            className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: '#059669' }}
          >
            Host
          </div>
          <div
            className="w-16 h-16 mb-5 rounded-2xl flex items-center justify-center"
            style={{
              background:  'rgba(5,150,105,0.12)',
              border:      '2px solid rgba(5,150,105,0.35)',
              boxShadow:   'inset 0 2px 0 rgba(255,255,255,0.4)',
            }}
          >
            <Plus className="w-8 h-8" style={{ color: '#059669' }} />
          </div>
          <h2 className="text-xl font-black tracking-wide mb-1.5" style={{ color: INK }}>
            Buat Room
          </h2>
          <p className="text-sm font-medium leading-relaxed" style={{ color: WOOD_LIGHT }}>
            Atur tema, warna, dan password — lalu bagikan kode ke temanmu.
          </p>
          <div
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
            style={{
              background:  'rgba(5,150,105,0.10)',
              border:      '1px solid rgba(5,150,105,0.30)',
              color:       '#065f46',
            }}
          >
            <Dices className="w-3.5 h-3.5" /> Kode 6 digit otomatis
          </div>
        </motion.button>

        {/* Bergabung */}
        <motion.button
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const { data } = await supabase.auth.getSession();
            router.push(!data?.session?.user ? '/online/login' : '/online/join');
          }}
          className="relative rounded-[28px] p-7 text-left transition-all focus-visible:outline-none"
          style={{
            background: BOARD,
            border:     `3px solid ${WOOD}`,
            boxShadow:  `4px 4px 0 ${WOOD_DARK}`,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = ACCENT_DEEP;
            (e.currentTarget as HTMLElement).style.boxShadow   = `0 0 0 3px rgba(255,211,77,0.2), 4px 4px 0 ${ACCENT_DEEP}`;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = WOOD;
            (e.currentTarget as HTMLElement).style.boxShadow   = `4px 4px 0 ${WOOD_DARK}`;
          }}
        >
          <div
            className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-widest"
            style={{ color: ACCENT_DEEP }}
          >
            Tamu
          </div>
          <div
            className="w-16 h-16 mb-5 rounded-2xl flex items-center justify-center"
            style={{
              background: `rgba(140,94,0,0.12)`,
              border:     `2px solid rgba(140,94,0,0.35)`,
              boxShadow:  'inset 0 2px 0 rgba(255,255,255,0.4)',
            }}
          >
            <LogIn className="w-8 h-8" style={{ color: ACCENT_DEEP }} />
          </div>
          <h2 className="text-xl font-black tracking-wide mb-1.5" style={{ color: INK }}>
            Bergabung
          </h2>
          <p className="text-sm font-medium leading-relaxed" style={{ color: WOOD_LIGHT }}>
            Sudah punya kode undangan? Masuk dan langsung mulai main.
          </p>
          <div
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
            style={{
              background: `rgba(140,94,0,0.10)`,
              border:     `1px solid rgba(140,94,0,0.30)`,
              color:       ACCENT_DEEP,
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Aman dengan password
          </div>
        </motion.button>
      </motion.div>

      {/* Info box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="relative z-10 mt-8 max-w-2xl w-full rounded-[24px] p-6"
        style={{
          background: BOARD,
          border:     `3px solid ${WOOD}`,
          boxShadow:  `4px 4px 0 ${WOOD_DARK}`,
        }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
          style={{ color: WOOD }}
        >
          Yang Perlu Diketahui
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RULES.map(({ icon: Icon, text }, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm font-medium" style={{ color: INK }}>
              <span
                className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: BOARD_DARK, border: `1.5px solid ${WOOD}` }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: WOOD }} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}