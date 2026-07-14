# AI Brain Feedback — Round 3 Notes

## Slug Reference Corrections

In the v4 delivery, several ability slugs were guessed incorrectly. The canonical source of truth is `src/config/gameData.ts`. Corrected list below — please update any references in aiBrain, defaultData, or smoke tests.

| Unit | Ability | Fable's guess | Correct slug |
|---|---|---|---|
| Fighter | Special | `first_aid` | `second_wind` |
| Rogue | Basic | `twin_strike` | `twin` |
| Ranger | Special | `piercing_shot` | `piercing` |
| Sorcerer | Basic | `arcane_bolt` | `bolt` |
| Wizard | Basic | `ice_blast` | `missile` |

The following were correct: `mace`, `strike`, `whirlwind`, `heal`, `assassinate`, `arrow`, `ffh`, `eldritch`, `fear`, `freeze`, `sword`.

Barbarian and Fighter do **not** share a slug. Barbarian's basic is `strike`; Fighter's basic is `sword`. They happen to share the display name "Strike" in the UI, but the engine treats them as distinct abilities with different definitions.

Going forward: do not guess slugs — derive them from `defaultData.ts` which is always in sync with the live game via `gameData.ts`. If a slug looks ambiguous, flag it rather than guessing.

---

## Integration Bugs Found After Wiring to the Real Engine

These bugs were found when running the delivered aiBrain v4 + simHarness v2 against the actual game engine (`turnProcessor.ts`). All were fixed before the first real sim run.

---

### Bug A: Brain sends MOVE for frozen/dead unit in Round 1 → engine rejects it

**Status: Fixed ✓** (includes V2 dead-unit crash)

**What happened:** 50 validation errors across 100 games. Error: `"Unit is frozen and cannot act"`. A separate V2 bug also caused non-Round-1 crashes when the forced-commit path emitted MOVE for a dead unit.

**Root cause:** In Round 1, the brain committed a frozen or dead unit by sending `[MOVE(unit, samePosition), END_TURN]`. The engine calls `tickUnitStatusEffects(actingUnit)` before processing actions — meaning it ticks the freeze before validating the MOVE. Then `processMove` checks `statusEffects.some(se => se.slug === 'frozen')` (no `turnsRemaining` filter) and throws. For dead units, `processMove` immediately rejects with "Unit is dead."

There is no engine action that can commit a frozen unit in Round 1: MOVE is rejected, USE_ABILITY is rejected, and bare END_TURN triggers "Must commit a unit in round 1." The only path is the harness's force-commit recovery.

**Fix — brain (`aiBrain.ts`):** Frozen units and dead units now both return `[END_TURN]` in the forced-commit path. Dead units are checked first (before frozen) since a dead unit is never frozen. The comment was updated to explain why.

**Fix — harness (`simHarness.ts`):** Added a Round 1 pre-flight check before calling `processTurn`. If all uncommitted units for the active player are frozen or dead, the harness directly appends the unit to `initiative.order` and advances state without going through the engine. This keeps `validationErrors` clean for real brain/engine disagreements.

**For Fable:** The engine's `processMove` / `processCharge` / `processUseAbility` all check `statusEffects.some(se => se.slug === 'frozen')` WITHOUT filtering by `turnsRemaining > 0`. This is fine in Round 2+ because `tickUnitStatusEffects` removes the effect when it hits 0. But in Round 1, the engine ticks before it validates, so a unit with `turnsRemaining: 1` gets its freeze ticked to 0 and then removed — meaning a Round 1 MOVE for a recently-expired freeze would actually work. The edge case is only units that are still genuinely frozen (turnsRemaining > 1 → still frozen after tick). The harness pre-flight is the clean solution.

---

### Bug B: `hasStatus` checked `turnsRemaining > 0` but engine doesn't

**What happened:** Investigated as the initial hypothesis for Bug A, then ruled out. Documented here for clarity.

The brain's `hasStatus` function originally checked `e.turnsRemaining > 0`. The engine's stun checks do not filter by `turnsRemaining`. After `tickUnitStatusEffects` removes expired effects (turnsRemaining hits 0 → effect spliced out), both approaches agree. The difference only matters if the engine were to leave `turnsRemaining: 0` effects in the array — which it does not. The `> 0` guard in the brain was removed anyway for defensive consistency with the engine, but it was not the root cause of Bug A.

