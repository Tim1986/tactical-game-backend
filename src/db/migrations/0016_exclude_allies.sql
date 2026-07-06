-- AOE abilities: whether allies are excluded from the blast (e.g. Roar).
-- Default false — existing AOEs (Whirlwind, Firestorm, Piercing Shot, Shockwave,
-- Blizzard) keep hitting allies unchanged.
ALTER TABLE ability_definitions
  ADD COLUMN IF NOT EXISTS exclude_allies BOOLEAN NOT NULL DEFAULT false;
