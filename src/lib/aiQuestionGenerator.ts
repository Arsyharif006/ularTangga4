// ============================================================
// AI Question Generator - Supports multiple providers
// ============================================================

import type { Question, QuestionTheme } from '@/types/game';

export type AIProvider = 'gemini' | 'groq' | 'openai';

interface GeneratedQuestionData {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 0 | 1 | 2 | 3;
  theme: QuestionTheme;
  difficulty: 'easy' | 'medium' | 'hard';
}

const THEME_PROMPTS: Record<QuestionTheme, string> = {
  general: 'pengetahuan umum',
  programming: 'pemrograman dan ilmu komputer',
  sistem_digital: 'sistem digital, logika digital, dan bilangan biner',
  logika_mtk: 'logika matematika dan proposisi',
  matematika: 'matematika dan perhitungan',
  english: 'bahasa inggris dan tata bahasa',
  history: 'sejarah',
};

const DIFFICULTY_DESC: Record<string, string> = {
  easy: 'mudah (tingkat dasar)',
  medium: 'sedang (tingkat menengah)',
  hard: 'sulit (tingkat lanjut)',
};

async function generateWithGemini(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY tidak diset');

  const themeDesc = THEME_PROMPTS[theme];
  const difficultyDesc = DIFFICULTY_DESC[difficulty] || 'sedang';

  const prompt = `Buat 1 soal pilihan ganda dalam bahasa Indonesia tentang ${themeDesc} dengan tingkat kesulitan ${difficultyDesc}.

PENTING: Balasan HARUS berformat JSON yang valid, tanpa teks tambahan.

Format JSON:
{
  "question": "pertanyaan di sini",
  "options": ["opsi A", "opsi B", "opsi C", "opsi D"],
  "correctAnswer": 0,
  "theme": "${theme}",
  "difficulty": "${difficulty}"
}

Catatan:
- correctAnswer adalah indeks (0, 1, 2, atau 3) dari jawaban yang benar
- Pastikan soal unik dan berbeda dari soal sebelumnya
- Gunakan bahasa Indonesia yang jelas
- Jawaban harus masuk akal dan realistis`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Gemini API response tidak valid');
  }

  // Extract JSON dari response (mungkin ada text sebelum/sesudah)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Tidak dapat parse JSON dari response Gemini');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    question: parsed.question,
    options: parsed.options as [string, string, string, string],
    correctAnswer: parsed.correctAnswer as 0 | 1 | 2 | 3,
    theme: parsed.theme,
    difficulty: parsed.difficulty,
  };
}

async function generateWithGroq(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_GROQ_API_KEY tidak diset');

  const themeDesc = THEME_PROMPTS[theme];
  const difficultyDesc = DIFFICULTY_DESC[difficulty] || 'sedang';

  const prompt = `Buat 1 soal pilihan ganda dalam bahasa Indonesia tentang ${themeDesc} dengan tingkat kesulitan ${difficultyDesc}.

PENTING: Balasan HARUS berformat JSON yang valid, tanpa teks tambahan.

Format JSON:
{
  "question": "pertanyaan di sini",
  "options": ["opsi A", "opsi B", "opsi C", "opsi D"],
  "correctAnswer": 0,
  "theme": "${theme}",
  "difficulty": "${difficulty}"
}

Catatan:
- correctAnswer adalah indeks (0, 1, 2, atau 3) dari jawaban yang benar
- Pastikan soal unik dan berbeda dari soal sebelumnya
- Gunakan bahasa Indonesia yang jelas
- Jawaban harus masuk akal dan realistis`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mixtral-8x7b-32768',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Groq API response tidak valid');
  }

  // Extract JSON dari response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Tidak dapat parse JSON dari response Groq');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    question: parsed.question,
    options: parsed.options as [string, string, string, string],
    correctAnswer: parsed.correctAnswer as 0 | 1 | 2 | 3,
    theme: parsed.theme,
    difficulty: parsed.difficulty,
  };
}

async function generateWithOpenAI(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error('NEXT_PUBLIC_OPENAI_API_KEY tidak diset');

  const themeDesc = THEME_PROMPTS[theme];
  const difficultyDesc = DIFFICULTY_DESC[difficulty] || 'sedang';

  const prompt = `Buat 1 soal pilihan ganda dalam bahasa Indonesia tentang ${themeDesc} dengan tingkat kesulitan ${difficultyDesc}.

Balasan HARUS berformat JSON yang valid, tanpa teks tambahan.

Format JSON:
{
  "question": "pertanyaan di sini",
  "options": ["opsi A", "opsi B", "opsi C", "opsi D"],
  "correctAnswer": 0,
  "theme": "${theme}",
  "difficulty": "${difficulty}"
}

Catatan:
- correctAnswer adalah indeks (0, 1, 2, atau 3) dari jawaban yang benar
- Pastikan soal unik dan berbeda dari soal sebelumnya
- Gunakan bahasa Indonesia yang jelas`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('OpenAI API response tidak valid');
  }

  // Extract JSON dari response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Tidak dapat parse JSON dari response OpenAI');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    question: parsed.question,
    options: parsed.options as [string, string, string, string],
    correctAnswer: parsed.correctAnswer as 0 | 1 | 2 | 3,
    theme: parsed.theme,
    difficulty: parsed.difficulty,
  };
}

export async function generateQuestionFromAI(
  theme: QuestionTheme,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<Question> {
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini') as AIProvider;
  let data: GeneratedQuestionData;

  try {
    if (provider === 'gemini') {
      data = await generateWithGemini(theme, difficulty);
    } else if (provider === 'groq') {
      data = await generateWithGroq(theme, difficulty);
    } else if (provider === 'openai') {
      data = await generateWithOpenAI(theme, difficulty);
    } else {
      throw new Error(`AI Provider tidak dikenal: ${provider}`);
    }

    // Generate unique ID berdasarkan timestamp + random
    const id = `ai_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    return {
      id,
      theme: data.theme,
      question: data.question,
      options: data.options,
      correctAnswer: data.correctAnswer,
      difficulty: data.difficulty,
    };
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
      // Delay untuk menghindari rate limiting (100ms)
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      errors.push(`Error pada pertanyaan ${i + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    console.warn('Beberapa pertanyaan gagal di-generate:', errors);
  }

  return questions;
}
