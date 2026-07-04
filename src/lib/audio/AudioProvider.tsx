'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/stores/settingsStore';

type AudioContextValue = {
  play: (index: number) => void;
  stop: () => void;
  setVolume: (v: number) => void;
  current: number | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
};

const AudioCtx = createContext<AudioContextValue | null>(null);

const LOCAL_TRACKS = ['/audio/Track1.mp3', '/audio/Track2.mp3'];
const FALLBACK_TRACKS = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
];

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { musicEnabled, track, setTrack, volume } = useSettingsStore();
  const audios = useRef<HTMLAudioElement[]>([]);
  const [current, setCurrent] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const firstAutoTried = useRef(false);

  useEffect(() => {
    // create audio elements with fallback to remote sample tracks
    audios.current = LOCAL_TRACKS.map((localSrc, i) => {
      const fallback = FALLBACK_TRACKS[i];
      const a = new Audio(localSrc);
      a.loop = true;
      a.preload = 'auto';
      a.volume = volume;
      a.addEventListener('error', () => {
        if (fallback && a.src !== fallback) {
          a.src = fallback;
          try { a.load(); } catch {}
        }
      });
      return a;
    });
    return () => {
      audios.current.forEach((a) => { a.pause(); a.src = ''; });
      audios.current = [];
    };
  }, []);

  // try autoplay on mount (menu) and install user-gesture fallback if blocked
  useEffect(() => {
    let mounted = true;
    const tryAuto = async () => {
      if (!mounted) return;
      if (!musicEnabled) return;
      try {
        console.debug('[AudioProvider] attempting autoplay for track', track);
        await play(track);
      } catch (err) {
        console.debug('[AudioProvider] autoplay attempt rejected, waiting for user gesture');
        // install one-time gesture handler
        const onGesture = async () => {
          try {
            await play(track);
            window.removeEventListener('click', onGesture);
            window.removeEventListener('touchstart', onGesture);
          } catch (e) {
            // ignore
          }
        };
        window.addEventListener('click', onGesture, { once: true });
        window.addEventListener('touchstart', onGesture, { once: true });
      }
    };
    tryAuto();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // update volumes
    audios.current.forEach((a) => { a.volume = volume; });
  }, [volume]);

  // track timeupdate/metadata for the currently playing audio
  useEffect(() => {
    if (current == null) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    const a = audios.current[current];
    if (!a) return;

    const onTime = () => setCurrentTime(a.currentTime || 0);
    const onLoaded = () => setDuration(a.duration || 0);

    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onLoaded);

    // set current values immediately if available
    setCurrentTime(a.currentTime || 0);
    setDuration(a.duration || 0);

    return () => {
      try { a.removeEventListener('timeupdate', onTime); } catch {}
      try { a.removeEventListener('loadedmetadata', onLoaded); } catch {}
    };
  }, [current]);

  useEffect(() => {
    // route-aware: stop when entering offline/VS AI/online game routes
    const inGame = pathname?.startsWith('/offline/game') || pathname?.startsWith('/vs-ai/game') || pathname?.includes('/online/game');
    if (inGame) {
      stop();
    } else {
      // try to auto-play when returning to menu if enabled
      if (musicEnabled && current == null && !firstAutoTried.current) {
        firstAutoTried.current = true;
        play(track);
      }
    }
  }, [pathname]);

  const play = async (index: number) => {
    if (!musicEnabled) return;
    if (!audios.current[index]) return;
    try {
      // stop other tracks first
      audios.current.forEach((a, i) => {
        if (i !== index) {
          try { a.pause(); a.currentTime = 0; } catch {};
        }
      });
      await audios.current[index].play();
      setCurrent(index);
      setIsPlaying(true);
      setTrack(index);
      // update immediate time/duration state
      try {
        const a = audios.current[index];
        setCurrentTime(a.currentTime || 0);
        setDuration(a.duration || 0);
      } catch {}
    } catch (err) {
      // autoplay failed (browser policy). wait for user gesture.
      console.debug('Auto-play blocked, will wait for user gesture');
    }
  };

  const stop = () => {
    audios.current.forEach((a) => { try { a.pause(); a.currentTime = 0; } catch {} });
    setIsPlaying(false);
    setCurrent(null);
    setCurrentTime(0);
    setDuration(0);
  };

  const setVol = (v: number) => {
    audios.current.forEach((a) => { a.volume = v; });
  };

  return (
    <AudioCtx.Provider value={{ play, stop, setVolume: setVol, current, isPlaying, currentTime, duration }}>
      {children}
    </AudioCtx.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
  return ctx;
};

export default AudioProvider;
