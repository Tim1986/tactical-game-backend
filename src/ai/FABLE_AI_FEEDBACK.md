# AI Brain Feedback — Round 1 Review

This document covers two confirmed in-game bugs, two structural issues found through extended testing, and a handful of minor tuning notes. All references are to the original files: `aiBrain.ts`, `defaultData.ts`, `geometry.ts`, `types.ts`.

---

## Bug 1 — AoE can deal the killing blow to an allied unit

### What was observed

During a live game, Fable appeared to use an AoE ability (Whirlwind or Firestorm) in a way that killed one of its own low-HP units rather than a nearby enemy.

### Why it happens

Direct single-target abilities on allies are correctly gated out. In `enumerateAbilityActions`, single-target scores on allies always come back negative from `scoreEffectsOnTarget`, so the `if (score > 0)` filter eliminates them. That part is fine.

The AoE path is different:

```typescript
for (const t of units) {
  if (!t.isAlive) continue;
  if (def.range === 0 && t.instanceId === caster.instanceId) continue;
  if (chebyshevDistance(c, effPos(ctx, t)) > def.areaRadius) continue;
  hitAny = true;
  score += scoreEffectsOnTarget(ctx, def, t);   // ← allies included here
}
if (hitAny && score > 0) {
  out.push(...);
}
```

`hitAny` is set by ANY unit entering the area, including allies. The net score subtracts `allyDamage` weight and `allyDeathPenalty` for allies caught in the blast. Under normal circumstances those penalties are enough to deter the AoE. But when the primary enemy target is about to die, `killValue` adds a large bonus (base 55 + threat factor) that can outweigh the ally death penalty. The result: the brain correctly wants to kill the high-threat enemy and tolerates the ally casualty as collateral damage, even when the collateral damage is killing one of its own units.

Concretely: imagine a barbarian using Whirlwind adjacent to a full-HP enemy fighter AND a 5-HP allied cleric. Enemy kill score ≈ 35–45 points. Allied cleric death penalty = `p * allyDeathPenalty = 0.6 * 90 = 54`. That correctly blocks it. But if the allied unit is, say, a 20-HP rogue with armor 15 and the barbarian's whirlwind does 15 damage:

- `effective = min(15, 20) = 15`. `expected = 0.55 * 15 = 8.25`. Penalty: `8.25 * 1.4 = 11.55`. NOT in kill range (15 < 20), so no death penalty fires.
- Enemy kill score: can exceed 11.55 easily.

So the AoE fires, and if there's a second hit or the ally was at exactly the whirlwind's damage value, it can die. The `allyDeathPenalty` only applies when `eff.value >= target.currentHealth` — it does not look ahead at whether the ally is already below a dangerous HP threshold.

### Fix

In the AoE scoring loop, track separately whether any ally **would die** from the hit. If so, apply the death penalty regardless of whether `eff.value >= currentHealth`:

```typescript
// inside the AoE units loop
const wouldDie = eff.value >= t.currentHealth;  // for the damage effect
if (!isEnemy && wouldDie) {
  score -= p * WEIGHTS.allyDeathPenalty;
}
```

Alternatively, add a hard veto: if the AoE would kill any ally, skip that center tile entirely. This is stricter but cleaner for player trust — Fable should never visibly kill its own units.

---

## Bug 2 — Brain wastes debuffs on already-debuffed targets

### What was observed

On consecutive turns, Fable's wizard froze a fighter (applying `stunned`), and then on the very next turn Fable's warlock used Fear on the same fighter, applying `rooted`. The `rooted` effect is entirely wasted: a stunned unit already cannot move or act, so rooting it adds nothing. This also burned the warlock's special ability for the rest of the match.

### Why it happens

`scoreEffectsOnTarget` scores `apply_status` effects based solely on the target's stats and position. It does not check whether the target already has an active debuff:

```typescript
case 'apply_status': {
  if (!isEnemy) { s -= WEIGHTS.statusOnAllyPenalty; break; }
  if (eff.statusSlug === 'stunned') {
    s += WEIGHTS.stunFlat + eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor;
    ...
  } else if (eff.statusSlug === 'rooted') {
    // No check: is this target already stunned?
    s += eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.rootMeleeFactor * ...;
  }
  break;
}
```

If the fighter has `stunned` with 1 turn remaining, the warlock's Fear scores the `rooted` component at full value — maybe 8–10 points for a melee unit — plus push distance. None of that value is real because the stun makes the root irrelevant.

The same applies in reverse: applying `stunned` to a target that's already stunned is worth far less than applying it to a fresh target (you're just extending duration), but the brain scores it at full value.

### Fix

At the start of `apply_status` scoring, add guards for redundant debuffs:

```typescript
case 'apply_status': {
  if (!isEnemy) { s -= WEIGHTS.statusOnAllyPenalty; break; }
  
  // Stunned already covers everything rooted does — skip
  if (eff.statusSlug === 'rooted' && hasStatus(target, 'stunned')) break;
  
  // Already stunned: stacking only extends duration — steeply discount
  if (eff.statusSlug === 'stunned' && hasStatus(target, 'stunned')) {
    s += (WEIGHTS.stunFlat + eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor) * 0.1;
    break;
  }
  
  // ... rest of existing logic
}
```

