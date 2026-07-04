-- Fix ability damage values to match source of truth in src/config/gameData.ts.
-- Warlock Demon Blast: was 9, correct value is 12.
-- Sorcerer Arcane Bolt: was 10, correct value is 8.

UPDATE ability_definitions
SET
  effects     = '[{"type":"damage","formula":"flat","value":12}]',
  description = 'Deals 12 unblockable damage from up to 4 tiles away.'
WHERE slug = 'eldritch';

UPDATE ability_definitions
SET
  effects     = '[{"type":"damage","formula":"flat","value":8}]',
  description = 'Deals 8 damage from up to 5 tiles away.'
WHERE slug = 'bolt';
