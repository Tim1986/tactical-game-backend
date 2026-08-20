-- Puzzle star scoring + Wordle-style lifetime stats (server-side).
--
-- One row per (user, puzzle). This is the AUTHORITATIVE record; the client keeps
-- a local mirror so puzzles stay fully playable offline, and syncs when it can.
-- Every displayed statistic (played, win %, current/max streak, the solve
-- distribution) is DERIVED from this table by aggregation — nothing is
-- denormalised, so a bad sync can never leave a counter permanently wrong.
--
-- Scoring recap (see mobile/PUZZLES_AND_INVITES.md "Star scoring"): five stars
-- for a first-attempt solve, one fewer per attempt after, floored at one.
CREATE TABLE IF NOT EXISTS puzzle_solves (
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Engine puzzle id ('puzzle-017'), NOT a FK: puzzles are code-defined content
  -- that ships with the app, and a retired puzzle must not orphan a player's
  -- score or break their distribution.
  puzzle_id         TEXT NOT NULL,

  -- Attempts ever made at this puzzle. Keeps climbing on replays, so it is NOT
  -- the number to display next to the stars (see solved_on_attempt).
  attempts          INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  -- The attempt that earned `stars`. NULL until solved. Displaying `attempts`
  -- instead produces "solved in 6 attempts / 4 stars", which contradicts itself.
  solved_on_attempt INTEGER CHECK (solved_on_attempt IS NULL OR solved_on_attempt >= 1),
  -- Best (highest) score ever earned. NULL until solved. Never decreases.
  stars             INTEGER CHECK (stars IS NULL OR (stars BETWEEN 1 AND 5)),
  solved_at         TIMESTAMPTZ,

  -- The UTC calendar day this puzzle was the FEATURED daily, set only when the
  -- solve happened on that day. Drives the streak; NULL for a shared-link or
  -- back-catalogue solve, which must never advance a daily streak.
  daily_date        DATE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, puzzle_id),

  -- A solve is all-or-nothing: these three travel together or not at all.
  -- Guards against a partial sync writing stars with no solve date, which would
  -- corrupt win % (a "win" with no solve) for the rest of the account's life.
  CONSTRAINT puzzle_solves_solved_consistent CHECK (
    (solved_at IS NULL AND stars IS NULL AND solved_on_attempt IS NULL)
    OR (solved_at IS NOT NULL AND stars IS NOT NULL AND solved_on_attempt IS NOT NULL)
  )
);

-- Every stats read is "this user's rows"; the partial index serves the streak
-- query, which only ever looks at rows carrying a daily_date.
CREATE INDEX IF NOT EXISTS idx_puzzle_solves_user ON puzzle_solves(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_solves_user_daily
  ON puzzle_solves(user_id, daily_date DESC) WHERE daily_date IS NOT NULL;
