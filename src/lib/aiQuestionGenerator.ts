// ============================================================
// AI Question Generator - Groq-only integration
// ============================================================

import type { Question, QuestionTheme } from '@/types/game';
import supabase from './supabase/client';
import { ALL_QUESTIONS } from '@/data/questions';

export type AIProvider = 'groq';

interface GeneratedQuestionData {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  theme: QuestionTheme;
  difficulty: 'easy' | 'medium' | 'hard';
}

const REQUEST_BACKOFF_MS = 600;
const LAST_REQUEST_BY_THEME = new Map<string, number>();

async function requestAIQuestion(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const provider: AIProvider = 'groq';
  const now = Date.now();
  const key = `${provider}:${theme}:${difficulty}`;
  const lastRequest = LAST_REQUEST_BY_THEME.get(key) || 0;
  const waitTime = Math.max(0, REQUEST_BACKOFF_MS - (now - lastRequest));

  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  LAST_REQUEST_BY_THEME.set(key, Date.now());
  // Retry with exponential backoff on transient errors (rate limits, 413, 5xx).
  const MAX_RETRIES = 3;
  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch('/api/ai-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, theme, difficulty }),
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.success) {
        return {
          question: payload.question,
          options: payload.options as [string, string, string, string],
          correctAnswer: payload.correctAnswer as 0 | 1 | 2 | 3,
          theme: payload.theme,
          difficulty: payload.difficulty,
        };
      }

      const errMsg = payload?.error || `${response.status} ${response.statusText}`;
      lastError = new Error(errMsg);

      // Retry on rate-limit / payload-too-large / server errors
      const shouldRetry = /rate_limit|rate limit|Payload Too Large|tokens|413/i.test(errMsg) || response.status >= 500;
      if (!shouldRetry) throw lastError;

      attempt++;
      const backoffMs = 500 * Math.pow(2, attempt - 1);
      console.warn(`[AI] Request failed (attempt ${attempt}) - retrying in ${backoffMs}ms:`, errMsg);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    } catch (err) {
      lastError = err;
      attempt++;
      const backoffMs = 500 * Math.pow(2, attempt - 1);
      console.warn(`[AI] Fetch error (attempt ${attempt}) - retrying in ${backoffMs}ms:`, err);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('Gagal memanggil AI endpoint setelah beberapa percobaan');
}

const normalizeQuestionText = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .toLowerCase();

async function isDuplicateQuestion(question: string): Promise<boolean> {
  const normalized = normalizeQuestionText(question);
  const { data, error } = await supabase
    .from('ai_questions')
    .select('id')
    .eq('question_normalized', normalized)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Failed checking duplicate question:', error);
    return false;
  }

  return Boolean(data?.id);
}

async function saveAIQuestionToDatabase(question: Question): Promise<void> {
  try {
    const normalized = normalizeQuestionText(question.question);
    const duplicate = await isDuplicateQuestion(question.question);
    if (duplicate) {
      console.log('AI question already exists in database, not inserting');
      return;
    }

    const { error } = await supabase.from('ai_questions').insert({
      question: question.question,
      question_normalized: normalized,
      options: question.options,
      correct_answer: question.correctAnswer,
      theme: question.theme,
      grade: question.difficulty,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Failed to save AI question to database:', error);
    }
  } catch (error) {
    console.warn('Unable to persist AI question:', error);
  }
}

export async function generateQuestionFromAI(
  theme: QuestionTheme,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question> {
  try {
    const data = await requestAIQuestion(theme, difficulty);

    const id = `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const question: Question = {
      id,
      theme: data.theme,
      question: data.question,
      options: data.options,
      correctAnswer: data.correctAnswer,
      difficulty: data.difficulty,
    };

    // Persist server-side in the API route; skip client-side insert to avoid RLS errors.
    return question;
  } catch (error) {
    console.error('Error generating question from AI:', error);
    // Fallback: return one static question from the theme to avoid blocking gameplay
    try {
      const themeQs = (ALL_QUESTIONS as Record<QuestionTheme, Question[]>)[theme] || (ALL_QUESTIONS as Record<QuestionTheme, Question[]>)['general'];
      const fallback = themeQs && themeQs.length > 0 ? themeQs[Math.floor(Math.random() * themeQs.length)] : {
        id: `fallback_${Date.now()}`,
        theme,
        question: 'Soal sementara tidak tersedia',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 0,
        difficulty,
      } as Question;
      const id = `ai_fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      return { ...fallback, id };
    } catch (err) {
      throw error;
    }
  }
}

export async function generateQuestionsFromAI(
  theme: QuestionTheme,
  count: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question[]> {
  const questions: Question[] = [];
  const errors: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const question = await generateQuestionFromAI(theme, difficulty);
      questions.push(question);
      await new Promise((resolve) => setTimeout(resolve, 250));
    } catch (error) {
      errors.push(`Error pada pertanyaan ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Beberapa pertanyaan gagal di-generate:', errors);
  }

  return questions;
}
