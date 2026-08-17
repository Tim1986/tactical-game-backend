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

- **Acceptance = per encounter/difficulty: MEAN across the 3 representative
  parties in band AND no party below its floor.** Individual parties out of
  band are fine (flavored encounters have inherent ±30-pt party spread).

  | difficulty | mean band | per-party floor |
  |---|---|---|
  | easy | 80–95% | 60% |
  | medium | 65–80% | 40% |
  | hard | 45–65% | 15% |
  | nightmare | 25–45% | 0% |

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

Order of preference: `hpScaleOverride` → enemy maxHealth (breakpoint-aware)
→ count/composition (measured) → AC → placement (for spread). **Changing
placement invalidates the encounter's `hpScaleOverride` — re-tune HP after
moving anyone, then re-verify at 200 games.**

Campaign-grammar knobs (A2–A7 content) are legal too, with design intent in
mind: wave trigger rounds and sizes, room garrison composition, door mode,
hazard placement, escort HP/route, objective deadlines, `aiHints` hunts
(NOTE: hints attach to an enemy DEFINITION key — every instance of that key
hunts; give hunters their own key). Goals and boons are OUTSIDE the loop:
balance without boons (they're bonuses on top), goals never gate acceptance.

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
