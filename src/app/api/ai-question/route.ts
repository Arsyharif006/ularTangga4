import { NextResponse } from 'next/server';
import type { QuestionTheme } from '@/types/game';

export const runtime = 'nodejs';

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
  bahasa_indonesia: 'bahasa Indonesia dan pemahaman bacaan',
  ipa: 'ilmu pengetahuan alam',
  ips: 'ilmu pengetahuan sosial',
  ppkn: 'PPKn dan pendidikan kewarganegaraan',
  fisika: 'fisika dan konsep gerak, energi, serta gaya',
  kimia: 'kimia dan sifat zat serta reaksinya',
  broadcasting: 'broadcasting dan media komunikasi',
  informatika: 'informatika dan dasar komputer',
  tkj: 'teknik komputer dan jaringan',
  desain_grafis: 'desain grafis dan komunikasi visual',
  sd: 'materi umum SD (kognitif dasar)',
  smp: 'materi umum SMP (tingkat menengah)',
  sma_smk: 'materi umum SMA/SMK (tingkat lanjut dan teknis)',
};

const DIFFICULTY_DESC: Record<string, string> = {
  easy: 'mudah (tingkat dasar)',
  medium: 'sedang (tingkat menengah)',
  hard: 'sulit (tingkat lanjut)',
};

function getProviderApiKey(provider: AIProvider): string | undefined {
  if (provider === 'groq') {
    return process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
  }

  if (provider === 'openai') {
    return process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  }

  return process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
}

function buildPrompt(theme: QuestionTheme, difficulty: string): string {
  const themeDesc = THEME_PROMPTS[theme];
  const difficultyDesc = DIFFICULTY_DESC[difficulty] || 'sedang';

  return `JSON_ONLY
{"question":"...","options":["","","",""],"correctAnswer":0,"theme":"${theme}","difficulty":"${difficulty}"}
Generate one Indonesian multiple-choice question about ${themeDesc}. Difficulty: ${difficultyDesc}.`;
}

function parseJsonContent(content: string): GeneratedQuestionData {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Tidak dapat parse JSON dari response AI');
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

async function generateWithGemini(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = getProviderApiKey('gemini');
  if (!apiKey) throw new Error('GEMINI_API_KEY tidak diset');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(theme, difficulty) }] }],
        generationConfig: {
          temperature: 0.4,
          topK: 8,
          topP: 0.8,
          maxOutputTokens: 180,
        },
      }),
    }
  );

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Gemini API error: status=${response.status} statusText=${response.statusText} body=${bodyText}`);
  }

  const data = await response.json().catch(() => null);
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.candidates?.[0]?.content || null;

  if (!content || typeof content !== 'string') {
    throw new Error('Gemini API response tidak valid or empty content');
  }

  return parseJsonContent(content);
}

async function generateWithGroq(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = getProviderApiKey('groq');
  if (!apiKey) throw new Error('GROQ_API_KEY tidak diset');

  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(theme, difficulty) }],
          temperature: 0.4,
          max_tokens: 180,
        }),
      });

      const bodyText = await response.text().catch(() => '');
      if (!response.ok) {
        lastError = new Error(`Groq API error: status=${response.status} statusText=${response.statusText} body=${bodyText}`);
        continue;
      }

      const data = await response.json().catch(() => null);
      const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || null;

      if (!content || typeof content !== 'string') {
        lastError = new Error('Groq API response tidak valid or empty content');
        continue;
      }

      return parseJsonContent(content);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Groq API request gagal');

}

async function generateWithOpenAI(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = getProviderApiKey('openai');
  if (!apiKey) throw new Error('OPENAI_API_KEY tidak diset');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: buildPrompt(theme, difficulty) }],
      temperature: 0.4,
      max_tokens: 180,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error: status=${response.status} statusText=${response.statusText} body=${bodyText}`);
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || null;

  if (!content || typeof content !== 'string') {
    throw new Error('OpenAI API response tidak valid or empty content');
  }

  return parseJsonContent(content);
}

async function generateWithProvider(provider: AIProvider, theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  if (provider === 'groq') {
    return generateWithGroq(theme, difficulty);
  }

  if (provider === 'openai') {
    return generateWithOpenAI(theme, difficulty);
  }

  return generateWithGemini(theme, difficulty);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const provider = (body.provider || process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini') as AIProvider;
    const theme = body.theme as QuestionTheme;
    const difficulty = (body.difficulty || 'medium') as string;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme tidak valid' }, { status: 400 });
    }

    const data = await generateWithProvider(provider, theme, difficulty);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
