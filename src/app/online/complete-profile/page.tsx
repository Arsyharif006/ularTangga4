'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '@/lib/supabase/client';

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

/* ─── helpers ─── */
const ANIMALS = ['🐶','🐱','🐭','🐹','🐰','🦊'];
const getEmoji = (name?: string | null) => {
  if (!name) return '🥔';
  const s = String(name).trim();
  if (!s) return '🥔';
  const c = s[0].toLowerCase();
  if (c >= 'a' && c <= 'z') return ANIMALS[(c.charCodeAt(0) - 97) % ANIMALS.length];
  return ANIMALS[s.charCodeAt(0) % ANIMALS.length];
};

/* ─── Die face ─── */
const DOTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
};
const Die = ({ n }: { n: number }) => (
  <motion.div
    whileHover={{ scale: 1.18, rotate: 12 }}
    transition={{ type: 'spring', stiffness: 400 }}
    className="relative w-[34px] h-[34px] rounded-[8px] shrink-0"
    style={{
      background:  BOARD_DARK,
      border:      `1.5px solid ${WOOD}`,
      boxShadow:   `2px 2px 0 ${WOOD_DARK}`,
    }}
  >
    {(DOTS[n] || []).map(([x, y], i) => (
      <div
        key={i}
        className="absolute w-[5px] h-[5px] rounded-full"
        style={{
          background: ACCENT_DEEP,
          left:       `${x}%`,
          top:        `${y}%`,
          transform:  'translate(-50%,-50%)',
        }}
      />
    ))}
  </motion.div>
);

