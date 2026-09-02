# LANTERN_BALANCE_NOTES.md — The Lantern of Elmsworth, rebalance + redesign

Operator: Fable. Started 2026-09-01. Owner mandate (verbatim): *"if you determine
that the design of the encounters themselves are lacking, due to the primitive
nature of the previous state of our process, by all means redesign. Unlit Beacon
feels like it's getting close to a great campaign, I want every campaign to be
similarly interesting and unique."* Also: *"get the next one closer to the
target, we can fine tune it further later."*

Lantern is the FREE campaign — the first one every player meets. It is also the
oldest content in the repo: its roster predates A6 (no campaign abilities), its
tiers predate B4 (no per-tier enemies/tiles/clocks), and half its objective
encounters were authored before the sim could tell whether an objective was
actually deciding the fight.

Method follows CAMPAIGN_BALANCING.md's loop: design pass → smoke battery →
structural passes (one lever per battery) → ONE centring pass → final battery.
UNLITBEACON_BALANCE_NOTES.md [TUNE-POST] is the reference run.

---

## 1. Baseline instruments (old content, hash da302af7819c)

* `balance_runs/lantern_BASE_s{0,1}.json` — 150 builds × 25 games × 48 cells.
* `balance_runs/lantern_tune_BASE.log` — campaignTune, 60 games × 7 iters.
* `balance_runs/lantern_spread_e{1,2}.log` — spreadSweep, 80 games.
* `balance_runs/lantern_reasons_medium.log` — campaignSim @ medium, 60 games,
  the MECHANISM histogram: what actually ends each fight.

### 1a-battery. Baseline battery (OLD content, 150×25): **33 of 48 cells fail**
`balance_runs/lantern_BASE_merged.json`. 24 TOO EASY (e4, e6, e9, e11, e12 at
every tier; e8/e10 at most), 6 TOO HARD+WALLS (e3 hard/nightmare 0% with 99%
walled; e5 medium/hard/nightmare 4% with ~70% walled), 3 WALLS. bossViability
e12: every class p75 100% at hard — the finale was a walkover for everyone.
This is the number to beat, not the content to tune.

### 1a. The mechanism histogram (medium) — the design verdict

| enc | palette (claimed) | how it actually ends | verdict |
|---|---|---|---|
| e1 | kill-all pincer | kill-all; melee 97 / ranged 55 / bal 55 | comp filter — the rear scrapper |
| e2 | carve (millstones) | kill-all; melee 38 / ranged 93 | comp filter — cover serves ranged only |
| e3 | protect (ember-cart) | ranged 12%: "Your charge has fallen" ×52 | **the cart dies to dagger-tossers; nightmare 0%, 97% walls** |
| e4 | hazard | ranged 100 / melee 77 | ceiling; fine shape |
| e5 | siege (wolfpelts) | party wipes; 25 / 47 / 63 | TOO HARD everywhere, melee walled |
| e6 | race (carriers) | "target destroyed" ×59, 19–30 turns | **not a race — the carriers stand and die** |
| e7 | escape (cave mouth) | party wipes; ranged 7% | walled ranged, DRAWs (stalemates) |
| e8 | survive (bridge) | 94–100% | walkover |
| e9 | survive (the dark) | 97%; won by "Every enemy has fallen" in half the games | **the dark is not a threat; it is a kill-all** |
| e10 | escort (Nib) | 83%; won by kill-all in ~40% of games | **escort in costume** |
| e11 | rooms | 77% melee so far | probably fine |
| e12 | boss (Grubnash+shaman) | 90%; "target destroyed" | walkover at medium |

Three encounters are not decided by their own objective (e6, e9, e10), two are
walkovers (e8, e9), two are comp filters (e3, e7), one is a wipe (e5). That is
seven of twelve with a SHAPE problem, and a shape problem is not tunable.

### 1b. Spread sweeps (the placement lever)

**e2**: enemies ONE STEP CLOSER (offset +1) collapses the spread from 60/45/41
to **10/3/11** points with means 95/80/54 — the same fix e11 got in Unlit
Beacon. Apply, then re-scale. The millstones at x=3 are cover for the party's
own approach; with the goblins a step nearer the melee party reaches them
before the slinger has farmed it.

