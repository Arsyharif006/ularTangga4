const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizeQuestion(q) {
  return q
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALLOWED_GRADES = ['sd','smp','sma_smk'];

function validateEntry(e) {
  if (!e.question || !Array.isArray(e.options) || e.options.length !== 4) return 'invalid options';
  if (typeof e.correct_answer !== 'number' || e.correct_answer < 0 || e.correct_answer > 3) return 'invalid correct_answer';
  if (!e.theme || typeof e.theme !== 'string') return 'invalid theme';
  if (!e.grade || typeof e.grade !== 'string' || !ALLOWED_GRADES.includes(e.grade)) return `invalid grade (allowed: ${ALLOWED_GRADES.join(',')})`;
  return null;
}

async function seed(entries) {
  const formatted = entries.map(e => ({
    question: e.question,
    question_normalized: normalizeQuestion(e.question),
    options: e.options,
    correct_answer: e.correct_answer,
    theme: e.theme,
    grade: e.grade,
  }));

  const { data, error } = await supabase
    .from('ai_questions')
    .upsert(formatted, { onConflict: 'question_normalized' });

  if (error) {
    console.error('Insert error:', error);
    process.exit(1);
  }

  const insertedCount = Array.isArray(data) ? data.length : (data ? 1 : 0);
  console.log('Upserted', insertedCount, 'rows.');
}

async function main() {
  const arg = process.argv[2];
  let entries = [];

  if (arg) {
    const raw = fs.readFileSync(arg, 'utf-8');
    entries = JSON.parse(raw);
  } else {
    // Simple example entry
    entries = [
      {
        question: 'Apa ibukota Indonesia?',
        options: ['Jakarta', 'Bandung', 'Surabaya', 'Medan'],
        correct_answer: 0,
        theme: 'general',
        grade: 'sd'
      },
      {
        question: 'Berapakah 7 x 8?',
        options: ['54', '56', '58', '64'],
        correct_answer: 1,
        theme: 'matematika',
        grade: 'smp'
      }
    ];
  }

  // validate
  // normalize if file contains a single array wrapper (e.g. [[...]] )
  if (Array.isArray(entries) && entries.length === 1 && Array.isArray(entries[0])) {
    entries = entries[0];
  }

  if (!Array.isArray(entries)) {
    console.error('Expected JSON array of entries.');
    process.exit(1);
  }

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const v = validateEntry(e);
    if (v) {
      console.error(`Validation failed for entry #${i}:`, e, 'reason:', v);
      process.exit(1);
    }
  }

  await seed(entries);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
