
import { NextResponse } from 'next/server';
import type { QuestionTheme, QuestionGrade } from '@/types/game';
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
  programming: 'pemrograman web',
  sistem_digital: 'sistem digital dan logika gerbang',
  logika_mtk: 'logika matematika',
  matematika: 'matematika dan perhitungan',
  english: 'bahasa inggris dan tata bahasa',
  history: 'sejarah Indonesia',
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

const GRADE_DIFFICULTY: Record<QuestionGrade, 'easy' | 'medium' | 'hard'> = {
  sd: 'easy',
  smp: 'medium',
  sma_smk: 'hard',
};

// Konteks singkat per jenjang. Ini yang membatasi TINGKAT soal,
// bukan topik/objek/format soal — itu dibebaskan ke AI.
const GRADE_CONTEXT: Record<QuestionGrade, string> = {
  sd: 'untuk siswa SD (konsep konkret, angka kecil, satu langkah pengerjaan)',
  smp: 'untuk siswa SMP (materi menengah, boleh sedikit analisis)',
  sma_smk: 'untuk siswa SMA/SMK (materi lanjut, boleh analisis dan konteks praktis)',
};

// Gaya bahasa soal dibuat berbeda per jenjang supaya terasa "pas" untuk usianya.
const GRADE_STYLE: Record<QuestionGrade, string> = {
  sd: 'ceria, akrab, dan sangat sederhana, seolah bicara langsung ke anak SD (boleh pakai sapaan seperti "kamu", kalimat pendek, tanpa istilah rumit)',
  smp: 'bahasa baku sekolah namun tetap santai dan mudah dipahami, seperti soal ulangan SMP pada umumnya',
  sma_smk: 'bahasa formal dan sedikit teknis, layaknya soal ujian SMA/SMK atau konteks dunia kerja/praktik',
};

const GROQ_MODELS = [
  'qwen/qwen3-32b',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
] as const;

function getProviderApiKey(): string | undefined {
  return process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
}

/**
 * Prompt hanya bergantung pada TEMA dan GRADE.
 * Sisanya (jenis soal, konteks cerita, nama, angka, objek, dsb) dibebaskan
 * ke AI supaya variasinya alami dan tidak terpaku pada satu pola.
 */
function buildPrompt(theme: QuestionTheme, grade: QuestionGrade = 'smp'): string {
  const themeDesc = THEME_PROMPTS[theme];
  const gradeDifficulty = GRADE_DIFFICULTY[grade] || 'medium';
  const difficultyDesc = DIFFICULTY_DESC[gradeDifficulty] || DIFFICULTY_DESC.medium;
  const gradeContext = GRADE_CONTEXT[grade] || GRADE_CONTEXT.smp;
  const gradeStyle = GRADE_STYLE[grade] || GRADE_STYLE.smp;

  return `JSON_ONLY
{"question":"...","options":["","","",""],"correctAnswer":0}
Buat 1 soal pilihan ganda berbahasa Indonesia sesuai tema tentang ${themeDesc}, ${gradeContext}, dengan tingkat kesulitan ${difficultyDesc}.
Batasi panjang teks pertanyaan menjadi 10-25 kata saja; buat kalimat singkat, langsung ke inti, dan mudah dipahami.
Gunakan gaya bahasa: ${gradeStyle}.
Bebaskan sepenuhnya jenis soal (hitungan, cerita, analisis, pemahaman, logika, dll), konteksnya (nama, benda, situasi, angka), dan sudut pandangnya — asal tetap relevan dengan tema dan jenjang di atas. Jangan terpaku pada satu pola atau contoh tertentu, buat soal terasa baru dan tidak monoton setiap kali dibuat.
Output HANYA 1 JSON valid berisi field question, options (4 string pilihan jawaban), dan correctAnswer (index 0-3). Jangan tambahkan teks lain di luar JSON.`;
}

function parseJsonContent(content: string): GeneratedQuestionData {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
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

async function generateWithGroq(theme: QuestionTheme, grade: QuestionGrade): Promise<GeneratedQuestionData> {
  const apiKey = getProviderApiKey();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY belum diatur. Tambahkan variabel environment di Vercel sebelum deploy.');
  }

  const doRequest = async (model: string, maxTokens: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: buildPrompt(theme, grade) }],
          temperature: 0.95,
          max_completion_tokens: maxTokens,
          top_p: 0.95,
          ...(model.includes('qwen') ? { reasoning_effort: 'default' } : model.includes('gpt-oss') ? { reasoning_effort: 'medium' } : {}),
          stream: false,
          stop: null,
        }),
        signal: controller.signal,
      });

      const text = await res.text().catch(() => '');
      return { res, text } as const;
    } finally {
      clearTimeout(timeout);
    }
  };

  let lastError: Error | null = null;

  for (const model of GROQ_MODELS) {
    const maxTokens = model.includes('qwen') ? 4096 : model.includes('gpt-oss') ? 512 : 384;
    let attempt;
    try {
      attempt = await doRequest(model, maxTokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = new Error(`Groq request threw for model ${model}: ${msg}`);
      // Try next model when a network/abort/other exception occurs
      continue;
    }

    if (attempt.res && attempt.res.ok) {
      const data = JSON.parse(attempt.text || '{}');
      const content = data?.choices?.[0]?.message?.content ?? null;
      if (!content || typeof content !== 'string') {
        lastError = new Error('Groq API response tidak valid atau kosong');
        continue; // try next model
      }
      return parseJsonContent(content);
    }

    const bodyText = (attempt && attempt.text) || '';
    const details = attempt && attempt.res ? `status=${attempt.res.status} statusText=${attempt.res.statusText} body=${bodyText.slice(0, 400)}` : `no response body=${bodyText.slice(0,400)}`;

    if (attempt && attempt.res && (attempt.res.status === 401 || attempt.res.status === 403)) {
      throw new Error(`Groq API key tidak valid atau tidak diizinkan. ${details}`);
    }

    if (attempt && attempt.res && (attempt.res.status === 404 || attempt.res.status === 400 || attempt.res.status === 422)) {
      lastError = new Error(`Model ${model} tidak tersedia. ${details}`);
      continue;
    }

    if (attempt && attempt.res && (attempt.res.status === 429 || attempt.res.status >= 500 || /rate_limit|overloaded|timed out|timeout/i.test(bodyText))) {
      lastError = new Error(`Groq request gagal untuk model ${model}. ${details}`);
      continue;
    }

    lastError = new Error(`Groq API error untuk model ${model}. ${details}`);
  }

  throw lastError || new Error('Groq API gagal setelah mencoba beberapa model');
}

async function generateWithProvider(theme: QuestionTheme, grade: QuestionGrade): Promise<GeneratedQuestionData> {
  return generateWithGroq(theme, grade);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const theme = body.theme as QuestionTheme;
    const grade = (body.grade || 'smp') as QuestionGrade;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme tidak valid' }, { status: 400 });
    }

    console.log('[AI] Requesting question', { theme, grade, hasApiKey: Boolean(getProviderApiKey()) });
    const data = await generateWithProvider(theme, grade);

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