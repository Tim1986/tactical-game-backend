# GOBLINOPOLIS_BALANCE_NOTES.md — The Bell of Goblinopolis, rebalance + redesign

Operator: Fable. Started 2026-09-01, in parallel with Lantern (owner: *"take a
look at the next goblin campaign, start redesign and rebalance work on that
while we wait for lantern battery"*). Same mandate as Lantern — redesign where
the encounter design is lacking; every campaign as interesting and unique as
Unlit Beacon is becoming. Method: LANTERN_BALANCE_NOTES.md §1–§4.

Design brief of record: `mobile/TRILOGY_REDESIGN.md` §4 (paid · funny ·
delivery). Where the shipped content falls short of ITS OWN brief, that is the
first thing to fix.

## 1. Baseline instruments (old content)

* `balance_runs/gob_smoke_BASE.log` — smoke PASS.
* `balance_runs/gob_reasons_BASE_medium.log` — mechanism histogram @ medium.
* `balance_runs/gob_kitusage_BASE.log` — kit probe.
* Baseline battery: queued behind Lantern's (CPU) — `gob_BASE_s{0,1}.json`.

### 1a. The mechanism histogram (medium, 60 games) — the design verdict

| enc | palette | how it actually ends (melee / ranged / balanced) | verdict |
|---|---|---|---|
| e1 | kill-all | 92 / **25** / 95 | ranged walled at L1 — spread, not mean |
| e2 | escort (wagon) | 98 / **15** / 97 — "party has fallen" ×40 | the route walks INTO the enemy line; ranged cannot screen it |
| e3 | carve | 92 / 88 / **30** | bimodal on the balanced comp — sweep |
| e4 | rooms | 45 / 98 / 92 | melee soft |
| e5 | hazard | 53 / 80 / 72 | fine shape |
| e6 | race-kill (barge) | **37** / 92 / 48 — "deadline passed" ×37 | pinning roots the melee party and the clock does the rest |
| e7 | "hold" (plain survive) | **33** / 68 / 78 | melee walled; shipped without the two-plates objective its brief specified |
| e8 | siege | 93 / 87 / 83 | walkover |
| e9 | boss (Snagg) | 73 / **100** / 62 | ranged kites an immovable grasp-warlock for free |
| e10 | survive (rain) | 97 / 90 / 83, kill-all ends half the games | walkover, survive in costume, no water |
| e11 | escape (stair) | 100 / **32** / 72 | the r2 ambush spawns on the party's back rank — Lantern e7's exact failure |
| e12 | race (ring it) | **33** / 97 / **18** — "deadline passed" ×34/×44 | the hero cannot get through: r3 wave lands IN the lane, 8-round clock |

Kit probe: every engine kit fires except the mender's heal (a hard/nightmare
wave, not present at medium) and the bruiser's shockwave in e11/e12 (arrives in
a late wave and dies first). No dead content at medium.

## 2. Design read

**What is already right.** The brief's structure is intact: the boss is
mid-campaign (e9, Snagg), the finale is the promised race (e12), rooms/hazard/
carve/escort all present, both forks pay a boon. Counter caps: immovable is
**8% of bodies** (5 of 62) — the 22% figure in BALANCE_STAGE2_PLAN §2c was the
5-encounter version; no breach.

**Where it falls short of its brief.**

1. **e7 "The Weighbridge" shipped as a plain survive.** The brief: *"Hold both
   scale platforms while the bell is weighed — leave either, the reading
   voids."* The objective is `round_reached(6)`; the plates exist only in the
   banner text. The engine has the two-buttons puzzle (`units_at_tiles` +
   `simultaneous`) and it is unused here. Same shape failure as Lantern e8.
2. **Four survive-the-clock encounters** (e7, e8, e10 + e6/e12 deadlines),
   with e7→e8 consecutive — palette rule 2. The brief itself lists e7 hold /
   e8 siege / e10 survive — three of one family; the fix for e7 (above) makes
   it a hold and breaks the run of two.
