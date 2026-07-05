-- Add AI-generated questions table and update game_rooms theme constraint

ALTER TABLE IF EXISTS game_rooms DROP CONSTRAINT IF EXISTS game_rooms_theme_check;
ALTER TABLE IF EXISTS game_rooms ADD CONSTRAINT game_rooms_theme_check CHECK(theme IN (
  'sd',
  'smp',
  'sma_smk',
  'general',
  'programming',
  'sistem_digital',
  'logika_mtk',
  'matematika',
  'english',
  'history',
  'bahasa_indonesia',
  'ipa',
  'ips',
  'ppkn',
  'fisika',
  'kimia',
  'broadcasting',
  'informatika',
  'tkj',
  'desain_grafis'
));

CREATE TABLE IF NOT EXISTS ai_questions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  question TEXT NOT NULL,
  question_normalized TEXT NOT NULL UNIQUE,
  options JSONB NOT NULL,
  correct_answer INT NOT NULL CHECK(correct_answer IN (0, 1, 2, 3)),
  theme TEXT NOT NULL CHECK(theme IN (
    'sd',
    'smp',
    'sma_smk',
    'general',
    'programming',
    'sistem_digital',
    'logika_mtk',
    'matematika',
    'english',
    'history',
    'bahasa_indonesia',
    'ipa',
    'ips',
    'ppkn',
    'fisika',
    'kimia',
    'broadcasting',
    'informatika',
    'tkj',
    'desain_grafis'
  )),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_questions_theme ON ai_questions(theme);
CREATE INDEX IF NOT EXISTS idx_ai_questions_created_at ON ai_questions(created_at);