The `hasStatus` helper already exists in the file — it just isn't called here.

---

## Structural Issue 1 — Last surviving ranged unit kites indefinitely

### What happens

When a single ranged unit (wizard, ranger, sorcerer) is the last survivor on its side against multiple melee opponents, it will run indefinitely rather than fight. In testing: 1 wizard vs 4 barbarians, the wizard reaches the turn limit (~67% of the time) with all 4 barbarians still alive.

### Root cause

`positionScore` sums expected danger from all enemies simultaneously and compares it to the unit's current HP:

```typescript
s -= danger * WEIGHTS.danger * (danger >= unit.currentHealth ? WEIGHTS.dangerLethalMult : 1);
```

A lone wizard facing 4 barbarians accumulates `danger ≈ 4 × 12 = 48 expected damage/turn` (twin-strike each), which vastly exceeds the wizard's 30 HP. The `dangerLethalMult = 2.2` kicks in everywhere, producing a position score of roughly `−48 × 0.35 × 2.2 = −37` for staying and attacking vs `−12 × 0.35 = −4.2` for retreating (once out of one barbarian's range). The brain always retreats.

The flaw in this model: the danger sum treats all 4 barbarians as attacking simultaneously in one turn, but only one unit acts per initiative slot. The actual danger per turn is one barbarian's attack, not four. A lone wizard that attacks before retreating deals real damage; the brain scores it as suicidal.

This is partly a tuning issue and partly a modeling issue. The brain does the right thing in realistic multi-unit situations (where spreading danger across many turns matters), but overshoots in the lopsided endgame.

### Fix options

**Option A — Add a "cornered" check.** If `myAliveCount == 1` and the danger score is roughly equal at all reachable positions (no meaningful escape exists), fall back to the best attacking option rather than the best position. In practice: if `max(pScore over moveTiles) - min(pScore over moveTiles) < threshold`, treat `pScore` as constant and let damage scoring dominate.

**Option B — Model per-turn danger, not simultaneous danger.** Instead of summing all enemies' expected output, use `max(enemies' expected output)` as the danger signal. This is a more accurate model of what happens in one turn. It reduces `dangerLethalMult` fires and makes the brain fight more willingly in endgames.

**Option C — Reduce `dangerLethalMult`.** Tuning alone doesn't fully solve this (tested: draw rate stays near 50% at multipliers from 1.0 to 2.2), but it does help at the margins. Recommend testing `1.3`.

---

## Structural Issue 2 — `approachHpBias` penalizes even in-range positions

In `positionScore`:

```typescript
const gap = Math.max(0, manhattanDistance(pos, e.position) - prefRange);
const cost = gap * WEIGHTS.approach + e.currentHealth * WEIGHTS.approachHpBias;
```

`approachHpBias` is added to the cost even when `gap == 0` (the unit is already in attack range). The intent seems to be "prefer low-HP targets to reduce future threat," but as written it also makes the current position feel slightly expensive, creating a small disincentive to stay in range of a healthy enemy. Over many turns, this nudges units to drift away from fights slightly faster than ideal.

**Fix:** only apply the bias when there's actually a gap to close:

```typescript
const cost = gap > 0
  ? gap * WEIGHTS.approach + e.currentHealth * WEIGHTS.approachHpBias
  : 0;
```

---

## Minor Notes

**Cleric heals only at range 1, but `enumerateAbilityActions` scores all in-range allies.** This is correct per the ability data but worth confirming: if Heal is ever given range > 1 in a future balance pass, the targeting logic will work, but Heal's `isUnblockable: true` means LOS is bypassed and the full ally pool is considered. Keep that in mind.

**`slotsUntilUnitActs` returns 99 when `order.length === 0`.** This only matters during Round 1 (before the order is built), when Freeze or other status abilities might be used. The brain currently gets `initiativeSoonBonus = 0` in that case, which is correct as a default — but it means Freeze in Round 1 gets no bonus for acting before the target would otherwise go. Not a bug, just a known limitation.

**Line ability scoring clips early when the ray exits the board.** In `enumerateAbilityActions`:

```typescript
if (p.x < 0 || p.x >= BOARD_SIZE || p.y < 0 || p.y >= BOARD_SIZE) break;
if (isInBounds(p)) lastInBounds = p;
```

`lastInBounds` is only updated for tiles that pass `isInBounds` — but the outer bounds check fires first and breaks. The effect is that diagonal line shots that pass through or near a corner tile get `lastInBounds` set to whatever was last valid before the corner. This is mostly harmless (the action still targets a valid tile) but the scoring is computed for potentially fewer units than the ray actually hits. Worth a second look if line abilities become more prominent.

**Smoke tests pass.** All 8 unit behavior tests in `smokeTest.ts` pass cleanly with the current implementation. The tests cover the most important judgment calls: Kill Shot threshold, healing over attacking, AoE avoidance, and Charge usage. These are a solid baseline.

---

## Priority Order for Next Draft

1. **Bug 2 (status stacking)** — low effort, clear fix, directly visible to players
2. **Bug 1 (AoE friendly fire)** — medium effort, also directly visible
3. **Structural Issue 1 (kiting endgame)** — harder, needs design input on intent
4. **Structural Issue 2 (approachHpBias)** — one-line fix, do it alongside any other tuning pass