/* ─── Mascot ─── */
const Mascot = ({ emoji }: { emoji: string }) => (
  <div className="relative w-[130px] h-[130px] flex items-center justify-center mx-auto my-4">
    {/* Spinning rings */}
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ border: `1.5px solid rgba(122,74,38,0.30)` }}
      animate={{ rotate: 360 }}
      transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
    >
      <div
        className="absolute top-[-3.5px] left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full"
        style={{ background: ACCENT }}
      />
    </motion.div>
    <motion.div
      className="absolute inset-[12px] rounded-full"
      style={{ border: `1px solid rgba(122,74,38,0.20)` }}
      animate={{ rotate: -360 }}
      transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
    >
      <div
        className="absolute top-[-3px] left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full"
        style={{ background: WOOD_LIGHT }}
      />
    </motion.div>

    {/* Blob */}
    <motion.div
      key={emoji}
      initial={{ scale: 0.75, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, y: [0, -8, 0] }}
      transition={{
        scale:   { duration: 0.25 },
        opacity: { duration: 0.25 },
        y:       { duration: 3, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="relative w-[90px] h-[90px] rounded-[28px] flex items-center justify-center text-[44px]"
      style={{
        background: BOARD_DARK,
        border:     `2.5px solid ${WOOD}`,
        boxShadow:  `3px 3px 0 ${WOOD_DARK}`,
      }}
    >
      {emoji}
      <div
        className="absolute top-[8px] left-[12px] w-[14px] h-[6px] rounded-full"
        style={{ background: 'rgba(255,255,255,0.45)', transform: 'rotate(-20deg)' }}
      />
    </motion.div>
  </div>
);

/* ─── Page ─── */
export default function CompleteProfilePage() {
  const router   = useRouter();
  const [loading,  setLoading]  = useState(true);
  const [username, setUsername] = useState('');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [focused,  setFocused]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!mounted) return;
      if (!user) { router.replace('/online/login'); return; }
      try {
        const { data: stats } = await supabase
          .from('user_stats').select('username').eq('user_id', user.id).maybeSingle();
        const db = (stats as any)?.username;
        if (db) { router.replace('/online/mode'); return; }
        setUsername((user.email?.split('@')[0] || '').slice(0, 15));
      } catch { /* allow */ }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handleSave = async () => {
    setError('');
    const cleaned = username.trim();
    if (!cleaned)           { setError('Username wajib diisi!');      return; }
    if (cleaned.length > 15){ setError('Maksimal 15 karakter!');      return; }
    setSaving(true);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;
      if (!user) { router.replace('/online/login'); return; }
      const { data: ex } = await supabase
        .from('user_stats').select('user_id').eq('username', cleaned).maybeSingle();
      if (ex && (ex as any).user_id && (ex as any).user_id !== user.id) {
        setError('Username sudah dipakai pemain lain!');
        setSaving(false); return;
      }
      const DEFAULT_COUNT = 5;
      const defaults = ANIMALS.slice(0, DEFAULT_COUNT);
      let defaultAvatar = defaults[0];
      if (cleaned.length > 0) {
        const c = cleaned[0].toLowerCase();
        if (c >= 'a' && c <= 'z') {
          defaultAvatar = defaults[(c.charCodeAt(0) - 97) % DEFAULT_COUNT];
        } else {
          defaultAvatar = defaults[cleaned.charCodeAt(0) % DEFAULT_COUNT];
        }
      }
      await supabase.from('user_stats').upsert({
        user_id:         user.id,
        username:        cleaned,
        name:            cleaned,
        email:           user.email || null,
        avatar:          defaultAvatar,
        coins:           0,
        unlocked_avatars: defaults,
        unlocked_boards:  ['classic', 'winter'],
      }).select();
      router.replace('/online/mode');
    } catch (e: any) {
      setError(e?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#2B1B0F' }}>
        <motion.div
          className="text-5xl"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          🎲
        </motion.div>
      </div>
    );
  }

  const emoji     = getEmoji(username || null);
  const charCount = username.length;

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-0 overflow-hidden"
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
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="relative z-10 w-full max-w-sm mx-auto px-4"
      >
        {/* Top badge */}
        <div className="flex justify-center mb-3">
          <div
            className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.14em]"
            style={{
              background: `rgba(122,74,38,0.18)`,
              border:     `1px solid rgba(122,74,38,0.35)`,
              color:       WOOD_LIGHT,
            }}
          >
            ✦ Pemain Baru · Langkah 1/1 ✦
          </div>
        </div>

        {/* Inner card */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: BOARD,
            border:     `3px solid ${WOOD}`,
            boxShadow:  `4px 4px 0 ${WOOD_DARK}`,
          }}
        >
          {/* Top accent stripe */}
          <div
            className="h-[4px] w-full"
            style={{ background: `linear-gradient(90deg, ${WOOD}, ${ACCENT}, ${WOOD})` }}
          />

          <div className="px-5 pt-2 pb-6 flex flex-col items-center">
            <Mascot emoji={emoji} />

            {/* Greeting */}
            <motion.h1
              key={username || 'empty'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[26px] font-black text-center tracking-tight leading-tight"
              style={{ color: INK }}
            >
              Halo,{' '}
              <span style={{ color: ACCENT_DEEP }}>
                {username || 'Pemain'}
              </span>!
            </motion.h1>
            <p
              className="text-[12px] font-semibold text-center mt-1 mb-5"
              style={{ color: WOOD_LIGHT }}
            >
              Pilih nama jagoanmu untuk papan peringkat
            </p>

            {/* Form card */}
            <div
              className="w-full rounded-[20px] p-[18px] flex flex-col gap-3"
              style={{
                background: BOARD_DARK,
                border:     `2px solid ${WOOD}`,
                boxShadow:  `inset 0 1px 0 rgba(255,255,255,0.4)`,
              }}
            >
              {/* Label row */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-black uppercase tracking-[0.14em]"
                  style={{ color: WOOD }}
                >
                  Username
                </span>
                <span
                  className="text-[10px] font-black tabular-nums"
                  style={{ color: charCount > 12 ? '#dc2626' : WOOD_LIGHT }}
                >
                  {charCount} / 15
                </span>
              </div>

              {/* Input */}
              <div
                className="relative rounded-[14px] overflow-hidden transition-all duration-200"
                style={{
                  background: BOARD,
                  border:     `2px solid ${focused ? ACCENT_DEEP : WOOD}`,
                  boxShadow:  focused ? `0 0 0 3px rgba(140,94,0,0.15)` : 'none',
                }}
              >
                <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[22px] pointer-events-none z-[2]">
                  {emoji}
                </span>
                <input
                  ref={inputRef}
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  maxLength={15}
                  placeholder="nama_jagoan_kamu"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent font-black text-[15px] pl-[46px] pr-4 py-[13px] outline-none"
                  style={{ caretColor: ACCENT_DEEP, color: INK }}
                />
              </div>
              <p className="text-[11px] font-semibold pl-[2px] -mt-1" style={{ color: WOOD_LIGHT }}>
                Huruf, angka, underscore — maks 15 karakter
              </p>

              {/* Dice row */}
              <div className="flex items-center justify-center gap-[6px] py-1">
                {[1, 2, 3, 4, 5, 6].map(n => <Die key={n} n={n} />)}
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    className="flex items-center gap-2 px-3 py-[10px] rounded-[12px] text-[13px] font-bold"
                    style={{
                      background: 'rgba(239,68,68,0.09)',
                      border:     '1px solid rgba(239,68,68,0.35)',
                      color:      '#dc2626',
                    }}
                  >
                    <span>⚠️</span><span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save button */}
              <motion.button
                onClick={handleSave}
                disabled={saving}
                whileTap={{ scale: 0.97 }}
                whileHover={!saving ? { scale: 1.02 } : {}}
                className="w-full py-[15px] rounded-[16px] font-black text-[16px] border-none flex items-center justify-center gap-2 transition-all"
                style={saving ? {
                  background: BOARD_DARK,
                  color:      WOOD_LIGHT,
                  cursor:     'not-allowed',
                  border:     `2px solid ${WOOD}`,
                } : {
                  background: `linear-gradient(135deg, ${ACCENT}, #e8b820)`,
                  color:       INK,
                  boxShadow:  `0 4px 18px rgba(255,211,77,0.30), 0 2px 0 ${ACCENT_DEEP}`,
                  cursor:     'pointer',
                }}
              >
                {saving ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    >
                      🎲
                    </motion.span>
                    Menyimpan...
                  </>
                ) : (
                  <> Mulai Bermain!</>
                )}
              </motion.button>

              {/* Skip */}
              <button
                onClick={() => router.replace('/online/mode')}
                className="w-full py-[10px] bg-transparent border-none text-[13px] font-bold transition-colors"
                style={{ color: WOOD_LIGHT, cursor: 'pointer' }}
              >
                Lewati untuk sekarang →
              </button>
            </div>

            <p
              className="text-[10px] mt-3 uppercase tracking-[0.18em] font-bold"
              style={{ color: WOOD_LIGHT }}
            >
              Ular Tangga · Multiplayer Online
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}