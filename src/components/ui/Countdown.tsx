"use client";

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSettingsStore } from '@/stores/settingsStore';

// ── Design tokens (sama dengan Main Menu & Settings) ────────────────────
const BOARD      = '#EFDFB8';
const BOARD_DARK = '#E2CC95';
const WOOD       = '#7A4A26';
const WOOD_DARK  = '#5C3417';
const WOOD_LIGHT = '#9C6B3F';
const INK        = '#3A2814';
const ACCENT     = '#FFD34D';

interface CountdownProps {
  seconds?: number;
  onComplete?: () => void;
  /** Optional external sound URLs. If omitted a small WebAudio beep is used. */
  tickUrl?: string;
  goUrl?: string;
}

const DEFAULT_TICK = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
const DEFAULT_GO = 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';

export default function Countdown({ seconds = 3, onComplete, tickUrl, goUrl }: CountdownProps) {
  const [n, setN] = useState(seconds);
  const settings = useSettingsStore.getState();

  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const goAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<any | null>(null);

  useEffect(() => {
    setN(seconds);
    const t = setInterval(() => setN((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  // Prepare HTMLAudioElements for external sounds (if provided)
  useEffect(() => {
    const tSrc = tickUrl ?? DEFAULT_TICK;
    const gSrc = goUrl ?? DEFAULT_GO;
    try {
      tickAudioRef.current = new Audio(tSrc);
      tickAudioRef.current.preload = 'auto';
      tickAudioRef.current.crossOrigin = 'anonymous';
    } catch {
      tickAudioRef.current = null;
    }
    try {
      goAudioRef.current = new Audio(gSrc);
      goAudioRef.current.preload = 'auto';
      goAudioRef.current.crossOrigin = 'anonymous';
    } catch {
      goAudioRef.current = null;
    }

    return () => {
      try { tickAudioRef.current?.pause(); } catch {}
      try { goAudioRef.current?.pause(); } catch {}
      tickAudioRef.current = null;
      goAudioRef.current = null;
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch {}
        audioCtxRef.current = null;
      }
    };
  }, [tickUrl, goUrl]);

  const playSynth = (freq = 880, dur = 0.12) => {
    try {
      if (!settings.sfxEnabled) return;
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return;
      let ctx = audioCtxRef.current;
      if (!ctx) {
        ctx = new Ctor();
        audioCtxRef.current = ctx;
      }
      // resume if suspended
      try { if (ctx.state === 'suspended') ctx.resume(); } catch {}
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      const vol = Math.max(0.0001, settings.volume ?? 0.7);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.stop(now + dur + 0.02);
      // close context shortly after
      setTimeout(() => { try { ctx.close(); audioCtxRef.current = null; } catch {} }, (dur + 0.06) * 1000);
    } catch {
      // ignore
    }
  };

  const tryPlayAudioEl = async (el: HTMLAudioElement | null, fallbackFreq?: number, fallbackDur?: number) => {
    try {
      if (!settings.sfxEnabled) return;
      if (!el) {
        playSynth(fallbackFreq ?? 880, fallbackDur ?? 0.12);
        return;
      }
      try {
        el.currentTime = 0;
      } catch {}
      el.volume = settings.volume ?? 0.7;
      await el.play();
    } catch {
      playSynth(fallbackFreq ?? 880, fallbackDur ?? 0.12);
    }
  };

  useEffect(() => {
    // Play tick for numbers > 0, play GO for 0 or less
    if (n > 0) {
      tryPlayAudioEl(tickAudioRef.current, 880, 0.12);
    } else if (n <= 0) {
      tryPlayAudioEl(goAudioRef.current, 880, 0.28);
      // call completion immediately as before
      onComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl p-8 text-center"
        style={{ background: `linear-gradient(145deg, ${WOOD_DARK}, ${INK})`, border: `2px solid ${ACCENT}` }}
      >
        <div className="text-6xl font-black mb-3" style={{ color: ACCENT }}>{n > 0 ? n : 'GO!'}</div>
        <p className="font-bold" style={{ color: BOARD }}>{n > 0 ? 'Persiapan...' : 'Mulai!'}</p>
      </motion.div>
    </div>
  );
}
