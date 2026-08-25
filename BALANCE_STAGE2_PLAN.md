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

## STATUS — the operator updates this block after EVERY work session

**NEXT STEP → 2 (RUN 3 — the de-confounded sweep — IN PROGRESS.)** Runs 1–2
are done and recorded in §2a-results; run 2 is decision-grade on MEANS but
its slopes carry the confound described in §2a-critique, so no remedy is
sized from them. Run 3 (classValueSweep.ts) sweeps the SAME four
kill-relevant cells at k ∈ {0.8, 1.2, 1.6, 2.0}: within-cell slopes are
confound-free. 15 variants (run 2's twelve + war:grasp, war:drain,
ran:longshot) × 2 templates × 4 cells × 4 scales × 200 games ≈ 96k.
Owner has approved taking the time to measure properly before concluding.

_(superseded)_ Run 1: classValue.ts built and RUNNING — 8 classes
× 2 company templates × 12 cells (scale 0.68–1.95) × 100 games ≈ 19k games.
When it lands: paste the per-class table into §2a, then size the curve (§3a).
Sonnet: nothing delegated until step 5.

- [x] 1. Trilogy battery 2 harvested (L≤5 rows + structural signals). DONE
      2026-08-24. Battery 2: goblinopolis 25/48, moonberry 19/48 (from 15 and
      11). L6+ rows discarded unread — pre-curve, void by construction. L≤5
      failures fixed and re-walked; those rows are PERMANENT CAPITAL under the
      anchor and will not be touched again.
      ⚠ Lesson recorded for §4: adding waves AND keeping scale double-charges
      the same tier. Both escorts and one hold overshot exactly that way
      (moonberry e2 hard 12%/46% walls, e3 medium 36%/37%). An ESCORT's top
      tiers need LESS added pressure than a kill-all's — the ally's HP does
      not scale with the party's competence.
- [ ] 2. classValue.ts built + run; §2a table published here  (OPUS)
- [ ] 3. CAMPAIGN_GROWTH sized (§3a loop) → OWNER GATE 1 → implemented + anchor test  (OPUS)
- [ ] 4. giftPerClass re-run post-curve → gift values + policy → OWNER GATE 2  (OPUS)
- [ ] 5. ENGINE FREEZE → §4 re-walk + certification  (SONNET executes, OPUS signs off)
- [ ] 6. §5 client work → version bump → owner builds  (SONNET)
- [ ] 7. Ongoing: playtest ledger rows; spot-fixes; targeted re-certs

Rules for this block: mark a step only when its section's acceptance is met;
move the NEXT arrow; if you stopped mid-step, write one line under it saying
exactly where. This block is the handoff — a fresh session reads it first.

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

### 2a. MEASURE it — `src/ai/classValue.ts` (BUILT 2026-08-24)

**Design as built** (review it before trusting a re-run): one COMPANION slot
(index 1) rotates through all 8 chassis while the other three are held fixed,
so each win-rate difference belongs to one class — the isolation the gift
harness skipped. Two company templates (melee-heavy, ranged-heavy) so a class
is not judged only by its neighbours. 12 cells spanning the authored scale
range 0.68–1.95 across two campaigns and mixed objective kinds, all L5+.
Deep Gifts forced OFF (the current policy is measurably wrong, and leaving it
on would fold that error into the class signal). Each class's per-cell delta
is regressed against the cell's hpScale: **the slope, in points of win rate
per +1.00 of enemy-HP multiplier, IS the tax.** ~19k games, ±1pt SE on a
class's mean delta.

Known caveat, written into the file: when the rotating class matches a fixed
member the party runs a duplicate (2 of 16 rows per class) and carries a
same-class synergy the other rows do not.

#### §2a-results — RUN 1 (12 cells × 100 games, 2026-08-24). DIRECTIONAL ONLY.

