import { NextResponse } from 'next/server';
import type { QuestionTheme } from '@/types/game';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export type AIProvider = 'groq';

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

function getProviderApiKey(): string | undefined {
  return process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
}

function buildPrompt(theme: QuestionTheme, difficulty: string): string {
  const themeDesc = THEME_PROMPTS[theme];
  const difficultyDesc = DIFFICULTY_DESC[difficulty] || 'sedang';
  // Concise prompt to minimize token usage. Instruct model to output ONLY a single JSON object.
  return `JSON_ONLY\n{"question":"...","options":["","","",""],"correctAnswer":0,"theme":"${theme}","difficulty":"${difficulty}"}\nGenerate one Indonesian multiple-choice question about ${themeDesc}. Difficulty: ${difficultyDesc}. Output must be exactly one JSON object matching the example.`;
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

async function generateWithGroq(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  const apiKey = getProviderApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY tidak diset');
  // Try primary request with conservative token limit
  const doRequest = async (model: string, maxTokens: number) => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: buildPrompt(theme, difficulty) }],
        temperature: 0.7,
        max_completion_tokens: maxTokens,
        top_p: 1,
        reasoning_effort: 'medium',
        stream: false,
        stop: null,
      }),
    });

    const text = await res.text().catch(() => '');
    return { res, text } as const;
  };

  const primary = await doRequest('openai/gpt-oss-120b', 512);
  if (primary.res.ok) {
    const data = JSON.parse(primary.text || '{}');
    const content = data?.choices?.[0]?.message?.content ?? null;
    if (!content || typeof content !== 'string') throw new Error('Groq API response tidak valid atau kosong');
    return parseJsonContent(content);
  }

  // If primary failed due to payload too large / rate limits, try a smaller model / token budget
  const primaryBody = primary.text || '';
  const shouldFallback = primary.res.status === 413 || /rate_limit|tokens|Payload Too Large/i.test(primaryBody + primary.res.statusText);
  if (shouldFallback) {
    console.warn('[AI] Primary Groq request failed due to size/rate limits; retrying with smaller model/tokens');
    try {
      const fallback = await doRequest('openai/gpt-oss-20b', 256);
      if (fallback.res.ok) {
        const data = JSON.parse(fallback.text || '{}');
        const content = data?.choices?.[0]?.message?.content ?? null;
        if (!content || typeof content !== 'string') throw new Error('Groq fallback response tidak valid atau kosong');
        return parseJsonContent(content);
      }
      const bodyText = fallback.text || '';
      throw new Error(`Groq fallback error: status=${fallback.res.status} statusText=${fallback.res.statusText} body=${bodyText}`);
    } catch (err) {
      // Rethrow original primary error if fallback fails
      throw new Error(`Groq primary failed: status=${primary.res.status} statusText=${primary.res.statusText} body=${primaryBody}; fallback error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`Groq API error: status=${primary.res.status} statusText=${primary.res.statusText} body=${primaryBody}`);
}

async function generateWithProvider(theme: QuestionTheme, difficulty: string): Promise<GeneratedQuestionData> {
  return generateWithGroq(theme, difficulty);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const theme = body.theme as QuestionTheme;
    const difficulty = (body.difficulty || 'medium') as string;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme tidak valid' }, { status: 400 });
    }

    const data = await generateWithProvider(theme, difficulty);

    // Persist generated question server-side using service role to bypass RLS
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
      if (supabaseUrl && serviceKey) {
        const svc = createClient(supabaseUrl, serviceKey as string);
        const normalized = String(data.question ?? '')
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        await svc.from('ai_questions').insert({
          question: data.question,
          question_normalized: normalized,
          options: data.options,
          correct_answer: data.correctAnswer,
          theme: data.theme,
          grade: data.difficulty,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('[AI] Failed to persist generated question server-side:', err);
      // Do not fail the request for DB errors
    }

    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