---

### Summary for next delivery

- The harness pre-flight (Round 1 forced-commit bypass) is now in `simHarness.ts`. If you regenerate the harness, include this block or the frozen-unit scenario will produce ~0.5 errors per game.
- The brain's forced-commit path (`frozenUnits` / `deadUnits`) should always return `[END_TURN]` — never MOVE — since the engine rejects MOVE for both frozen and dead units in the commitment phase.
- Do not add `turnsRemaining > 0` checks to the engine's freeze validators (lines 264, 283, 295 in `turnProcessor.ts`). The tick-then-validate order means the engine is already correct; the harness pre-flight is the right layer to handle the Round 1 edge case.

---

## Behavioral Issues (V2 → V4/V5 resolution)

All five issues identified in the V2 review were addressed in the v4/v5 delivery. Tests 20–22 in smokeTest.ts cover the three highest-priority items.

| Issue | Priority | Status |
|---|---|---|
| Kiting endgame — corneredDangerSpread fallback | High | Shipped ✓ (v5) |
| Fear: adjacent melee turn-denial — rootTurnDenialFactor model | High | Shipped ✓ (v5, test 20) |
| AoE near-death ally penalty — allyNearDeathThreshold/Factor | Low | Shipped ✓ (v5) |
| Fear push validation — push-blocked scores 0 | Medium | Shipped ✓ (v5) |
| Fear ally-exploitation bonus — rootExploitFactor | Medium | Shipped ✓ (v5) |

Next step: run the sim harness (100+ games) to validate that the behavioral fixes produce expected win-rate and draw-rate changes before trusting the balance numbers.

---

## Status Slug Rename: `stunned` → `frozen` (patch 1.0.04)

The game had two overlapping implementations of the same effect (Wizard's Freeze):

- `'frozen'` — auto-skips the unit's turn in the initiative loop (`turnProcessor.ts` lines 83, 144)
- `'stunned'` — rejects MOVE/CHARGE/USE_ABILITY if the brain tried to act (lines 264, 283, 295)

These were two guards for the same mechanic. The `'stunned'` slug has been removed everywhere and all references unified to `'frozen'`. **Going forward, the only status slug for the freeze/immobilize effect is `'frozen'`.**

### What was updated

- `gameData.ts` — Freeze ability effect `statusSlug: 'stunned'` → `'frozen'`
- `seed.ts` — STATUS_EFFECTS entry renamed
- `turnProcessor.ts` — 3 validation guards now check `'frozen'`; error messages updated to "frozen and cannot act"
- `aiBrain.ts` — `isStunned()` body, scoring checks, variable `stunnedUnits` → `frozenUnits`, comments
- `simHarness.ts` — pre-flight check and Round 1 recovery
- `smokeTest.ts` — test slugs in tests 11, 12, 15; variable `stunnedRogue` → `frozenRogue`
- `tests/turnProcessor.test.ts` and `tests/abilityExecutor.test.ts` — test names, slugs, assertions
- `mobile/app/match/[id].tsx` and `mobile/app/(tabs)/dtest2.tsx` — UI blocked-check and status label
- **DB migration `0014_rename_stunned_to_frozen.sql`** — ran on Railway; updated both `status_effect_definitions` and the freeze ability's effect JSON

All 62 backend tests pass after the rename.

## Methodology rule (added after the Fear/root engine bug, 2026-07)

Balance sims measure the engine AS IMPLEMENTED — both sides share every engine
bug, so win rates cannot detect "data/engine disagrees with the tooltip."
Before tuning stats or AI weights in response to an underutilization finding:
1. Rule out an engine defect first (trace the effect end-to-end in a unit test).
2. tests/specConformance.test.ts must pass — it checks every ability's
   description against its data (damage, durations, ranges, riders).
3. Any "quirk" discovered in engine semantics gets a failing test + a fix, not
   an AI model workaround. (The brain modeling the old tick-first quirk is how
   a broken root became load-bearing.)
