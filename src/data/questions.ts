import type { Question, QuestionTheme } from '@/types/game';

const GENERAL_QUESTIONS: Question[] = [
  {
    id: 'general-1',
    theme: 'general',
    question: 'Apa ibu kota Indonesia?',
    options: ['Bandung', 'Jakarta', 'Surabaya', 'Medan'],
    correctAnswer: 1,
    difficulty: 'easy',
  },
  {
    id: 'general-2',
    theme: 'general',
    question: 'Planet yang kita tinggali adalah...',
    options: ['Mars', 'Venus', 'Bumi', 'Jupiter'],
    correctAnswer: 2,
    difficulty: 'easy',
  },
  {
    id: 'general-3',
    theme: 'general',
    question: 'Bendera Indonesia memiliki warna...',
    options: ['Merah dan Biru', 'Hijau dan Putih', 'Merah dan Putih', 'Kuning dan Merah'],
    correctAnswer: 2,
    difficulty: 'easy',
  },
  {
    id: 'general-4',
    theme: 'general',
    question: 'Hari setelah hari Senin adalah...',
    options: ['Selasa', 'Jumat', 'Sabtu', 'Minggu'],
    correctAnswer: 0,
    difficulty: 'easy',
  },
  {
    id: 'general-5',
    theme: 'general',
    question: 'Ada berapa hari dalam satu minggu?',
    options: ['5', '6', '8', '7'],
    correctAnswer: 3,
    difficulty: 'easy',
  },
];

const THEMES: QuestionTheme[] = [
  'sd',
  'smp',
  'sma_smk',
  'general',
  'programming',
  'matematika',
  'english',
  'history',
  'bahasa_indonesia',
  'ipa',
  'ips',
  'ppkn',
  'fisika',
  'kimia',
  'broadcasting',
  'informatika',
  'tkj',
  'desain_grafis',
];

export const ALL_QUESTIONS: Record<QuestionTheme, Question[]> = THEMES.reduce(
  (acc, theme) => {
    acc[theme] = GENERAL_QUESTIONS;
    return acc;
  },
  {} as Record<QuestionTheme, Question[]>
);

export const STATIC_QUESTIONS = ALL_QUESTIONS;