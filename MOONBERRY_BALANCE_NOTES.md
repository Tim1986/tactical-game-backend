# MOONBERRY_BALANCE_NOTES.md — The Moonberry Masquerade

Design spec: CAMPAIGN_DESIGN_SPECS.md §4 (MASKS & MISDIRECTION — the palace
SEES you). Method: LANTERN_BALANCE_NOTES.md §1–§4.

## Baseline (old content, medium, 60 games) — mechanism histogram
e1 98/82/90 · e2 escort 97/97/100 (walkover; ends as kill-all) · e3 hold
100/37/100 (ranged walled) · e4 57/98/43 · e5 rooms 28/37/92 (melee+ranged
walled) · e6 race 72/82/93 won by KILL in 27 turns (a walk) · e7 protect
92/15/78 ("your charge has fallen" ×51) · e8 90/85/87 · e9 survive 88/48/47 ·
e10 rooms 10/98/80 (melee walled) · e11 boss 88/100/98 · e12 escape 90/98/100.
Kit probe: expose never cast in e2; concussive never in e3.

## Design pass — applied 2026-09-01 (smoke PASS)
A6: `spotlight` (crier: aoe exposed), `curtain_hook` (caller: pull+root),
`redraw` (Cartographer: ring rooted) — grasp/ignite retired from this roster
(they belong to other campaigns' identities). Passives: Undying footmen,
Opportunist duelist, Stalwart gate guard. Lifters get dagger_toss.
Levers: e3/e7/e9 clocks by tier; e4 easy one juggler; e6 couriers to the far
corners behind a guard line, clock 8/7/6/6; e7 specialist 74→110 HP; e12 exit
narrows at hard+, clock 9/8/8/7, r2 ambush to the flanks.
Not yet touched (balance phase): e5/e10 rooms melee walls (spread sweep first).

## D1 — designed content, medium mechanism (60 games) — 2026-09-01
e1 90 · e2 escort 99 (walkover; contact 62 HP is never threatened — the
stalker needs to reach it: move the stalker up-board, or the contact's HP down)
· e3 hold 100/18/98 (ranged walled) · e4 38/98/43 · **e5 rooms 2/0/72** —
Undying footman + concussive freeze + mender ward + Opportunist duelist on
exposed... at hpScale 1.37: a wipe for two comps (all-tier probe running) ·
e6 race 85/27/97 (ranged walled — the guard line blocks the lanes for
shooters) · e7 protect 75/97/92 ✓ · e8 53/85/53 · e9 62/63/45 · **e10 rooms
0/87/62** (melee 0%) · e11 52/98/98 · e12 escape 97 (walkover).

## D2 — full medium read after the sweep pass (60 games) — 2026-09-01
e1 98/82/90 · e2 82/53/98 ✓ (the escort is threatened now) · e3 83/73/90 ✓ ·
**e4 38/98/43** → one juggler at medium, recheck 20/98/93 (worse; sweep
running — the fire lanes vs melee are geometry) · **e5 rooms 50/25/100** ·
e6 97/80/92 ✓ · e7 75/97/92 ✓ · e8 53/85/53 · e9 62/63/45 (survive, floors
hold) · e10 rooms 47/100/95 · e11 52/98/98 · e12 98/95/98 (escape — floor
only; the tuner will not touch it, the clock 9/8/8/7 will).

## e4 — the one that would not move (2026-09-01) — PARKED for the owner's play
Melee read 7–28% at medium through six changes: every start distance the sweep
tried, two hazard layouts (scatter → burning square with cold lanes), the stage
edge walled behind the shooters, one juggler instead of two, and a footman in
the line. Traced cause: four shooters focus the first melee body to arrive
while kiting, and the brain's melee path crosses the fire (burning) to close.
Ranged 95–100 and balanced 70–98 the whole way. The final layout keeps the
burning square + the stage edge + the medium footman (the best-shaped board of
the six even if the number did not follow). This is a HUMAN question now: a
player who walks the cold lane and waits for the footman to come may not read
it as a wall at all. Owner adjudicates on device; the tuner treats it as a
fight cell meanwhile.

## FORK 0 — the owner's lever (2026-09-02)
Owner: a party type that cannot win an early encounter should be able to
choose the other fork. `fork_stage` (L4, after `audition_note`) now offers the
ferry-stage audition (e4, unchanged — ranged/balanced 95-98, melee ~25) or the
LOADING DOCK (e4b, new): a brawl, stagehands on you from turn one, an Undying
footman, no fire and no marksmen. e4b @ medium: melee 95 / ranged 80 / balanced
60 (three geometries: a walled lane read 63 then 35 for melee — ANY lane lets
three dagger-throwers burst the first body; adjacent start is the melee branch
by construction). Both branches level to 5 and rejoin at the servants' wing.
Achievements `the_audition` / `the_loading_dock`; flag `tookDock`.

## D1 battery (designed content, 150×25) + TUNE-D1 — 2026-09-02
`mb_D1_merged.json`: 33/48 flagged, three real cliffs — e3 hard/nightmare 0%
(85% walled: two scoped waves on the 7-round clock), e9 hard 8 / nightmare 0
(the r5 wave on clock 8), e4/e4b nightmare 4/0 — and the rest TOO EASY where
the emergency ladders (e5, e10) and the tuner (e11, e12) undershot the
build space. Applied in one edit: e3 clock 6 at hard+ with the gate guard
nightmare-only; e9 clock 7 at hard+, the r5 wave nightmare-only, scale flat;
e4/e4b nightmare sit on hard; e5/e10/e11/e12 ladders up; e6 medium clock 6;
e12 clocks one notch tighter. C1 running. The fork (e4/e4b) reads as intended
at hard: e4 52 / e4b 44 medians, so both branches are real fights.

## D1 battery (designed content, 150×25) + TUNE-D1 — 2026-09-02
`mb_D1_merged.json`: 33/48 flagged, three real cliffs — e3 hard/nightmare 0%
(85% walled: two scoped waves on the 7-round clock), e9 hard 8 / nightmare 0
(the r5 wave on clock 8), e4/e4b nightmare 4/0 — and the rest TOO EASY where
the emergency ladders (e5, e10) and the tuner (e11, e12) undershot the
build space. Applied in one edit: e3 clock 6 at hard+ with the gate guard
nightmare-only; e9 clock 7 at hard+, the r5 wave nightmare-only, scale flat;
e4/e4b nightmare sit on hard; e5/e10/e11/e12 ladders up; e6 medium clock 6;
e12 clocks one notch tighter. C1 running. The fork (e4/e4b) reads as intended
at hard: e4 52 / e4b 44 medians, so both branches are real fights.
