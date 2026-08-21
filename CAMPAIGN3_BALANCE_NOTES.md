# The Unlit Beacon — balance pass, session notes (Opus 5, 2026-08-20)

Work-in-progress notes for the campaign-3 balance pass
(`CAMPAIGN_BALANCING.md` operating procedure, design at
`mobile/CAMPAIGN3_DESIGN.md` §6.4–6.5). **Stopped mid-pass to cut a build.**

## STATUS IN ONE LINE

Runtime verification (§6.4) is **done except one item** and found two real
content bugs, now fixed — the campaign **SMOKES CLEAN**. The balance pass
itself (§6.5) has **not started**: all 12 `hpScaleOverride`s are still the
uniform placeholder and the 200-game battery has never run.

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

## §6.4 runtime verification — 4 of 5 confirmed

| # | Mechanic | Result |
|---|---|---|
| a | Novel abilities loader (first `novel` use ever) | ✓ **WORKS** — all three cast in play: `undertow` 56 casts/25 games (e6), `halt_the_line` 30 (e12), `muster_charge` 30 (e12). Two were mis-authored though — see below. |
| b | AI-cast `move_self` (`muster_charge`) | ✓ **WORKS** after the content fix — and it was **never a brain gap**. The brain's AoE placement already respects the free-landing-tile rule. Do not escalate this. |
| c | Dual-win `[units_dead, units_at_tiles scope:'main']` | ✓ **WIRED** — proved by pre-placing the main on the Standard tile (7,4): instant `winnerSide: p1, reason: "You reached the goal"`. **But see the measurement limit below.** |
| d | Rooms flags: `surprise` + wave `on:'door'` + `doorMode:'always'` | ⚠ **NOT FULLY VERIFIED** — the only outstanding §6.4 item. e8 runs clean (0 validation errors) so nothing is crashing, but I did **not** confirm each flag actually fires. |
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

## §6.5 balance — NOT STARTED

All 12 `hpScaleOverride`s remain `{ easy: 1.0, medium: 1.2, hard: 1.4,
nightmare: 1.6 }`. Nothing has been tuned.

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

## NEXT STEPS, in order

1. Finish §6.4 item (d): confirm the e8 room flags actually fire — the
   `on:'door'` wave springs, `surprise` applies, `doorMode:'always'` lets you
   bar the stair mid-fight.
2. Register `unlitbeacon` (needed for the sim).
3. `npx tsx src/ai/campaignSim.ts unlitbeacon --smoke` — re-gate on current content.
4. `npx tsx src/ai/campaignSim.ts unlitbeacon --games 200 --json results.json`
   — budget for a long run; the doc warns a full battery is hours.
5. Read the **mechanism histograms before the win rates** (doc's loop step 2):
   is each encounter decided by its own objective?
6. Structural pass → centring pass → final battery, per the doc's loop.
7. Unregister again if stopping before `RESULT: PASS`; register permanently
   once it passes.
8. Then the rest of the per-campaign checklist: boss on nightmare first,
   deviations documented, balance report in delivery notes, Fable review.
