-- Store the events from the most recent turn so the opponent can see
-- what happened when they poll or open the match screen.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS last_turn_events JSONB NOT NULL DEFAULT '[]';
