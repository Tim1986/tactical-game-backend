-- Daily-solve SET, replacing puzzle_solves.daily_date (owner bug report,
-- 2026-08-22: "if you redo a puzzle you completed correctly the first time,
-- you should not lose your consecutive puzzle streak").
--
-- THE BUG. `puzzle_solves.daily_date` is ONE date per (user, puzzle), but the
-- daily rotation repeats every PUZZLE_ROTATION.length days (getDailyPuzzle
-- takes dayIndex % n), so a single puzzle is the featured daily many times over
-- an account's life. The column could only ever remember the FIRST of those.
-- Both the client and the server guarded the write with "only if not already
-- set", so when the rotation came round again the player solved that day's
-- daily and got NO credit for the day — their streak broke through no fault of
-- their own. One column cannot represent a set of days.
--
-- THE FIX. Days live in their own table, one row per (user, day). Inserts are
-- ON CONFLICT DO NOTHING, so replaying a puzzle can only ever ADD a day and can
-- never remove one — which is what makes a replay safe for streaks in the same
-- way it is already safe for stars.
--
-- puzzle_id is carried for forensics only ("which puzzle was the daily that
-- day"); it is deliberately NOT part of the key, because the streak is a
-- property of the DAY, not of the puzzle.
CREATE TABLE IF NOT EXISTS puzzle_daily_solves (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_date DATE NOT NULL,
  puzzle_id  TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, daily_date)
);

-- The streak query is "this user's days, newest first".
CREATE INDEX IF NOT EXISTS idx_puzzle_daily_solves_user
  ON puzzle_daily_solves(user_id, daily_date DESC);

-- Carry across whatever the old single column did manage to record, so this
-- migration is not itself a streak reset for anyone who skips the wipe below.
INSERT INTO puzzle_daily_solves (user_id, daily_date, puzzle_id)
SELECT user_id, daily_date, puzzle_id
  FROM puzzle_solves
 WHERE daily_date IS NOT NULL
ON CONFLICT (user_id, daily_date) DO NOTHING;

-- ── FULL PUZZLE STATS RESET (owner directive, 2026-08-22) ───────────────────
-- A clean slate for the build that ships the ring rebalance and the repaired
-- puzzles #26/#40. Two of the rotation's puzzles changed shape, so existing
-- star scores were earned against content that no longer exists; and the streak
-- data above was accumulated under the bug this migration fixes. Wiping both is
-- the honest option. The client wipes itself via SLATE_RESET_KEY 'v3'.
DELETE FROM puzzle_daily_solves;
DELETE FROM puzzle_solves;
