-- Password reset codes: one active code per user, hashed like a password.
-- A new request replaces any existing code (upsert on user_id).
CREATE TABLE IF NOT EXISTS password_reset_codes (
  user_id     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
