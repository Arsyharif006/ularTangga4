-- Create redeem code tables for in-app reward redemption
CREATE TABLE IF NOT EXISTS redeem_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  reward_type TEXT NOT NULL DEFAULT 'coins',
  reward_value INTEGER NOT NULL DEFAULT 0,
  reward_meta TEXT[] DEFAULT ARRAY[]::TEXT[],
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redeem_redemptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  code TEXT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'coins',
  reward_value INTEGER NOT NULL DEFAULT 0,
  reward_meta TEXT[] DEFAULT ARRAY[]::TEXT[],
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, code)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_redeem_redemptions_user_code
  ON redeem_redemptions (user_id, code);

ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE redeem_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_public_redeem_codes ON redeem_codes;
CREATE POLICY allow_public_redeem_codes ON redeem_codes
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS allow_public_redeem_redemptions ON redeem_redemptions;
CREATE POLICY allow_public_redeem_redemptions ON redeem_redemptions
  FOR ALL USING (true) WITH CHECK (true);

INSERT INTO redeem_codes (code, reward_type, reward_value, reward_meta, description, active)
VALUES
  ('BETA', 'coins', 15, ARRAY[]::TEXT[], 'Kode beta dari developer untuk 15 koin gratis.', TRUE),
  ('ALLMAPS', 'boards', 0, ARRAY['classic','winter','forest','lava','space'], 'Buka semua peta.', TRUE),
  ('AVATARX', 'avatars', 0, ARRAY['🦄','🦋','🌟','👑'], 'Buka avatar limited.', TRUE)
ON CONFLICT (code) DO NOTHING;
