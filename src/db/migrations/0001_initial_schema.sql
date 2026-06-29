-- =============================================================
-- Migration 0001: Initial Schema
-- =============================================================
-- Creates all tables required for Phase 1 MVP.
-- Uses UUIDs for all primary keys.
-- JSONB for flexible data (abilities, passives, match state, etc.)
-- =============================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------------
-- USERS
-- -------------------------------------------------------------
CREATE TABLE users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username        TEXT        NOT NULL UNIQUE,
  email           TEXT        NOT NULL UNIQUE,
  password_hash   TEXT        NOT NULL,
  elo             INTEGER     NOT NULL DEFAULT 1200,
  account_xp      INTEGER     NOT NULL DEFAULT 0,
  account_level   INTEGER     NOT NULL DEFAULT 1,

  -- token_version incremented on password change / explicit logout-all
  -- so old refresh tokens become invalid.
  token_version   INTEGER     NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email    ON users (email);
CREATE INDEX idx_users_elo      ON users (elo);

-- -------------------------------------------------------------
-- PUSH TOKENS
-- -------------------------------------------------------------
CREATE TABLE push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL,
  platform    TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens (user_id);
-- A user may have multiple devices but not the same token twice
CREATE UNIQUE INDEX idx_push_tokens_token ON push_tokens (token);

-- -------------------------------------------------------------
-- ABILITY DEFINITIONS
-- All ability logic is data-driven. The executor reads these rows.
-- -------------------------------------------------------------
CREATE TABLE ability_definitions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  targeting_type  TEXT    NOT NULL CHECK (targeting_type IN ('single','aoe','self','line','cone')),
  range           INTEGER NOT NULL DEFAULT 1,
  area_radius     INTEGER NOT NULL DEFAULT 0,
  cooldown_turns  INTEGER NOT NULL DEFAULT 0,
  effects         JSONB   NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_ability_definitions_slug ON ability_definitions (slug);

-- -------------------------------------------------------------
-- STATUS EFFECT DEFINITIONS
-- All status effects are data-driven.
-- -------------------------------------------------------------
CREATE TABLE status_effect_definitions (
  slug         TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  description  TEXT    NOT NULL DEFAULT '',
  trigger      TEXT    NOT NULL CHECK (trigger IN ('on_turn_start','on_turn_end','on_hit','on_death')),
  effect       JSONB   NOT NULL,
  is_stackable BOOLEAN NOT NULL DEFAULT FALSE,
  max_stacks   INTEGER NOT NULL DEFAULT 1
);

-- -------------------------------------------------------------
-- UNIT DEFINITIONS
-- -------------------------------------------------------------
CREATE TABLE unit_definitions (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  max_health      INTEGER NOT NULL,
  movement_range  INTEGER NOT NULL,
  -- Arrays of ability/passive slugs, ordered (first = primary, etc.)
  abilities       JSONB   NOT NULL DEFAULT '[]',
  passives        JSONB   NOT NULL DEFAULT '[]',
  unlock_level    INTEGER NOT NULL DEFAULT 1,
  asset_key       TEXT    NOT NULL DEFAULT '',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_unit_definitions_slug ON unit_definitions (slug);

-- -------------------------------------------------------------
-- TEAMS
-- Exactly 4 unit definition IDs per team (enforced in application layer).
-- -------------------------------------------------------------
CREATE TABLE teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  -- Stored as a JSON array of exactly 4 unit_definition UUIDs
  unit_ids    JSONB       NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_user_id ON teams (user_id);

-- -------------------------------------------------------------
-- MATCHES
-- match_state holds the full authoritative game state as JSONB.
-- -------------------------------------------------------------
CREATE TABLE matches (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_one_id     UUID        NOT NULL REFERENCES users(id),
  player_two_id     UUID        NOT NULL REFERENCES users(id),
  player_one_team   UUID        NOT NULL REFERENCES teams(id),
  player_two_team   UUID        NOT NULL REFERENCES teams(id),
  status            TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','completed','abandoned')),
  active_player_id  UUID        NOT NULL REFERENCES users(id),
  turn_number       INTEGER     NOT NULL DEFAULT 1,
  turn_deadline     TIMESTAMPTZ,
  winner_id         UUID        REFERENCES users(id),
  match_state       JSONB       NOT NULL DEFAULT '{}',
  elo_delta_p1      INTEGER,
  elo_delta_p2      INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX idx_matches_player_one    ON matches (player_one_id);
CREATE INDEX idx_matches_player_two    ON matches (player_two_id);
CREATE INDEX idx_matches_status        ON matches (status);
CREATE INDEX idx_matches_active_player ON matches (active_player_id);

-- -------------------------------------------------------------
-- TURN HISTORY
-- One row per submitted turn. Enables replays and debugging.
-- -------------------------------------------------------------
CREATE TABLE turn_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID        NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id       UUID        NOT NULL REFERENCES users(id),
  turn_number     INTEGER     NOT NULL,
  actions         JSONB       NOT NULL,
  state_snapshot  JSONB       NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, turn_number)
);

CREATE INDEX idx_turn_history_match_id ON turn_history (match_id);

-- -------------------------------------------------------------
-- MATCHMAKING QUEUE
-- Only one entry per user allowed at a time.
-- -------------------------------------------------------------
CREATE TABLE matchmaking_queue (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  team_id          UUID        NOT NULL REFERENCES teams(id),
  elo              INTEGER     NOT NULL,
  elo_search_range INTEGER     NOT NULL DEFAULT 100,
  entered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matchmaking_queue_elo ON matchmaking_queue (elo);

-- -------------------------------------------------------------
-- COSMETICS (schema only — content added in later phase)
-- -------------------------------------------------------------
CREATE TABLE cosmetics (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT    NOT NULL UNIQUE,
  type             TEXT    NOT NULL CHECK (type IN ('skin','emote','arena','profile')),
  unlock_condition JSONB   NOT NULL DEFAULT '{}'
);

CREATE TABLE user_cosmetics (
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id   UUID        NOT NULL REFERENCES cosmetics(id) ON DELETE CASCADE,
  acquired_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);
