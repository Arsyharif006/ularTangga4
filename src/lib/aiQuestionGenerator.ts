// ============================================================
// AI Question Generator - Supports multiple providers
// ============================================================

import type { Question, QuestionTheme } from '@/types/game';
import supabase from './supabase/client';

export type AIProvider = 'gemini' | 'groq' | 'openai';

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
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini') as AIProvider;
  const now = Date.now();
  const key = `${provider}:${theme}:${difficulty}`;
  const lastRequest = LAST_REQUEST_BY_THEME.get(key) || 0;
  const waitTime = Math.max(0, REQUEST_BACKOFF_MS - (now - lastRequest));

  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  LAST_REQUEST_BY_THEME.set(key, Date.now());

  const response = await fetch('/api/ai-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, theme, difficulty }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Gagal memanggil AI endpoint');
  }

  return {
    question: payload.question,
    options: payload.options as [string, string, string, string],
    correctAnswer: payload.correctAnswer as 0 | 1 | 2 | 3,
    theme: payload.theme,
    difficulty: payload.difficulty,
  };
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
      difficulty: question.difficulty,
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

    await saveAIQuestionToDatabase(question);
    return question;
  } catch (error) {
    console.error('Error generating question from AI:', error);
    throw error;
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
