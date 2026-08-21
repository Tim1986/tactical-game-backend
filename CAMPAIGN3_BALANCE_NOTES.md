# The Unlit Beacon — balance pass, session notes (Opus 5)

Work-in-progress notes for the campaign-3 balance pass
(`CAMPAIGN_BALANCING.md` operating procedure, design at
`mobile/CAMPAIGN3_DESIGN.md` §6.4–6.5).

Sessions: 1 (2026-08-20) runtime verification · 2 (2026-08-21) §6.4 close-out +
type-table scales, hit the engine blocker · 3 (2026-08-21) blocker fixed,
structural pass on e2/e6, measured scales for all 12 → **41/48 in band**.

## STATUS IN ONE LINE (session 3, 2026-08-21)

**41 of 48 cells in band.** The engine blocker is FIXED, e2's catastrophe is
fixed, and every encounter now carries measured scales. `RESULT` is still FAIL:
7 cells remain, and 3 of them need STRUCTURE, not numbers. Latest battery
artifact: `balance_runs/unlitbeacon_pass3_200g.json`.

| enc | easy | med | hard | nm | |
|---|---|---|---|---|---|
| e1 | 93 | 67 | 65 | 32 | ✓ |
| e2 | 91 | 71 | 56 | 31* | *nm solvability: best party 36% (<40) |
| e3 | 75* | 78 | 73* | 70* | **FLAT — structural** |
| e4 | 91 | 79 | 56 | 50* | nm overshot; wants ~1.12 |
| e5 | 81 | 73 | 50 | 37 | ✓ |
| e6 | 93 | 76 | 80* | 83* | **structural — spread** |
| e7 | 82 | 78 | 51 | 25 | ✓ |
| e8 | 86 | 70 | 49 | 25 | ✓ |
| e9 | 88 | 73 | 56 | 52* | **structural — survive is scale-inert up here** |
| e10 | 91 | 69 | 58 | 36 | ✓ |
| e11 | 82 | 77 | 52 | 29 | ✓ (all rungs ≥0.89, see cliff note) |
| e12 | 84 | 72 | 50* | 28 | *hard: WALL for ranged (spread) |

Bands: easy 80–95 · medium 65–80 · hard 45–65 · nightmare 15–45.

### THE 7 REMAINING CELLS, and the lever each needs

1. **e3 easy/hard/nm — FLAT (75/78/73/70).** Barely moves with scale across the
   whole range, because you win by STANDING on two tiles, not by killing. Per
   the tuning table a `hold` needs its guards standing ON the marks — e3's
   pikemen start beside the bridgeheads, not on them. This is a placement/design
   fix. `ranged` is also walled on easy.
2. **e6 hard/nm (80/83) — SPREAD, not mean.** The clock (added this session)
   made scale matter at all, but the `ranged` party crosses ~100% at EVERY
   scale from 0.9 to 2.4 while melee gets walled — so scale moves the mean
   without ranking the parties. Enemy START DISTANCE is the documented spread
   lever; run `spreadSweep.ts`. Do NOT reach for scale again here.
3. **e9 nightmare (52%).** Raising scale 2.90→3.40 barely moved it — the table
   is right that `survive` difficulty lives in ROUND COUNT × WAVE SIZE, not HP.
   Add a wave or a round rather than pushing scale past 3.
4. **e4 nightmare (50%).** Pure overshoot from this session's centring edit
   (1.25→1.05 was too big a step). Wants ~1.12. One-line fix, needs a battery.
5. **e2 nightmare — solvability.** Mean 31% is in band but the best party only
   reaches 36%, and nightmare requires one party ≥40%. Spread lever.
6. **e12 hard — `ranged` walled.** Mean 50% is fine; one party is locked out.
   Spread lever.

### Session 3 also established
- **e11 has a violent breakpoint CLIFF.** For the ranged party, scale 0.88 → 3%
  and 0.89 → 100%, on a 100-game sample each — a 100-point swing in one step
  (wisp HP 29→30 crosses a one-shot threshold and flips the brain's target
  priority; melee is unaffected at every scale). **Every e11 rung must stay
  ≥0.89.** The current 1.20/1.45/2.00/2.35 all clear it. Do not let a future
  tune walk easy below that line — it silently makes EASY the hardest rung.
