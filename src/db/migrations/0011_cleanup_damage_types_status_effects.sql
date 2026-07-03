-- Remove phantom status effects (only stunned and rooted are real mechanics)
DELETE FROM status_effect_definitions
WHERE slug IN ('burning', 'poisoned', 'regenerating', 'weakened', 'shielded');

-- Update status effect descriptions to match current mechanics
UPDATE status_effect_definitions SET description = 'Cannot move, charge, or use abilities.' WHERE slug = 'stunned';
UPDATE status_effect_definitions SET description = 'Cannot move or charge; can still use abilities.' WHERE slug = 'rooted';

-- Twin Strike: two separate hit rolls of 10 each (was one effect of 20)
UPDATE ability_definitions
SET effects = '[{"type":"damage","formula":"flat","value":10},{"type":"damage","formula":"flat","value":10}]'::jsonb
WHERE slug = 'twin';

-- Update Heal to 25 HP
UPDATE ability_definitions
SET description = 'Restores 25 HP to an adjacent ally.',
    effects = '[{"type": "heal", "formula": "flat", "value": 25}]'::jsonb
WHERE slug = 'heal';

-- Strip damageType from all ability effect JSON (PostgreSQL jsonb array manipulation)
UPDATE ability_definitions
SET effects = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'type' = 'damage' THEN elem - 'damageType'
      ELSE elem
    END
  )
  FROM jsonb_array_elements(effects) AS elem
)
WHERE effects IS NOT NULL
  AND effects @> '[{"type": "damage"}]'::jsonb;
