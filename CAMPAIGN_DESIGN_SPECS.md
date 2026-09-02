# CAMPAIGN_DESIGN_SPECS.md — the five campaigns, designed to be fun and DIFFERENT

Owner mandate (2026-09-01): *"use all we've learned in the recent work on the
Unlit Beacon campaign about what makes encounters fun, and do your best to make
these encounters interesting, fun, and with sufficient variety that all the
campaigns are fun individually, and unique from each other so all are worth
purchasing. Focus on encounter design first, then once you have a set of
campaign design specs you are confident in, start work on balancing them."*

This file is the spec. Per-campaign working notes (measurements, passes) live in
`<CAMPAIGN>_BALANCE_NOTES.md`; the content lives in `src/campaigns/*.ts`.

---

## 0. What we learned makes an encounter fun (the ledger, from Unlit Beacon)

1. **The objective must be what ends the fight.** Measured with the mechanism
   histogram (`campaignSim --difficulty medium`): a race that ends "target
   destroyed" in 20 turns is a kill-all in a costume; a survive that ends
   "every enemy has fallen" has no threat. Design bug, not a number.
2. **A signature a player can say in one sentence** — and the owner's favourite
   fight (Unlit e4) is the one where *bad play is punished hardest*: "the fire
   spreads across YOUR path, not theirs."
3. **Counterplay that is visible.** Owner ruling on Leaping Slam: a mechanic is
   fine at nightmare *as long as it's killable* and the player has options.
   Every bespoke ability below names its answer. "Roots feel unplayable" is
   what happens when a counter has no answer (stalwart everywhere).
4. **Tier = a different fight, not a bigger number.** `enemiesByDifficulty`
   (a soft torchhand on easy, the real one on hard), `tilesByDifficulty`,
   `roundByDifficulty`, scoped waves. hpScale is decorative on objectives.
5. **Enemy passives are free identity.** Vengeful, Thorns, Warded, Undying,
   Stalwart, Opportunist, phasing — each changes how you must fight the body.
6. **The puzzle traps, at encounter scale.** The free kill as bait; the order
   trap (kill the pinner first; bait the ward, then commit); the blocked line;
   the status you must clear before the finisher works. Fights with one of
   these inside feel *clever*, not merely hard.
7. **Placement is a puzzle at hard+** if the board telegraphs it, and a wall
   if it doesn't (spreadSweep names the walled archetype in two minutes).
8. **The brain has no flee behaviour** — a race against runners is built from
   DISTANCE, guards and a clock, never from fleeing. And a kit the brain never
   casts is dead content: `kitUsageProbe` before shipping any ability. On a
   rogue chassis a special must out-score Twin Strike's 16.
9. **Two-buttons holds need a CONTESTED tile — and the contest must be
   TERRAIN, not a body.** Uncontested plates are taken in three turns; a
   melee guard *on* the tile walks off it to fight; a Thorns or pinning guard
   on it walls whichever comp cannot dislodge it; and an open lane lets a
   Swift unit reach the far mark in ONE move (Goblinopolis e7, five
   geometries). What works: the mark is walled off from the straight lane so
   it is reached AROUND the guards, and the deadline is the slow alternative,
   not a loss (win = plates OR survive).
10. **A defenceless VIP wants boss-tier HP for its tier**, and escorts need
    LESS added pressure at top tiers than kill-alls (the VIP does not scale).
11. **Sim doctrine when balancing:** fight cells are band-checked; objective
    cells are FLOOR-only (the sim understates the human on objectives).
12. **The stopping rule:** a cell is done when it passes, or misses by ≤5 wall
    points, or is cliff-locked and documented. Do not re-certify to confirm.

Palette rule (CAMPAIGNS.md §8): ≥4 types, never two consecutive alike, two
kill-alls must differ in carve AND composition.

---

## 1. Five campaigns, five MECHANICAL identities

