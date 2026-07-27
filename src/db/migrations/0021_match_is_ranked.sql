-- Distinguish ranked ladder matches from friendly challenge/invite matches.
-- Only matchmaking (random ladder) matches should affect ELO — challenge and
-- invite matches are between chosen opponents and are trivially gameable, so
-- they must NOT move the ladder.
--
-- Fail-closed: default FALSE so any match that isn't explicitly created through
-- the matchmaking path (which sets is_ranked = TRUE) leaves ELO untouched.
-- Existing rows are historical (ELO already applied at completion) and are left
-- as unranked; this only governs matches finalized after deploy.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_ranked BOOLEAN NOT NULL DEFAULT FALSE;
