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

const GRADE_DIFFICULTY: Record<QuestionGrade, 'easy' | 'medium' | 'hard'> = {
  sd: 'easy',
  smp: 'medium',
  sma_smk: 'hard',
};

const GRADE_CONTEXT: Record<QuestionGrade, string> = {
  sd: 'untuk SD: bahasa sangat sederhana, konsep konkret, angka kecil, satu langkah pengerjaan, dan tidak memakai materi di atas SD',
  smp: 'untuk SMP: materi menengah sesuai kurikulum SMP, bisa sedikit analisis, dan hindari topik SMA/SMK yang terlalu sulit',
  sma_smk: 'untuk SMA/SMK: materi lanjut sesuai kurikulum SMA/SMK, analisis singkat, dan hindari materi dasar SD/SMP',
};

const GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
] as const;

const VARIETY_HINTS: Record<QuestionTheme, string[]> = {
  general: ['situasi sehari-hari', 'permainan', 'belanja', 'keluarga', 'sekolah', 'alam sekitar'],
  programming: ['algoritma sederhana', 'logika pemrograman', 'struktur data', 'debugging', 'perintah komputer'],
  sistem_digital: ['gerbang logika', 'bilangan biner', 'sirkuit sederhana', 'kode biner', 'logika digital'],
  logika_mtk: ['pola bilangan', 'premis logika', 'pernyataan benar/salah', 'penalaran sederhana'],
  matematika: ['penjumlahan', 'pengurangan', 'perkalian', 'pembagian', 'waktu', 'uang', 'ukuran', 'geometri'],
  english: ['kosakata', 'grammar', 'dialog sederhana', 'tenses', 'reading'],
  history: ['peristiwa sejarah', 'tokoh sejarah', 'asal usul', 'peradaban', 'kejadian penting'],
  bahasa_indonesia: ['bacaan singkat', 'kata baku', 'makna kata', 'kalimat efektif', 'tanda baca'],
  ipa: ['makhluk hidup', 'energi', 'sifat benda', 'ekosistem', 'cuaca'],
  ips: ['kehidupan sosial', 'peta', 'kebutuhan hidup', 'budaya', 'ekonomi dasar'],
  ppkn: ['norma', 'hak dan kewajiban', 'nilai Pancasila', 'tata tertib', 'kebersamaan'],
  fisika: ['gaya', 'energi', 'gerak', 'cahaya', 'suhu'],
  kimia: ['zat', 'reaksi sederhana', 'perubahan wujud', 'campuran', 'unsur'],
  broadcasting: ['media', 'siaran', 'pesan', 'audiens', 'program'],
  informatika: ['komputer', 'jaringan', 'data', 'aplikasi', 'internet'],
  tkj: ['jaringan komputer', 'topologi', 'router', 'kabel', 'internet'],
  desain_grafis: ['warna', 'layout', 'tipografi', 'logo', 'komposisi'],
  sd: ['kehidupan sehari-hari', 'berhitung', 'uang', 'waktu', 'ukuran'],
  smp: ['konsep sekolah', 'ilmu pengetahuan', 'masalah sehari-hari', 'analisis sederhana'],
  sma_smk: ['kasus nyata', 'analisis', 'teknologi', 'konteks praktik'],
};

const QUESTION_FORMATS = ['hitungan', 'analisis', 'pemahaman', 'logika'] as const;

const NAME_BANK = ['Alya', 'Raka', 'Nina', 'Damar', 'Selvi', 'Arman', 'Citra', 'Farel', 'Mira', 'Irfan'];

