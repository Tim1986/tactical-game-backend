-- Daily leaderboard snapshot table
-- Populated by a scheduled job once per day; top 10 by ELO at snapshot time.
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id          SERIAL PRIMARY KEY,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rank        INTEGER NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  elo         INTEGER NOT NULL,
  win_count   INTEGER NOT NULL DEFAULT 0,
  match_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_snapshotted ON leaderboard_snapshots (snapshotted_at DESC);
