-- Add username and avatar columns to user_stats

ALTER TABLE IF EXISTS user_stats ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE IF EXISTS user_stats ADD COLUMN IF NOT EXISTS avatar TEXT;

-- Unique index for username (only enforce uniqueness for non-null usernames)
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_stats_username ON user_stats(username) WHERE username IS NOT NULL;

-- Ensure username length does not exceed 15 characters
ALTER TABLE IF EXISTS user_stats DROP CONSTRAINT IF EXISTS user_stats_username_length_check;
ALTER TABLE IF EXISTS user_stats ADD CONSTRAINT user_stats_username_length_check CHECK (username IS NULL OR char_length(username) <= 15);

-- Populate username from existing name where available
UPDATE user_stats
SET username = name
WHERE (username IS NULL OR username = '')
  AND (name IS NOT NULL AND name <> '');

-- Populate default avatar for existing rows
UPDATE user_stats
SET avatar = '🎮'
WHERE avatar IS NULL;

-- Enable RLS for user_stats and add permissive dev policy (adjust for production)
ALTER TABLE IF EXISTS user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_public_user_stats ON user_stats;
CREATE POLICY allow_public_user_stats ON user_stats FOR ALL USING (true) WITH CHECK (true);
