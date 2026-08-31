# BALANCE_PROCESS_V2 — the campaign balance process (operator: Opus)

Owner directive, 2026-08-31. Supersedes the measurement half of
CAMPAIGN_BALANCING.md (its tuning tables, pitfalls, and untouchables all still
apply — read it too). Written after the unlitbeacon findings showed the old
regime's blind spots; scope: every campaign, current and future.

## Why V2 exists — what the old regime could and could not see

Be precise about the failure, because the fix must match it:

- `campaignSim` (3 fixed parties, first-listed options) — measures content vs
  STRAWMEN. Fine as a smoke tool, meaningless as a difficulty verdict.
- `buildBattery` (random build sampling — 150 builds × 25g in the 2026-08-21
  audit) — DID vary specials/passives/gifts/boon-forks, and its wall/spread
  verdicts remain valid. But it has three structural blind spots:
  1. **It never finds the optimum.** Its nightmare "solvable" check is the max
     of random draws at G=25 — a directed search beat that by 30+ points. You
     cannot verify "nightmare is winnable for top builds" without knowing the
     top builds.
  2. **It never aggregates by choice.** Snowshoe March lost inside thousands of
     sampled builds and no report ever compared the fork options head-to-head.
     Traps and auto-picks are invisible to distribution statistics.
  3. **Its per-build numbers are noise** (G=25 → ±10pt SE), so it cannot give
     the owner calibratable "this number = this difficulty" data.

## The four instruments (all in `src/ai/`)

| Tool | Question it answers | Typical cost |
|---|---|---|
| `campaignSim --smoke` | does the content run at all | ~1 min |
| `buildBattery` | distribution: walls, spread, bimodality | ~1h (150×40, 2 shards) |
| `buildSearch` (NEW) | what are the TOP builds, and what do they score | ~1–2h |
| `choiceReport` (NEW) | is every choice meaningful — traps / auto-picks | ~1–1.5h per difficulty |

All four share `balancePanels.ts` (versioned NORMIE comps + ARCHETYPE_SEEDS)
and gate boons per encounter through `boonsFor()` — the +30pt early-boon
inflation bug is structurally impossible in any of them.

## The battery — run order for one campaign

```bash
# 0. ALWAYS FIRST, and after ANY content edit
npx tsx src/ai/campaignSim.ts <c> --smoke

# 1. Distribution (walls) — unchanged tool, more games than the old audit
npx tsx src/ai/buildBattery.ts <c> --builds 150 --games 40 --shard 0 --shards 2 --json s0.json
npx tsx src/ai/buildBattery.ts <c> --builds 150 --games 40 --shard 1 --shards 2 --json s1.json
npx tsx src/ai/buildBattery.ts --merge s0.json s1.json --json balance_runs/battery_<c>.json

# 2. Top builds — nightmare first (it is the design target), then hard
npx tsx src/ai/buildSearch.ts <c> --difficulty nightmare
npx tsx src/ai/buildSearch.ts <c> --difficulty hard

# 3. Choice health — medium AND nightmare (a choice may be healthy in one
#    and a trap in the other; both must be reported)
npx tsx src/ai/choiceReport.ts <c> --difficulty medium
npx tsx src/ai/choiceReport.ts <c> --difficulty nightmare

# 4. Normie panel at high games — the owner's calibration numbers
#    (campaignSim with an explicit party per NORMIE comp, --games 200)
```

Wall-clock for the full battery: **4–6 hours**, shardable to two parallel jobs.
That is the deliberate middle of the owner's trade: "better long than
meaningless." Never cut games below the defaults to save time — cut SCOPE
(fewer difficulties per session) instead, so every number that exists is real.

## Acceptance criteria (what PASS means now)

Per campaign, all five, in this order of authority:

1. **No walls** (buildBattery): ≤15% of sampled builds below the wall floor
   per cell (easy 40 / medium 25 / hard 10 / nightmare 5). Unchanged from V1.
2. **Medium is manageable for normies**: every NORMIE panel build ≥60% mean
   across the campaign at medium, and no normie build below 40% on any
   single COMBAT encounter. This encodes "manageable without much trouble for
   most builds played semi-competently" — the brain IS semi-competent play.
3. **Nightmare is solvable at the top, and only at the top** (buildSearch):
   the best verified build lands 45–65% mean with worst-encounter ≥25%.
   The sim brain is a mid-level human at best, so sim-60% ≈ strong-human
   higher; the owner calibrates the exact mapping on device (see below) and
   owns the final band. Random-sample mean staying inside the old nightmare
   band (15–45) remains a secondary check.
4. **Every choice is meaningful** (choiceReport): zero TRAP verdicts, zero
   AUTO-PICK verdicts, on both medium and nightmare. WEAK verdicts are
   allowed but must be listed in the report to the owner. The owner's rule,
   encoded: an option may be the archetype-X favorite only if some sibling is
   the favorite of a different, itself-viable archetype.
