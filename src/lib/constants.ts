// ============================================================
// Ular Tangga – Game Constants
// ============================================================

/** Total number of cells on the board */
export const BOARD_SIZE = 100;

/** Number of columns per row */
export const BOARD_COLS = 10;

/** Number of rows */
export const BOARD_ROWS = 10;

/** Minimum number of players */
export const MIN_PLAYERS = 1;

/** Maximum number of players */
export const MAX_PLAYERS = 4;

/** Maximum items a player can hold */
export const MAX_INVENTORY = 3;

/** Consecutive correct answers needed to earn a random item */
export const STREAK_REWARD_THRESHOLD = 3;

/** Bonus steps awarded by Quiz Bonus power-up on correct answer */
export const QUIZ_BONUS_STEPS = 3;

/** Steps a player moves backward when stepping on a Bomb Trap */
export const BOMB_PENALTY_STEPS = 5;

/** Swap Position radius – minimum distance (cells) */
export const SWAP_RADIUS_MIN = 5;

/** Swap Position radius – maximum distance (cells) */
export const SWAP_RADIUS_MAX = 7;

/** Dice minimum value */
export const DICE_MIN: 1 = 1;

/** Dice maximum value */
export const DICE_MAX: 6 = 6;

/** Starting position (0 means "off the board", first move goes to cell 1+) */
export const START_POSITION = 0;

/** Winning position */
export const FINISH_POSITION = 100;

/** Maximum response time for interactions (ms) – non-functional requirement */
export const MAX_RESPONSE_TIME_MS = 1000;

/** Available player colors */
export const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'] as const;

/** Default game settings */
export const DEFAULT_SETTINGS = {
  sfxEnabled: true,
  volume: 70,
  theme: 'general' as const,
  playerCount: 2,
} as const;
