-- Drop old event_type constraint if exists
ALTER TABLE game_events DROP CONSTRAINT IF EXISTS game_events_event_type_check;

-- Create/replace constraint with additional event types
ALTER TABLE game_events ADD CONSTRAINT game_events_event_type_check 
  CHECK(event_type IN (
    'dice_rolled',
    'move_made', 
    'question_answered',
    'game_started',
    'turn_changed',
    'question_started',
    'question_finished',
    'game_finished',
    'player_left'
  ));

-- Create tables if they do not exist
CREATE TABLE IF NOT EXISTS game_rooms (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id TEXT UNIQUE NOT NULL,
  room_name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  password TEXT,
  theme TEXT DEFAULT 'general' CHECK(theme IN ('general', 'programming', 'sistem_digital', 'logika_mtk', 'matematika', 'english', 'history')),
  status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'playing', 'finished')),
  current_turn_player_id TEXT,
  max_players INT DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id TEXT NOT NULL REFERENCES game_rooms(room_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL CHECK(color IN ('red', 'blue', 'green', 'yellow')),
  position INT DEFAULT 1,
  previous_position INT DEFAULT 1,
  inventory JSONB DEFAULT '[]',
  correct_streak INT DEFAULT 0,
  total_correct INT DEFAULT 0,
  total_wrong INT DEFAULT 0,
  skip_next_turn BOOLEAN DEFAULT FALSE,
  has_finished BOOLEAN DEFAULT FALSE,
  used_skill_this_turn JSONB DEFAULT '[]',
  device_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_heartbeat BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

CREATE TABLE IF NOT EXISTS game_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  room_id TEXT NOT NULL REFERENCES game_rooms(room_id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('dice_rolled', 'move_made', 'question_answered', 'game_started', 'turn_changed', 'question_started', 'question_finished', 'game_finished')),
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User stats for leaderboard (online accounts only)
CREATE TABLE IF NOT EXISTS user_stats (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  wins INT DEFAULT 0,
  games INT DEFAULT 0,
  win_rate NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_id ON game_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_created_at ON game_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_game_players_room_id ON game_players(room_id);
CREATE INDEX IF NOT EXISTS idx_game_events_room_id ON game_events(room_id);
CREATE INDEX IF NOT EXISTS idx_game_events_created_at ON game_events(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS game_events ENABLE ROW LEVEL SECURITY;

-- Development policies (allow public) — adjust for production
-- Create permissive dev policies (use DROP then CREATE to be idempotent)
DROP POLICY IF EXISTS allow_public_game_rooms ON game_rooms;
CREATE POLICY allow_public_game_rooms ON game_rooms FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_public_game_players ON game_players;
CREATE POLICY allow_public_game_players ON game_players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_public_game_events ON game_events;
CREATE POLICY allow_public_game_events ON game_events FOR ALL USING (true) WITH CHECK (true);

-- Ensure only one 'game_finished' event per room: partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS ux_game_finished_per_room ON game_events(room_id) WHERE event_type = 'game_finished';

-- Trigger function to update `user_stats` when a room finishes
CREATE OR REPLACE FUNCTION public.handle_game_finished_event()
RETURNS trigger AS $$
DECLARE
  winner_text TEXT;
  p RECORD;
BEGIN
  IF NEW.event_type IS DISTINCT FROM 'game_finished' THEN
    RETURN NEW;
  END IF;

  -- extract winner id from event_data
  IF NEW.event_data IS NOT NULL THEN
    winner_text := COALESCE(NEW.event_data->>'winnerId', NEW.event_data->>'winner');
  END IF;

  IF winner_text IS NULL THEN
    RETURN NEW;
  END IF;

  -- For each player in the room, update/insert user_stats for authenticated users
  FOR p IN SELECT player_id FROM game_players WHERE room_id = NEW.room_id LOOP
    IF p.player_id NOT LIKE 'player_%' THEN
      IF p.player_id = winner_text THEN
        INSERT INTO user_stats (user_id, email, wins, games, win_rate, updated_at)
        VALUES (p.player_id, NULL, 1, 1, 100.00, now())
        ON CONFLICT (user_id) DO UPDATE SET
          wins = user_stats.wins + 1,
          games = user_stats.games + 1,
          win_rate = ROUND(((user_stats.wins + 1)::numeric/(user_stats.games + 1)::numeric)*100,2),
          updated_at = now();
      ELSE
        INSERT INTO user_stats (user_id, email, wins, games, win_rate, updated_at)
        VALUES (p.player_id, NULL, 0, 1, 0.00, now())
        ON CONFLICT (user_id) DO UPDATE SET
          games = user_stats.games + 1,
          win_rate = ROUND((user_stats.wins::numeric/(user_stats.games + 1)::numeric)*100,2),
          updated_at = now();
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to invoke the handler after inserting a game_finished event
DROP TRIGGER IF EXISTS trg_handle_game_finished_event ON game_events;
CREATE TRIGGER trg_handle_game_finished_event
AFTER INSERT ON game_events
FOR EACH ROW
WHEN (NEW.event_type = 'game_finished')
EXECUTE FUNCTION public.handle_game_finished_event();