- **Body count dominates at low level.** On e2, removing ONE enemy moved a cell
  from 10% to 93%. Shape matters too: same 4 bodies with two of them present at
  round 1 instead of arriving later cost ~25 points.


**BLOCKED on an engine bug (see next section).** §6.4 runtime verification is
now **5 of 5 COMPLETE**, and the type-table starting scales are in. But the
battery cannot run: e8 throws validation errors, and the smoke gate (correctly)
refuses every run — full AND `--encounter`-scoped — until they are zero. No
win-rate data can be collected by anyone until this is resolved.

### Session 2 (2026-08-21) added
- §6.4 item (d) CONFIRMED — all three e8 room flags fire. Permanent regression
  test at `tests/unlitbeaconRooms.test.ts` (4 tests).
- All 12 placeholder scales REPLACED with the objective-type table's starting
  values (`KILL_ALL/CARVE/HOLD/ESCAPE/ROOMS/SURVIVE/ESCORT/BOSS_SCALE`).
- That scale change EXPOSED the e8 engine bug below (it was always there; the
  old placeholder scales made floor 2 so slow to reach that it rarely fired).

## ⚠ THE CAMPAIGN IS DELIBERATELY UNREGISTERED

`src/campaigns/index.ts` does **not** list `unlitbeacon`, and that is on
purpose. `mobile/app/(tabs)/campaign.tsx` renders `Object.values(CAMPAIGNS)`
directly with no draft/hidden flag, so registering makes it immediately
playable — an unbalanced 12-encounter campaign in players' hands.

Registering is a **one-line change** (import + registry entry, rationale
comment is in that file). Do it as the LAST step of the balance pass.

It must be registered to run the sim at all (`campaignSim` resolves slugs
through `CAMPAIGNS`), so the loop is: register → work → unregister before any
commit that could ship, until the battery passes.

## 🛑 BLOCKER — e8 door-triggered wave orphans the rest of a queued turn

**This is escalation trigger 1 (validation errors that survive a content fix) and
it is an ENGINE bug, not a balance or authoring one. The balance operator may not
fix it — it needs Fable or an owner ruling.**

### Symptom
`e8`, balanced party (`fighter,ranger,cleric,wizard`) only:

| cell | games | validation errors | draws |
|---|---|---|---|
| e8 easy balanced | 40 | 8 (20%) | 6 |
| e8 hard balanced | 40 | 8 (20%) | 9 |
| e8 easy/hard melee | 40 ea | 0 | 0 |
| e8 easy/hard ranged | 40 ea | 0 | 0 |

Every error is the same message: `Charge destination is not reachable (path blocked)`.
The draw-stall flag on that cell tracks it exactly — the stall is a SYMPTOM of the
broken turns, not an independent placement problem. Do not "fix" it with placement.

### Mechanism (confirmed, not inferred)
The offending action batch is:
```
MOVE   -> (6,3)      <- e8 floor 2's door-trigger tile
CHARGE -> (6,6)
END_TURN
```
`(6,3)` is exactly `waves[0].trigger.tile`. The MOVE springs the landing guard,
which spawns at `(6,4)` — inside the path the CHARGE was planned through. The
charge is then correctly rejected, and the rest of the turn is orphaned.

### Root cause
`turnProcessor.ts:313` fires `checkSpawnTriggers(..., wasMove ? actingUnit : undefined)`
MID-TURN. The comment directly above it (lines 306–312) documents this exact
failure mode for ROOM TRANSITIONS and says they were moved to end-of-turn
because "a mid-turn transition ... orphans the rest of its queued turn (the D2
Goblinopolis bug)". **The same fix was never applied to the sibling case:
door-triggered wave SPAWNS.** Inserting a unit mid-turn invalidates later queued
actions exactly the way a mid-turn teleport does.

