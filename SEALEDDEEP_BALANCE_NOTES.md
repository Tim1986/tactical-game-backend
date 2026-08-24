# The Sealed Deep — balance notes (BAL1 retune, 2026-08-23)

Operator: Opus 5. Process: `CAMPAIGN_BALANCING.md`. Targets: `DIFFICULTY_TARGETS.md`
(frozen during this pass). Plan: `REBALANCE_2026-08.md` steps D1–D2.
Artifact: `balance_runs/sealeddeep_bal1_PASS.json` (150 builds × 25 games × 48 cells).

## Result

| | audit (2026-08-21) | after this pass |
|---|---|---|
| TOO HARD cells | 21 | **0** |
| WALLS cells | 22 | 2 |
| TOO EASY cells | 8 | 5 |
| clean encounters (all 4 tiers) | — | **7 of 12** (e1 e2 e3 e9 e10 e11 e12) |

The campaign opened this pass with a **39%-walled opening fight on EASY**, e4/nightmare
walling 99% of parties, and two cells no sampled team could solve at all. None of that
remains. Every surviving failure is a cell that is slightly TOO EASY or 1–3 points over
a wall cap — the safe direction.

## The one-line lesson

**Three of the four hardest cells were not tuning problems at all, and no amount of
`hpScaleOverride` could ever have fixed them.** Each was an encounter excluding a party
ARCHETYPE, which the build-sampled battery reports only as "bimodal". `spreadSweep`
names the archetype in ~2 minutes. Run it FIRST on any cell that fails at both ends.

| encounter | what scale said | what the sweep said | fix |
|---|---|---|---|
| e4 | bimodal, no passing rung at easy/medium | melee 42% vs ranged 95% (53-pt spread) — bricked by the crossing | enemies 1 tile closer → spread 7 pts, melee 93% |
| e5 | walls at every rung | ranged **0–5%** at hard/medium — phasers ignore the carve and delete a backline that cannot body-block | phasers 2 tiles back → ranged 32–88% |
| e8 | scale-SATURATED: 2.60 and 3.00 measured identically | the crew reached the exit on ~round 3; the fight ended before the hunters closed | route switched back across the chamber + 10-round clock → hard/nightmare pass at **1.60**, down from 2.30/3.00 |

e8 is the cautionary tale: its shipped hard/nightmare rungs (2.30/3.00) existed only
because successive operators kept pushing scale at a cell that structurally could not
respond to it. Once the crew stopped outrunning its own encounter, 1.60 did what 3.00
could not.

## ⚠ RE-CERTIFIED AGAINST THE ROUND-1 FROZEN AUTO-SKIP (2026-08-23, second pass)

Mid-pass the engine gained an auto-skip: in round 1, a player whose every
choosable unit is frozen no longer receives a do-nothing commit turn (owner
request). It is a UX fix, but it is ALSO a balance change, and a large one.

Measured on e5/hard at an unchanged scale of 1.25, three runs each:

| | teams solving | median | walled |
|---|---|---|---|
| before the auto-skip | 58% | 52 | 22% ✓ |
| after | 38-40% | 32-36 | 37-38% ✗ |

Instrumented: the only units auto-skipped in this campaign are the e5 phasers
(wraith/specter, `warlock` chassis) — i.e. it fires on the ENEMY side, when the
party's own area freeze catches the whole enemy team. Freezing the enemy in
round 1 used to be worth more, because the enemy spent real submits fumbling
through forced commits; now those commits are consumed inside the freezing
player's own turn. That is a legitimate consequence of the rule, not a defect.

The first certification run predates the auto-skip and is therefore VOID. The
owner's call (2026-08-23): keep the feature and re-tune the campaign to the
engine as it actually ships, rather than revert to preserve the old numbers.
Everything below reflects the re-certified state.

**Lesson for the remaining campaigns: an engine change lands underneath a
balance pass silently.** Nothing in the tooling noticed that the certification
and the engine had diverged — the content hash covers the CAMPAIGN object only.
Before trusting any battery, check that no gameplay commit landed after it
started.

## The engine bug this pass uncovered

Campaign enemies are built from `DEFAULT_UNITS[baseClass]` and inherit that class's
`definitionSlug`. `THORNS_DAMAGE_BY_CLASS` is keyed on that slug — so the 2026-08-23
player-Fighter buff (thorns 3 → 5) silently applied to the **zombie** (fighter chassis +
thorns), across the 5 encounters it appears in. e9 read melee 0–17% at EVERY start
distance and looked like an unfixable archetype filter. With `thornsDamage: 3` authored
explicitly on the enemy, e9 certifies at **0–12% walls on all four tiers**.

