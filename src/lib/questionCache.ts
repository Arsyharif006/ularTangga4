// ============================================================
// AI Question Cache - Manages generated questions in memory
// ============================================================

import type { Question, QuestionTheme } from '@/types/game';
import { generateQuestionsFromAI } from './aiQuestionGenerator';
import { ALL_QUESTIONS as STATIC_QUESTIONS } from '@/data/questions';

interface QuestionCache {
  [theme: string]: Question[];
}

let questionCache: QuestionCache = {};
let cacheInitialized = false;

const QUESTIONS_PER_THEME = 20; // Cache 20 soal per theme

export async function initializeQuestionCache() {
  if (cacheInitialized) return;

  const useAI = process.env.NEXT_PUBLIC_USE_AI_QUESTIONS === 'true';

  if (!useAI) {
    // Use static questions only
    console.log('Using static questions (AI disabled)');
    questionCache = { ...STATIC_QUESTIONS };
    cacheInitialized = true;
    return;
  }

  try {
    console.log('Initializing AI question cache...');
    const themes: QuestionTheme[] = ['general', 'programming', 'sistem_digital', 'logika_mtk', 'matematika', 'english', 'history'];

    // Pre-generate beberapa soal untuk masing-masing theme
    for (const theme of themes) {
      try {
        console.log(`Generating ${QUESTIONS_PER_THEME} questions for theme: ${theme}`);
        const generated = await generateQuestionsFromAI(theme, QUESTIONS_PER_THEME, 'medium');
        questionCache[theme] = generated;
      } catch (error) {
        console.warn(`Failed to generate questions for ${theme}, using static fallback:`, error);
        // Fallback to static questions
        questionCache[theme] = STATIC_QUESTIONS[theme] || [];
      }
    }

    cacheInitialized = true;
    console.log('Question cache initialized successfully');
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

  // If all questions have been used, try to generate new ones from AI
  if (available.length === 0 && process.env.NEXT_PUBLIC_USE_AI_QUESTIONS === 'true') {
    console.log(`All questions used for theme ${theme}, generating new ones...`);
    try {
      const newQuestions = await generateQuestionsFromAI(theme, 5, 'medium');
      questionCache[theme] = [...questions, ...newQuestions];
      available = newQuestions;
    } catch (error) {
      console.warn('Failed to generate new questions, resetting used list:', error);
      // Reset used questions and try again
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
