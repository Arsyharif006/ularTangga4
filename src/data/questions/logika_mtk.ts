import type { Question } from '@/types/game';

export const logikaMtkQuestions: Question[] = [
  { id: 'lm_01', theme: 'logika_mtk', question: 'Jika P → Q benar dan P benar, maka Q?', options: ['Benar', 'Salah', 'Tidak dapat ditentukan', 'Bergantung pada Q'], correctAnswer: 0, difficulty: 'easy' },
  { id: 'lm_02', theme: 'logika_mtk', question: 'Negasi dari pernyataan "Semua A adalah B" adalah?', options: ['Semua B adalah A', 'Ada A yang bukan B', 'Tidak ada A', 'Semua A bukan B'], correctAnswer: 1, difficulty: 'easy' },
  { id: 'lm_03', theme: 'logika_mtk', question: 'Operator logika "AND" pada tabel kebenaran menghasilkan true jika?', options: ['Salah satu operand true', 'Kedua operand true', 'Salah satu operand false', 'Kedua operand false'], correctAnswer: 1, difficulty: 'easy' },
  { id: 'lm_04', theme: 'logika_mtk', question: 'Jika p = true dan q = false, maka p XOR q adalah?', options: ['true', 'false', 'tidak terdefinisi', 'kedua'], correctAnswer: 0, difficulty: 'easy' },
  { id: 'lm_05', theme: 'logika_mtk', question: 'Apa itu kontradiksi dalam logika?', options: ['Pernyataan selalu false', 'Pernyataan selalu true', 'Pernyataan kadang true', 'Pernyataan tidak memiliki variabel'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'lm_06', theme: 'logika_mtk', question: 'Pernyataan yang ekuivalen dengan "Jika P maka Q" adalah?', options: ['Jika Q maka P', '¬P atau Q', 'P dan Q', '¬Q atau P'], correctAnswer: 1, difficulty: 'medium' },
  { id: 'lm_07', theme: 'logika_mtk', question: 'Seorang siswa lulus jika lulus ujian dan memenuhi syarat. Ini contoh dari operator?', options: ['OR', 'AND', 'NOT', 'XOR'], correctAnswer: 1, difficulty: 'easy' },
  { id: 'lm_08', theme: 'logika_mtk', question: 'Jika 2 + 2 = 4 benar, maka 2 + 3 = ?', options: ['5', '4', '3', '6'], correctAnswer: 0, difficulty: 'easy' },
  { id: 'lm_09', theme: 'logika_mtk', question: 'Apa itu tautologi?', options: ['Pernyataan selalu true', 'Pernyataan selalu false', 'Pernyataan tergantung variabel', 'Pernyataan ambigu'], correctAnswer: 0, difficulty: 'medium' },
  { id: 'lm_10', theme: 'logika_mtk', question: 'Jika p → q dan q → r, maka p → r adalah contoh dari?', options: ['Kontradiksi', 'Modus Ponens', 'Silogisme Hipotetis', 'Reductio ad absurdum'], correctAnswer: 2, difficulty: 'medium' },
  { id: 'lm_11', theme: 'logika_mtk', question: 'Negasi dari (p ∧ q) adalah?', options: ['¬p ∧ ¬q', '¬p ∨ ¬q', 'p ∨ q', 'p ∧ ¬q'], correctAnswer: 1, difficulty: 'hard' },
  { id: 'lm_12', theme: 'logika_mtk', question: 'Jika modus ponens berlaku, bentuk dasar adalah?', options: ['p ∧ (p → q) ⇒ q', '(p → q) ∧ p ⇒ q', 'p ⇒ (q → p)', 'p ∨ q ⇒ r'], correctAnswer: 1, difficulty: 'hard' },
  { id: 'lm_13', theme: 'logika_mtk', question: 'Apa itu kuantor universal?', options: ['Simbol ∃', 'Simbol ∀', 'Simbol ¬', 'Simbol ⇒'], correctAnswer: 1, difficulty: 'medium' },
  { id: 'lm_14', theme: 'logika_mtk', question: 'Jika p adalah true, maka apa nilai dari ¬p?', options: ['true', 'false', 'p', 'tidak terdefinisi'], correctAnswer: 1, difficulty: 'easy' },
  { id: 'lm_15', theme: 'logika_mtk', question: 'Apa itu implikasi material?', options: ['p → q', 'p ∧ q', 'p ∨ q', '¬p'], correctAnswer: 0, difficulty: 'hard' }];