| variant | mean Δ | slope /+1.00 scale | slope SE | verdict |
|---|---|---|---|---|
| warlock | +11.0 | +4.6 | ±7.5 | noise |
| cleric | +2.0 | −3.5 | ±9.4 | noise |
| barbarian | +1.3 | +2.0 | ±9.0 | noise |
| sorcerer | −0.7 | −9.6 | ±9.5 | noise |
| fighter | −1.7 | −8.9 | ±8.0 | noise |
| rogue | −2.5 | **−15.1** | ±7.4 | **SIGNIFICANT** |
| wizard | −3.8 | **+31.9** | ±12.3 | **SIGNIFICANT** |
| ranger | −5.6 | −1.5 | ±8.9 | noise |

Low-scale (≤1.00) vs high-scale (≥1.45) shift: wizard **+20.7**, rogue
**−10.6**, fighter −6.6, sorcerer −5.5, warlock +3.3.

**What run 1 established:** the tax's DIRECTION is real — every damage class
slopes negative, and wizard slopes strongly POSITIVE (+31.9): control gets
better as enemies fatten, because a freeze denies one turn regardless of HP
and fat enemies mean longer fights where denial compounds. At scale 1.95,
wizard won 97% where sorcerer won 38%.

**What it did NOT establish, and two errors it exposed:**
1. Only 2 of 8 slopes cleared significance. Sorcerer's slope (−9.6 ± 9.5) is
   indistinguishable from noise and its mean is −0.7, i.e. AVERAGE — which
   contradicts the owner's play experience.
2. ⚠ **MEASUREMENT ERROR, found by taking that contradiction seriously**
   (owner: "if the data isn't showing Sorcerer problems, we are not measuring
   correctly"): every class was given `specialOptions[0]`, and the sorcerer's
   is **`ffh` — the AoE ring**. Run 1 scored the sorcerer holding its single
   best-case tool and never measured flame_jet or ignite. Owner's objection
   to trusting that number: "we can't count on aoe to make the damage worth
   it, the ai brain is too good at playing around aoe, much of the time you
   don't get good aoe targets."
3. ⚠ Run 1 also printed the SE of the MEAN beside the slope, which invites
   reading noise as signal. Run 2 prints the slope's own SE and a t-value.

**Run 2 fixed all three** (20 cells, 250 games, variants). Its results:

#### §2a-results — RUN 2 (20 cells × 250 games ≈ 120k, 2026-08-24)

| variant | mean Δ | slope /+1.00 scale | t | verdict |
|---|---|---|---|---|
| warlock (fear) | **+14.0** ±2.4 | +0.5 | 0.1 | dominant, flat |
| sorc:ignite | +3.3 | +8.9 | 1.2 | noise |
| cleric | +2.8 | +0.4 | 0.0 | noise |
| barbarian | 0.0 | +3.4 | 0.4 | noise |
| sorcerer (ffh) | −0.1 | −11.1 | −1.8 | marginal |
| wizard (freeze) | −0.2 | **+24.2** | 3.1 | SIGNIFICANT |
| fighter | −1.2 | −11.6 | −1.5 | marginal |
| sorc:flame_jet | −1.4 | **+18.0** | 2.6 | SIGNIFICANT |
| wiz:cold_snap | −2.1 | +1.0 | 0.1 | noise |
| rogue (assassinate) | −2.7 | **−16.7** | −2.7 | SIGNIFICANT |
| ranger (piercing) | −4.1 | −7.3 | −0.8 | noise |
| rogue:dagger_toss | **−8.2** ±2.1 | −9.7 | −1.8 | marginal |

Robust findings (Opus): no GENERAL damage tax — flame_jet's slope is
strongly positive; the sorcerer's felt problem is `ffh` specifically (at
scale 1.95: ffh 46% vs flame_jet 94% vs ignite 99%); warlock is the real
outlier at +14.0 mean, flat.

#### §2a-critique (Fable review) — why run 2's SLOPES are not load-bearing

