-- Migration 0005: Achievements

CREATE TABLE achievement_definitions (
  slug        TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL,
  icon_key    TEXT    NOT NULL DEFAULT '',
  condition   JSONB   NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE user_achievements (
  user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_slug TEXT        NOT NULL REFERENCES achievement_definitions(slug),
  unlocked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_slug)
);

CREATE INDEX idx_user_achievements_user ON user_achievements (user_id);
