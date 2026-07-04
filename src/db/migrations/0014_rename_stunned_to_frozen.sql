-- Rename the 'stunned' status effect to 'frozen' — unified name for the Wizard's Freeze mechanic
UPDATE status_effect_definitions SET slug = 'frozen', name = 'Frozen' WHERE slug = 'stunned';

-- Update the freeze ability to use the renamed status slug
UPDATE ability_definitions
SET effects = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'type' = 'apply_status' AND elem->>'statusSlug' = 'stunned'
        THEN jsonb_set(elem, '{statusSlug}', '"frozen"')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(effects) AS elem
)
WHERE effects IS NOT NULL
  AND effects @> '[{"statusSlug": "stunned"}]'::jsonb;
