import { createClient } from '@supabase/supabase-js';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY as string);

const ALLOWED_GRADES = ['sd','smp','sma_smk'];
const ALLOWED_THEMES = ['general','programming','sistem_digital','logika_mtk','matematika','english','history','bahasa_indonesia','ipa','ips','ppkn','fisika','kimia','broadcasting','informatika','tkj','desain_grafis'];

function normalizeQuestion(q: string) {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateEntry(e: any) {
  if (!e.question || !Array.isArray(e.options) || e.options.length !== 4) return 'invalid options';
  if (typeof e.correct_answer !== 'number' || e.correct_answer < 0 || e.correct_answer > 3) return 'invalid correct_answer';
  if (!e.theme || typeof e.theme !== 'string') return 'invalid theme';
  if (!e.grade || typeof e.grade !== 'string' || !ALLOWED_GRADES.includes(e.grade)) return `invalid grade (allowed: ${ALLOWED_GRADES.join(',')})`;
  return null;
}

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log('Interactive seeder — masukkan soal manual. Ketik kosong pada pertanyaan untuk keluar.');

  while (true) {
    const question = await rl.question('Question: ');
    if (!question.trim()) break;

    const options: string[] = [];
    for (let i = 0; i < 4; i++) {
      const opt = await rl.question(`Option ${i} : `);
      options.push(opt);
    }

    const correct = await rl.question('Correct answer index (0-3): ');
    const correctIdx = Number(correct);

    const theme = await rl.question(`Theme (allowed: ${ALLOWED_THEMES.join(',')}): `);
    const grade = await rl.question(`Grade (allowed: ${ALLOWED_GRADES.join(',')}): `);

    const entry = {
      question,
      options,
      correct_answer: correctIdx,
      theme,
      grade,
    };

    const v = validateEntry(entry);
    if (v) {
      console.error('Validation failed:', v);
      continue;
    }

    const { data, error } = await supabase.from('ai_questions').upsert([
      {
        question: entry.question,
        question_normalized: normalizeQuestion(entry.question),
        options: entry.options,
        correct_answer: entry.correct_answer,
        theme: entry.theme,
        grade: entry.grade,
      }
    ], { onConflict: 'question_normalized' });

    if (error) {
      console.error('Insert error:', error);
    } else {
      console.log('Inserted/updated: 1');
    }
  }

  rl.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