### Recommended fix (surgical, matches the existing precedent)
Split the mid-turn call by trigger kind:
- `round` and `room_cleared` triggers MUST keep firing mid-turn — the comment
  notes a cleared board has to spawn its wave BEFORE the win check or the match
  ends early.
- The `on:'door'` trigger (the only mover-dependent one) moves to end-of-turn in
  `finalizeTurnInternal`, next to `maybeRoomTransition` and behind the same
  "actually moved this turn AND still alive" guard.

### Why this matters beyond the sim
Turns are submitted as a BATCH in live play, so a human can hit this too: step on
the ambush tile, and the rest of your own turn is rejected. That is the same
defect class as the Leaping Slam bug a tester reported in v1.0.86 (a queued
action the engine will never accept). Blast radius today is any `on:'door'` wave
— e8 is the only content using one, so fixing it now is cheap.

### Options if the engine fix is refused
Moving e8's trigger tile only relocates the landmine (any tile a unit walks
THROUGH before a charge can do this) and would be papering over a live-play bug.
Recommend against.

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

## MEASUREMENT LIMIT — e12's second win path

The brain **always** takes the kill path: every simmed e12 win reads
`W:The target is destroyed`, never the Standard tile. So the battery will
measure e12 as a boss fight only, and its win rate says **nothing** about
whether a human can realistically cut through to (7,4).

The tile is mechanically real (proved above), but reachability is a design
question the sim cannot answer here. Geometry for whoever picks this up: the
hero starts at x≤1 and must reach (7,4), passing the Marshal at (5,4) with
honor guards at (6,3)/(6,5) — (6,4) is the only gap and is flanked by both.
**Verify this path by hand before trusting e12's numbers**, per §6.5's warning
that the Standard "must be genuinely reachable or it's decoration".

## §6.5 balance — starting scales SET, nothing measured yet

The uniform placeholder is gone. Each encounter now carries the OBJECTIVE-TYPE
TUNING TABLE's starting scale for its type (CAMPAIGN_BALANCING.md) — first
guesses to be measured, not final values:

| enc | type | constant |
|---|---|---|
| e1 (tutorial), e2 | kill-all | `KILL_ALL_SCALE` 0.95/1.20/1.30/1.30 |
| e3 | hold (simultaneous tiles) | `HOLD_SCALE` 1.30/1.45/1.70/2.30 |
| e4 (hazard), e5 | carve | `CARVE_SCALE` 1.05/1.30/1.45/1.45 |
| e6, e7 | escape | `ESCAPE_SCALE` 0.90/1.10/1.30/1.70 |
| e8 | rooms | `ROOMS_SCALE` 0.75/0.80/0.90/1.00 |
| e9 | survive | `SURVIVE_SCALE` 0.95/1.00/1.05/1.10 |
| e10 | escort | `ESCORT_SCALE` 0.70/1.10/1.20/1.30 |
| e11, e12 | boss | `BOSS_SCALE` 0.70/0.90/1.00/1.20 |

**No win rates have been measured at any sample size** — the smoke gate blocks
every run while e8 errors. e1 also gets the tutorial exemption when it is.

### Directional signals only — NOT acceptance data

Smoke is 2 games/cell (pure noise, the doc says ignore) and my probes used
default unit choices rather than `choicesForLevel`, so these are hints about
where to look first, nothing more:

- **e6** (novel/undertow, `scope:'all'` escape) — 25/25 party escapes on HARD
  in a 30-game probe. Looks far too easy; §6.5 already flags the perverse
  straggler incentive here.
- **e12** (finale) — party lost 26/30 on HARD in the same probe shape. Looks
  too hard, though that was measured *before* the ability fixes, which
  **strengthened** the boss (it now lands two abilities it previously could
  not) — so expect it to be harder still, not easier. Re-measure first.
- **e8** (rooms) — `⚠ draws 50% (stall)` on hard/balanced. Per the doc a stall
  is a placement/design problem, not an HP one.

## FABLE DIRECTION (review pass, 2026-08-21) — the 7 cells, in work order