⚠ The same chassis-sharing still applies to `OPPORTUNIST_BONUS_BY_CLASS` and
`VENGEFUL_BONUS_BY_CLASS` — ghouls run the rogue chassis, skeleton berserkers the
barbarian. Left as-is deliberately (they predate this and may be intended), but **if
either player class is ever retuned, check the campaign enemies built on it.**

## The 5 remaining failures, and why they are parked

All five are the same shape: **the median will not come down before the wall share breaks
its cap.** Where the two bounds disagree, the floor wins (the philosophy's own rule) — a
soft fight costs a good team some tension; a broken wall cap costs a fifth of parties
their run, in a campaign where the comp is LOCKED.

| cell | state | why no rung works |
|---|---|---|
| e4/easy | median 100 vs 95 | quantization (below) — walls already 9% of a 10% cap |
| e4/medium | median 92 vs 80, walls 12% | 0.98 → median 80 ✓ but walls 18%; 1.04 → walls 28% |
| e5/easy | walls 11% vs 10% | 1.00 → walls 7% but median 96 |
| e5/medium | walls 19% vs 15% | 1.10 → walls 10% but median 88 |
| e6/easy | walls 11% vs 10% | 1.02 → median 88 ✓ but walls 17% |
| e7/easy | median 100 vs 95 | every rung that moves the median walls 12–32% (`units_at_tiles scope:'all'` — a party that cannot get EVERY unit out scores a flat 0, so weak comps fall off a cliff) |
| e8/medium | median 88 vs 80, walls 6% | 1.41 → median 80 ✓ but walls 17%; 1.44 → 21%; 1.50 → 28% |

**Owner ruling 2026-08-23: leave them.** e4/medium and e8/medium are TOO EASY, not too
hard — the median team wins ~90% of its games there. Nobody is stuck.

### ⚠ Measurement artifact — the easy ceiling is effectively 92, not 95

25 games per build means a build's win rate lands on multiples of 4%, and the MEDIAN
inherits that grid: 96, 92, 88 … **there is no 95.** Any cell whose natural median sits
at the top reads TOO EASY against a `<=95` ceiling for an arithmetic reason. e4/easy and
e7/easy miss by exactly this. To make it real: certify at 100 games (1% resolution, 4×
runtime), or read a 1-point easy-ceiling miss as noise. Flagged for the owner; the
targets file was frozen so the threshold itself is untouched.

### ⚠ Run-to-run noise is ±5 points on wall share

Measured directly: on UNCHANGED content between two 150-build runs, e5/easy read 9% then
11%, and e12/easy flipped TOO EASY → WALLS. Several of the misses above are inside that.
Do not chase a cell that is within ~5 points of a bound — re-run first.

## Structural changes made (owner authorised full control of enemy stats)

- **e4** — enemies 1 tile closer; 1 ghoul → zombie; fire hazards 4 → 2.
  ⚠ The composition and hazard edits were aimed at the identical-body breakpoint, which
  is real but was the SMALLER effect. **Start distance was the dominant term.** Re-sweep
  before trusting either in isolation.
- **e5** — the three phasers 2 tiles further back.
- **e8** — crew route switched back across the chamber (was a straight 7-tile line);
  10-round deadline added to the objective, and named in its text.
- **zombie** — `thornsDamage: 3` authored explicitly (see above).

## Final rows

| enc | easy | medium | hard | nightmare |
|---|---|---|---|---|
| e1 | 1.05 | 1.18 | 1.32 | 1.36 |
| e2 | 0.75 | 0.90 | 1.00 | 1.12 |
| e3 | 0.85 | 1.00 | 1.30 | 1.25 |
| e4 | 0.75 | 0.92 | 1.10 | 1.15 |
| e5 | 1.05 | 1.15 | 1.25 | 1.35 |
| e6 | 0.97 | 1.00 | 1.20 | 1.32 |
| e7 | 0.50 | 0.75 | 0.90 | 2.00 |
| e8 | 1.30 | 1.38 | 1.60 | 1.60 |
| e9 | 0.78 | 0.85 | 0.92 | 0.90 |
| e10 | 1.55 | 1.50 | 1.68 | 1.90 |
| e11 | 1.20 | 1.40 | 1.70 | 1.85 |
| e12 | 0.85 | 0.88 | 1.00 | 1.05 |

## For the next campaign (Unlit Beacon, trilogy)

1. **`spreadSweep` FIRST** on every failing cell, before any scale walk. Three of this
   campaign's four hardest cells were archetype exclusions.
2. **The recurring squeeze is structural to the tooling.** There is exactly ONE per-tier
   dial (`hpScaleOverride`), and enemy HP moves the median and the wall share in the SAME
   direction. When the two bounds need to move apart, one dial cannot do it — which is
   why 5 cells here are parked. A second per-tier dial that moves them differently
   (`damageScaleOverride`, or a per-tier clock) would break the deadlock. Worth building
   before the remaining four campaigns, since the same wall will be hit there.
