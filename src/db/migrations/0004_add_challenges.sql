-- Challenges table for async direct match invitations
CREATE TABLE IF NOT EXISTS challenges (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenger_username TEXT NOT NULL,
  opponent_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_username   TEXT NOT NULL,
  challenger_team_id  UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  match_id            UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours')
);

CREATE INDEX IF NOT EXISTS idx_challenges_opponent ON challenges(opponent_id, status);
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id, status);
