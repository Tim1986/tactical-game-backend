# AI Brain Feedback — Round 2 Review

This document covers one new crash bug found through simulation, one unresolved structural issue from Round 1, one partially-resolved bug from Round 1, and one behavioral observation about status-based ability usage. All references are to the current `aiBrain.ts` and `simHarness.ts`.

---

## Status of Round 1 Issues

| Issue | Status |
|---|---|
| Bug 1: AoE friendly fire | Partial — see updated notes below |
| Bug 2: Redundant debuffs (rooted on stunned) | Fixed ✓ |
| Structural 1: Kiting endgame | Not fixed |
| Structural 2: approachHpBias in-range penalty | Fixed ✓ |

---

## New Bug — Dead Unit Forced-Commit Crash

### What was observed

During simulation runs, the harness crashed with `TurnValidationError: Unit is dead` originating from `processMove`. This happened in non-Round-1 turns — meaning the harness's Round 1 recovery block never triggered, and the error propagated up and terminated the match.

### Why it happens

In `OptimalBrain.selectActions`, the Round 1 forced-commit path handles the case where all remaining uncommitted units are either stunned or dead:

```typescript
const stunnedUnits = uncommitted.filter((u) => u.isAlive && isStunned(u));
const deadUnits    = uncommitted.filter((u) => !u.isAlive);
const forced = stunnedUnits.length > 0 ? stunnedUnits : deadUnits;
if (forced.length > 0) {
  const pick = forced[0];
  return [{ type: 'MOVE', unitInstanceId: pick.instanceId, destination: pick.position }, { type: 'END_TURN' }];
}
```

When `pick` is a dead unit, the brain emits a MOVE action for it. The engine's `processMove` immediately rejects this with "Unit is dead." The simHarness catches `TurnValidationError` only when `state.initiative.isRound1 === true`, so if a dead unit somehow ends up in this path during or near the Round 1→2 transition the error propagates uncaught.

### Fix

Guard the dead-unit case before emitting MOVE:

```typescript
if (forced.length > 0) {
  const pick = forced[0];
  if (!pick.isAlive) return [{ type: 'END_TURN' }];
  return [{ type: 'MOVE', unitInstanceId: pick.instanceId, destination: pick.position }, { type: 'END_TURN' }];
}
```

Dead units cannot move. Returning `END_TURN` lets the simHarness's Round 1 recovery block force-commit the unit by position in the order, which is the correct behavior.

Additionally, the simHarness itself should be hardened to handle any non-Round-1 `TurnValidationError` gracefully (advance initiative to the next alive unit and continue) rather than crashing the match. This prevents a single bad action from terminating a simulation.

---

## Unresolved Structural Issue — Ranged Unit Retreats When It Should Fight

This was Structural Issue 1 from Round 1. It was not addressed in v2. Simulation data confirms it is still occurring: games involving a lone ranged survivor regularly run to 75–85 turns.

To be clear about scope: a game ending in a draw because a ranged unit genuinely cannot be caught is a legitimate outcome — that's correct game behavior. The problem here is narrower: the brain is choosing to retreat in situations where it could fight and win, leaving real value on the table. It's a suboptimal decision by the AI, not a flaw in game structure.

### Recap of root cause

`positionScore` sums expected damage from all living enemies simultaneously and compares it to the unit's current HP:

```typescript
const lethal = danger >= unit.currentHealth;
s -= danger * WEIGHTS.danger * (lethal ? WEIGHTS.dangerLethalMult : 1);
```

When one ranged unit faces multiple melee opponents, `danger` aggregates all enemies' expected output as if they all act in the same slot. This wildly overestimates real per-turn threat — only one unit acts per initiative slot. The `dangerLethalMult` penalty fires at every reachable position, so the brain concludes every option is suicidal and retreats indefinitely, even when attacking would be the winning play.

### Recommended fix (from Round 1, still applicable)

**Option A — Cornered-unit fallback.** If `myAliveCount === 1` and `max(pScore over moveTiles) - min(pScore over moveTiles) < threshold`, the unit has no meaningful escape. Fall back to the best attacking plan instead of the best positional plan.

**Option B — Per-turn danger model.** Replace the summed danger with `max(single enemy's expected output)` as the danger signal. This models actual turn-by-turn threat accurately and eliminates most false `dangerLethalMult` fires.

Either option would prevent the indefinite-kiting failure mode. Option B is the more structurally correct fix; Option A is lower risk.

---

## Partially Resolved Bug — AoE Ally Death Penalty

### What was resolved

The v2 brain applies `allyDeathPenalty` when `eff.value >= target.currentHealth`. This correctly vetoes AoE moves that would one-shot a full-HP ally.

### What remains

The fix doesn't account for allies who are near death but below `eff.value`. Example: an allied unit has 8 HP remaining and the AoE deals 15 damage. The penalty fires correctly here. But if the allied unit has 18 HP and the AoE deals 15 damage, no penalty fires — and if the ally was already at 18 HP after a prior hit (i.e. below 50% health), this represents a meaningful risk that the brain ignores. A second hit from any source kills the ally, and the brain's AoE scoring doesn't account for that fragility.