The story registers were already distinct (warm recovery / bureaucratic comedy
/ elegant heist / crypt attrition / winter war). What was NOT distinct was the
board: four of the five shipped on engine kits with no bespoke verbs and the
same three objective shapes. Each campaign now owns a mechanic family — its
enemies' verbs, its passives, and the objective shapes it leans on — so that
playing all five is five different games of the same system.

| campaign | identity (what the board does to you) | its verbs (A6) | its passives | objective shapes it owns |
|---|---|---|---|---|
| **Lantern** (free) | LIGHT & DARK — the sampler. Every status family once; the dark takes your sight, the crown burns, the pack leaps. | hamstring · pounce · snuff · crown_blaze · mine | undying King (+Vengeful at nightmare), warded (none now) | one of everything: hold, race, escape, two-buttons, survive, escort, rooms, boss |
| **Goblinopolis** | CONTROL & PAPERWORK — they do not want to kill you, they want to STOP you. Roots, pushes, seizures, tile objectives; the bell is the object. | red_tape (weaken) · impound (root 2) | Thorns kettle, Vengeful couriers, Warded clerk, Stalwart Snagg | two-plates hold, PROTECT the bell, race to the rope, escape up the stair; a MID-campaign boss |
| **Moonberry** | MASKS & MISDIRECTION — the party are the performers; the palace SEES you. Exposed (you cannot dodge) is the campaign's status; Undying footmen are the mirrors; the Cartographer redraws where you stand. | spotlight (aoe exposed) · curtain_hook (pull + root) · redraw (ring rooted) | Undying mirror_footmen, Opportunist duelist (feeds on exposed), Stalwart gate guards, Warded Cartographer | escort (hunted VIP), hold-the-arch, courier race, PROTECT the specialist, carve maze, survive-the-sweep, 3-room vault, boss on stage, rooftop escape |
| **Sealed Deep** | ATTRITION & THE UNSEEN — phasing wraiths through walls, drain, fear, thorns zombies, and THE SONG: the choir extends your cooldowns. Your specials are what the barrow eats. | counting_song (cooldown +1 in radius) · crescendo (cooldown +2 + dmg, Conductor) | Thorns+Stalwart zombies, Opportunist ghouls, Vengeful berserker, Warded necromancers, phasing | protect-in-place, survive the wraiths, 13-round chanter hunt, flooding stair (main_dead), escort under a hunter, three wards at once, 3-room finale |
| **Unlit Beacon** (reference) | FORMATIONS & THE ROAD — a drilled army: pikemen, standards, doors and the crossing tax, the press. | undertow · halt_the_line · muster_charge · flame_jet_soft | Stalwart pikemen (dieted), Vengeful breakers, Siphon | siege at the gate, bridgeheads, rooms with doors, hold-the-mouth, escort to parley, duel (hero-hunt, %damage), standard-seize finale |

Cross-campaign guardrails: no verb is shared between campaigns (grasp/pinning/
ignite are ENGINE kits and may appear anywhere; the bespoke ones are exclusive).
The two-buttons hold appears in Lantern (bridge), Goblinopolis (plates) and
Sealed Deep (three wards) — three different contests: split under fire /
push the guard off / cover three at once. Every campaign has exactly one
boss+ward order trap OR none; the boss+mender pattern is retired everywhere.

---

## 2. Lantern — see LANTERN_BALANCE_NOTES.md §5 (design table) — DONE, awaiting balance.
## 3. Goblinopolis — see GOBLINOPOLIS_BALANCE_NOTES.md §5 — DONE, awaiting balance.

---

## 4. Moonberry — design table

Baseline (medium, old content): e2/e11/e12 walkovers (97–100%), e6 race
resolves by kill in 27 turns (a walk), e7 protect walls ranged at 15% (the
specialist dies), e5/e10 rooms wall melee (28% / 10%), e3 hold walls ranged
(37%), e9 survive walls ranged+balanced (48/47). Kit probe: `expose` never
cast in e2, `concussive` never in e3, shield_bash/longshot never in e9.

