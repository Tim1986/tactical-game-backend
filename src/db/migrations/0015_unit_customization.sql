-- Unit definitions: available special and passive options for player customization.
-- special_options: array of ability slugs the player can choose their special from.
-- passive_options: array of {slug, name, description, stat, value} objects.
ALTER TABLE unit_definitions
  ADD COLUMN IF NOT EXISTS special_options JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS passive_options  JSONB NOT NULL DEFAULT '[]';

-- Teams: per-slot customization choices.
-- Array of 4 objects: { specialSlug: string, passiveSlug: string }
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS unit_customizations JSONB NOT NULL DEFAULT '[]';
