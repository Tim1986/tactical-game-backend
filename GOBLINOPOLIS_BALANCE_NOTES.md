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
