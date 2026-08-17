# CAMPAIGN_BALANCING.md — the balancing workflow (operator: Opus 5)

This is the A8 deliverable (CAMPAIGN_ROADMAP.md): campaign encounter balancing
is **operated by Opus 5** (`claude-opus-5`), with Fable reviewing once per
campaign — a spot-check at the end, not a step in the loop. Everything you
need is in this file plus the tools it names. If you hit an escalation
trigger (bottom), stop and flag for Fable instead of pushing through.

The methodology behind these rules lives in `BALANCE_GRID_METHODOLOGY.md`
(arena grid) and `mobile/CAMPAIGNS.md` → "Balancing with campaignSim"
(campaign specifics, including the measured placement-spread case studies).
This file is the operating procedure; those are the why.

---

## The loop

```bash
cd ~/Claude/backend

# 1. SMOKE — always first, and again after ANY content edit (~1 min)
npx tsx src/ai/campaignSim.ts <slug> --smoke

# 2. FULL battery (only unlocks after a smoke pass on the CURRENT content)
npx tsx src/ai/campaignSim.ts <slug> --games 200 --json results.json

# 3. Read RESULT: PASS/FAIL. On FAIL, tune (see "Choosing the lever"), then
#    GOTO 1 — every content edit invalidates the smoke marker by content hash.
```

Scoped runs while iterating (faster, same rules):

```bash
npx tsx src/ai/campaignSim.ts <slug> --encounter e3 --games 200
npx tsx src/ai/campaignSim.ts <slug> --encounter e3 --difficulty nightmare --games 200
npx tsx src/ai/campaignSim.ts <slug> --party fighter,barbarian,rogue,cleric --level 4
```

Mechanics the harness enforces so you don't have to remember them:

- **Smoke-first is a hard gate.** A full run refuses to start unless a smoke
  pass has seen a content-identical campaign (SHA of the campaign object,
  marker in `.sim-smoke/`). This exists because a 2-hour run once measured
  nothing; don't work around it with `rm`.
- **Full runs self-caffeinate** on macOS (App Nap once masqueraded as a 4×
  slowdown). You still should not run two full batteries concurrently.
- **Unmodeled mechanics refuse to sim.** An objective kind the brain can't
  play throws at cell start (`BRAIN_MODELED_WIN/LOSS` in campaignSim.ts).
  That error is an escalation, not something to patch around.
- **Validation errors are an automatic FAIL** regardless of win rates — they
  mean authoring bugs (corner placements, bad kits), and win rates from such
  runs are garbage. Fix content, re-smoke.

## Reading the output

```
e3   L3   hard      melee      52%    [ 45%, 65%]    23
       └ W:Every enemy has fallen×15  L:Your charge has fallen×12  DRAW×3
     mean  55%  [ 45%, 65%] ✓
...
RESULT: PASS | FAIL
```

- **THE DIFFICULTY PHILOSOPHY (owner, 2026-08-17 — read this before tuning
  anything).** The bar is Gloomhaven's: easy is beatable with basic strategy
  by ANY reasonable comp; comp tolerance narrows with difficulty; **nightmare
  may legitimately be beatable only with the right comps and strategies.**
  A comp having a rough encounter is IDENTITY — the campaign-level
  comp-building metagame (a tool that cracks one encounter and dead-weights
  the next is a feature) is the game. A comp hitting a retry WALL is a bug,
  because the party is locked for the whole campaign and cannot re-comp
  around it. Floors mean "no walls", never "comp-neutral". **Do NOT tune an
  encounter's identity away to equalize parties** — if satisfying a floor
  requires sanding off the carve/wave/objective that makes the fight itself,
  flag it instead of flattening it.

