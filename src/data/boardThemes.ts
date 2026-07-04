import type { BoardConfig } from '@/types/game';
import { BOARD_CONFIGS } from '@/data/boardConfig';

export type BoardThemeName = 'classic' | 'winter' | 'forest' | 'lava' | 'space';

/**
 * What the user can pick in GameSetup. Includes every real board theme plus
 * the special 'random' option (the dice card). 'random' is never a key in
 * BOARD_THEMES — it must be resolved to a concrete BoardThemeName before the
 * game actually starts (see resolveBoardTheme in GameSetup).
 */
export type SelectableBoardThemeName = BoardThemeName | 'random';

export interface BoardTheme {
  name: BoardThemeName;
  label: string;
  description: string;
  bgGradient: string;
  cellBg: string;
  cellHover: string;
  borderColor: string;
  accentColor: string;
  config: BoardConfig;
  /** Visual identity used by GameBoard for ambient particles + entity rendering */
  visual: {
    /** Ambient particle behaviour rendered behind the grid */
    particle: 'sand' | 'snow' | 'leaf' | 'ember' | 'star';
    /** Two-tone palette used for the connector (snake/ladder) gradient strokes */
    connectorColors: { primary: string; secondary: string; glow: string };
    /** Label shown on the "down" entity (e.g. a classic snake vs. an icy crevasse) */
    downEntityLabel: string;
    /** Label shown on the "up" entity (ladder, rope bridge, vine, etc.) */
    upEntityLabel: string;
    /** Emoji/icon glyphs used as compact markers on the cell itself */
    downIcon: string;
    upIcon: string;
    boxIcon: string;
  };
}

// ─── Theme 1: Gurun Pasir (Desert) ─────────────────────────────
export const classicTheme: BoardTheme = {
  name: 'classic',
  label: 'Gurun Pasir',
  description: 'Bukit pasir berkilau dengan jalur tali kuno',
  bgGradient: 'from-amber-700 via-orange-600 to-yellow-700',
  cellBg: 'bg-amber-100',
  cellHover: 'hover:bg-yellow-200',
  borderColor: 'border-amber-400',
  accentColor: '#d97706',
  config: BOARD_CONFIGS.classic,
  visual: {
    particle: 'sand',
    connectorColors: { primary: '#c2410c', secondary: '#fcd34d', glow: 'rgba(252,211,77,0.35)' },
    downEntityLabel: 'jebakan ular pasir',
    upEntityLabel: 'tali pendakian',
    downIcon: '🐍',
    upIcon: '🪢',
    boxIcon: '🏺',
  },
};

// ─── Theme 2: Musim Dingin (Winter) ───────────────────────────────
export const winterTheme: BoardTheme = {
  name: 'winter',
  label: 'Musim Dingin',
  description: 'Salju turun dan retakan es licin di antara puncak gletser',
  bgGradient: 'from-sky-700 via-blue-600 to-cyan-700',
  cellBg: 'bg-blue-50',
  cellHover: 'hover:bg-cyan-100',
  borderColor: 'border-blue-300',
  accentColor: '#0ea5e9',
  config: BOARD_CONFIGS.winter,
  visual: {
    particle: 'snow',
    connectorColors: { primary: '#0369a1', secondary: '#bae6fd', glow: 'rgba(186,230,253,0.45)' },
    downEntityLabel: 'retakan es licin',
    upEntityLabel: 'tangga es',
    downIcon: '❄️',
    upIcon: '🧊',
    boxIcon: '🎁',
  },
};

// ─── Theme 3: Hutan Mistis (Forest) ───────────────────────────────
export const forestTheme: BoardTheme = {
  name: 'forest',
  label: 'Hutan Mistis',
  description: 'Daun berguguran di antara akar tua dan liana yang menjerat',
  bgGradient: 'from-emerald-800 via-green-700 to-teal-800',
  cellBg: 'bg-emerald-100',
  cellHover: 'hover:bg-green-200',
  borderColor: 'border-emerald-400',
  accentColor: '#059669',
  config: BOARD_CONFIGS.forest,
  visual: {
    particle: 'leaf',
    connectorColors: { primary: '#15803d', secondary: '#a3e635', glow: 'rgba(163,230,53,0.35)' },
    downEntityLabel: 'liana yang menjerat',
    upEntityLabel: 'akar pendakian',
    downIcon: '🐍',
    upIcon: '🌿',
    boxIcon: '🍄',
  },
};

// ─── Theme 4: Gunung Berapi (Lava) ───────────────────────────────
export const lavaTheme: BoardTheme = {
  name: 'lava',
  label: 'Gunung Berapi',
  description: 'Abu beterbangan di atas sungai lava dan jembatan obsidian',
  bgGradient: 'from-red-900 via-orange-800 to-stone-900',
  cellBg: 'bg-stone-800',
  cellHover: 'hover:bg-orange-900',
  borderColor: 'border-orange-500',
  accentColor: '#ea580c',
  config: BOARD_CONFIGS.lava,
  visual: {
    particle: 'ember',
    connectorColors: { primary: '#7c2d12', secondary: '#fb923c', glow: 'rgba(251,146,60,0.5)' },
    downEntityLabel: 'sungai lava retak',
    upEntityLabel: 'jembatan obsidian',
    downIcon: '🌋',
    upIcon: '🪨',
    boxIcon: '💎',
  },
};

// ─── Theme 5: Luar Angkasa (Space) ───────────────────────────────
export const spaceTheme: BoardTheme = {
  name: 'space',
  label: 'Luar Angkasa',
  description: 'Bintang berkelip di antara jalur komet dan portal plasma',
  bgGradient: 'from-indigo-950 via-purple-950 to-slate-950',
  cellBg: 'bg-indigo-950',
  cellHover: 'hover:bg-purple-900',
  borderColor: 'border-fuchsia-500',
  accentColor: '#a855f7',
  config: BOARD_CONFIGS.space,
  visual: {
    particle: 'star',
    connectorColors: { primary: '#a21caf', secondary: '#67e8f9', glow: 'rgba(103,232,249,0.5)' },
    downEntityLabel: 'jalur komet liar',
    upEntityLabel: 'portal plasma',
    downIcon: '☄️',
    upIcon: '🌀',
    boxIcon: '🛸',
  },
};

// ─── All themes ───────────────────────────────────────────────────
export const BOARD_THEMES: Record<BoardThemeName, BoardTheme> = {
  classic: classicTheme,
  winter: winterTheme,
  forest: forestTheme,
  lava: lavaTheme,
  space: spaceTheme,
};

export const BOARD_THEME_LIST = [classicTheme, winterTheme, forestTheme, lavaTheme, spaceTheme];

/** Picks a uniformly random real theme (used to resolve the 'random' dice option). */
export function pickRandomBoardTheme(): BoardThemeName {
  const names = BOARD_THEME_LIST.map(t => t.name);
  return names[Math.floor(Math.random() * names.length)];
}