**e1**: farther (offset −1) narrows medium/hard/nightmare to 22/45/30 but hard
is still 70 melee / 26 ranged. The sweep moves all three; the real culprit is
the REAR scrapper at (1,4) — a pincer denies a ranged party its first volley.
Hand-fix, not sweep.

### 1c. What the tuner found (partial — the numbers matter less than the shape)

e3 hard/nightmare: the tuner wants 2.00→1.04 and 2.40→1.20 (halving) and
ranged is STILL 22%/8%. When halving the scale does not lift the floor, the
lever is wrong. e3 is a redesign, not a rung.

---

## 2. Design assessment — where Lantern is "lacking"

Held against Unlit Beacon (the bar the owner named) and CAMPAIGNS.md §8:

1. **The roster is flat.** Ten enemies, ZERO campaign abilities, and three of
   the ten (scrapper, slinger, runner) carry no special or passive — they are
   class chassis with names. Unlit Beacon: every enemy has a hook, four bespoke
   abilities. CAMPAIGNS.md already flags Lantern as "the exposure": only two
   status-applying monsters in twelve encounters, so purify/root counterplay
   has nothing to bite on.
2. **Four survive-the-clock encounters** (e3, e5, e8, e9), with e8→e9
   consecutive — a palette-rule breach (§8 rule 2). Unlit Beacon has one.
3. **No per-tier levers** beyond scoped waves. The B4 grammar
   (`enemiesByDifficulty`, `tilesByDifficulty`, `roundByDifficulty`) is unused,
   so every tier is the same fight with a different HP multiplier — and on the
   survive/race cells that multiplier is decorative (§0 lever doctrine).
4. **The thematic hooks are not cashed mechanically.** The story is about
   LIGHT: thieves who run with fire, a dark that reaches in, a dead hearth, a
   king wearing the lantern. On the board: e6's carriers don't run, e9's dark
   does nothing, e12's king has a basic attack.