5. **Every class is viable in medium and hard** (buildBattery aggregation):
   for each class, the mean win rate of sampled builds CONTAINING it is
   within 10pts of the all-builds mean, and class-containing builds are not
   over-represented among walled builds (>2× base rate = flag). Every special
   usable in medium = no special with verdict TRAP on the medium choiceReport.

## Tuning levers, and who owns each

- **Boon values / boon replacement** — free to tune per campaign. If a boon is
  a TRAP, first try value changes (snowshoes: +1 → +2 movement); if it stays
  trapped at sane values, replace the effect (passives are the inspiration
  pool: party-wide thorns-lite, start-with-X, per-encounter revive, etc.).
  Re-run choiceReport on the fork after every change.
- **Deep Gifts** — now explicitly PER-CAMPAIGN and PER-CLASS tunable (owner
  2026-08-31): both which gifts a campaign offers and their magnitudes. The
  flat damage/movement/armor trio with identical values is why gifts are
  auto-picks today. Design per-class values (or per-campaign gift menus) until
  the gift axis of choiceReport is healthy. giftHarness.ts remains useful for
  magnitude probes.
- **Class scaling (CAMPAIGN_GROWTH)** — tune ONCE, on this run, then STATIC
  FOREVER (owner). Every later campaign balances around it, like the Rogue
  +1 HP already shipped. Changes here require the full 5-campaign battery,
  not just the campaign under test.
- **Passives / specials (base game)** — arena-shared; changes ripple into PvP.
  Escalate to the owner with the choiceReport table before touching; the
  arena grid (BALANCE_GRID_METHODOLOGY.md) must re-run for any change here.
- **Encounter content** (enemy comps, hpScaleOverride, placement, round
  limits) — the ordinary lever, same rules as CAMPAIGN_BALANCING.md.

## Calibration contract with the owner (why numbers must be comparable)

The owner maps sim numbers to human difficulty ("60% = harder end of
medium"), so the numbers must mean the same thing everywhere. That holds iff:

- The measuring stick is FIXED: panels are versioned (`PANEL_VERSION` in
  balancePanels.ts); any panel edit bumps the version and stales all prior
  numbers. Never "improve" a panel mid-campaign.
- Games are high enough to trust: calibration numbers come only from ≥200-game
  cells (SE ≤ ±3.5pts). Screening numbers (40–80g) never leave the tools.
- Statistics are labeled: a NORMIE mean, a sampled-build mean, and a
  top-build number are three different scales. Never mix them in one claim.

**⚠ SEPARATE FIGHT CELLS FROM OBJECTIVE CELLS IN EVERY REPORT.** Confirmed
with human data 2026-08-31, not merely suspected: on unlitbeacon the owner
found e2 (a FIGHT) harder than e3 (an OBJECTIVE) while the sim scored them
100% and 70% — an ORDERING error, not a magnitude one, which no per-campaign
calibration constant can fix. Five of unlitbeacon's twelve encounters are
objectives, so a campaign-level sim mean blends two incomparable scales and
is not a difficulty statement. Band-check FIGHT cells; treat OBJECTIVE cells
as floors for owner device calibration.

**⚠ WIN RATE SATURATES — capture a MARGIN statistic too.** The same owner
session scored e1 and e2 both at 100% for the same build and called one "very
easy" and the other "medium-to-hard end of medium, I could have lost." At the
top of the range a win/loss counter has no resolution left, and margin is
what "could I have lost by playing badly" actually measures. Record party HP
remaining at win and turns taken alongside win rate; a 100% cell won at 20%
HP is not the same content as a 100% cell won at 90%.

**⚠ The objective-encounter caveat — sim numbers there are FLOORS.** The brain
plays kill-things well and objectives worse than a human: on unlitbeacon e7 (a
pure footrace) every mobility investment made the sim result WORSE — backwards
for a race, and diagnostic of the brain fighting when it should run. Tag every
non-combat-objective cell in reports as `simFloor` and exclude them from bands;
they get owner device calibration instead, and their sim numbers are used only
for regression tracking (did my change make the floor drop?). This is the same
modelling-gap family as BR1 — and any brain improvement triggers BR1's rider:
re-certify everything.

## Reporting contract

Every session ends with a written artifact in `balance_runs/` plus a summary
to the owner containing: the five acceptance verdicts, the top-3 verified
builds with full loadouts, the TRAP/AUTO-PICK/WEAK table, the walled-build
names per failing cell, and the levers you recommend — with the owner making
every content call on shipped campaigns (Trilogy rule).

## What you may not touch
Unchanged from CAMPAIGN_BALANCING.md, plus: `balancePanels.ts` panels without
a version bump, and CAMPAIGN_GROWTH once the owner ratifies this run's values.
