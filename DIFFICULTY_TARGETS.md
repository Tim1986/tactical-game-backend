# Difficulty targets — the numbers campaigns are balanced to

**This file is the single source of truth for what "correctly balanced" means.**
The numbers are ratified by the owner (2026-08-21) but **provisional**: they are
derived from design intent, not yet from playtest. They are expected to move
once the owner plays the campaigns. See "Retuning after playtest" at the bottom
— changing them is a one-line edit plus a re-run, deliberately.

Implemented in `src/ai/buildBattery.ts` as `ACCEPTANCE` / `ACCEPTANCE_EARLY`.
If a number here disagrees with the code, the CODE is wrong — fix it there and
say so in the commit.

---

## The principle

> "I don't care about weak teams doing poorly, I care about how better teams do.
> Easy should be forgiving, solvable at a reasonable percentage with 50% of
> teams at least. Nightmare can require higher quality team building in order to
> have decent solve numbers — if 50% of possible teams on nightmare have less
> than 5% wins, that's fine, get good, play better teams. But there needs to be
> a subset of good teams that can meet those percents, different demands for how
> many of those teams need to be successful, based on difficulty level."
> — owner, 2026-08-21

Every encounter is simmed against ~150 randomly drawn legal parties. We judge
the **shape of that distribution**, never its average. A pile of hopeless comps
losing is not a balance failure — it is the comp-building metagame working.

## The two bounds

Each encounter × difficulty cell must satisfy both.

**FLOOR — "enough good teams can win it."**
At least `share` of sampled teams must win at least `target` of their games.
This is the anti-"too hard" bound.

**CEILING — "the typical team cannot walk it."**
The **median** team's win rate must not exceed `ceiling`.
This is the anti-"too easy" bound. Without it, "10% of teams beat 40%" passes
trivially on a fight that everybody wins.

A third, older check also still runs: **WALLS** — the share of teams below a
"cannot progress at all" floor (easy 40 / medium 25 / hard 10 / nightmare 5%)
must stay under a cap (easy 10 / medium 15 / hard 25 / nightmare 50%). A locked
party that cannot re-comp must never be truly bricked.

## The numbers

### Standard (level 3 and above)

| difficulty | a team "solves" at | share that must | median must not exceed |
|---|---|---|---|
| easy | ≥ 80% win | **≥ 50%** of teams | 95% |
| medium | ≥ 65% win | **≥ 35%** of teams | 80% |
| hard | ≥ 45% win | **≥ 20%** of teams | 65% |
| nightmare | ≥ 40% win | **≥ 10%** of teams | 45% |

In plain English, reading the `hard` row: *at least one team in five must be
able to win 45% of its games, and the middle-of-the-pack team must not be
winning more than 65%.*

The `share` column is the difficulty dial — it encodes "how many teams need to
be good enough". Easy demands half the field can do it; nightmare demands a
tenth. The `target` column stays roughly flat by comparison, because it
describes what winning *feels* like, not how exclusive it is.

### Early encounters (level ≤ 2) — both bounds loosen

> "For the first 2 rounds it should be easier. Should still require decent play,
> but you don't have all your tools, it'll be boring to get stuck there."
> — owner, 2026-08-21

| difficulty | a team "solves" at | share that must | median must not exceed |
|---|---|---|---|
| easy | ≥ 80% win | ≥ 65% of teams | 100% |
| medium | ≥ 65% win | ≥ 50% of teams | 90% |
| hard | ≥ 45% win | ≥ 35% of teams | 80% |
| nightmare | ≥ 40% win | ≥ 20% of teams | 60% |

**Keyed on LEVEL, not encounter number**, because level is the actual cause: at
L1 nobody has a special, at L2 only the hero and the first companion do (see
`choicesForLevel`). In practice:

- 5-encounter campaigns (the trilogy): **e1–e2**
- 12-encounter campaigns (Sealed Deep, Unlit Beacon): **e1–e3** — their e3 is
  also L2

⚠ **Both bounds loosen, not just the floor.** A fight deliberately made gentler
would otherwise be flagged TOO EASY for doing exactly what it was told.

## What the sim actually varies

Every sampled build draws, independently:

| axis | space | when it exists |
|---|---|---|
| **comp** | 4 distinct classes from 8 → C(8,4) = **70** legal comps | always |
| **special** | 3 options per class | L2 hero + 1st companion; L3 all four |
| **passive** | 3 options per class | L4 hero + 1st companion; L5 all four |
| **Deep Gift** | damage / movement / armor, **per unit** | L7 hero + 1st companion; L8 all four |
| **story fork** | one option per boon-granting choice already passed | Sealed Deep & Unlit Beacon only, e7+ |

At 150 builds per cell this is dense: measured on Sealed Deep, e8 (L7, 2 gifts
per party) sampled **6 of 6** possible gift multisets and e9–e12 (L8+, 4 gifts)
sampled **14 of 15**. So yes — late encounters are genuinely simmed across
"party took damage gifts" vs "party took armor gifts" vs mixtures.

Note the trilogy tops out at L5 and therefore never sees a Deep Gift at all.

