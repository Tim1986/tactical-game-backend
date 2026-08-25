# BALANCE_STAGE2_PLAN.md — the per-class balancing stage (Fable, 2026-08-24)

**Operator: Opus. Gatekeeper: the owner.** This plan exists because the owner
caught the previous stage doing "aggregate nonsense" — party-level means
projected onto per-class questions — and because two raw-numbers problems
surfaced the same day that aggregates can never see:

1. **Deep Gifts** were valued from whole-party uniform application
   (giftHarness's own HONEST LIMIT comment admits it). +3 AC = a permanent
   +15% dodge; +2 damage dilutes as enemy HP scales. Owner hypotheses to
   test: movement is great on ranged, armor is great on melee, damage is weak.
2. **The Sorcerer**, and the HP-scale damage tax behind it. See §2 — this is
   structural, not a tuning miss.

---

## 0. STANDING RULES for this stage (Opus: read before every session)

- **The aggregate ban.** Any question of the form "is X balanced for CLASS?"
  must be answered by ISOLATION: vary one unit's X at a time, everything else
  held at policy. Party-uniform application answers a different question.
  If a harness can only produce party-level means, it does not answer
  per-class questions — say so rather than projecting.
- **Noise floors are stated with every number.** 150 games ≈ ±4pt on a cell;
  a 3-point window cannot be tuned inside (PLAYTEST_CALIBRATION.md). A
  conclusion that fits inside its own noise is not a conclusion.
- **Objective kind chooses the lever** (PLAYTEST_CALIBRATION.md, measured):
  kill-all/boss/rooms respond to hpScale; survive/hold/escape/race respond to
  clocks, arrivals, geometry (`roundByDifficulty`, scoped waves). Scale on a
  survive is decorative; wave size is ~30pt per body.
- **Engine freeze before certification.** Every battery run before the last
  engine/brain change is void (CAMPAIGN_BALANCING.md). Measure → decide →
  apply → ONE certification pass at the end, not interleaved.
- **The owner's playtest ledger outranks the bands.** A measured PASS that
  plays as a grind is a fail (e1 exemption; the 69–72% window; "a verdict is
  only valid for the engine it was played on").

## 1. What is already in flight

- `giftPerClass.ts` (E0.4b) is running: per-class gift isolation, 8 chassis ×
  {none,damage,movement,armor} × 6 real L7+ unlitbeacon cells × 150 games.
  Output: per-class delta table → the gift revaluation (§3).
- Trilogy battery 2 (goblinopolis/moonberry) running; ordinary tuning follows
  its report. Neither blocks this plan.

## 2. THE DAMAGE TAX — why the Sorcerer is garbage in campaigns

The difficulty dial is an enemy-HP multiplier. Walk the class roles through it:

| role | value proposition | under hpScale ×k |
|---|---|---|
| burst damage (sorcerer, and partly ranger/rogue) | fraction of an enemy killed per turn | **divided by k** |
| control (wizard freeze, warlock fear/grasp roots) | enemy TURNS denied | unchanged |
| tank (fighter dodge/HP, stalwart) | incoming damage absorbed | unchanged (scale doesn't raise enemy damage) |
| sustain (cleric heal/ward) | incoming damage undone | unchanged |

**HP scaling is a tax only damage pays.** And the Sorcerer is the roster's
only PURE payer: bolt 10 / ffh 14 / flame_jet 16 / ignite burn — every effect
a flat number, no control rider, no range edge (bolt is range 5 vs arrow 6 /
longshot 8), no sustain. Wizard shares the weak basic but its specials buy
turns. At a 1.7× cell, flame_jet drops from 32% of a kill to 19%; freeze
stays worth exactly one enemy turn. The owner's report ("Fighter absorbing,
Wizard freezing, Cleric sustaining, Sorcerer sucks") is this table, felt.

Also true and worth keeping in frame: kill BREAKPOINTS recede. Assassinate's
≤22 threshold, burst-to-kill-before-it-acts — all quietly degrade as k rises.

### 2a. First: MEASURE it (Opus builds `classValue.ts`)

Same isolation trick as giftPerClass, applied to class slots:
- Template parties where ONE slot rotates through all 8 classes, the other
  three held fixed (use 2–3 templates so the rotating slot sees melee-heavy,
  ranged-heavy and mixed company).
- Cells: one per objective kind, L5 and L9, medium+hard, across ≥2 campaigns —
  and RECORD each cell's effective hpScale.
- Output per class: mean win-delta vs the slot's average, AND the regression
  of that delta against cell hpScale. **The slope is the tax, measured.**
  Hypothesis to confirm/refute: sorcerer's slope is the most negative;
  wizard/cleric slopes ≈ 0.
- Acceptance: enough cells that per-class deltas carry ≤2pt SE; publish the
  table in this file.

### 2b. Remedy options (decision AFTER 2a's numbers; owner gates)

- **(A) Shrink the tax at its source: cap hpScale (~≤1.5) and express
  difficulty through arrivals/clocks/enemy damage.** Structurally right —
  the lever doctrine already pushes this way, and more bodies is exactly
  where burst/AoE shines. Cost: re-walking many rows; enemy-damage as a dial
  needs its own care (it taxes tanks/healers instead — which is at least a
  tax someone else pays for once).
- **(B) Campaign damage normalization: player damaging effects scale by a
  FRACTION of the cell's HP multiplier** — e.g. effective = value ×
  (1 + 0.5·(k−1)), campaign-only, arena untouched, applied in the same place
  enemy `damagePercentOfTargetMax` lives. Pays every damage class back
  proportionally to the tax, preserves arena-relative class balance, keeps
  the dial meaningful (half-cancelled, not neutralized). My recommendation
  to test first: it is the direct answer to "the numbers aren't calibrated
  for this environment."
- **(C) A damage rung on the level ladder** (e.g. +1 all-ability damage at
  L6/L9). Simple, visible to players — but it invents a progression system
  (CAMPAIGNS.md §5 forbids without owner override) and pays melee the same
  as the classes actually drowning.
- **(D) Campaign-only sorcerer kit calibration.** Rejected unless 2a shows
  sorcerer is an outlier BEYOND the damage tax: it breaks kit
  single-source-of-truth and starts whack-a-mole.
- **(E) Content shaping** (more multi-enemy encounters where AoE shines).
  Real but soft; a complement, never the fix.

Process: 2a table → pick A/B/A+B shape with the owner → implement behind the
sim first → re-run 2a to verify the slope flattens → only then content
re-walks.

## 3. Deep Gift revaluation (blocked on giftPerClass results)

- Read /tmp/giftpc.json. Per class: best gift and deltas, with SE.
- Decide values so the MENU IS A CHOICE per class (the E1 boon standard): if
  armor +3 dominates everywhere, it comes down (+2) or damage goes up; if
  damage is universally worthless, raise it — but re-check AFTER the §2
  remedy, because the damage tax and the damage gift are the same problem.
  **Sequencing: §2 first, gifts second.** Valuing the damage gift under a
  tax we intend to remove would bake the tax in.
- Update DEFAULT_GIFT_BY_CLASS from the per-class table (it drives what the
  sim balances against); re-run giftPerClass to confirm; document in
  campaignSim.ts replacing the HONEST LIMIT block.

## 4. Order of operations (the whole stage)

1. Trilogy battery 2 report → ordinary tuning (already normal work).
2. `classValue.ts` built + run → §2a table published here.
3. Owner decision on the damage-tax remedy (§2b) → implement → verify slope.
4. giftPerClass re-run on the post-remedy engine → gift values + policy set.
5. ENGINE FREEZE. Full 5-campaign certification (150×25, two shards each).
6. PLAYTEST_CALIBRATION rows for whatever the owner plays next; spot-fix
   without touching the engine; re-certify only affected campaigns.

## 5. What Fable owes this plan

- Review 2a's harness design before the big run (the aggregate ban applies
  to its author too).
- The §2b decision memo with the owner once numbers exist.