- **Acceptance = per encounter/difficulty: MEAN in band, no party below its
  floor, and (nightmare only) at least one party ≥ 40% (solvability).**

  | difficulty | mean band | per-party floor | extra |
  |---|---|---|---|
  | easy | 80–95% | 60% | — |
  | medium | 65–80% | 35% | — |
  | hard | 45–65% | 10% | — |
  | nightmare | 15–45% | none | best party ≥ 40% |

  Nightmare's wide mean band is deliberate: with real comp differentiation
  the mean may sit low while the right comp wins plenty. The solvability
  check is the binding constraint there.

- **The `└ reasons` line is the mechanism check** (printed for smoke,
  out-of-band, or stalling cells; always in `--json`). Verify the fight is
  testing what it's designed to test: an escort encounter whose losses are
  not mostly "Your charge has fallen" isn't an escort fight; a deadline
  encounter with no "The deadline passed" losses has a toothless clock.
  In-band for the wrong reason is NOT balanced — fix the design pressure.
- **`⚠ draws N% (stall)`** (>10% draws): kiting/standoff signature. Usually a
  reachability problem (walls + ranged enemies, or a survive objective with
  nothing forcing engagement). Placement/design fix, not an HP fix.
- **Tutorial exemption:** the campaign's first encounter on easy (and often
  medium) may sit ABOVE band — a near-certain first win is correct UX.
  Document it in the campaign's balance report; don't tune it down.
- **Small samples lie.** Judgments at 200 games/cell only (±~7 pts at 95%
  confidence near 50%). 20–50-game runs are for direction while iterating,
  never for acceptance. SMOKE bands are pure noise — ignore them.

## Choosing the lever (by WHICH number is wrong)

The two failure modes need opposite tools:

| symptom | lever | tool |
|---|---|---|
| MEAN out of band, spread fine | `hpScaleOverride` (moves all parties together) | `npx tsx src/ai/campaignTune.ts` — binary-searches to the band MIDPOINT |
| a party under its FLOOR / spread wild | placement — enemy START DISTANCE is the dominant spread driver | `npx tsx src/ai/spreadSweep.ts` — sweeps start distance, writes nothing |

Expected effect sizes (measured, 2026-08):

- `hpScaleOverride` ±0.05 → mean moves ~5–10 pts (all parties together; it
  CANNOT fix spread — raising HP hurts/helps all three parties equally).
- Enemy start distance ±1 tile → spread swings 20–40 pts. Close starts brick
  RANGED (deny the standoff); far starts brick MELEE (crossing under fire).
  Proven both directions on lantern e3/e5 — a single tile un-bricked each.
- ±1 AC → ~±5% dodge — big, coarse. Whole-encounter mood shift.
- Enemy `maxHealth` by whole hit-breakpoints only: one HP step across an
  attack's kill-threshold can move a cell 25 pts with nothing in between
  (34→35 HP crossed a Twin-Strike boundary: 45%→20%). When the band's edge
  falls inside a cliff, park on the nearest safe side and document it.
- Composition swaps are NOT the intuitive fix — measure first. Swapping a
  melee runner for a ranged slinger to punish standoffs made spread WORSE
  (43→82 pts): ranged enemies punish the melee party more.

Objective-type levers (measured during the D2 Lantern retrofit, 2026-08-17):

- **Survive objectives are nearly hpScale-immune** — tankier attackers live
  longer but don't kill faster. The levers are ROUND COUNT (very coarse:
  ~25 pts per round) and WAVE SIZE (~10–15 pts per unit). Log a calibration
  walk in the encounter comment; expect to bracket.
- **Escape objectives are semi-hpScale-sensitive** — you fight through, so HP
  matters, but less than in a kill-all. Expect scales well above kill-all
  norms, and watch for overshoot.
- **Kill-target bosses must be fights on their own.** Once the chaff is
  ignorable, the target's own HP pool is nearly the whole difficulty;
  `undying` makes the kill need follow-through instead of one alpha window.
