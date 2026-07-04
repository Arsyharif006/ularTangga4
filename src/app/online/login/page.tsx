'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import supabase from '@/lib/supabase/client';
import { SUPABASE_OAUTH_REDIRECT } from '@/lib/supabase/authConfig';

// ── Design tokens ────────────────────────────────────────────────
const BOARD       = '#EFDFB8';
const BOARD_DARK  = '#E2CC95';
const WOOD        = '#7A4A26';
const WOOD_DARK   = '#5C3417';
const WOOD_LIGHT  = '#9C6B3F';
const INK         = '#3A2814';
const ACCENT      = '#FFD34D';
const ACCENT_DEEP = '#8C5E00';

export default function OnlineLoginPage() {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted && data?.session?.user) router.replace('/online/mode');
      } catch { /* ignore */ }
    })();
    return () => { mounted = false; };
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options:  { redirectTo: SUPABASE_OAUTH_REDIRECT },
      });
    } catch (err) {
      console.error('Login error', err);
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden"
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

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl"
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

        <div className="p-7">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{
                background: BOARD_DARK,
                border:     `2.5px solid ${WOOD}`,
                boxShadow:  `3px 3px 0 ${WOOD_DARK}`,
              }}
            >
              🎲
            </div>
          </div>

          <h1
            className="text-2xl sm:text-3xl font-black text-center mb-2 tracking-tight"
            style={{
              color:            ACCENT,
              WebkitTextStroke: `1px ${WOOD_DARK}`,
              textShadow:       `0 3px 0 ${ACCENT_DEEP}, 0 6px 14px rgba(0,0,0,0.25)`,
            }}
          >
            MASUK DULU YUK
          </h1>
          <p className="text-sm font-semibold text-center mb-7" style={{ color: WOOD_LIGHT }}>
            Masuk untuk memainkan mode online dan menyinkronkan progress kamu
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-3 font-extrabold uppercase tracking-wide text-sm transition-all transform active:translate-y-0.5"
            style={loading ? {
              background: BOARD_DARK,
              border:     `3px solid ${WOOD}`,
              color:      WOOD_LIGHT,
              boxShadow:  `3px 3px 0 ${WOOD_DARK}`,
              cursor:     'not-allowed',
            } : {
              background: '#ffffff',
              border:     `3px solid ${WOOD}`,
              color:      INK,
              boxShadow:  `3px 3px 0 ${WOOD_DARK}`,
              cursor:     'pointer',
            }}
          >
            {!loading && (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {loading
              ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>🎲</motion.span>
              : null
            }
            {loading ? 'Menghubungkan...' : 'Masuk dengan Google'}
          </button>

          <p className="text-xs text-center mt-5 font-medium" style={{ color: WOOD_LIGHT }}>
            Tidak ada kata sandi diperlukan. Anda akan diarahkan ke Google.
          </p>
        </div>
      </motion.div>
    </div>
  );
}