5. **The finale is the banned pattern** (CAMPAIGN_BEATS §2 #3, banned on
   MEASURED grounds: "boss + healer does not scale into high difficulty —
   retire the pattern; don't retune it"). 90% at medium confirms it again.

---

## 3. The redesign — encounter by encounter

Palette after: kill-all · carve · protect · hazard · siege · race · escape ·
hold · survive · escort · rooms · boss+novel — no two consecutive alike.

Design constraints honoured: enemy art is by CHASSIS (goblin/orc set 9) so new
enemies reuse class chassis; effect kinds limited to KNOWN_EFFECT_TYPES
(damage/heal/lifesteal/push/pull/apply_status/remove_status/move_self/
grant_max_health/modify_cooldown); the brain has NO enemy-flee behaviour, so a
"race" must be built from a deadline + reach, never from fleeing.

### Roster changes (A6 — Lantern gets its own abilities)

| enemy | was | now | why |
|---|---|---|---|
| goblin_scrapper | rogue, no special | + `hamstring` (novel): 6 dmg, ROOTED 1 turn, range 1 | the goblins' whole style is "catch you in the squeeze"; gives purify/root play a home; a status monster in e1/e2/e7/e10 |
| goblin_slinger | ranger, longshot by default | `pinning` | pinning roots at range 6 — sets up the thieves' getaway and the pincer; second status source |
| wolfpelt_runner | rogue, no special, move 4 | + `pounce` (novel): move_self 3 + 7 dmg, cd 99 | a pack animal that LEAPS; e5 becomes a fight about positioning, not a wipe |
| ember_thief | dagger_toss | unchanged, + `aiHints` none | already the campaign's identity |
| torch_hurler | ignite | unchanged | |
| dark_croaker | grasp | + `snuff` (novel): aoe r2 around a target, applies WEAKENED 2 turns to the party, unblockable, cd 99 | THE DARK: your blades are worth less when you cannot see. e9's thesis, mechanically |
| coalgate_warden | shield_bash, immovable | unchanged | |
| moss_shaman | heal | `ward` (opening shield on the king) — no longer a mender | retires the banned "kill the healer first" script; the shaman now makes the ALPHA STRIKE fail instead of undoing damage — a different decision |
| king_grubnash | barbarian, immovable+undying, basic only | `crown_blaze` (novel): aoe ring r1, 9 dmg + BURNING, cd 99 · `mine` (novel): pull 3 + rooted — he drags a hero to the throne | a boss with a kit; the lantern-crown IS the weapon |

New enemy: **ember_warden** (sorcerer chassis, `flame_jet`) for e11 room 2 —
the throne approach is lit by the stolen fire, and it burns.

### Encounters

* **e1 — road pincer (kill-all, tutorial).** Keep the pincer (it is the
  campaign's own beat) but move the rear scrapper from (1,4) to (0,6): it still
  arrives, one round later, so a ranged party gets its volley. Owner's e1
  exemption on easy/medium stands.
* **e2 — the mill (carve).** Enemies one step closer (spreadSweep +1: spread
  60→10). Slinger now pins. Re-scale from the tuner.
* **e3 — the ember-cart (protect — KEPT, re-levered).** First draft of this
  plan turned the cart into two tiles held simultaneously; that is wrong —
  `units_at_tiles` wins the MOMENT the tiles are covered, and the party starts
  adjacent to the cart, so it would be an instant win. The real failure is
  burst density against a pool that does not scale: the cart's 96 HP is the
  same at every hpScale while four tossers' damage is scaled UP by it. So:
  cart 96→130 HP / AC 11, the scale ladder halved (the tuner wanted it halved
  and it still failed — the clock carries the tiers now), and
  `roundByDifficulty` 5/6/7/7. Re-measure; if ranged is still walled the next
  lever is one fewer thief at the start.
* **e4 — the orchard (hazard).** Shape is right. Centring only.
* **e5 — the hollow (siege).** Eight runners with pounce is the fight; drop the
  base scale (the tuner will say ~1.3) and give the tiers WAVE SIZE: easy 2+1,
  medium 2+1+1, hard/nightmare +2 (existing). `roundByDifficulty` 6/7/7/8.
* **e6 — the ridge (race).** Carriers cannot flee, so build the race from
  DISTANCE and GUARDS: carriers start at (7,1)/(7,6) behind two blockers on
  the middle lane, deadline `roundByDifficulty` 7/6/6/5, carriers get `warded`
  (the alpha strike from range does not one-shot them). The clock is real when
  the party must go THROUGH something to reach them.
* **e7 — the cave mouth (escape).** Ranged walled at 7%: the door-wave spawns
  BEHIND the party at (3,3)/(3,4)/(2,4) — three bodies on the back rank of a
  party that wants to stand back. Move the ambush to the flanks (2,1)/(2,6)
  and make it one scrapper + one runner; `tilesByDifficulty` shrinks the exit
  from six tiles to four at hard/nightmare (the B4 lever).
* **e8 — the underbridge (hold).** Walkover as a survive. Becomes the
  two-buttons puzzle the briefing already describes: "hold BOTH ends" =
  `units_at_tiles` simultaneous on (2,4) and (5,4) (the bridgeheads), deadline
  7. The warden holds the far end (immovable — you must kill or go around).
* **e9 — the dark between (survive).** Keep the survive; make the dark a
  mechanic: two croakers with `snuff` (party-wide WEAKENED) + grasp pulls.
  `roundByDifficulty` 6/7/8/8. The scale stays ~1.0 — the tiers are the clock
  and the second croaker.
* **e10 — the scullery run (escort).** Decided by kill-all 40% of the time
  because the enemies start in the party's lap. Enemies moved 2 tiles up-board,
  a dedicated hunter `ladle_snatcher` (rogue, move 5, `aiHints priorityTarget:
  'ally'`) so the escort is actually pressured, Nib's route stays `follow`.
* **e11 — the undervault (rooms).** Room 2 gains the ember_warden; per-tier
  garrison via `enemiesByDifficulty` (easy drops the croaker).
* **e12 — the lantern court (boss+novel).** Grubnash gets his kit (crown_blaze,
  mine). The shaman WARDS him once (shield eats the alpha) and then fights with
  a mace — no heal. Two scrappers become a scrapper + a slinger (pin the hero
  the king is pulling). 2c-boss statistics judged with bossViability after the
  confirm battery. Nightmare must NOT need an ignite-sorcerer: undying is the
  only execute-counter and burning is exactly what the king deals out — a
  sorcerer is a fine pick, not the pick.

Story text touched: e3 briefing (cart → "keep them off the cart"), e8 briefing
(already says both ends), e12 briefing ("every wound you open, she closes" →
"she'll shield him once"). Flagged for the owner's CAMPAIGN_TEXT.md pass.

---

## 3b. Kit probe — does the brain CAST the new kit? (`src/ai/kitUsageProbe.ts`, new)

A special the brain never uses is dead content, and campaignSim only reports
outcomes. The probe mirrors campaignSim's setup and tallies enemy
USE_ABILITY by slug (12 games × 3 parties per encounter, medium):

| ability | casts/game | verdict |
|---|---|---|
| pounce (runner) | 1.89 in e5, 0.2–0.7 elsewhere | fires — e5 is the pack fight |
| snuff (croaker) | 0.39 | fires; competes with grasp (0.89) as intended |
| crown_blaze / mine (King) | 0.83 / 0.33 | fires |
| ward (shaman → King) | 1.00 | fires every game — the alpha-strike eater works |
| pinning (slinger) | 1.00 | fires |
| flame_jet (ember_warden) | 1.00 | fires |
| **hamstring (scrapper)** | **0.00** at 6+rooted(1) · **0.00** at 8+weakened(2) · **1.94** at 14+weakened(2) | sized by the probe |

The hamstring lesson generalises: **on a rogue chassis a special competes
with Twin Strike's 16, and no rider closes a 10-point gap.** A campaign
special for a rogue-chassis enemy must carry ≥ basic damage or it is
decoration. (The brain values a 1-turn root on an adjacent target at ~0, and
it is right to.)

Also learned: `campaignSim` REFUSES a full run until `--smoke` has passed on
the current content hash. The first smoke pass of the redesign was lost to
this (both logs were the refusal message). Smoke first, always.

## 3c. R2 — the redesign measured (medium, 60 games; nightmare, 40)

Objective cells are read on FLOORS and on WHAT ENDS THE FIGHT (the doctrine
in UNLITBEACON_BALANCE_NOTES: the sim understates the human on objectives, so
"TOO EASY" there is not a verdict). Fight cells are band-checked.

| enc | baseline → R2 (m / r / b) | what ends it now | read |
|---|---|---|---|
| e2 | 38/93/72 → 63/67/87 | kill-all | spread 55→24 ✓ (the sweep was right) |
| e3 | 93/12/88 → 80/100/100 | "survived 6 rounds" | ranged un-walled ✓; now soft — clock/scale can come back up |
| e5 | 25/47/63 → 52/70/95 | survive | melee still soft; **nightmare 1%, best party 3%** ✗ |
| e6 | 98/98/100 → 72/**18**/**2** | "deadline passed" | the race is REAL now — and overshot: warded corners + guards + clock 7 is three levers |
| e7 | 43/7/43 → 50/80/72 | escape | ranged un-walled ✓; melee **22% draws** — one-tile gap beside an immovable = stall |
| e8 | 100/88/95 → 32/**100**/32 | **"Every mark is held"** ✓ | the two-buttons hold WORKS mechanically; with the warden ON the mark it is a DPS race |
| e9 | 100/93/98 → 92/95/97 | survive, kill-all ~40% | snuff is cast but medium lacks the r5 wave; nightmare 25% ✓ |
| e10 | 87/93/70 → 92/98/80 | escort/kill-all | nightmare 41% ✓; medium soft (doctrine: floor only) |
| e11 | 77/?/? → 92/**25**/85 | kill-all | ember_warden + croaker in room 2 walls ranged |
| e12 | 100/?/? → 85/100/92; nightmare 53 | "target destroyed" | the kit fires (probe) and the King still folds — HP, not shape |

### Structural pass 2 — applied 2026-09-01 (smoke PASS, → R3)
* e5 nightmare 1.60→1.45, clock 8→7.
* e6: **ward removed** from the carriers; clocks 8/7/7/6.
* e7: wall (5,5) opened — a two-tile throat, no longer a cork.
* e8: warden BESIDE (7,4) at (6,4), runner beside (0,4) at (1,4); clock 9/8/7/7.
* e9: the r5 croaker wave now fires on medium too.
* e11: ember_warden to room 1 (with the coalgate warden), room 2 back to
  croaker / thief / scrapper.
* e12 left for the tuner: it is a fight cell and the lever is hpScale.

## 4. Order of work

1. Baseline battery lands → §1 tables completed (below).
2. Roster + abilities (A6) with tests: campaignAbilities validation, AC band.
3. Structural pass 1: e3, e6, e8, e9, e10 objectives; e1/e2/e7 placements.
4. Smoke each redesigned encounter with campaignSim reasons at medium — the
   objective must be what ends the fight.
5. Full battery → tuner for the FIGHT cells → one centring pass → confirm.
6. bossViability e12; viability audit (purify must lead somewhere).
7. Notes, GAMEPLAN, engine sync, version note. Owner text pass.

## 5. DESIGN TABLE — owner ruling 2026-09-01: "focus on good encounter design first, balance after"

| enc | signature | counterplay | tier lever (not HP) | trap |
|---|---|---|---|---|
| e1 Road | The third goblin comes from behind, a round late. | Turn to face it. | scale only (tutorial) | — |
| e2 Mill | Millstone cover on the approach; the slinger PINS you in the open. | Break line behind the stones; purify the pin. | scale | — |
| e3 Ember-cart | The thieves want the cart, not you. | Body-block; kill the slinger first so your blocker can stay. | clock 5/6/7/7 + r3 wave | order |
| e4 Orchard | The fire spreads across YOUR path; hurlers make more of it. | Step through the cold gaps; kill hurlers to stop new fire. | **enemiesByDifficulty** (easy: one hurler) | hazard |
| e5 Hollow | The pack LEAPS (Pounce); they keep coming. | Trees at your back; stand where a ring can't land on two of you. | clock 6/7/7/7; nightmare +2 bodies | — |
| e6 Ridge | Winning the fight IS losing the race. | Send the fast unit past the guards. | clock 8/6/6/6 | free-kill bait (the guards) |
| e7 Cave mouth | Get through — the doorman keeps his door. | Don't fight the immovable; the ambush hits stragglers. | **tilesByDifficulty** (exit narrows at hard+) | the obvious kill is the trap |
| e8 Underbridge | Both ends at once. | Split; the warden bashes whoever takes the far mark. | clock 9/8/7/7; nightmare third mark | two-buttons |
| e9 The Dark | You cannot see (Snuff: weakened); things pull you out of the circle. | Ward/purify; stay adjacent. | croakers by tier; clock 6/7/8/8 | — |
| e10 Scullery | Nib is armed; the Snatcher hunts HIM. | Kill the snatcher; Nib heals himself. | **enemiesByDifficulty** (two snatchers at hard+) | — |
| e11 Undervault | What you spend in room 1 you fight room 2 without. | Conserve. | scale (rooms) | resource |
| e12 Court | The crown BURNS, MINE! drags you to the throne, the shaman wards him once; nightmare: Vengeful. | Bait the ward; kill the slinger so the dragged hero can leave; burst the half-health window. | nightmare passive | **order (bait the ward)** |

## 6. D1 — designed content, medium mechanism (60 games) — 2026-09-01
Every objective cell now ends by its objective (e3 survive, e6 target, e7
escape, e8 marks, e9 survive, e10 escort). Means: e1 77 · e2 72 · e3 90 · e4
81 · e5 72 · e6 88 · e7 67 · e8 74 · e9 68 · e10 90 · e11 68 · e12 92.
Floors: e1 ranged 52, e8 ranged 57, e11 ranged 47 (watch), everything else
≥50. Fight cells over band (e4, e12) go to the tuner; objective cells over
band are floor-only by doctrine. Battery D1 + tuner + sweeps running.
