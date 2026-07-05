// ============================================================
// Ular Tangga – Master Type Definitions
// ============================================================

// ── Theme / Category ─────────────────────────────────────────
export type QuestionGrade = 'sd' | 'smp' | 'sma_smk';

export type QuestionTheme =
  | QuestionGrade
  | 'general'
  | 'programming'
  | 'sistem_digital'
  | 'logika_mtk'
  | 'matematika'
  | 'english'
  | 'history'
  | 'bahasa_indonesia'
  | 'ipa'
  | 'ips'
  | 'ppkn'
  | 'fisika'
  | 'kimia'
  | 'broadcasting'
  | 'informatika'
  | 'tkj'
  | 'desain_grafis';

export type BoardThemeName = 'classic' | 'winter' | 'forest' | 'lava' | 'space';

/**
 * What the user can pick in GameSetup. Includes every real board theme plus
 * the special 'random' option (the dice card). 'random' is never a valid
 * value in game state — it must be resolved to a concrete BoardThemeName
 * (via pickRandomBoardTheme in @/data/boardThemes) before initGame is called.
 */
export type SelectableBoardThemeName = BoardThemeName | 'random';

// ── Difficulty ────────────────────────────────────────────────
export type Difficulty = 'easy' | 'medium' | 'hard';

// ── Question ──────────────────────────────────────────────────
export interface Question {
  id: string;
  theme: QuestionTheme;
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  difficulty: Difficulty;
}

// ── Items (Power-ups & Traps) ───────────────────────────────────
export type ItemCategory = 'powerup' | 'trap';
export type ItemUsage = 'auto' | 'manual';

export type PowerUpType =
  | 'shield'
  | 'snake_protection'
  | 'hint_answer'
  | 'golden_dice'
  | 'freeze_timer'
  | 'swap_position'
  | 'quiz_bonus';

export type TrapType = 'skip_turn' | 'bomb_trap' | 'push_back';

export type ItemType = PowerUpType | TrapType;

export interface GameItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  category: ItemCategory;
  usage: ItemUsage;
  icon: string; // emoji
}

// ── Board Elements ──────────────────────────────────────────────
export interface SnakeConfig {
  head: number; // cell where player lands on the snake head
  tail: number; // cell where player slides down to
}

export interface LadderConfig {
  bottom: number; // cell at the base of the ladder
  top: number;    // cell at the top of the ladder
}

export interface MysteryBoxConfig {
  position: number; // cell number (1–100)
}

export interface BoardConfig {
  snakes: SnakeConfig[];
  ladders: LadderConfig[];
  mysteryBoxes: MysteryBoxConfig[];
}

// ── Player ────────────────────────────────────────────────────
export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Player {
  id: number;            // 1-based index
  name: string;
  color: PlayerColor;
  position: number;      // current cell (0 = not started, 1–100)
  previousPosition: number;
  inventory: GameItem[]; // max 3
  correctStreak: number; // consecutive correct answers
  totalCorrect: number;  // total correct answers for stats
  totalWrong: number;    // total wrong answers for stats
  skipNextTurn: boolean; // skip next turn flag
  hasFinished: boolean;
  usedSkillThisTurn: string[]; // track which skill types used this turn (skip_turn, push_back, swap_position)
  isBot?: boolean;
}

// ── Bomb on Board ─────────────────────────────────────────────
export interface PlacedBomb {
  position: number;
  placedByPlayerId: number;
}

// ── Cell type helpers ─────────────────────────────────────────
export type CellType =
  | 'normal'
  | 'snake_head'
  | 'snake_tail'
  | 'ladder_bottom'
  | 'ladder_top'
  | 'mystery_box';

export interface CellInfo {
  number: number;
  type: CellType;
  /** For snake_head → tail position; for ladder_bottom → top position */
  linkedTo?: number;
}

// ── Dice ──────────────────────────────────────────────────────
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

// ── Game Phase ──────────────────────────────────────────────────
export type GamePhase =
  | 'setup'         // choosing players, theme, etc.
  | 'rolling'       // waiting for dice roll
  | 'moving'        // animating piece movement
  | 'question'      // answering a question
  | 'item_awarded'  // showing awarded item modal
  | 'ladder_question' // answering a question to climb a ladder
  | 'mystery_box'   // revealing mystery box item
  | 'item_use'      // player is using a manual item
  | 'finished';     // game over

// ── Game Settings ────────────────────────────────────────────────
export interface GameSettings {
  sfxEnabled: boolean;
  volume: number;       // 0–100
  theme: QuestionTheme;
  playerCount: number;  // 1–4
}

// ── Game State ──────────────────────────────────────────────────
export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  currentPlayerIndex: number; // index into players[]
  diceValue: DiceValue | null;
  currentQuestion: Question | null;
  placedBombs: PlacedBomb[];
  winnerId: number | null;
  turnCount: number;
  usedQuestionIds: string[]; // avoid repeats
}

// ── Board grid coordinate (for rendering) ───────────────────────
export interface BoardCoordinate {
  row: number; // 0 = bottom row, 9 = top row
  col: number; // 0 = left, 9 = right
}