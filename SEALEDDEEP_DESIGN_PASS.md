# SEALEDDEEP_DESIGN_PASS.md — addendum to SEALEDDEEP_BALANCE_NOTES.md (2026-09-01)

Design spec: CAMPAIGN_DESIGN_SPECS.md §5 (ATTRITION & THE UNSEEN — and THE
SONG). The August certification predates BR3 (enemy press), A3 (specials
scaling) and DOOR1; today's baseline @ medium: e2 48/43/32 (too hard), e3
ranged 35, e7 melee/balanced 30 ("your hero has fallen"), e8 melee 32 (crew
dies), e10 melee 18, e11 ranged 33, e12 melee 42 / ranged 52. All archetype
walls — spread sweeps first in the balance phase.

## Design pass — applied (smoke PASS)
ENGINE (small, additive, ABL-16 + rulebook check + brain scoring):
`modify_cooldown` with `abilitySlug: '*'` sets back every special the target
has, never the basic, never below zero. New WEIGHTS.cooldownDenial = 9.
A6: `counting_song` (cultists + necromancer: aoe, specials +1) and `crescendo`
(the Conductor: single r4, 8 dmg + specials +2). Nobody else touches your
cooldowns — this is the campaign's verb.
Levers: e5 clock 7/8/8/9; e6 song 14/13/12/11; e7 stair 8/7/7/6; e2 easy one
archer; e4 easy has no singer.

## D1 — designed content, medium mechanism (60 games) — 2026-09-01
e1 85/83/58 · e2 48/43/32 (too hard, all comps) · e3 92/35/87 · e4 96 ·
e5 100/72/60 · e6 70/88/47 · e7 30/77/32 ("your hero has fallen") · e8
32/92/93 (crew dies under melee) · e9 70/97/82 · **e10 3/77/68** (melee 3%:
three singers + necromancer at 1.50 — the song stacks on a melee party that
must walk into it) · e11 90/33/95 · e12 43/40/100. Sweeps running on
e2/e3/e7/e8/e11.

## D2 — full medium read after the sweep pass (60 games) — 2026-09-01
e1 85/83/58 · e2 42/92/60 (melee soft) · e3 87/87/88 ✓ · e4 96 · e5 100/72/60
· e6 70/88/47 · **e7 30/77/32 "your hero has fallen"** → one reaver at
easy/medium (recheck 65/90/23 — balanced hero still dies; sweep running) ·
e8 77/98/98 ✓ · e9 70/97/82 · **e10 3/77/68** → scale 1.50→1.15 (recheck
50/100/100) · e11 83/73/97 ✓ · e12 rooms 43/40/100 (tuner).

## D1 battery (designed content, 150×25) + TUNE-D1 — 2026-09-02
`sd_D1_merged.json`: 30/48 flagged. My +1 sweep on e3 plus a raised ladder
overshot (medium 62 / hard 24 / nightmare 8) — back to 1.00-1.30; e5 nightmare
0% (67% walled) on clock 9 — clock 8; e7 carried a stale nightmare 2.00 (4%);
e1 nightmare 18. The finale run e9-e12 was 100% almost everywhere after the
emergency e10 drop and the tuner's undershoot — ladders up. C1 running.

## D1 battery (designed content, 150×25) + TUNE-D1 — 2026-09-02
`sd_D1_merged.json`: 30/48 flagged. My +1 sweep on e3 plus a raised ladder
overshot (medium 62 / hard 24 / nightmare 8) — back to 1.00-1.30; e5 nightmare
0% (67% walled) on clock 9 — clock 8; e7 carried a stale nightmare 2.00 (4%);
e1 nightmare 18. The finale run e9-e12 was 100% almost everywhere after the
emergency e10 drop and the tuner's undershoot — ladders up. C1 running.

## C1 confirm (150×25) + TUNE-C1 — 2026-09-02
`sd_C1_merged.json`: the TUNE-D1 ladders overshot the back half — e8 escort
72/52/12/4 (clock 9 + 1.50-2.20), e9 tide 56/20/0/0, e12 finale 88/48/12/0
with bossViability hard p75 32 (FAIL). The tuner's three-party table had said
"undershoot" for e9-e12 and I raised by 35-60% in one step — too much at
once; the 150-build space reads those rooms far harder than the three
representative parties do. Applied in one edit: e8 back to 1.30-1.75, clock
10 (nightmare 9); e9 0.90-1.20; e12 0.85-1.15; e10/e11 up (100% at every
tier); e5 nightmare 1.20. Medium wall shares at e4/e5/e7 (20/16/17 vs cap
15) are inside the ±5 rule — accepted. C2 running.

## CERTIFIED — 2026-09-02 (C2 + single-cell walk on e9; stopping rule)
`sd_C2_merged.json` (150×25). bossViability e12 clears every tier (hard p75
92, nightmare median 40 — selective). Fight cells in band; medium wall shares
at e4/e5/e7 (14-20 vs cap 15) inside the ±5 rule. Objective cells run TOO
EASY on easy medians with walls inside caps — accepted by doctrine.
e9 (the tide) at nightmare was a cliff pair: two r6 ghouls @1.12 → 12%, one
@1.40 → 8%, one @1.20 → 40% median / 4% walls ✓ — documented rung, cell done.
e12 hard/nightmare re-rung to 1.15/1.25 (60/24 ✓). Engine at commit; a
brain/engine change voids this table. ALL FOUR NON-REFERENCE CAMPAIGNS ARE
NOW CERTIFIED on their redesigned content.