- **⚠ Walls between melee and a RANGED enemy shield the shooter and tax only
  the crosser.** Three successive e2 layouts did this; melee fell 52% → 35%
  → 4% while ranged sat near 100%. Cover belongs on the APPROACH lane so the
  party advances behind it — never screening the enemy's shooters.

Order of preference: `hpScaleOverride` → enemy maxHealth (breakpoint-aware)
→ count/composition (measured) → AC → placement (for spread). **Changing
placement invalidates the encounter's `hpScaleOverride` — re-tune HP after
moving anyone, then re-verify at 200 games.**

**Anti-oscillation discipline (added after the D2 Lantern loop failed to
converge):**

1. **One lever per battery.** Moving round count AND wave size AND walls,
   then reading one battery, tells you nothing about any of them. The e3
   walk (99→51→90→64→88) is what multi-lever "bracketing" looks like.
2. **200 games/cell has ±7-pt noise.** Never chase a delta under ~10 pts
   with another content change; re-run first if it matters.
3. **Log the calibration walk in the encounter's comment** (lever → mean) so
   the next session brackets instead of rediscovering.
4. **Two overshoots in a row on the same lever = wrong lever.** Stop and
   reread the mechanism (usually it's a breakpoint cliff or a spread problem
   wearing a mean costume).

Campaign-grammar knobs (A2–A7 content) are legal too, with design intent in
mind: wave trigger rounds and sizes, room garrison composition, door mode,
hazard placement, escort HP/route, objective deadlines, `aiHints` hunts
(NOTE: hints attach to an enemy DEFINITION key — every instance of that key
hunts; give hunters their own key). Goals and boons are OUTSIDE the loop:
balance without boons (they're bonuses on top), goals never gate acceptance.

## Known measurement limits (do not over-trust the floors)

The three representative parties fight with **default loadouts** (each class's
first special/passive option — `choicesForLevel` in campaignSim.ts). Nobody
optimizes a loadout for the encounter. So "ranged 10%" means "ONE default
ranged build 10%" — the comp might be fine with the right picks, and a
passing comp might be carried by a lucky default. Before declaring a
nightmare cell unsolvable or a floor breached, probe 1–2 alternative
loadouts with `--passives` (specials require a small code change — flag if
needed). The owner's design intent (fears/roots crack one encounter, dead
weight in the next) lives exactly in the space this harness does not sweep.

## What you may not touch

- **Arena data** (`gameData.ts` chassis/abilities/passives) — campaign
  balance never reaches into arena. Per-encounter knobs only.
- The engine, the brain, `rulebook.ts`, the sim harness itself.
- The bands/floors in this file and campaignSim.ts (owner-set).
- Live determinism (fortune meters start at 0 in live play; the sim seeding
  random phases is intentional variance — don't "fix" either side).

## Escalation triggers — stop and flag for Fable

1. Any validation errors that survive a content fix (possible engine bug).
2. "not modeled by the brain" errors (new objective kind → brain work).
3. A cell you cannot land in band with legal knobs (often a breakpoint cliff
   or a design contradiction — needs a design change, not a bigger hammer).
4. Draw-stall flags that placement changes don't clear (brain/AI gap).
5. The mechanism histogram says the encounter isn't testing its design and
   no content knob changes that.
6. Suspicion the brain can't play a mechanic the encounter leans on (the
   sim then measures a floor, not the truth — e.g. conditional passives).

## Per-campaign checklist (done = all boxes)

- [ ] Smoke pass on final content
- [ ] Full battery at 200 games: `RESULT: PASS` (with `--json` saved)
- [ ] Mechanism histograms eyeballed for every designed-pressure encounter
      (escorts lose to escort death, deadlines to the clock, etc.)
- [ ] Boss encounter simmed on nightmare first, then all difficulties
- [ ] Deviations documented (tutorial exemption, breakpoint parks)
- [ ] Balance report written into the campaign's delivery notes
      (table + deviations), per CAMPAIGNS.md Part 2
- [ ] Fable review requested (once, end of campaign)