Roster changes:
* `palace_crier` (sorcerer): **spotlight** — aoe r1 around a tile within 5,
  4 unblockable dmg + EXPOSED 2 turns ("you have been SEEN"). Counter: ward /
  shielded, or kill the crier first — exposed is what makes everything else
  land. Replaces ignite.
* `moonhook_caller` (warlock): **curtain_hook** — 6 unblockable, pull 3 toward
  caster, rooted 1 ("hooked off the stage"). Replaces grasp (the engine pull
  belongs to Lantern's croakers and Goblinopolis's Snagg).
* `night_cartographer`: **redraw** — ring r2 around himself, 5 unblockable +
  ROOTED 1 to every enemy ("you are where I drew you"), plus curtain_hook.
  Warded stays (the alpha-strike eater). Counter: stalwart, or stand outside
  the ring and let the mender's ward fall to a small hit first.
* `mirror_footman`: **Undying** ("the reflection gets up") — counter: finish
  with a multi-hit or a second body; concussive stays.
* `starstep_duelist`: **Opportunist** (+4 vs any status — and this campaign
  paints EXPOSED on you). Counter: purify the spotlight.
* `velvet_gate_guard`: **Stalwart** (a doorman cannot be bashed aside).
* `crescent_stalker`: keeps the hunt; `lantern_lifter`: `dagger_toss`.

| enc | signature | counterplay | tier lever (not HP) | trap |
|---|---|---|---|---|
| e1 Canal Dock | Three lifters at the water-stairs, and one comes up BEHIND you on round 3 — teaches that waves exist. | keep a body facing the stairs | scale (tutorial) | the late wave |
| e2 Market Escort | Four hundred stalls of cover; the stalker moves parallel to you and wants the contact | kill the stalker before he reaches the contact; the contact fights back | nightmare +duelist | order |
| e3 Silver Arch | Hold the arch six rounds while the gate guard (Stalwart) and the mender's ward turn your alpha strike away | don't bash the doorman; bait the ward; the marksman is the real damage — shoot him | waves scoped by tier; clock 5/6/7/7 | bait the ward |
| e4 Ferry Stage | The embers are already burning where you want to stand; the jugglers make more | walk the cold tiles; kill jugglers to stop the fire | easy: one juggler | hazard |
| e5 Servants' Wing | Two rooms, no rest: the Undying footman gets back up in room 1 | finish him with a second hit; spend room 1's specials knowing room 2 has a mender | room garrison | resource + follow-through |
| e6 Invitation Courier | Two couriers, far corners, behind a guard line, on a clock that tightens by tier | send the fast unit; ignore the guards (they are bait) | clock 8/7/6/6 | free-kill bait |
| e7 Front Door | The specialist works the lock (armed, 110 HP) while the landing is overlooked from three sides; the caller HOOKS your screen off it | kill the caller first; stand where the hook cannot pull a guard out of the ring | clock 5/6/7/7; hard+ second footman | order |
| e8 Hall of Mirrors | Lanes of mirror frames; the Undying footmen know which are real; the crier SPOTLIGHTS whoever picks wrong | kill the crier; go through footmen with multi-hits | scale (carve) | geometry |
| e9 The Unmasking | The floor sweeps for impostors: spotlight paints you EXPOSED and the duelist (Opportunist) feeds on it | purify/ward the spotlit; kill the crier | clock 6/7/8/8; r5 wave hard+ | order |
| e10 The Vault | Three rooms of collected things — and no Charter | conserve across three doors | room garrison (easy: 2+2+2) | resource |
| e11 The Stage | The Cartographer REDRAWS the ring (rooted), hooks a hero to him, and is warded once by the mender | bait the ward with a small hit; stalwart hero or stand outside r2; kill the mender last, not first | scale + nightmare Vengeful | bait the ward |
| e12 Rooftop Line | Alarm waves behind, exit at the gondola line; the marksmen on the roofs pin the last one out | keep the slowest unit central; kill marksmen | exit tiles narrow at hard+; clock 9/8/8/7 | escape |

---

## 5. Sealed Deep — design table

