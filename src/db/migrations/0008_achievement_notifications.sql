-- Track whether the client has been shown an achievement banner yet.
-- NULL = not yet shown. Set to NOW() when drained by GET /achievements/pending.
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ NULL;
