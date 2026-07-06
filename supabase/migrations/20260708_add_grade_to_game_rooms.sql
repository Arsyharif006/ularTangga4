-- Add 'grade' column to game_rooms table to store tingkat (sd/smp/sma_smk)
ALTER TABLE IF EXISTS game_rooms
  ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'smp' CHECK (grade IN ('sd','smp','sma_smk'));

-- Drop old theme constraint and add new one with all current subject options
ALTER TABLE IF EXISTS game_rooms
  DROP CONSTRAINT IF EXISTS game_rooms_theme_check;

ALTER TABLE IF EXISTS game_rooms
  ADD CONSTRAINT game_rooms_theme_check CHECK(theme IN (
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

-- Add 'seat_index' column to game_players if it doesn't exist (for player seating order)
ALTER TABLE IF EXISTS game_players
  ADD COLUMN IF NOT EXISTS seat_index INT;
