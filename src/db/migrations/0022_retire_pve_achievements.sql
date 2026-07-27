-- Retire the three dead pve_difficulty_clear arena achievements.
-- These can never unlock (evaluator returns false, campaigns are local-only),
-- so they show as permanently-locked clutter on the achievements list.
-- Remove any user rows first to satisfy the FK, then remove the definitions.
DELETE FROM user_achievements WHERE achievement_slug IN ('pve_easy', 'pve_hard', 'pve_nightmare');
DELETE FROM achievement_definitions WHERE slug IN ('pve_easy', 'pve_hard', 'pve_nightmare');
