-- Multi-hit abilities: each damage effect rolls the fortune meter independently.
-- Default false — all existing abilities keep their single shared hit roll.
ALTER TABLE ability_definitions
  ADD COLUMN IF NOT EXISTS is_multi_hit BOOLEAN NOT NULL DEFAULT false;
