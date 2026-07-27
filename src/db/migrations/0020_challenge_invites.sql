CREATE TABLE IF NOT EXISTS challenge_invites (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token         TEXT NOT NULL UNIQUE,
  challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenger_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'expired')),
  claimed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  match_id      UUID REFERENCES matches(id) ON DELETE SET NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_invites_token ON challenge_invites(token);
CREATE INDEX IF NOT EXISTS idx_challenge_invites_challenger ON challenge_invites(challenger_id);
