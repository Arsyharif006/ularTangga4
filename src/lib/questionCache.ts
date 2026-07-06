// ============================================================
// AI Question Cache - Manages generated questions in memory
// ============================================================

import type { Question, QuestionTheme } from '@/types/game';
import { generateQuestionsFromAI } from './aiQuestionGenerator';
import { STATIC_QUESTIONS } from '@/data/questions';
import supabase from './supabase/client';

interface QuestionCache {
  [theme: string]: Question[];
}

async function loadAIQuestionsFromDatabase(theme: QuestionTheme): Promise<Question[]> {
  try {
    const { data, error } = await supabase
      .from('ai_questions')
      .select('*')
      .eq('theme', theme)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Failed loading AI questions from database:', error);
      return [];
    }
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id ? String(row.id) : `ai_db_${Math.random().toString(36).substring(2, 9)}`,
      theme: row.theme,
      question: row.question,
      options: row.options as [string, string, string, string],
      correctAnswer: row.correct_answer as 0 | 1 | 2 | 3,
      difficulty: row.grade as 'easy' | 'medium' | 'hard',
    }));
  } catch (error) {
    console.warn('Failed loading AI questions from database:', error);
    return [];
  }
}

let questionCache: QuestionCache = {};
let cacheInitialized = false;

const QUESTIONS_PER_THEME = 3;

export async function initializeQuestionCache() {
  if (cacheInitialized) return;

  const useAI = process.env.NEXT_PUBLIC_USE_AI_QUESTIONS === 'true';

  if (!useAI) {
    console.log('AI questions disabled and no static fallback configured; question cache will be empty');
    questionCache = {};
    cacheInitialized = true;
    return;
  }

  try {
    console.log('Initializing AI question cache from Supabase...');
    questionCache = {};

    const themes: QuestionTheme[] = [
      'sd', 'smp', 'sma_smk',
      'general',
      'programming',
      'sistem_digital',
      'logika_mtk',
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

    for (const theme of themes) {
      try {
        const aiDatabaseQuestions = await loadAIQuestionsFromDatabase(theme);
        questionCache[theme] = aiDatabaseQuestions;
      } catch (error) {
        console.warn(`Failed loading DB questions for ${theme}:`, error);
        questionCache[theme] = [];
      }
    }

    cacheInitialized = true;
    console.log('Question cache initialized successfully without pre-generating AI questions');
  } catch (error) {
    console.error('Error initializing question cache, falling back to static questions:', error);
    questionCache = { ...STATIC_QUESTIONS };
    cacheInitialized = true;
  }
}

export async function getNextQuestion(
  theme: QuestionTheme,
  usedQuestionIds: string[]
): Promise<Question | null> {
  if (!cacheInitialized) {
    await initializeQuestionCache();
  }

  const questions = questionCache[theme] || STATIC_QUESTIONS[theme] || [];
  
  if (questions.length === 0) {
    console.warn(`No questions available for theme: ${theme}`);
    return null;
  }

  // Find a question that hasn't been used yet
  let available = questions.filter(q => !usedQuestionIds.includes(q.id));

  // If all questions have been used, try to generate new ones from AI for this theme only
  if (available.length === 0 && process.env.NEXT_PUBLIC_USE_AI_QUESTIONS === 'true') {
    console.log(`All questions used for theme ${theme}, generating a small batch...`);
    try {
      const newQuestions = await generateQuestionsFromAI(theme, QUESTIONS_PER_THEME, 'medium');
      questionCache[theme] = [...questions, ...newQuestions];
      available = newQuestions.length > 0 ? newQuestions : questions;
    } catch (error) {
      console.warn('Failed to generate new questions, using existing ones or DB:', error);
      available = questions;
    }
  }

  if (available.length === 0) {
    console.warn(`No available questions for theme: ${theme}`);
    return null;
  }

  return available[Math.floor(Math.random() * available.length)];
}

export function getQuestionStats() {
  const stats: Record<string, number> = {};
  for (const [theme, questions] of Object.entries(questionCache)) {
    stats[theme] = questions.length;
  }
  return stats;
}

export function resetCache() {
  questionCache = {};
  cacheInitialized = false;
}