3. **No campaign abilities.** Thirteen enemies, all on engine kits. The
   villain is "warlock + grasp + immovable" and the brief's own line —
   *"drags you back into the queue you were trying to leave"* — is exactly a
   bespoke ability waiting to be written. The BELL (two tons, loud, the whole
   campaign's object) is on the board once (e2, as a wagon).
4. **Flat ladders.** e7 0.90/1.05/1.05/1.10, e8 and e10 0.85/0.97/0.97/1.05 —
   hard equals medium three times. These are the survive cells, where scale is
   decorative (§0 doctrine) and the tier levers (`roundByDifficulty`,
   scoped waves, `enemiesByDifficulty`) should carry it. Only scoped waves are
   used.
5. **e10 "The First Rain"** — *"keep the bell above the water"* — has no
   water. It is e8 again with looters.

## 3. Redesign — proposed, to be checked against the histogram

* **e7 → hold (two-buttons).** Plates at (2,4) and (5,4) [the board's blocked
  pillars at x=3/x=5 already frame them]; `units_at_tiles` simultaneous,
  deadline `roundByDifficulty` 8/7/6/6; the waves land while the party is
  split. Nightmare adds a third plate? No — the brief says TWO plates; use the
  clock and the r4 bruiser instead.
* **Snagg gets a kit (A6):** `unfiled` — pull 3 + rooted 1 + 5 unblockable
  ("back of the queue"), and `red_tape` — aoe r1 apply_status weakened 2 turns
  ("the paperwork"). Clerks: seals=ward (keep), stamps=expose (keep).
* **The bell as a mechanic in e10/e11/e12:** the brief's "carry the bell" is
  an escape with `scope:'all'`; consider `scope:'main'` carrying it (the hero
  is the bell-bearer) + `main_dead` loss on e11 — but Unlit e11 showed
  `main_dead` bimodality by hero class; measure before committing.
* **e10 water:** rising-water = shrinking safe zone. No engine support for
  dynamic hazards; approximate with `tilesByDifficulty`-style scoped waves of
  looters from the LOW side and a `round_reached` clock by tier. Or make it the
  campaign's `protect`: the bell-wagon (hold, 0 move) must survive the flood
  night — distinct from e8's siege (party survives) and from e2 (route).
* **Ladders**: survive cells get `roundByDifficulty`; fight cells re-walked by
  the tuner after the structural pass.

## 3a. Structural pass 1 — APPLIED 2026-09-01 (goblinopolis.ts, smoke PASS)

Only the shapes that do NOT share a skeleton with Lantern's unverified fixes
(two-buttons hold, flank ambush) went in this pass; e7 and e11 wait on
Lantern's R2 read so one measurement validates both campaigns' fix.

* **A6**: `red_tape` (aoe r2 around Snagg, 2 unblockable + weakened 2 turns).
  Snagg's kit is now eldritch / grasp / red_tape.
* **e2**: enemy line moved OFF the wagon's route to the eaves (6,1)/(6,6)/(7,2);
  wagon 96→120 HP.
* **e6**: deadline `roundByDifficulty` 8/7/7/6.
* **e8**: `roundByDifficulty` 6/7/8/8; ladder made monotonic 0.85/0.95/1.00/1.05.
* **e10**: survive → PROTECT. The bell-wagon (hold, 140 HP) sits at (4,4);
  `flood_looter` (dedicated key, `priorityTarget: 'ally'`) hunts it; win
  `roundByDifficulty` 6/7/8/8, loss `ally_dead`. Party starts around it.
* **e12**: r3 wave moved from the lane (4,3)/(4,5) to the avenue behind
  (0,2)/(0,5); deadline `roundByDifficulty` 9/8/8/7.

Instruments on this content: `gob_reasons_R1_medium.log`, `gob_kitusage_R1.log`.

### Pass 1b — e1 and e3 (applied after the tuner + spread sweeps, smoke PASS)
* **e1 rebuilt to its brief.** Two ARCHERS at L1 walled a ranged party at every
  scale the tuner tried (25 / 5 / 0 across tiers) and every distance the
  sweep tried — farther only flipped the wall onto melee. The brief said
  "metal-thieves over one wall, in two beats": two looters + a scout, and two
  more looters on round 2. Scale provisional 0.85/1.00/1.10/1.20 (five bodies
  now); the tuner re-walks it.
* **e3 one step closer** (sweep +1: balanced 41→70, spread 50→28), scale
  +0.10 across the ladder to pay for it.

Instruments: `gob_reasons_R2_medium.log`.

## 4. Order of work — as Lantern §4.

## 5. DESIGN TABLE — owner ruling 2026-09-01: "focus on good encounter design first, balance after"

Every encounter must fill the first two columns or be cut. Written against the
lessons ledger (Unlit Beacon's e4 "fire across YOUR path", the e9 counterplay
ruling, the puzzle traps, passives-as-identity, tier = a different fight).

| enc | signature (one sentence) | counterplay | tier lever (not HP) | trap |
|---|---|---|---|---|
| e1 Foundry Yard | Metal-thieves over one wall, in two beats. | Don't overextend into the second beat. | scale only (tutorial) | the second beat |
| e2 First Mile | The bell-wagon is the slowest, loudest thing on the road; the Vengeful bellrunner goes for it. | Kill the runner FIRST — half-dead, he hits harder. | nightmare +runner | order |
| e3 Tollgate | A barricade carve: the Kettlehelm (Thorns) holds the gap, the sparkcap burns behind him. | Shoot the kettle, don't punch it; ignite = kill the sparkcap first. | scale | order + geometry |
| e4 Office of Forms | Two rooms, no rest: the Clerk of Stamps EXPOSES you, the Clerk of Seals is warded. | Spend specials in room 1 only if you can afford room 2. | room garrison | resource |
| e5 Ink Works | Fire in lanes where you want to walk; sparkcaps make more. | Walk the cold gaps; kill the sparkcaps to stop new fire. | (todo: easy = one sparkcap) | hazard |
| e6 Customs Barge | Clear the barge before it casts off — the inspectors PIN you into the clock. | Kill the pinner first / purify. | **enemiesByDifficulty**: one inspector at easy/medium, the full desk at hard+; clock 8/7/7/6 | order |
| e7 Weighbridge | A hero on each plate at the same time — and the Kettlehelm is STANDING on the far one. | PUSH him off (Shield Bash / Shockwave / Fear) instead of chewing through Thorns; one hero holds the near plate. | clock 8/7/7/6 | two-buttons + displacement |
| e8 Impound Yard | Held all night, in shifts, by people paid by the hour. | Kill the mender in the hard wave first. | **enemiesByDifficulty** (easy: no pathfinder); clock 6/7/8/8 | order (hard+) |
| e9 The Audit | Snagg (Stalwart, immovable) drags you back into the queue; Red Tape weakens the room; the Clerk of Seals wards him ONCE. | Bait the ward with a small hit, then commit; purify the weakened finisher. | scale + clerks | **order (bait the ward)** |
| e10 First Rain | The bell sits in the rising street and the looters want IT, not you. | Screen the wagon; the bruiser's shockwave roots your screen — purify. | clock 6/7/8/8 | protect |
| e11 Stair of Stamps | Up the switchback with the bell; the Wardens IMPOUND stragglers (rooted 2). | Never end a turn in a warden's reach; purify the seized. | ambush size by wave | escape |
| e12 Ring It | The crest is coming; the pathfinder pins the runner and the sparkcap burns the rope approach. | Kill the pinner first; the hero runs, the rest screen. | **enemiesByDifficulty** (easy: scouts, no sparkcap); clock 9/8/8/7 | order + race |

Roster identity added this pass: `impound` (wardens), targeted `red_tape`
(Snagg), Thorns on the Kettlehelm, Vengeful on bellrunner + bruiser, Warded on
the Clerk of Seals, Stalwart on Snagg. Every status family has an answer in the
player kit (purify / ward / stalwart / range).

Still thin, flagged: e5's tier lever, and e1/e3/e4/e5 have no bespoke verb —
the city's identity lives in the clerks and wardens, not the street goblins.
Acceptable for now; revisit after the owner plays it.

## 6. D1 — designed content, medium mechanism (60 games) — 2026-09-01
e1 93/23/55 (ranged still walled — the knives out-trade a ranged party at L1;
sweep running) · e2 88/83/78 ✓ · e3 90/78/58 ✓ · e4 rooms 27/70/88 (melee
walled: Stamps' expose + Thorns kettle + warded Seals) · e5 50/85/65 ✓ · e6
68/67/75 ✓ (tier-by-bodies worked) · **e7 7/15/100** — the contested plate
with a Thorns kettle ON it and the bruiser behind walls melee AND ranged;
balanced walks it. Contest is right, the guard is wrong: a pushable non-Thorns
body (bruiser) on the plate, the kettle behind. · e8 68/70/87 ✓ · e9 93/100/50
(balanced soft) · e10 100/100/100 (protect too easy at 200 HP — 160, and the
looters' hunt needs the r2 looter back) · e11 88/98/58 ✓ · e12 30/57/40
("deadline passed") — the rope is still too far for a melee hero in 8; sweep.

## 7. e7 — six geometries, one lesson (2026-09-01)
| version | plate contest | m / r / b @ medium | why it failed |
|---|---|---|---|
| v1 | uncontested, plates 2 steps away | 100/100/100 in 3 turns | nobody on the plates |
| v2 | Thorns kettle ON the far plate | 7 / 15 / 100 | punching Thorns off a tile is not a plan |
| v3 | bruiser ON it | 100 / — / — in 3 turns | a melee guard walks OFF the plate to fight (traced) |
| v4 | pinning archer ON it | 15 / 93 / 73 | the pin walls melee |
| v5 | nobody on it, guards flanking, far | 100 / 60 / 33 | a Swift rogue walked the open lane onto it in ONE move (traced) |
| v6 | the plate behind a wall column (gaps at both ends); win = plates OR survive | 70 / 88 / 30 | balanced wiped on the survive path (fight strength → scale 0.72) |
Ruling recorded in CAMPAIGN_DESIGN_SPECS §0 item 9: the contest must be TERRAIN,
and the deadline the slow alternative, not a loss. The plates are now a human
path (the brain will not split around a wall) — the sim measures the survive
floor only, which is what the doctrine says to read on objective cells anyway.

Rechecks after the sweep-backed placements (medium, 40 games):
e1 95/53/70 ✓ · sd e2 38/95/78 (mean 70) · mb e3 83/73/90 · mb e5 50/20/100
(from 2/0/72; ranged still soft — tuner) · mb e6 95/80/93 · mb e10 40/100/93
(from 0/87/62) · sd e3 88/88/88 · sd e8 80/98/98 · sd e11 85/70/95.

## 8. D2 — full medium read after the sweep pass (60 games) — 2026-09-01
e1 95/62/62 ✓ · e2 88/83/78 · e3 90/78/58 ✓ · **e4 rooms 27/70/88** (melee
walled — tuner first, it is a fight cell) · e5 50/85/65 ✓ · e6 68/67/75 ✓ ·
e7 40/77/33 → scale 0.72 (survive floor) · e8 68/70/87 ✓ · e9 93/100/50 ·
e10 82/57/85 ✓ (the protect bites: "your charge has fallen" x26 for ranged) ·
e11 88/98/58 · e12 30/57/40 → no pinner at easy/medium + clock 10/9/8/7
(recheck 90/55/40).

## 9. D1 battery (designed content, 150×25) + TUNE-D1 — 2026-09-02
`balance_runs/gob_D1_merged.json`: 21/48 flagged. TOO EASY: e2 hard, e6
easy/medium, e7 easy/medium, e8 easy, e9 easy–hard, e11 all four, e12
easy/medium. TOO HARD (wave/clock cliffs, not scale): e3 nightmare 8%, e6
nightmare 4% (53% walled), e7 hard 24 / nightmare 8, e8 hard 4 / nightmare 0
(71–80% walled), e10 hard 16 (43% walled). bossViability e9: p75 92 at hard ✓,
nightmare selective. Applied in ONE edit: tuner ladders monotonic; e3
nightmare sits on hard (the AC bonus is the tier); e6 nightmare clock 7; e7's
r4 bruiser wave is nightmare-only, scale flat; e8 clock 7 at hard+ (was 8),
scale flat; e10 hard clock 7; e11 gains a hard+ r3 wave from above and the
tuner's ladder; e12 nightmare bimodal accepted (fast heroes win); e4 room 1
loses the Clerk of Stamps (the expose was the melee residual). Confirm C1 running.

## 10. C1 confirm (150×25) + TUNE-C1 — 2026-09-02
`gob_C1_merged.json`: 18/48 flagged, and NO TOO HARD cell remains — e3/e6/e7/e8
top tiers all in band after the wave/clock changes. What is left: TOO EASY at
easy/medium on the objective cells (e6 race, e7 hold, e8 siege, e2 escort —
floors hold, accepted by doctrine), the fight cells the three-party tuner
undershoots against the build space (e4, e12 easy/medium — up by hand), the
finale approach e11 soft at every tier (ladder up), and one real wall: e9
nightmare 4% median / 53% walled at 1.57 — Snagg's Red Tape + Stalwart brick
the bottom half of comps at that pool; nightmare now sits on hard's 1.45.
C2 running.

## 11. CERTIFIED — 2026-09-02 (C2 + single-cell nudges; stopping rule)
`balance_runs/gob_C2_merged.json` (150×25). No cell TOO HARD. FIGHT cells in
band: e1, e3, e5, e8 hard+, e10, e12 (medium 84, four over the ceiling —
inside the ±5 rule). bossViability e9 clears every tier (hard p75 88, medium
median 84; nightmare selective by design). e9 medium 1.30→1.22: walls 11% ✓.

OBJECTIVE cells (floor-only): e2 escort, e6 race, e7 hold, e8 siege, e11 escape
run TOO EASY on the median with every wall share inside its cap — accepted by
doctrine (an escape is won by arriving; scale 1.20–2.00 moved e11 from
97/91/75/77 to 90/81/76/77 and no further, which is the instrument saying so).

THE RESIDUAL: e4 The Office of Forms (rooms, L4) at medium — a pure-melee comp
reads 23–32% through five body swaps (Stamps→scout→looter in room 2, two bows→
bow+knife in room 1, Thorns kettle→bruiser) while ranged and balanced read
95/98. The constant is the door-crossing tax across two rooms for a comp that
must walk in; 32% is three points under the floor. PARKED at the best-shaped
board (Seals + bruiser + looter; scout + looter). ⚠ FORK CANDIDATE under the
owner's 2026-09-02 rule: it is early (L4) and the story already has a second
way through the Office ("a different stamp"). Owner adjudicates on device.
Engine at commit of this note; a brain/engine change voids this table.
