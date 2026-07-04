import { useSettingsStore } from '@/stores/settingsStore';

const STEP_SRC = '/audio/Step1.mp3';
const POOL_SIZE = 4;

const pool: HTMLAudioElement[] = [];

function initPool() {
  if (pool.length > 0) return;
  for (let i = 0; i < POOL_SIZE; i++) {
    const a = new Audio(STEP_SRC);
    a.preload = 'auto';
    pool.push(a);
  }
}

export function playStepSound() {
  try {
    const settings = useSettingsStore.getState();
    if (!settings.sfxEnabled) return;

    initPool();

    const a = pool.shift() as HTMLAudioElement;
    if (!a) return;
    try {
      a.currentTime = 0;
    } catch {}
    a.volume = settings.volume ?? 0.7;
    // fire and forget
    a.play().catch(() => {});
    pool.push(a);
  } catch (err) {
    // ignore audio errors
  }
}

export default playStepSound;