**Scale was never randomly assigned.** A cell's hpScale is its AUTHORED
difficulty, and the lever doctrine proves scale gets cranked high exactly
where it is inert (survive/hold/duel) and stays low where it bites
(kill-alls). High-scale cells are therefore systematically different KINDS
of fights, and a cross-cell regression conflates "how does this class handle
HP inflation" with "how does this class handle objective encounters".
Rogue's −16.7 could be either; the two readings need different fixes. Also:
12 significance tests at ±2 SE expect ~1 false positive, and defaults hid
more than ffh — warlock's +14 was measured holding FEAR, ranger's −4.1
holding PIERCING (a line that hits allies), and fighter's default is
SECOND_WIND, i.e. the purest blockable-basics profile in the roster.

**The refined hypothesis run 3 tests — the DODGE TAX:** what anti-scales is
blockable, repeated damage. Fatter enemies need more hits; every extra hit
is another dodge roll; the miss tax compounds with k. Unblockable bursts are
exempt by construction; control and sustain never cared about k. Run 3 tags
every variant with its mechanical profile and reports the grouping.

#### Original spec (kept — the acceptance bar it was built against)

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

### 2b. ⚠ DECIDED (owner, 2026-08-24): the Level Ladder becomes the tuning surface

The owner chose campaign-only damage normalization, with four requirements
that together define the architecture. Verbatim constraints:

1. **Campaign classes get their own balance tuning, independent of arena.**
2. **Mechanics of specials never change — numbers only.** A freeze stays a
   freeze, a push stays 2 tiles; damage/heal VALUES are the tuning surface.
3. **ONE set of campaign tuning numbers, shared by every campaign.** No
   per-campaign unit scaling. (Campaigns keep their per-encounter ENEMY
   hpScaleOverride rows — the player-side curve is global.)
4. **THE ANCHOR: arena = campaign at a specific level.** "I need arena to
   represent a specific level, not an entirely different universe." At the
   anchor level the party's chassis, specials and passives are EXACTLY the
   arena numbers; below it is the existing stripped ladder; above it the
   growth curve begins and the numbers become whatever viability requires.

**The anchor is L5, and it already nearly holds:** PLAYER_HP_DELTA reaches 0
at L4, specials complete at L3, passives at L5, and nothing above L5 changes
a number today (boons/gifts/second charge are additive). So the architecture
is: L1–L5 = the shipped ramp INTO arena values; L5 = arena, exactly; L6–L10 =
the new CAMPAIGN GROWTH CURVE.

**⚠ REMEDY SHAPE REVISED (Fable, 2026-08-24, after run 2 + critique):**
a flat "+X% all damage" curve is DEAD — it would hand warlock (+14.0
already) the same raise as the classes actually drowning and widen the real
gap. The revised working shape, to be confirmed by run 3:

- **CAMPAIGN_GROWTH's damage rung applies to BASIC attacks, flat +N per
  level** — not a percentage on everything. Under the dodge-tax model this
  pays the measured losers most by construction (+2 on twin is +4 every
  turn; +2 on a once-per-battle flame_jet is nothing), never touches
  specials, and leaves the anchor clean.