Gifts are drawn **uniformly at random**, not by the measured best-pick policy in
`campaignSim.DEFAULT_GIFT_BY_CLASS`. That is deliberate under this criterion: we
want the whole space including bad picks, and the good teams surface in the top
`share` on their own.

## Sample size: why a flat 150 builds is enough everywhere

The build space explodes with level, because each level opens another axis:

| encounter | level | build space | what 150 samples covers |
|---|---|---|---|
| e1 | L1 | 70 | 214% (every build ~2x) |
| e4 | L3 | 5,670 | 2.6% |
| e6 | L5 | 459,270 | 0.03% |
| e9 | L8 | 74,401,740 | 0.0002% |
| e12 | L10 | 148,803,480 | **0.0001%** |

It is tempting to conclude that late encounters need more builds, or that they
take longer to sim. **Neither is true.** Sim cost is fixed (150 builds x 25
games per cell at every level), and the precision of a proportion estimate
depends on the SAMPLE size, not the population size — the standard textbook
result, and it holds here.

Verified empirically rather than assumed. Two **disjoint** 150-build samples of
the same cell (shard 0 vs shard 1 of 300), at the densest and sparsest coverage
in the game:

```
sealeddeep/e1/nightmare  L1  (214% coverage)
  sample 0: median  0%  solve-share  0.0%  best  8%
  sample 1: median  0%  solve-share  0.0%  best 20%      -> share differs 0.0 pts

sealeddeep/e12/nightmare L10 (0.0001% coverage)
  sample 0: median 18%  solve-share 21.3%  best 96%
  sample 1: median 20%  solve-share 24.7%  best 84%      -> share differs 3.3 pts
```

3.3 points at e12 is inside binomial noise for n=150 at p≈0.23 (SE ≈ 3.4 pts).
So the verdict statistics are reproducible at 0.0001% coverage. **No
level-scaling rule is needed** — do not add one without re-running this test and
showing it fails.

⚠ **But note the `best` column: 96% vs 84% on the same cell.** A maximum is a
tail statistic and swings on one lucky draw. This is the second, unplanned
reason the old acceptance check had to go: its nightmare solvability test was
`best build >= 40%`, i.e. the least stable statistic available. Asking for a
SHARE of builds instead of the single best one made the verdict reproducible as
a side effect. **Never reintroduce a max-based threshold.**

## Known limits of these numbers

1. **They have never been checked against a human.** The sim plays with
   `OptimalBrain`, which is almost certainly a stronger player than a person. A
   70% sim win rate may be a much lower human win rate. This is the single
   biggest reason to expect the numbers to move after playtest.
2. **The ceiling is inferred, not stated.** The owner specified the floor
   (`share` per difficulty) directly. The `ceiling` column was proposed to stop
   a trivially-easy fight passing, and ratified — but it is the softer of the
   two commitments.
3. **`share` is a share of *sampled* teams, not of teams players actually
   field.** Players pick deliberately and will skew toward good comps, so the
   real-world experience is easier than these numbers imply. If playtest says
   "too easy", raising `target` is probably a better lever than raising `share`.

## Retuning after playtest

The intended loop is: balance to these numbers → play → adjust the numbers →
re-balance. Doing that:

1. Edit `ACCEPTANCE` / `ACCEPTANCE_EARLY` in `src/ai/buildBattery.ts`. **One
   place.** Update the tables above in the same commit.
2. Verdicts can be recomputed from **saved JSON without re-simming** —
   `npx tsx src/ai/buildBattery.ts --merge balance_runs/audit_<campaign>_<sha>.json`
   re-reports any saved run against the current numbers. Use this to see what a
   proposed change would flag before committing to a re-tune.
3. Only re-sim when the **content** changes (`--builds 150 --games 25` per cell
   is the floor for a verdict; spend extra budget on builds, not games).
4. Record what the playtest actually felt like alongside the number change —
   "nightmare e9 felt unfair with a ranged party" is the evidence that justifies
   a threshold, and it is the thing nobody can reconstruct later.

### Which way to turn the dials

| symptom in play | change |
|---|---|
| difficulty feels too forgiving overall | raise `target` (winning should mean winning more) |
| too many comps can clear it — not exclusive enough | lower `share` |
| too punishing, runs dying to comp choice alone | raise `share` |
| a specific tier is mushy vs the one below | lower that tier's `ceiling` |
| early fights still stalling runs | raise the `ACCEPTANCE_EARLY` shares |

## History

- **2026-08-21** — Created. Replaced a mean-in-band check (easy 80–95, medium
  65–80, hard 45–65, nightmare 15–45 on the *mean* of sampled builds). That
  check asked the wrong question twice: hopeless comps dragged the average of
  cells that were fine for good comps, and the bands themselves had been
  calibrated against the mean of `campaignSim`'s three representative parties —
  which sit at percentiles 57, 26 and 19 of the 70 legal comps (measured on
  unlitbeacon e1), a mean 12.3 points below the true comp-space mean. Full
  context in `REBALANCE_2026-08.md`.
