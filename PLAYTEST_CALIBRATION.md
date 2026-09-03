# PLAYTEST_CALIBRATION.md — owner-played encounters vs. what the sim measured

**Why this file exists.** The battery measures WIN RATE. It cannot measure
grind, agency, or whether a fight was fun. Every entry below pairs a
**measured number** with the **owner's verbatim verdict after actually playing
it**, so the bands can be corrected by ground truth instead of re-argued from
first principles each time.

**Read this before tuning any early-campaign cell**, and **add a row every time
the owner reports on a fight he played.** The measurement must be taken at the
scale he actually played, or the row is worthless.

Linked from `CAMPAIGNS.md` (§Balancing) and `CAMPAIGN_BALANCING.md`.

---

## The headline finding (2026-08-24)

> **Win rate is nearly useless for predicting how a fight FEELS.**

Three encounters, one campaign, played in order by the owner. The measured
numbers span **nine points**; the felt difficulty runs backwards through them:

| played | measured (mean) | owner's verdict | felt |
|---|---|---|---|
| **e1** — L1, `noSpecials`, kill-all | **78%** | *"Won by a very narrow margin… about the level I would expect of HARD for a first encounter."* | ✗ too hard |
| **e2** — L2, specials, kill-all + waves | **72%** | *"Felt reasonable… a little on the hard end of medium, but it was fine. Fun fight."* | hard end of OK |
| **e3** — L2, specials, HOLD two bridgeheads | **69%** | *"Felt like a good difficulty… on the easier end of medium."* | easy end of OK |

**The order of the measurements is the exact REVERSE of the order of the
feelings.** The easiest cell on paper was the only one rejected; the hardest
cell on paper felt the most comfortable. Two separate causes, and both are
things the battery cannot see:

1. **TOOLS (e1 → e2).** At L1 with `noSpecials` the party has basic attacks
   and nothing else, so a fight is a grind with no decisions in it. At L2 half
   the party has specials, and the same win rate becomes a fight you are
   *playing* rather than *waiting out*.
2. **WIN CONDITION (e2 → e3).** A kill-all with reinforcements gives the player
   no visible progress — bodies keep arriving and the finish line is wherever
   the last one dies. A `hold`/`survive` objective has a clock the player can
   watch and ground they chose; it reads as controlled even while measuring
   harder.

**Consequences, all now enforced in content:**

1. **The e1 tutorial exemption is about missing TOOLS, not about difficulty.**
   Every campaign's first encounter is calibrated to ~85% mean / ~90% median at
   easy and medium (see CAMPAIGNS.md §Balancing). It does NOT extend to e2+.
2. **The acceptable early-medium window is ~69–72% mean** — the owner has
   played both ends and named them. It is a THREE POINT window, which is well
   inside battery noise (±5 at 150 builds): do not pretend to tune inside it.
3. **Objective fights can run harder on paper than kill-alls** and still feel
   fair. When a kill-all and a hold measure the same, the kill-all is the
   harder experience.

⚠ When judging any early cell, look past the verdict at the SHAPE of the fight:
whether the party has specials yet · what the win condition is (visible
progress or not) · enemy AC (+1 = 5% more of your swings wasted) · identical
enemies sharing damage breakpoints · terrain funnels.

---

## Ledger

Add newest first. "Measured" = mean win rate from `calibrate.ts` at the scale
the owner actually played, ≥80 builds × 25 games.