const OBJECT_BANKS: Record<QuestionTheme, string[]> = {
  general: ['tas', 'jam', 'buku', 'kunci', 'topi', 'sepatu', 'piring', 'lampu'],
  programming: ['robot', 'kode', 'komputer', 'sensor', 'panel'],
  sistem_digital: ['saklar', 'lampu', 'sensor', 'sinyal', 'chip'],
  logika_mtk: ['kartu', 'angka', 'kotak', 'peta', 'token'],
  matematika: ['apel', 'permen', 'kelereng', 'stiker', 'kertas'],
  english: ['buku', 'tas', 'peta', 'kamera', 'kado'],
  history: ['prasasti', 'peta', 'patung', 'keramik', 'dokumen'],
  bahasa_indonesia: ['teks', 'novel', 'poster', 'surat', 'majalah'],
  ipa: ['tanaman', 'biji', 'air', 'matahari', 'serangga'],
  ips: ['pasar', 'desa', 'pabrik', 'jalan', 'bank'],
  ppkn: ['bendera', 'papan pengumuman', 'kelas', 'tempat sampah', 'ruang baca'],
  fisika: ['bola', 'mobil', 'sepeda', 'penggaris', 'jam'],
  kimia: ['larutan', 'cairan', 'padatan', 'gas', 'campuran'],
  broadcasting: ['mikrofon', 'kamera', 'studio', 'podcast', 'layar'],
  informatika: ['server', 'data', 'aplikasi', 'jaringan', 'file'],
  tkj: ['router', 'kabel', 'switch', 'server', 'modem'],
  desain_grafis: ['logo', 'poster', 'warna', 'layout', 'ikon'],
  sd: ['bola', 'pensil', 'tas', 'kue', 'buku'],
  smp: ['laptop', 'alat tulis', 'botol', 'jurnal', 'kamera'],
  sma_smk: ['proyek', 'aplikasi', 'alat ukur', 'prototype', 'data'],
};

const THEME_TOPIC_BANKS: Record<QuestionTheme, string[]> = {
  general: ['kejadian sehari-hari', 'pengetahuan umum', 'kebiasaan', 'sosial'],
  programming: ['alur program', 'struktur data', 'logika kode', 'debugging'],
  sistem_digital: ['gerbang logika', 'bilangan biner', 'sinyal digital', 'sirkuit sederhana'],
  logika_mtk: ['pola bilangan', 'premis logika', 'penalaran', 'pernyataan benar salah'],
  matematika: ['operasi hitung', 'pengukuran', 'waktu', 'uang', 'pola bilangan'],
  english: ['kosakata', 'grammar sederhana', 'dialog singkat', 'tenses sederhana'],
  history: ['tokoh sejarah', 'peristiwa penting', 'asal usul', 'peradaban'],
  bahasa_indonesia: ['bacaan singkat', 'kata baku', 'kalimat efektif', 'makna kata'],
  ipa: ['makhluk hidup', 'energi', 'sifat benda', 'ekosistem'],
  ips: ['kehidupan sosial', 'kebutuhan sehari-hari', 'ekonomi dasar', 'peta'],
  ppkn: ['norma', 'hak dan kewajiban', 'nilai Pancasila', 'tata tertib'],
  fisika: ['gaya', 'energi', 'gerak', 'cahaya'],
  kimia: ['zat', 'reaksi sederhana', 'perubahan wujud', 'campuran'],
  broadcasting: ['media', 'siaran', 'pesan audien', 'program'],
  informatika: ['data', 'jaringan', 'aplikasi', 'komputer dasar'],
  tkj: ['router', 'jaringan', 'topologi', 'kabel'],
  desain_grafis: ['warna', 'layout', 'tipografi', 'logo'],
  sd: ['kehidupan sehari-hari', 'berhitung', 'uang', 'waktu'],
  smp: ['konsep sekolah', 'analisis sederhana', 'masalah sehari-hari', 'ilmu pengetahuan'],
  sma_smk: ['kasus nyata', 'analisis', 'teknologi', 'praktik kerja'],
};