- **`ffh` is the per-ability exceptions table's first customer** — the one
  robust special-level finding: an ally-hitting ring anti-scales because
  bigger k means fewer, fatter targets (owner's own report of AoE in play).
- **Warlock is an INVESTIGATION, not a nerf**: +14 mean may be a brain
  artifact (fear/grasp/drain may be abilities the sim's opponent has no
  answer to). Cross-check warlock in the arena contain6 grid — if it is not
  dominant there, the campaign sim overrates it and that is a brain finding.
- Party max-HP per level stays as designed (it counters enemy DAMAGE, which
  nothing above measures).

**Original implementation shape (still the vehicle — the anchor, one global
table, L6–L10; only the damage rung's FORM changed):**

- `CAMPAIGN_GROWTH` in campaigns/runtime.ts — one table, level-indexed,
  L6–L10 only. Fields per level, all starting at 0 and tuned from 2a's
  measurements: party max-HP bonus; damaging-effect bonus (the damage-tax
  payback — likely a percentage so big and small hits scale together, with
  Math.max(1, round(...)) like percent damage uses); and a small PER-ABILITY
  exceptions table for outliers the flat curve cannot save (the sorcerer kit
  is the expected customer — numbers only, keyed by slug, empty until 2a
  proves a need).
- Applied in buildCampaignPlayerInstance / the ability-map layer exactly
  where cooldownOverrides and campaign abilities already compose — the sim
  and the client share it by construction.
- **The ANCHOR INVARIANT becomes a test** (the rulebookSpec pattern): build
  a campaign party at L5 for every class/special/passive combination and
  assert chassis stats and every ability number are byte-identical to
  arena's. Any future arena rebalance then propagates to the anchor
  automatically, and any campaign-side drift below L6 fails CI.
- Player-facing: the level-up screens above L5 say what grew ("+X% damage,
  +Y HP") — the growth is a reward the player can read, and it is also the
  sales pitch: arena is level 5; campaigns continue past it.

**Consequences accepted up front:** every L6+ cell in every campaign gets
easier when the curve lands and must be re-walked — that is folded into the
stage's final re-walk + certification, not done twice. Curve SIZING comes
from 2a: the target is a flat class-value slope (the tax refunded), not
maximum generosity.

### 2b-archive. Options as originally analyzed (kept for the record)

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

Process (updated for the decision): 2a table → SIZE the growth curve from the
measured slopes → implement CAMPAIGN_GROWTH + anchor test → re-run 2a to
verify the slope flattens → gifts (§3) → the one big re-walk + certification.

## 3. Deep Gift revaluation

**MEASURED 2026-08-24** (giftPerClass, 8 classes × 6 real L7+ cells × 150
games, ±1.6pt SE; raw rows in `giftPerClass_2026-08-24.json`):

| class | damage +2 | movement +1 | armor +3 | best |
|---|---|---|---|---|
| fighter | +3.8 | **+15.4** | +8.6 | movement |
| barbarian | +2.1 | **+15.0** | +1.1 | movement |
| rogue | +6.2 | **+10.7** | +10.3 | movement |
| cleric | +1.7 | **+12.4** | +8.4 | movement |
| ranger | +8.6 | +9.2 | **+11.1** | armor |
| wizard | +3.3 | +6.2 | **+7.3** | armor |
| sorcerer | **+1.4** | **+17.3** | +6.3 | movement |
| warlock | +9.2 | **+11.2** | +5.6 | movement |

Readings: the shipped DEFAULT_GIFT_BY_CLASS (melee→armor, ranged→damage) is
wrong in nearly every cell; the damage gift is never anyone's best (the tax,
measured — sorcerer's +1.4 is the worst cell in the table); movement
dominates 6/8 (either +1 movement is undervalued at these gift prices, or
the other two are overpriced — the revaluation decides which). ⚠ These
numbers were taken at PRE-CURVE damage values; the damage column will move
when CAMPAIGN_GROWTH lands, which is exactly why gifts are valued AFTER it.

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

### 3a. The curve-sizing loop (how §2a's numbers become CAMPAIGN_GROWTH values)

Iterate, don't derive-once: (1) run classValue.ts, record each class's
slope-vs-hpScale; (2) set the damaging-effect percentage so the WORST slope
(sorcerer, presumably) projects to ≈0 at the L9-typical scale; (3) re-run
classValue at the new values; (4) repeat until every class's slope is flat
within ±1 SE; (5) only then touch the per-ability exceptions table, only for
classes still negative after the flat-curve refund, one slug at a time with a
re-run per change. Every iteration's values + slopes get a row in a log table
appended to this file — the walk must be reconstructible.

## 4. THE FINAL RE-WALK + CERTIFICATION (the stage's last act)

Preconditions: CAMPAIGN_GROWTH landed + anchor test green + gift values and
DEFAULT_GIFT_BY_CLASS updated + ENGINE FROZEN (no brain/engine/kit edits past
this point — any such edit voids the pass and restarts §4).

- **L1–L5 cells are permanent capital and are NOT re-walked** — the anchor
  freezes the party under them; their existing certified rows stand. Only
  L6+ cells re-walk. (Trilogy battery 2's L≤5 rows stay valid for the same
  reason.)
- Per campaign, in order (unlitbeacon → sealeddeep → lantern → goblinopolis
  → moonberry): calibrate.ts walks on L6+ cells per the lever doctrine
  (§0), then a full 150×25 two-shard battery, merged.
- Acceptance: DIFFICULTY_TARGETS.md ACCEPTANCE as imported by calibrate —
  never a hand-reading. Stopping rule per cell (unchanged from BAL1): PASS,
  or ≤5 wall points over, or the 96-vs-95 quantization; anything else parks
  as BEYOND-RULE with a written reason, escalated (see §6).
- Record: per-campaign notes file updated; CAMPAIGN_BALANCING.md's VOID
  banner replaced with the new certification date + engine commit.

## 5. CLIENT WORK (mobile — small, but the stage isn't done without it)

- Level-up screens above L5 show the growth ("+X% damage, +Y max HP") —
  LEVEL_AWARD_INTRO in app/campaign/[slug].tsx; the strings must be BUILT
  from CAMPAIGN_GROWTH's constants (the DEEP_GIFTS description pattern), so
  screen and engine cannot drift.
- Gift descriptions already build from constants; verify after revaluation.
- `npm run sync-engine` after every backend change, as always.

## 6. WHO DOES WHAT — model assignment (owner asked this be explicit)

**Opus (judgment work — anything that decides what a number SHOULD be):**
harness design/review (classValue.ts and any new instrument); every
CAMPAIGN_GROWTH sizing iteration (§3a); gift value + policy decisions;
per-ability exception calls; structural encounter changes (formation,
terrain, waves, clocks) and anything BEYOND-RULE; interpreting playtest
ledger rows; the anchor test's design; final certification sign-off per
campaign.

**Sonnet (mechanical work — anything with a written procedure and a
machine-checkable acceptance):**
- Running calibrate.ts walks at rungs OPUS SPECIFIES, and applying the
  passing rung to hpScaleOverride rows verbatim with the measured numbers
  pasted into the row's comment.
- Running/merging the 150×25 batteries; producing the per-campaign result
  tables; updating notes files and the VOID banner from a template.
- Re-running classValue/giftPerClass at values Opus sets, reporting tables.
- The client string work in §5 (pattern exists), engine syncs, doc
  bookkeeping, puzzle-solver re-runs after any gameData change.

**Sonnet's hard guardrails:** never edit the brain, the engine, gameData
kits, CAMPAIGN_GROWTH values, or gift values; never choose rungs or invent
levers; never reinterpret a band ("close enough" is Opus's call: the
stopping rule is exact); anything failing its written acceptance — or any
cell reading TOO HARD+WALLS ≥30% — stops and escalates to Opus rather than
being tuned at. The aggregate ban (§0) binds Sonnet identically.

**Owner gates (the only human stops in the whole run):**
1. Sign-off on the sized CAMPAIGN_GROWTH values before the big re-walk.
2. Sign-off on the gift values + per-class defaults.
3. Playtest verdicts whenever he plays — ledger rows outrank bands (§0).

## 7. Order of operations (the whole stage)

1. Trilogy battery 2 report → harvest L≤5 rows + structural signals only
   (L6+ rows are pre-curve and void by construction).
2. `classValue.ts` built (Opus) + run → §2a table published here.
3. CAMPAIGN_GROWTH sized via the §3a loop (Opus) → OWNER GATE 1 →
   implemented with the anchor test.
4. giftPerClass re-run post-curve → gift values + DEFAULT_GIFT_BY_CLASS
   (Opus) → OWNER GATE 2.
5. ENGINE FREEZE → §4 re-walk + certification (Sonnet executes, Opus
   signs off per campaign).
6. §5 client work → version bump → owner builds.
7. PLAYTEST_CALIBRATION rows as the owner plays; spot-fixes without
   engine edits; re-certify only affected campaigns.

## 8. What Fable owes this plan

- Review 2a's harness design before the big run (the aggregate ban applies
  to its author too).
- The §2b decision memo with the owner once numbers exist.
