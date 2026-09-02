# SEALEDDEEP_DESIGN_PASS.md — addendum to SEALEDDEEP_BALANCE_NOTES.md (2026-09-01)

Design spec: CAMPAIGN_DESIGN_SPECS.md §5 (ATTRITION & THE UNSEEN — and THE
SONG). The August certification predates BR3 (enemy press), A3 (specials
scaling) and DOOR1; today's baseline @ medium: e2 48/43/32 (too hard), e3
ranged 35, e7 melee/balanced 30 ("your hero has fallen"), e8 melee 32 (crew
dies), e10 melee 18, e11 ranged 33, e12 melee 42 / ranged 52. All archetype
walls — spread sweeps first in the balance phase.

## Design pass — applied (smoke PASS)
ENGINE (small, additive, ABL-16 + rulebook check + brain scoring):
`modify_cooldown` with `abilitySlug: '*'` sets back every special the target
has, never the basic, never below zero. New WEIGHTS.cooldownDenial = 9.
A6: `counting_song` (cultists + necromancer: aoe, specials +1) and `crescendo`
(the Conductor: single r4, 8 dmg + specials +2). Nobody else touches your
cooldowns — this is the campaign's verb.
Levers: e5 clock 7/8/8/9; e6 song 14/13/12/11; e7 stair 8/7/7/6; e2 easy one
archer; e4 easy has no singer.
