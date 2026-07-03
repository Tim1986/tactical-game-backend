-- Add PvE support: is_pve flag on matches, Fable bot user

-- Fable bot user (fixed UUID, never authenticates)
INSERT INTO users (id, username, email, password_hash, elo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Fable',
  'fable@dungeoncombat.game',
  'bot-account-no-password',
  1200
)
ON CONFLICT (id) DO NOTHING;

-- PvE flag on matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_pve BOOLEAN NOT NULL DEFAULT FALSE;
