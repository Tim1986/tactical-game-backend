CREATE TABLE IF NOT EXISTS match_analytics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id),
  winner_id       UUID REFERENCES users(id),
  loser_id        UUID REFERENCES users(id),
  p1_id           UUID NOT NULL REFERENCES users(id),
  p2_id           UUID NOT NULL REFERENCES users(id),
  p1_comp         TEXT[] NOT NULL,
  p2_comp         TEXT[] NOT NULL,
  winner_comp     TEXT[],
  loser_comp      TEXT[],
  turn_count      INTEGER NOT NULL,
  duration_seconds INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_analytics_winner_comp ON match_analytics USING GIN (winner_comp);
CREATE INDEX idx_match_analytics_loser_comp  ON match_analytics USING GIN (loser_comp);
CREATE INDEX idx_match_analytics_created_at  ON match_analytics (created_at);
