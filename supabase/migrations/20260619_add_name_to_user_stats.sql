-- Add `name` column to user_stats and populate from game_players when possible

ALTER TABLE IF EXISTS user_stats ADD COLUMN IF NOT EXISTS name TEXT;

-- Populate existing user_stats.name from any matching game_players records (take most recent name per player_id)
WITH latest_names AS (
  SELECT DISTINCT ON (player_id) player_id, name
  FROM game_players
  ORDER BY player_id, created_at DESC
)
UPDATE user_stats
SET name = latest_names.name
FROM latest_names
WHERE user_stats.user_id = latest_names.player_id
  AND (user_stats.name IS NULL OR user_stats.name = '');
