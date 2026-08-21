# The Unlit Beacon — balance pass, session notes (Opus 5)

Work-in-progress notes for the campaign-3 balance pass
(`CAMPAIGN_BALANCING.md` operating procedure, design at
`mobile/CAMPAIGN3_DESIGN.md` §6.4–6.5).

Sessions: 1 (2026-08-20) runtime verification · 2 (2026-08-21) §6.4 close-out +
type-table scales, hit the engine blocker · 3 (2026-08-21) blocker fixed,
structural pass on e2/e6, measured scales for all 12 → **41/48 in band**.

## STATUS: ✅ BALANCED — `RESULT: PASS`, campaign REGISTERED (2026-08-21)

48/48 cells in band, every party floor held, zero validation errors, on a
200-games/cell battery. Artifact: `balance_runs/unlitbeacon_PASS_200g.json`.
`unlitbeacon` is now registered in `src/campaigns/index.ts` and is live content.

| enc | type | easy | med | hard | nm |
|---|---|---|---|---|---|
| e1 | kill-all (tutorial) | 94 | 80 | 49 | 33 |
| e2 | kill-all + waves | 90 | 72 | 57 | 39 |
| e3 | hold | 90 | 74 | 49 | 35 |
| e4 | hazard carve | 92 | 75 | 56 | 35 |
| e5 | carve | 85 | 71 | 54 | 37 |
| e6 | escape + clock | 93 | 72 | 59 | 34 |
| e7 | escape + clock | 86 | 78 | 53 | 29 |
| e8 | rooms | 86 | 69 | 50 | 24 |
| e9 | survive | 89 | 76 | 55 | 37 |
| e10 | escort (armed) | 88 | 75 | 62 | 36 |
| e11 | boss (duel) | 82 | 70 | 50 | 30 |
| e12 | boss (dual-win) | 84 | 74 | 61 | 30 |

Bands: easy 80–95 · medium 65–80 · hard 45–65 · nightmare 15–45.

### Mechanism histograms — every encounter decided by its own objective
(2400 games each, aggregated across all difficulties/parties)

- **e3** 55% `Every mark is held` — the hold is the win condition, not attrition.
- **e6** 55% escaped / 36% `The deadline passed` — the clock is live.
- **e7** 48% reached goal / 32% deadline.
- **e9** 64% `You survived 8 rounds` / 36% party wipe — **zero** mercy wins.
- **e10** losses are 32.6% `Your charge has fallen` vs 2.1% party wipe — the
  escort is what kills you, which is the doc's test for an escort fight.
- **e11** 58% target destroyed / 42% `Your hero has fallen` — the duel stakes bite.
- **e12** dual-win confirmed live: 59% kill, **2.9% `You reached the goal`**.

### Structural changes made to reach PASS (not just numbers)
1. **e2** was 0% in all 12 cells. Cut from 7 enemies to 4 (2 starting, 1
   vanguard at r3, 1 breaker at r5). One body was worth ~83 points at level 2.
2. **e3** guards moved ONTO the marks ((5,1)/(5,6) → (4,1)/(4,6)). The cell was
   dead flat (75/78/73/70 across the whole scale range) because you win by
   standing on tiles, not killing. Scale bites now.
3. **e6** given a `round_reached: 6` loss. It was totally scale-inert (100% from
   0.90 to 2.40). `Dry Boots` moved to round 6 so the achievement stays a real
   choice. ⚠ Its placement is load-bearing — see the in-file comment.
4. **e9** +1 body in the round-5 wave; `survive` is scale-inert at high values,
   so its scales came DOWN from 1.30–3.40 to 1.00–2.40 once the body was added.