The engine fix (`5fc1aad`) is REVIEWED and patched (`fb49cda`): one hole —
`visited` only recorded MOVE/CHARGE, so a move_self leap landing on the trigger
tile never sprang the ambush. The trail now records any position change, pinned
by a processTurn-level Leaping Slam test. ⚠ This can nudge e8/e2 numbers a few
points versus pass 3 (the brain leaping onto (6,3) now springs the guard) — the
smoke marker is content-hashed so batteries run without re-smoking, but expect
small drift.

**GOOD NEWS that changes the plan: e12's Standard-tile win IS observed in sim
now** — pass 3's e12/hard/balanced histogram shows `W:You reached the goal ×21`.
The old "the brain always takes the kill path" limit was measured on pre-fix
content and is STALE. The dual-win is live, measurable, and already load-bearing
for balanced's 90% — hand-verification is now confirmation, not discovery, and
tuning e12 must not price out the tile path.

Ordered by leverage, cheapest first:

1. **e4 nightmare** — scale 1.05 → ~1.12. Pure overshoot, one line.
2. **e2 nightmare (solvability, best 36% < 40)** — do NOT reach for placement
   yet. All three parties lose to `Your party has fallen` and the wins are
   mercy kill-alls, so it responds to scale; the last notch (1.10→1.00) moved
   best-party 26→36. One more notch, nm → 0.92–0.95, plausibly lands ≥40 while
   mean stays in [15,45]. Placement only if that fails.
3. **e6 hard/nm — the wall is NOT who Opus thought.** Pass-3 histograms: melee
   88–92%, ranged 98%, **balanced 49–61% and failing to the CLOCK**
   (`L:The deadline passed ×102` on hard). So: ranged over-crosses (kites the
   drowned dead from standoff, then strolls), balanced under-crosses. One lever
   fixes both directions: **move the drowned starts CLOSER to the party**
   (`spreadSweep.ts`) — close starts brick ranged's standoff (doc-measured),
   and earlier engagement ends fights sooner, easing the clock on balanced.
   After the spread lands, re-walk scale DOWN (current 2.00/2.40 were inflated
   to chase ranged's 100% and will overshoot once ranged is mortal).
4. **e3 easy/hard/nm (flat)** — the tuning table's hold rule, literally: the
   pikemen stand BESIDE the bridgeheads at (5,1)/(5,6); stand them ON the marks
   at (4,1)/(4,6). Then the win requires killing or displacing them, HP starts
   to matter, and scale wakes up. Expect to re-walk e3's scales from much lower
   once it bites (current 1.30–2.30 were tuned against a flat curve and mean
   nothing). The easy-cell ranged wall likely eases too: today the ranged party
   must park two bodies on exposed tiles deep in enemy range with nothing
   forced to come to them; guards-on-marks turns that into a fight it can win
   at range first.
5. **e9 nightmare (52%, scale-inert)** — do not push scale past 3.4; the table
   is right (survive lives in round count × wave size). There is no
   per-difficulty wave knob, so: add **+1 unit to the round-5 wave** (~10–15
   pts down across ALL difficulties), then re-center easy/med/hard by walking
   their scales DOWN (they respond fine at low values). Watch the win reason
   stays `round_reached`, not mercy.
6. **e12 hard — ranged walled (6%)** — losses are `Your party has fallen ×189`,
   NOT hero-sniped: the ranged party grinds down against the formation before
   the 214-HP boss dies. Two candidate levers, measure before choosing:
   (a) start-distance sweep (though far starts should already favor ranged —
   suspicion is muster_charge leaping INTO the clumped squishies; check the
   histogram of a ranged-only probe for deaths-by-ability if the sweep is
   flat); (b) trim the marshal's hard-rung HP so the race is winnable. Keep the
   Standard-tile path priced IN for balanced while doing it.
7. Then: full battery to `RESULT: PASS` (save `--json` to `balance_runs/`),
   boss encounters on nightmare first, deviations documented, balance report,
   register `unlitbeacon` LAST.

Fable's engine-fix review obligation from the owner: **discharged** (fb49cda).
