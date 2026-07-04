// ============================================================
// Ular Tangga – Item Definitions (Power-ups & Traps)
// ============================================================

import type { GameItem } from '@/types/game';

// ── Power-ups ───────────────────────────────────────────────

export const SHIELD: GameItem = {
  id: 'powerup_shield',
  type: 'shield',
  name: 'Perisai',
  description:
    'Aktif otomatis. Mencegah pemain kembali ke posisi sebelumnya saat menjawab salah. Habis setelah satu kali penggunaan.',
  category: 'powerup',
  usage: 'auto',
  icon: '🛡️',
};

export const SNAKE_PROTECTION: GameItem = {
  id: 'powerup_snake_protection',
  type: 'snake_protection',
  name: 'Anti Ular',
  description:
    'Aktif otomatis. Mencegah efek ular saat menginjak kepala ular. Habis setelah satu kali penggunaan.',
  category: 'powerup',
  usage: 'auto',
  icon: '🐍',
};

export const HINT_ANSWER: GameItem = {
  id: 'powerup_hint_answer',
  type: 'hint_answer',
  name: 'Bantuan Jawaban',
  description:
    'Digunakan manual. Menghilangkan 1 pilihan jawaban yang salah dari pertanyaan.',
  category: 'powerup',
  usage: 'manual',
  icon: '💡',
};

export const GOLDEN_DICE: GameItem = {
  id: 'powerup_golden_dice',
  type: 'golden_dice',
  name: 'Dadu Emas',
  description:
    'Digunakan manual sebelum melempar dadu. Pemain dapat memilih angka 1–6.',
  category: 'powerup',
  usage: 'manual',
  icon: '🎲',
};

export const SWAP_POSITION: GameItem = {
  id: 'powerup_swap_position',
  type: 'swap_position',
  name: 'Tukar Posisi',
  description:
    'Digunakan manual. Menukar posisi dengan pemain lain dalam radius 5–7 kotak.',
  category: 'powerup',
  usage: 'manual',
  icon: '🔄',
};

export const QUIZ_BONUS: GameItem = {
  id: 'powerup_quiz_bonus',
  type: 'quiz_bonus',
  name: 'Bonus Soal',
  description:
    'Aktif otomatis. Jawaban benar memberikan bonus maju 3 langkah tambahan.',
  category: 'powerup',
  usage: 'auto',
  icon: '⭐',
};

export const FREEZE_TIMER: GameItem = {
  id: 'powerup_freeze_timer',
  type: 'freeze_timer',
  name: 'Pembeku Waktu',
  description:
    'Digunakan manual saat pertanyaan muncul. Membekukan timer sehingga pemain dapat menjawab tanpa dibatasi waktu.',
  category: 'powerup',
  usage: 'manual',
  icon: '⏸️',
};

// ── Traps ───────────────────────────────────────────────────

export const SKIP_TURN: GameItem = {
  id: 'trap_skip_turn',
  type: 'skip_turn',
  name: 'Lewati Giliran',
  description: 'Pemain kehilangan 1 giliran berikutnya.',
  category: 'trap',
  usage: 'manual',
  icon: '⏭️',
};

export const BOMB_TRAP: GameItem = {
  id: 'trap_bomb',
  type: 'bomb_trap',
  name: 'Bom Posisi',
  description:
    'Digunakan manual. Pemain memasang jebakan pada satu kotak. Pemain yang menginjak bom mundur 5 langkah. Bom hilang setelah aktif satu kali.',
  category: 'trap',
  usage: 'manual',
  icon: '💣',
};

export const PUSH_BACK_TRAP: GameItem = {
  id: 'trap_push_back',
  type: 'push_back',
  name: 'Dorong Mundur',
  description: 'Digunakan manual. Pilih pemain target; target akan kembali ke posisi sebelumnya.',
  category: 'trap',
  usage: 'manual',
  icon: '↩️',
};

// ── Aggregate lists ─────────────────────────────────────────

export const POWER_UPS: GameItem[] = [
  SHIELD,
  SNAKE_PROTECTION,
  HINT_ANSWER,
  GOLDEN_DICE,
  SWAP_POSITION,
  QUIZ_BONUS,
  FREEZE_TIMER,
];

export const TRAPS: GameItem[] = [SKIP_TURN, BOMB_TRAP, PUSH_BACK_TRAP];
export const ALL_ITEMS: GameItem[] = [...POWER_UPS, ...TRAPS];
