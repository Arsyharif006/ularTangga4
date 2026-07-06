const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const ALLOWED_GRADES = ['sd','smp','sma_smk'];

function normalizeQuestion(q) {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateEntry(e) {
  if (!e.question || !Array.isArray(e.options) || e.options.length !== 4) return 'invalid options';
  if (typeof e.correct_answer !== 'number' || e.correct_answer < 0 || e.correct_answer > 3) return 'invalid correct_answer';
  if (!e.theme || typeof e.theme !== 'string') return 'invalid theme';
  if (!e.grade || typeof e.grade !== 'string' || !ALLOWED_GRADES.includes(e.grade)) return `invalid grade (allowed: ${ALLOWED_GRADES.join(',')})`;
  return null;
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

(async function main() {
  console.log('Interactive seeder — masukkan soal manual. Ketik kosong pada pertanyaan untuk keluar.');
  while (true) {
    const question = (await prompt('Question: ')).toString();
    if (!question.trim()) break;

    const options = [];
    for (let i = 0; i < 4; i++) {
      const opt = (await prompt(`Option ${i} : `)).toString();
      options.push(opt);
    }

    const correct = (await prompt('Correct answer index (0-3): ')).toString();
    const correctIdx = Number(correct);

    const theme = (await prompt(`Theme: `)).toString();

    const grade = (await prompt(`Grade (allowed: ${ALLOWED_GRADES.join(',')}): `)).toString();

    const entry = { question, options, correct_answer: correctIdx, theme, grade };

    const v = validateEntry(entry);
    if (v) { console.error('Validation failed:', v); continue; }

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

    if (error) { console.error('Insert error:', error); } else { console.log('Inserted/updated:', (data && data.length) || 1); }
  }
  process.exit(0);
})().catch(err => { console.error(err); process.exit(1); });