const THEME_CURRICULUM_RULES: Record<QuestionTheme, Record<QuestionGrade, string>> = {
  general: {
    sd: 'konsep konkret dan sangat dasar',
    smp: 'konsep menengah dan sederhana',
    sma_smk: 'konsep aplikatif dan analitis',
  },
  programming: {
    sd: 'logika sederhana dan urutan langkah',
    smp: 'alur program dan pemahaman dasar',
    sma_smk: 'algoritma, struktur, dan pemecahan masalah',
  },
  sistem_digital: {
    sd: 'pengenalan sederhana benda dan sinyal',
    smp: 'logika digital dasar',
    sma_smk: 'sistem digital dan aplikasi teknis',
  },
  logika_mtk: {
    sd: 'pola sederhana dan penalaran dasar',
    smp: 'pola dan logika berurutan',
    sma_smk: 'analisis logika dan argumen',
  },
  matematika: {
    sd: 'operasi hitung dasar dan angka kecil',
    smp: 'persamaan, perbandingan, dan pola',
    sma_smk: 'aplikasi, fungsi, dan pemecahan masalah',
  },
  english: {
    sd: 'kosakata dan kalimat sederhana',
    smp: 'grammar dasar dan pemahaman singkat',
    sma_smk: 'komunikasi dan konteks nyata',
  },
  history: {
    sd: 'tokoh dan peristiwa paling dasar',
    smp: 'urutan peristiwa dan makna sejarah',
    sma_smk: 'analisis peristiwa dan dampaknya',
  },
  bahasa_indonesia: {
    sd: 'kata, kalimat, dan bacaan sederhana',
    smp: 'pemahaman teks dan struktur kalimat',
    sma_smk: 'analisis teks dan makna tersirat',
  },
  ipa: {
    sd: 'gejala alam yang dekat dengan kehidupan',
    smp: 'konsep ilmiah sederhana',
    sma_smk: 'hubungan sebab-akibat dan aplikasi',
  },
  ips: {
    sd: 'kehidupan sehari-hari dan lingkungan',
    smp: 'aktivitas sosial dan ekonomi dasar',
    sma_smk: 'fenomena sosial dan ekonomi lebih kompleks',
  },
  ppkn: {
    sd: 'hak, kewajiban, dan aturan sederhana',
    smp: 'nilai dan norma di masyarakat',
    sma_smk: 'konsep kebangsaan dan aplikasi nyata',
  },
  fisika: {
    sd: 'fenomena sehari-hari yang konkret',
    smp: 'konsep dasar gaya dan gerak',
    sma_smk: 'analisis konsep fisika dan penerapan',
  },
  kimia: {
    sd: 'sifat benda dan perubahan sederhana',
    smp: 'zat, reaksi, dan perubahan wujud',
    sma_smk: 'reaksi dan konsep kimia lebih terstruktur',
  },
  broadcasting: {
    sd: 'media dan komunikasi sederhana',
    smp: 'pesan dan media dasar',
    sma_smk: 'analisis media dan audiens',
  },
  informatika: {
    sd: 'alat dan fungsi komputer dasar',
    smp: 'data, jaringan, dan aplikasi dasar',
    sma_smk: 'sistem informasi dan solusi digital',
  },
  tkj: {
    sd: 'pengenalan perangkat sederhana',
    smp: 'jaringan dan konektivitas dasar',
    sma_smk: 'arsitektur dan troubleshooting jaringan',
  },
  desain_grafis: {
    sd: 'warna, bentuk, dan gambar sederhana',
    smp: 'komposisi dan elemen visual',
    sma_smk: 'desain komunikasi visual dan tujuan',
  },
  sd: {
    sd: 'materi dasar yang sesuai SD',
    smp: 'materi dasar yang lebih luas',
    sma_smk: 'materi dasar yang dipakai untuk konteks lanjut',
  },
  smp: {
    sd: 'materi sederhana untuk pengenalan',
    smp: 'materi sesuai SMP',
    sma_smk: 'materi yang bisa dikembangkan ke level atas',
  },
  sma_smk: {
    sd: 'materi ringan untuk pengantar',
    smp: 'materi menengah yang bisa dipahami',
    sma_smk: 'materi sesuai SMA/SMK',
  },
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function getProviderApiKey(): string | undefined {
  return process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
}

function buildPrompt(theme: QuestionTheme, difficulty: string, grade: QuestionGrade = 'smp'): string {
  const themeDesc = THEME_PROMPTS[theme];
  const gradeDifficulty = GRADE_DIFFICULTY[grade] || 'medium';
  const difficultyDesc = DIFFICULTY_DESC[gradeDifficulty] || DIFFICULTY_DESC.medium;
  const gradeContext = GRADE_CONTEXT[grade] || GRADE_CONTEXT.smp;
  const hints = VARIETY_HINTS[theme] || VARIETY_HINTS.general;
  const varietyHint = pickRandom(hints);
  const format = pickRandom(QUESTION_FORMATS);
  const topic = pickRandom(THEME_TOPIC_BANKS[theme] || THEME_TOPIC_BANKS.general);
  const curriculumRule = THEME_CURRICULUM_RULES[theme]?.[grade] || 'sesuai tingkat kelas';
  const name = pickRandom(NAME_BANK);
  const object = pickRandom(OBJECT_BANKS[theme] || OBJECT_BANKS.general);
  const promptSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `JSON_ONLY\n{"question":"...","options":["","","",""],"correctAnswer":0}\nBuat 1 soal pilihan ganda Indonesia tentang ${themeDesc}. Grade: ${grade}. ${gradeContext}. Level: ${difficultyDesc}. Format: ${format}. Topik: ${topic}. Aturan kurikulum: ${curriculumRule}. Gunakan konteks ${varietyHint} dan nama/objek baru seperti ${name} dan ${object}. Hindari pola berulang. Output hanya 1 JSON.`;
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

async function generateWithGroq(theme: QuestionTheme, difficulty: string, grade: QuestionGrade): Promise<GeneratedQuestionData> {
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
          messages: [{ role: 'user', content: buildPrompt(theme, difficulty, grade) }],
          temperature: 0.95,
          max_completion_tokens: maxTokens,
          top_p: 0.95,
          ...(model.includes('gpt-oss') ? { reasoning_effort: 'medium' } : {}),
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
    const attempt = await doRequest(model, model.includes('gpt-oss') ? 512 : 384);
    if (attempt.res.ok) {
      const data = JSON.parse(attempt.text || '{}');
      const content = data?.choices?.[0]?.message?.content ?? null;
      if (!content || typeof content !== 'string') {
        throw new Error('Groq API response tidak valid atau kosong');
      }
      return parseJsonContent(content);
    }

    const bodyText = attempt.text || '';
    const details = `status=${attempt.res.status} statusText=${attempt.res.statusText} body=${bodyText.slice(0, 400)}`;

    if (attempt.res.status === 401 || attempt.res.status === 403) {
      throw new Error(`Groq API key tidak valid atau tidak diizinkan. ${details}`);
    }

    if (attempt.res.status === 404 || attempt.res.status === 400 || attempt.res.status === 422) {
      lastError = new Error(`Model ${model} tidak tersedia. ${details}`);
      continue;
    }

    if (attempt.res.status === 429 || attempt.res.status >= 500 || /rate_limit|overloaded|timed out|timeout/i.test(bodyText)) {
      lastError = new Error(`Groq request gagal untuk model ${model}. ${details}`);
      continue;
    }

    lastError = new Error(`Groq API error untuk model ${model}. ${details}`);
  }

  throw lastError || new Error('Groq API gagal setelah mencoba beberapa model');
}

async function generateWithProvider(theme: QuestionTheme, difficulty: string, grade: QuestionGrade): Promise<GeneratedQuestionData> {
  return generateWithGroq(theme, difficulty, grade);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const theme = body.theme as QuestionTheme;
    const difficulty = (body.difficulty || 'medium') as string;
    const grade = (body.grade || 'smp') as QuestionGrade;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme tidak valid' }, { status: 400 });
    }

    console.log('[AI] Requesting question', { theme, difficulty, grade, hasApiKey: Boolean(getProviderApiKey()) });
    const data = await generateWithProvider(theme, difficulty, grade);

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