Certified 38/48 in August on an older engine; the baseline today walls melee
on e7 (hero dies on the stair, 30%), e8 (crew dies, 32%), e10 (18%) and e12
(42%), and ranged on e3 (35%) and e11 (33%). Its DESIGN is the strongest of
the four — phasing, drain, fear, thorns, three wards, a 13-round hunt — and
the fixes are archetype walls (spread sweeps) plus ONE missing verb: the choir.

Roster changes:
* `cultist` / `chorister_cultist_*`: **counting_song** — aoe r2 around a tile
  within 4, 2 unblockable dmg + `modify_cooldown` +1 on every enemy's special
  ("the song dulls your edge"). Unique to this campaign: nobody else touches
  your COOLDOWNS. Counter: silence the singer (they are the kill-target) and
  spend specials BEFORE stepping into the song's reach.
* `the_conductor`: **crescendo** — single r4, 8 unblockable + cooldown +2 on
  the target's special; keeps grasp; Warded stays.
* `necromancer` (e10): counting_song too — the choir's master.
* `zombie` Thorns+Stalwart, `ghoul` Opportunist, `berserker` Vengeful,
  wraith/specter phasing — all already there; unchanged.

| enc | signature | counterplay | tier lever | trap |
|---|---|---|---|---|
| e1 Barrow Steps | Sentries that only wake when you get close | approach one at a time | tutorial | — |
| e2 Gallery | One crooked lane; archers on the rubble, Thorns zombies in the gap | shoot the zombies, don't punch them; the archers' Piercing line is the danger | easy: one archer | geometry |
| e3 Whistle | Feral ghouls (Opportunist) circle the survivor; the reaver's Whirlwind | keep the survivor unstatused; kill the reaver before it reaches the huddle | hound count by tier | protect |
| e4 Censer | Ghouls herd you INTO the fire lanes; the cultist SINGS from the centre | kill the cultist first — the song is what stops your specials | easy: no song | order + hazard |
| e5 Walls | Wraiths walk THROUGH the crypt walls and drain; you cannot pick the side | stand in a square, backs together; ward the weakest | clock 7/8/8/9; r6 wraith hard+ | survive |
| e6 Counting Song | Three chanters, each singing (cooldown +1); silence them before the song ends | the order: nearest singer first, then the witch's frost | clock 14/13/12/11 | order |
| e7 Stair | The stair floods; reach the landing before it gives way — and if the HERO falls the run ends | the hero goes FIRST; the reavers' whirlwind punishes clumping | clock 8/7/7/6 | race + main_dead |
| e8 Long Way | The hound beelines past everyone for the crew | screen the route; kill the hounds on the way in | hound count by tier | escort |
| e9 Tide | Zombies plant at the heart while the dead keep filing in | outlast; don't punch Thorns | wave sizes by tier | siege |
| e10 Choir | Three choristers hum (cooldown +1 each, stacking); the necromancer conducts from the dais | silence one singer before you spend anything; the witch's snap is the freeze | scale | order |
| e11 Wards | Three warding stones held at once; witches and archers converge on the uncovered one | split three ways; the fourth body screens | nightmare: fourth stone? (no — witches +1) | two-buttons ×3 |
| e12 Final Rooms | Three rooms to the Conductor; CRESCENDO takes your special away when you need it | spend before you enter his room; the wraith/specter pair drains and fears | room garrison | resource |

---

## 6. Order of work

1. Implement Moonberry + Sealed Deep content (A6 verbs, passives, tier levers,
   the structural fixes the histograms name). Smoke + kit probe.
2. Second identity pass on Lantern/Goblinopolis only where the matrix above
   changed them (Lantern's carriers lose `warded` — done; Goblinopolis keeps
   its verbs).
3. BALANCE, one campaign at a time, Lantern first (the free one): baseline
   battery on the DESIGNED content → spread sweeps on walls → tuner on fight
   cells → clocks/bodies on objective cells → ONE centring pass → confirm
   battery → bossViability → notes. Stopping rule applies.
4. Owner plays; his ledger outranks every number here.