### DEVIATIONS / traps for the next tuner
- **e11 breakpoint cliff.** Ranged party 3% at scale 0.88, 100% at 0.89 (wisp HP
  29→30 crosses a one-shot threshold and flips the brain's target priority).
  **Every e11 rung must stay ≥0.89** or EASY silently becomes the hardest rung.
- **e6 placement must not be "tidied".** undertow is `pull: toward_caster`, so
  drowned standing between the party and the far shore TOW crossers toward the
  exit. West, mid-lane and east sweeps all went flat or non-monotonic; the
  authored mid-mere placement is the only geometry where the drag punishes.
- **Slopes are steep and vary 5x by encounter.** e1/medium moves ~3 points per
  0.01 of scale; e12 moves ~0.4. A "centring pass" sized off a sweep midpoint
  overshot 14 cells at once and cost 3 batteries. Move edge cells 0.02–0.03 max.
- **Sim noise is ±5–8 points per cell at 200 games**, so a single battery can
  fail a correctly-tuned cell. Cells whose true value sits within ~3 points of a
  band edge WILL flip between runs — park them mid-band, and confirm a
  borderline cell at 300+ games/party before touching its scale (e9/medium read
  64 on one battery and 71 at 900 games).

## §6.4 runtime verification — 5 of 5 CONFIRMED

| # | Mechanic | Result |
|---|---|---|
| a | Novel abilities loader (first `novel` use ever) | ✓ **WORKS** — all three cast in play: `undertow` 56 casts/25 games (e6), `halt_the_line` 30 (e12), `muster_charge` 30 (e12). Two were mis-authored though — see below. |
| b | AI-cast `move_self` (`muster_charge`) | ✓ **WORKS** after the content fix — and it was **never a brain gap**. The brain's AoE placement already respects the free-landing-tile rule. Do not escalate this. |
| c | Dual-win `[units_dead, units_at_tiles scope:'main']` | ✓ **WIRED** — proved by pre-placing the main on the Standard tile (7,4): instant `winnerSide: p1, reason: "You reached the goal"`. **But see the measurement limit below.** |
| d | Rooms flags: `surprise` + wave `on:'door'` + `doorMode:'always'` | ✓ **CONFIRMED 2026-08-21** — all three fire, driven through the real engine functions on the real encounter in `tests/unlitbeaconRooms.test.ts`. `doorMode:'always'` lets the party leave floor 1 mid-fight; floor 2's garrison spawns with `skipFirstSlot` (surprise); the landing guard springs ONLY for a party unit on (6,3) (an enemy standing there does not spring it). ⚠ Trap found while verifying: room 0 is placed at BUILD time and never passes through `enterNextRoom`, so a `surprise` authored on room 0 would be silently dropped. e8 is safe (its surprise is on floor 2) — but do not author surprise on a room 0. |
| e | Ally `follow` mode + armed escort | ✓ **WORKS** — e10 resolves both ways in the histograms: `W:The escort made it through` and `L:Your charge has fallen`. |

### Two content bugs found and FIXED (`src/campaigns/unlitbeacon.ts`)

Both novel abilities were typed `targetingType: 'single'` when the file's own
comment says to follow `roar` and `whirlwind` from gameData. As authored they
were **unsatisfiable**, not merely mistuned:

1. **`halt_the_line`** — `single` + `range: 0` + `canTargetAlly: false`. The
   only tile in range is the caster's own, which it is forbidden to target, so
   it is uncastable: **0 casts in 30 games**. Now `aoe · range 0 · radius 1 ·
   orthogonal`, matching `whirlwind`/`shockwave`. → **30 casts**.
2. **`muster_charge`** — `single` + a `move_self` effect. A single-target cast
   demands a unit ON the tile; `move_self` demands that tile be EMPTY. Mutually
   exclusive, so **all 28 casts in 30 games were rejected** with "Cannot leap
   onto an occupied tile" and the Marshal's signature move never once fired.
   Now `aoe · range 4 · radius 1 · 'ring'`, matching `roar` (the ring shape also
   spares the caster in the calm eye). → **30 casts, 0 errors**.

Campaign-wide validation errors: **1 → 0**. `SMOKE: PASS`.

Note the shape of that second bug: it is the same defect class as the client-side
Leaping Slam bug fixed in v1.0.86 (offering occupied tiles as leap landings),
surfacing here in authored content instead of UI.

## Superseded notes (kept so nobody re-derives them)

- **"e12's Standard tile can't be measured — the brain always kills."** STALE.
  Fable spotted the dual-win firing in pass-3 histograms, and the final battery
  confirms it at 2.9% of e12 games (`W:You reached the goal`), across all three
  parties. It is live, measurable, and load-bearing for the balanced party. Hand
  -verification is now confirmation, not discovery.
- **The e8 door-wave ENGINE BLOCKER.** Fixed in `5fc1aad`, reviewed and patched
  by Fable in `fb49cda` (leap landings must enter the trigger trail). Regression
  armor lives in `tests/unlitbeaconRooms.test.ts` (7 tests).
- **Fable's 7-cell direction memo.** All seven cells are closed; its two
  corrections (e6's wall was the balanced party failing the CLOCK, not melee;
  and the e12 staleness above) are folded into the sections above.

## Remaining follow-ups (not blockers)

- `mobile/CAMPAIGN_BEATS.md` should get The Unlit Beacon's entry now that it
  ships (per mobile/AGENTS.md: update the registry whenever a campaign ships),
  so campaign 4 doesn't repeat its beats.
- e12's Standard-tile path is worth ONE hand-play to confirm it feels reachable
  rather than merely being reachable — the geometry is tight (hero from x≤1 to
  (7,4), past the Marshal at (5,4) with honor guards at (6,3)/(6,5)).
