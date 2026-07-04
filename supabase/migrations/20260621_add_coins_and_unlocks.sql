-- Add coins and unlocked item columns to user_stats

ALTER TABLE IF EXISTS user_stats ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0;

-- Store unlocked avatars (array of emoji strings) and unlocked boards (array of board names)
ALTER TABLE IF EXISTS user_stats ADD COLUMN IF NOT EXISTS unlocked_avatars text[] DEFAULT ARRAY['🐶','🐱','🐭','🐹','🐰','🦊'];
ALTER TABLE IF EXISTS user_stats ADD COLUMN IF NOT EXISTS unlocked_boards text[] DEFAULT ARRAY['classic','winter'];

-- Ensure coins is non-negative
ALTER TABLE IF EXISTS user_stats DROP CONSTRAINT IF EXISTS user_stats_coins_nonnegative;
ALTER TABLE IF EXISTS user_stats ADD CONSTRAINT user_stats_coins_nonnegative CHECK (coins >= 0);

-- Keep RLS policy permissive for now (adjust for production)
DROP POLICY IF EXISTS allow_public_user_stats ON user_stats;
CREATE POLICY allow_public_user_stats ON user_stats FOR ALL USING (true) WITH CHECK (true);