### Recommended improvement

In the AoE unit loop, additionally apply a scaled penalty when the hit would leave an ally below a danger threshold (e.g. 30% max HP):

```typescript
// existing check
if (eff.value >= target.currentHealth) {
  s -= WEIGHTS.allyDeathPenalty;
}
// additional near-death check
else if (!isEnemy && (target.currentHealth - expected) <= target.maxHealth * 0.3) {
  s -= WEIGHTS.allyDeathPenalty * 0.5;
}
```

This is a softer deterrent — the brain can still use AoE when the strategic upside is high, but it will prefer center tiles that don't clip wounded allies.

---

## Behavioral Observation — Fear Ability Underutilization

### What was observed

In simulation, the Warlock's Fear ability (applies `rooted` + push) is not producing value proportional to its strategic potential. The ability is being used, but often on targets where the root is minimally impactful: enemies that are ranged (and therefore don't need to move to attack), or enemies that are already engaged in melee (where push distance is wasted on blocked tiles).

### Why it happens

Fear's `apply_status: rooted` scoring in `scoreEffectsOnTarget` applies the `rootMeleeFactor` multiplier for melee targets and a lower flat value for ranged targets — that logic is correct. However, the push component is scored independently of whether the push tile is actually reachable (unblocked). When the target is surrounded by units, the scored push distance may not materialize, but the brain scores it at full value.

Additionally, the root is scored without considering the target's proximity to an ally who could exploit the immobilization. A rooted unit adjacent to an ally fighter is far more valuable than one rooted in an empty corner.

### Recommended improvements

1. **Verify push tiles are unblocked before scoring push distance.** If the target's push destination is occupied, the push distance contributes zero real value. Reduce or zero the push score for blocked destinations.

2. **Add an "ally exploitation" bonus for root.** When a rooted target is within movement+attack range of an ally melee unit (using the existing `reachableTiles` or a simplified distance check), add a bonus proportional to that ally's attack value. This makes Fear most attractive when it sets up a follow-up melee attack.

---

---

## New Behavioral Issue — Warlock Prefers Demon Blast Over Fear Against Adjacent Melee Units

### What was observed

A regression smoke test caught the following: when a Warlock faces an adjacent Fighter (melee, range 1) with a distant Wizard elsewhere on the board, the AI chooses Demon Blast (12 unblockable damage) over Fear (push 3 + root). The test expects Fear to be the correct play.

### Why this matters

The smoke test isn't wrong — Fear is the stronger play here. Here's the line:

1. Warlock uses Fear on adjacent Fighter → Fighter is pushed 3 tiles away and rooted.
2. Fighter's next turn: it is rooted and cannot move or charge. It is now 3 tiles from the Warlock and out of melee range. Fighter loses its entire turn.
3. Warlock's next turn: Demon Blast the Fighter from safety (4-tile range), then walk further away if needed.
4. Fighter's following turn: still 3 tiles away, must spend a turn closing, then gets another shot.

Net result: the Fighter loses **two full turns of attacks** while the Warlock takes zero damage and still deals 12 damage next turn. Compare that to the Demon Blast line: the Fighter takes 12 damage but is still adjacent and gets to attack on its very next turn.

Fear's true value in this scenario is not the immediate push displacement — it's **denying multiple turns of melee attacks from the highest-threat enemy**. The current scoring model treats push and root as modest positional bonuses, but doesn't capture the turn-denial value of rooting a unit that is the active threat.

### Recommended fix

The push+root score against an adjacent melee unit should account for turns lost, not just tiles gained. One approach: when scoring Fear against a melee enemy that is adjacent (distance ≤ 1), apply a multiplier to the root score proportional to the target's expected damage output (i.e. "how much damage did we just deny"). This can be approximated as:

```typescript
// when scoring apply_status: rooted against an adjacent melee target
const turnsLost = 2; // one turn immobile, one turn closing gap
const deniedDamage = expectedDamageFromTarget * turnsLost;
s += deniedDamage * WEIGHTS.rootTurnDenialFactor;
```

`WEIGHTS.rootTurnDenialFactor` should be tuned so that Fear reliably beats Demon Blast when the target is a melee unit at range ≤ 1, but not when the push is partially blocked or the target is ranged.

---

## Priority Order for Next Draft

1. **New Bug: Dead unit forced-commit crash** — simple guard, prevents sim crashes and likely a live-game edge case
2. **Structural Issue 1: Kiting endgame** — confirmed by simulation data, significant gameplay impact
3. **Fear: adjacent melee turn-denial scoring** — Fear undervalued against its ideal target; high impact for Warlock play quality
4. **AoE near-death ally penalty** — low effort improvement on an existing fix
5. **Fear push validation + ally exploitation** — medium effort, makes Warlock substantially smarter
