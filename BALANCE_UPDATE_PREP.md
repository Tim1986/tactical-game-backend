# Balance Update Prep — what lands BEFORE the sims run
2026-08-31, Fable. Source data: UNLITBEACON_BALANCE_NOTES.md (calibration run 3),
BALANCE_PROCESS_V2.md. Principle: the sims must measure the content and the brain
we intend to ship — anything changed after the battery invalidates the battery.

## A. Repairs (not tuning — do these mechanically, first)

1. **Fix all 17 difficulty-ladder inversions.** Rule: hpScale must be
   non-decreasing easy→nightmare. e9 medium 4.10 → between 1.45 and 1.70.
   Shrink KNOWN_INVERSIONS in difficultyOrdering.test.ts to zero.
2. **Finish the brain batch NOW — including enemy passivity (E8).** Three brain
   changes are already in (shields/status, empty-cast net, door crossing).
   Passivity is the one still open; fixing it after the battery voids the
   battery. Diagnose the hold-back, fix, re-run the exploit suite.
3. **Specials scaling policy.** Only ffh and assassinate scale at L6. Decide the
   rule (recommend: every damage special gets a L6 rung, sized like ffh's
   14→18 ≈ +30%) and apply once, so the sims measure the intended kit.

## B. Design decisions the owner has already signaled (implement pre-sim)

4. **Per-tier threat access is the primary difficulty lever; HP is trim.**
   Owner reached for it three times running: wisp from turn 1 on hard+ (e5),
   four exit tiles on hard+ (e6), one fewer freeze on easy (e7), Flame Jet out
   of easy / softened on medium (e4). Grammar needs per-difficulty fields once
   (enemy specials, wave turns, tile lists) — one schema change now.
5. **Rogue level-ups**: redistribute so no four-in-a-row HP-only levels, and
   make L10 the damage level for every class (currently it is for none).
6. **Deep gifts**: movement is dead on 6/8 classes — raise to +2 or replace
   with the owner's +1 range idea; trim fighter armor (+13 vs next-best +5.8).
   Warlock's near-equal row is the model. Equal strength = good; dominance = bad.
7. **Root viability** (e2/e6/e7 have no rootable melee): add one rootable
   melee enemy where roots are a party's counterplay, per owner's earlier read.

## C. The measurement contract (write down before running)

8. Bands are per-tier SHAPES, not one number:
   - easy: casual ≥ 70%, optimal ≈ 100. (Promise: kit knowledge suffices.)
   - medium: optimal median 80–95, casual 20–50. Skill delta is a FEATURE.
   - hard: optimal median 55–80.
   - nightmare: optimal median 20–50, thin margins.
9. Report median (best–worst) over openings; FIGHT and OBJECTIVE cells never
   averaged together; margin quoted beside win rate; per-comp, never aggregate.
10. e1–e5 anchors stand; e6–e9 provisional (Kill Shot/RoF display bug);
    e9 anchor void. Door rooms in the other four campaigns have never been
    measured under DOOR1 — battery must cover them.

## Order: A1 → A2 → A3 → B4–B7 → smoke → full battery → owner replays e6–e9.