| date | campaign / enc | level | diff | scale played | measured | owner verdict | action taken |
|---|---|---|---|---|---|---|---|
| 2026-09-02 | unlitbeacon e4 (hazard) | L3 | **nightmare** | 1.22 | not re-measured (approved as played) | *"Approved. Very difficult but winnable."* | **No change.** First nightmare-tier approval on record; anchors what "nightmare should feel like" for a hazard cell. |
| 2026-09-02 | unlitbeacon e3 (hold) | L2 | **nightmare** | 0.73, split deployment | owner-class-set proxy 45% (in band, top edge); his own build measured 83% with full kit | *"This felt too easy for nightmare mode. I didn't feel particularly challenged, maybe my party is too optimal. I'd say this felt like a hard mode difficulty level. I'm not sure what to add to make it appropriate nightmare level difficulty, I just know it's too easy."* | **Nightmare roster swap only** — the two mark guards become `honor_guard` (the Host's honor watch): guard HP 42 → 48, same stalwart/shield_bash puzzle, a visibly different board. Battery 25%/40%/18% → **8%/23%/25%, still passing**; hard unchanged at 67%/75%. Scale left at 0.73 — 0.95 (0% median, 68% walls) and 0.80 (TOO HARD) were tried and reverted. Root cause was structural: hard 0.66 vs nightmare 0.73 was the same fight twice. See the sim-defeat note below. |
| 2026-09-02 | unlitbeacon e2 | L2 | **nightmare** | 1.17 | not re-measured (approved as played) | *"Approved."* | **No change.** |
| 2026-09-02 | unlitbeacon e1 | L1 | **nightmare** | 1.39 | not re-measured (approved as played) | *"Approved."* | **No change.** Confirms the e1 tutorial exemption does not need a nightmare carve-out. |
| 2026-08-24 | unlitbeacon e9 (survive) | L8 | medium | 1.70, 8-round clock | 60% mean · 64% median · **15% walls (at the cap)** | *"This is definitely feeling unreasonably hard. By leaps and bounds too hard."* | Per-tier clock added to the grammar (`roundByDifficulty`, 6/7/8/8 per owner call); row re-walked to 1.45/1.45/1.20/1.50. |
| 2026-08-24 | unlitbeacon e8 (rooms) | L7 | medium | 1.30 | 4% mean · 99% walls (post-fix re-measure; he played it pre-fix) | *"Felt relatively easy because there's only 1-2 baddies at a time… I'd say it felt too easy overall. LOL I said all that until I realized there was a fourth room with three huge baddies. I decisively lost. This is definitely tuned too hard. I didn't play it optimally, but I played it better than your average normie playing on medium and with probably an above average build."* | Shape rebuilt (floor 1 2→3 enemies, floor 3 loses a second Ring-of-Frost caster, entry tiles spread), door mode fixed, row re-walked to 0.78/0.90/…. |
| 2026-08-24 | unlitbeacon e7 (race) | L6 | medium | 1.45 | 69% mean at the time | *"Looked really scary, lots of freeze effects, but didn't turn out hard, felt like the AI was playing it badly… a powerful opponent playing badly, not a well balanced opponent playing reasonably well."* + *"is E7 a race? didn't seem like a race"* | Brain gained `raceUrgency` (the defending side was objective-blind); clock 9→6; row re-walked to 0.80/1.00/1.15/1.30. |
| 2026-08-24 | unlitbeacon e5 (carve) | L4 | medium | 0.92 | 75% mean on the NEW geometry (old geometry not re-measured — the fight was a design bug, not a number) | *"A real design issue… I didn't choose to bunch them up, you did… I'm gonna get caught in a 3 unit blizzard. The only counterplay is to just waste my first turn… feels unfair. Even for a nightmare level difficulty."* | **Formation respaced** (caps any ring at 2, verified) + wisp to the back edge; row re-walked to 0.85/0.98/1.10/1.22. New standing rule in CAMPAIGNS.md. |
| 2026-08-24 | unlitbeacon e4 (hazard) | L3 | medium | 1.15 | **56% mean · 60% median · 18% walls** (re-measured AFTER the brain fix; the owner played the wall-blind brain) | *"Felt manageable. Maybe a little on the hard end, if he hadn't wasted his flame jet, it would have been tighter. Good fight though, good use of hazards (once they're explained) to make things interesting."* | medium **1.15 → 1.02** (71% mean, 10% walls), and the whole row eased. See below. |
| 2026-08-24 | unlitbeacon e3 (hold) | L2 | medium | 0.65 | 69% mean · 72% median · 5% walls | *"Felt like a good difficulty… on the easier end of medium."* | **No change.** Sets the floor of the acceptable early-medium window. |
| 2026-08-24 | unlitbeacon e2 | L2 | medium | 1.00 | 72% mean · 76% median · 4% walls | *"Felt reasonable. Maybe a little on the hard end of medium, wouldn't want a medium to feel much harder than that at level 2, but it was fine. Fun fight."* | **No change.** Recorded as the early-medium ceiling. |
| 2026-08-24 | unlitbeacon e1 | L1 | medium | 1.25 | 78% mean · 80% median · 3% walls | *"Won by a very narrow margin. The calibration for medium on a level 1 scenario, no specials at this point, is off. Too hard for this level — about the level I would expect of HARD for a first encounter."* | medium 1.25 → **1.12** (88% mean). Exemption then applied to all five campaigns' e1. |

### Cross-checks run off these rows

**All five e1s at medium** (the exemption sweep, 80 builds × 25 games) — every
one sat in the same 71–78% zone the owner rejected, and all five were retuned:
lantern 1.20→1.00, goblinopolis 1.46→1.32, moonberry 1.26→1.08,
sealeddeep 1.18→1.06, unlitbeacon 1.25→1.12. Full table in CAMPAIGNS.md.

**All five e2s at medium**, checked against the 72% ceiling — nothing exceeds
it, so no action:

| campaign | scale | measured mean | vs ceiling |
|---|---|---|---|
| lantern | 1.44 | 82% | comfortably inside (reads TOO EASY vs the general band) |
| goblinopolis | 1.30 | 74% | inside |
| moonberry | 1.45 | 73% | inside (14% walls — watch it) |
| sealeddeep | 0.90 | 71% | at the line |
| unlitbeacon | 1.00 | 72% | **the reference row** |

---

## ⚠ e3 defeats the simulator (2026-09-02) — read before tuning any SPLIT cell

Unlit Beacon e3 is the first encounter with a **forced split deployment**, and
it is the first cell where the battery could not be trusted at all. Evidence,
all measured the same day at nightmare, 40 games per row:

| party | result |
|---|---|
| fighter/wizard/ranger/cleric, slot order A | **0%** |
| fighter/ranger/cleric/wizard, slot order B | **45%** |

Same four classes. `frontlineOrder` puts BOTH orders on the identical bridge
split (north fighter+wizard, south cleric+ranger), so the 45-point gap is not
placement — it is which companion receives its single L2 special. A cell that
swings 45 points on one level-2 choice cannot be tuned by its mean.

**Every power lever was swept and every one walls the field before it touches
a strong party** (owner's own build sat at 83%):

| lever | strong party | melee / ranged / balanced |
|---|---|---|
| scale 0.95 | 50% | 8 / 18 / 10 |
| scale 1.15 | 23% | 0 / 5 / 3 |
| 2 pikemen arriving r4 | 50% | 0 / 5 / 18 |
| deadline 7 rounds | 57% | 30 / 45 / 5 |
| deadline 6 rounds | 35% | 13 / 55 / 8 |

Two findings worth carrying forward:

1. **A deadline is the kindest lever to an archetype spread** — it adds no
   enemy power, it only forbids the slow grind, and it *raised* the melee comp
   (8% → 30%) by forcing the brain to rush the marks instead of grinding.
   **But it is the wrong instrument at L2**, where only half the party has
   specials: it punishes the tool-poor party, which is exactly the TOOLS
   failure the headline finding at the top of this file describes. Reach for a
   deadline on a mid/late-campaign hold, not an early one.
2. **A pending wave suppresses the mercy rule** (`hasPendingContent` gates
   `all_enemies_dead` and the enemy-wipe mercy path, but NOT `units_at_tiles`).
   So adding any wave to an objective cell converts "clear the board and win"
   into "you must actually stand on the marks." That is a design lever, not
   just a difficulty one — worth remembering whenever an objective fight is
   being won by kill-all instead of by its objective.

**A false start, recorded so nobody repeats it:** `frontlineOrder` was
rewritten to cluster split zones and snake-deal the party across them, on the
theory that it was mis-splitting the party. It was not — the original's
front-tile-first ordering already alternates between the two bridges, and the
"fix" produced a *worse* assignment for the balanced comp and perturbed
moonberry e12. Reverted. Before "fixing" the harness, hand-trace what it
actually outputs for the cell in question.

## ⚠ A verdict is only valid for the ENGINE it was played on

The e4 row is the case that proves it. The owner reported the fight as
"manageable, maybe a little on the hard end" — and, unprompted, named the
reason it wasn't tighter: *"if he hadn't wasted his flame jet."* He was
playing the wall-blind brain, which burned the Torchhand's once-per-battle
special into a wall. The fix shipped the same day.

Re-measuring the SAME scale on the FIXED brain: 78% → **56% mean, 18% walls** —
a failing cell. The encounter he called "a little on the hard end" would have
shipped materially harder than the one he played.

**So: when the engine changes, every row above it is a record of a fight that
no longer exists.** Re-measure before acting on an old verdict, and note in the
row which side of the change it was played on. The observation that saved this
one came from the owner noticing an enemy play badly — playtesters see engine
bugs that batteries cannot, because a battery has no opinion about whether the
opponent played well.

## ⚠ "Too easy" and "too hard" can be the SAME encounter

The e8 row is one report, and it contains both verdicts about one fight:
three floors of "only 1-2 baddies at a time" and then a final floor that
decisively killed him. The average is meaningless; the SHAPE is the finding.

A battery cannot see this. It reports one win rate per encounter, so a
back-loaded encounter and an evenly-paced one of the same difficulty are
indistinguishable to it — and the back-loaded one is much worse to play,
because the player spends most of it bored and the rest of it losing.

**When a rooms/waves encounter reads fine in aggregate, check its shape by
hand: enemy count and total HP per room, and remember HP and cooldowns carry
across the door.** A party arrives at the last room depleted with specials
spent, so the last room should be the LIGHTEST-looking one on paper, not the
heaviest. e8 had it exactly backwards.

## ⚠ Some encounters do not care about `hpScaleOverride` at all

e9 is the extreme case and worth remembering before anyone reaches for the
usual dial. On its authored board:

| lever moved | effect on medium |
|---|---|
| scale 1.70 → 2.80 (+65%) | 89% → 78% (**11 points**) |
| clock 8 → 7 rounds (one round) | 60% → 89% (**29 points**) |
| +2 enemies at round 2 | 89% → 28% (**61 points**) |

A `survive` objective is won by lasting, so tankier enemies live longer but
do not kill faster — enemy HP barely registers. **Round count and wave size
are the levers; scale is nearly decorative.** Wave size in particular is
brutally coarse: one body is the smallest step available and it is worth
~30 points, so a cell can be impossible to land inside band by bodies alone.

Check the objective KIND before choosing a dial: kill-all and boss
encounters respond to scale; survive, hold, escape and race respond to
clocks, arrivals and geometry. `roundByDifficulty` exists so a survive
objective can separate its tiers with the lever that actually works.

## How to add a row

1. Get the verdict verbatim — paraphrase loses the signal ("narrow margin",
   "fun", "slog" are the data).
2. Read the scale actually played from the campaign file at that commit.
3. `npx tsx src/ai/calibrate.ts <campaign> <enc> <difficulty> <scale> --builds 80 --games 25`
4. Add the row, then ask what it implies for the same encounter INDEX across
   every other campaign — the e1 sweep found a catalog-wide problem from a
   single report, and that is the main value of this file.

---

## Unlit Beacon — NIGHTMARE run (owner, 2026-09-02/03, v1.0.101+)

Party: Fighter (Concussive/Undying/Stone) · Wizard (Ring of Frost/Opportunist/
Fangs) · Ranger (Pinning/Opportunist/Fangs) · Cleric (Heal/Undying/Stone).
Sim rows below are THIS build at 32 games (±17), not the battery.

| enc | owner verdict (verbatim gist) | sim (owner build) | action taken |
|---|---|---|---|
| e1 | approved | — | none |
| e2 | approved | — | none |
| e3 | "too easy for nightmare… felt like a hard mode difficulty level" | 83% pre-fix | Honor Watch: mark guards honor_guard + vanguard-for-archer swap, nightmare only (owner build 41% after; hard untouched at 67/75) |
| e4 | approved — "very difficult but winnable" | — | none |
| e5 | invisible round-1 wisp = "terrible… no chance for counter play"; difficulty "easy end of nightmare for now" | 66% post-fix | WAVE-R1 fold (spawn visible + targetable from placement); CHILL-v3 delays its ring. Rung left alone per "for now"; flagged for a later notch |
| e6 | "Holy crap this fight is a mess… spots got all filled up… a ton of them have Ring of Frost" — lucky win | 84% pre / 56% post | E6-0903: wisp spawns moved OFF the goal column to (6,1)/(6,6); nightmare's 3rd wisp cut; spawn-chill on rings; hard joins the 7-round clock (owner-build 0%→47% at hard) |
| e7 | round-1 triple ring "completely unacceptable… even for nightmare"; wisp asymmetry "very unintuitive" | 19% post-chill | CHILL-v3: AoE freezes chilled at EVERY tier (starts and spawns). No rung change — no difficulty verdict given; his comp is deadline-limited on races |

Cross-cutting from this run: objective banner precision (OBJ-0902, previous
session) · combat log covering board = LOG-CLEAR auto-dock + collapse ·
Opportunist copy shows the viewing class's own number · campaign defeat
counter added (STATS-0903).

⚠ CHILL-v3 is a POLICY change measured only at 32-game spot checks here —
the affected freeze cells (UB e5/e6/e7 hard+nightmare, SD witch cells are
single-target and untouched) want a battery pass before the beta opens.
