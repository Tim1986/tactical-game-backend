# The Unlit Beacon — balance notes (BAL1 retune, 2026-08-24)

Operator: Opus 5. Targets: `DIFFICULTY_TARGETS.md` (frozen). Engine: FROZEN for
the whole pass (the Sealed Deep lesson) — every measurement and the
certification ran on identical gameplay code.
Artifact: `balance_runs/unlitbeacon_bal1_PASS.json` (150×25 × 48 cells).

## Result

| | baseline (this pass) | after |
|---|---|---|
| failing cells | 28 | 9 |
| — TOO EASY | 24 | 5 |
| — TOO HARD / WALLS | 4 | 4 |
| clean encounters (all 4 tiers) | 2 | **6** (e1 e2 e3 e5 e10 e12) |

The audit's "soft throughout" read was correct: 24 of the 28 were plain scale
raises with near-zero walls. The four structural cells got structural fixes.

## Structural work

- **e3 ("hold both bridgeheads") was a COMP FILTER, not a difficulty** —
  nightmare measured melee 2% / ranged 0% / balanced 100%, and no start
  distance balanced the three (moving everyone together only traded which
  archetype was excluded). Cause: the win needs two units STANDING on contested
  forward tiles while two killers hold them in range; a fragile party has
  nothing that survives there. Fix: the archer+breaker moved one column back
  (x=6 → x=7) — the pikemen STAY on the marks. Spread collapsed 98/100 → 45/2.
  Moving the crossings closer together was tried first and made it WORSE
  (ranged 40% → 2%): marks nearer the centre sit nearer the backline.
  Full ladder now certifies: 0.50 / 0.65 / 0.75 / 0.85 (from 0.60/0.72/0.90/1.20).
- **e11 (the Adjutant duel) rebuilt per D5+** — wisps 34 → 20 HP (off the
  one-shot boundary that made the cell a coin flip), the Adjutant's difficulty
  moved from the HUNT into the DUEL (movement 5 → 4, HP 78 → 100). Nightmare
  certifies for the first time (1.85).
- **e6 ("cross the Frozen Mere") is hpScale-INERT** — you win by arriving.
  This produced the engine addition below. Also fixed: its "Dry Boots" goal
  (cross by round 6) was identical to the round-6 loss clock — awarded on
  every win, a goal that could not be failed. Now round 4.

## ⚙ Engine addition: difficulty-scoped waves (owner-approved)

`WaveSpec.difficulties?: [...]` — a wave that exists only on the listed
difficulties, filtered at encounter BUILD time (no runtime footprint
elsewhere). This is the SECOND per-tier dial the Sealed Deep post-mortem asked
for: hpScale is inert on objective fights, and every other knob was global.
First use: e6 runs +2 blizzard wisps on hard and +3 on nightmare, spawned ON
the exit tiles the win condition needs — each is a mandatory kill inside the
clock, the one way a body genuinely costs rounds in an escape. Contract test:
`tests/campaignWaveDifficulty.test.ts`.

Measured dose coefficients (for the next campaign): first exit wisp ≈ 20 pts
off the median, second ≈ 4 (diminishing — a party already at the shore kills
them in passing). Bodies BEHIND runners ≈ 0. A wisp in the centre corridor
breaks the brain's charge pathing (validation errors, whose skip-turn recovery
silently INFLATES measured difficulty — re-measure honestly after any
validation error appears).

## The 9 flagged cells

Within the stopping rule (≤5 wall pts, or the 96-vs-95 median quantization):
e4/medium (walls +2) · e6/hard (documented floor: four geometries all measure
median 76-80 vs 65, ZERO walls — a breather) · e6/nightmare (52 vs 44 on
identical content = the noise, directly demonstrated) · e7/easy, e8/easy
(quantization) · e9/medium (walls +0.3).

**⚠ e11 — SUPERSEDED by the percent-damage rebuild (2026-08-24, owner design).**
The paragraph below described the state at first certification. The owner then
proposed scaling the Adjutant's damage to the TARGET's max health, built as
`CampaignEnemy.damagePercentOfTargetMax` (0.15/strike here): the hunt now
kills a wizard hero in the same number of turns as a barbarian one, which
removed the hero-class bimodality outright. Focused re-certification
(150 builds): **hard 1.80 ✓ and nightmare 1.90 ✓ — the first time the upper
tiers have ever certified** — easy 1.30 is the 96-vs-95 quantization park
(walls +3), and medium 1.70 remains the campaign's one beyond-rule park:
walls read 17-25% across five measurements vs a 15% cap. The character of
that miss CHANGED, though: it is no longer a coin flip on hero class or the
wisp cliff — the weakest quarter of builds lose a fair damage race against a
170-effective-HP duelist, on the campaign's penultimate fight. Judged
acceptable to ship; revisit only from playtest feel. Final row:
1.30 / 1.70 / 1.80 / 1.90.

*(Original first-certification finding, kept for the record:)*
**⚠ BEYOND-RULE: e11 easy/medium/hard.** Walls 18/22/21 vs caps 10/15/25,
easy+medium still bimodal. The wisp-cliff bimodality is GONE; the residual
split is HERO CLASS: the loss is main_dead and the Adjutant hunts the main, so
fragile-hero builds brick while tanky-hero builds walk it. The squeeze
narrowed from 12-20 pts to 4-8 but no rung passes both bounds. The remaining
fixes are IDENTITY-level (soften the hunt, or de-freeze the wisps) — parked
for the owner's playtest rather than iterated blind. This is the campaign's
one real blemish.

## Final rows

| enc | easy | medium | hard | nightmare |
|---|---|---|---|---|
| e1 | 0.95 | 1.25 | 1.28 | 1.32 |
| e2 | 0.80 | 1.00 | 1.10 | 1.20 |
| e3 | 0.50 | 0.65 | 0.75 | 0.85 |
| e4 | 1.00 | 1.15 | 1.25 | 1.30 |
| e5 | 0.85 | 0.92 | 1.00 | 1.02 |
| e6 | 1.20 | 1.30 | 1.20 | 1.70 |
| e7 | 1.22 | 1.45 | 1.80 | 1.70 |
| e8 | 1.00 | 1.30 | 1.45 | 1.70 |
| e9 | 1.20 | 1.70 | 1.85 | 2.40 |
| e10 | 1.15 | 1.30 | 1.60 | 1.78 |
| e11 | 1.30 | 1.70 | 1.80 | 1.90 |
| e12 | 1.58 | 1.80 | 1.95 | 2.30 |

## Owner playtest, medium — 2026-08-31 (v1.0.98)

Live calibration by the owner. **These are the human anchors the sim numbers
get mapped onto** — record every one, they are the scarce data.

| Enc | Owner verdict |
|---|---|
| e1 | "Felt very easy — the EASY END OF MEDIUM. Fine for a pre-specials opener, but pushing it." |
| e2 | Root specials completely dead: no rootable melee enemy. |

### ⚠ FINDING — root/control specials are dead in 5 of 12 encounters

Owner (e2): *"Both of my specials have roots, and neither is useful at all...
I suspect this campaign is overusing Stalwart... if you have roots and
opportunist and you can't root anything, all your abilities are completely
useless in some encounters, which makes them completely unplayable, and that
is going to severely narrow down the viable build options."*

Measured against the roster. Stalwart (immune to push/pull/**root**/weaken/
expose) is carried by `shelf_pikeman`, `honor_guard`, `marshal_vail` — and
`shelf_pikeman` is the single most-used enemy in the campaign (12 appearances,
next-highest is 9).

⚠ **e1 is EXCLUDED — it is L1 and nobody has a special yet** (owner
correction 2026-08-31; specials unlock L2 hero/companion-1, L3 for the rest).
Its all-Stalwart line is fine by design. Count only encounters where the kit
actually exists:

| | Encounters |
|---|---|
| **No rootable MELEE enemy (specials live)** | **e2, e6, e7, e12** — 4 of 11 |
| of those, arguably fine by design | e12 (finale of hand-picked guards SHOULD be root-immune) |
| **the real problem set** | **e2, e6, e7** |

e6/e7 are all-caster/ranged rosters (meredrowned ×3; wisps + voices), so a
root has no melee to lock down even where it lands. e2 is a Stalwart wall.

**e2 is the worst of the three and should be fixed first**: it is the FIRST
encounter where a special exists at all, so a root build's introduction to its
own kit is "your special does nothing." That is where a player decides the
build was a mistake.

**Why this is a build-viability bug, not a flavor problem.** A campaign party
is LOCKED for the run. A player who takes Pinning Shot + Opportunist — a
coherent, signposted build — finds their special AND their passive inert in
five encounters they cannot re-comp around. That is the "wall" the process
targets, but buildBattery's wall check cannot see it: the build still *wins*
the fight on basic attacks, it just plays with a dead kit.

**Owner's design rule (ratified 2026-08-31):** avoid encounter design where
there are NO rootable melee enemies. *"Some is fine, it limits your options,
but [not] all your abilities completely useless."*

**Proposed acceptance test (add to BALANCE_PROCESS_V2 once agreed):** for each
control-tag (root, push/pull, weaken, expose), at most ~20% of a campaign's
encounters may present zero valid targets for it, and never two in a row
early. This is a CONTENT-LINT check — it is static analysis of the roster, not
a sim, so it costs nothing to run and belongs beside the smoke pass.

**Levers, cheapest first:** (1) e2 — swap the `shelf_pikeman` for a
non-Stalwart melee body, or add a third enemy that is rootable; (2) e6/e7 —
add one rootable melee body to the caster line; (3) leave e1 (no specials
yet) and e12 (finale, root-immunity is the point) alone.

⚠ Not applied. Content changes stay blocked on the owner (Trilogy rule), and
any change re-runs the battery.

## Calibration run 2 — owner's DAMAGE comp, medium (2026-08-31)

Owner restarted deliberately without roots to get a clean baseline:
**Barbarian/Whirlwind · Sorcerer/Ring of Fire · Rogue/Kill Shot ·
Warlock/Essence Drain.** (Passives/gifts irrelevant through e3 — passives
unlock L4/L5, gifts L7/L8.)

| Enc | Type | Owner's verdict | THIS BUILD, sim @200g |
|---|---|---|---|
| e1 | FIGHT | "very easy — easy end of medium, pushing it" | **100%** |
| e2 | FIGHT | "fine, a little more difficult — **medium-to-hard end of medium**, could lose if I played badly" | **100%** |
| e3 | OBJ | "**too easy** — this is a good calibration for the EASY difficulty" | **70%** |

### ⚠ THE HEADLINE: the sim and the human DISAGREE ON WHICH IS HARDER

Sim says e2 (100%) is easier than e3 (70%). The owner says the opposite, and
emphatically. That is not a magnitude error the operator can calibrate around
— it is an ORDERING error, and it breaks the contract BALANCE_PROCESS_V2 asks
for ("60% in one encounter should be approximately 60% in another").

**It is explained, and it confirms the simFloor caveat with human data.**
e2 is a straight FIGHT; e3 is an OBJECTIVE (hold both bridgeheads
simultaneously). The brain plays kill-everything well and objectives badly —
so on e3 it grinds a fight it does not need to win, while the owner reports
the human line is trivial: *"the archer can't even profitably run away from
you because you can just take the bridge."*

**Calibration rule, now evidence-backed rather than suspected:**

| Encounter type | Sim vs human | How to use the number |
|---|---|---|
| FIGHT (e1,e2,e4,e5,e8,e11,e12) | sim ≈ human, sim slightly optimistic | Band-check directly |
| OBJECTIVE (e3,e6,e7,e9,e10) | **sim badly UNDERSTATES the human** | FLOOR only. Never band-check. Owner calibrates on device |

⚠ Five of twelve encounters are objectives, so **the campaign-level mean of
any sim is not a difficulty statement** — it blends two incomparable scales.
Report FIGHT cells and OBJECTIVE cells separately from here on.

### What this says about the medium band

On FIGHT cells the owner's read maps roughly:
- 100% (e1) = "very easy", acceptable only as a pre-specials opener
- 100% (e2) = "medium-to-hard end of medium" ← **same sim number, opposite feel**

Two 100% cells feeling completely different means **win rate alone is
saturated at the top and cannot distinguish them**. e2 was close for a human
because of HP attrition and threat, none of which a win/loss counter sees.
**Recommendation for V2: capture a MARGIN statistic alongside win rate**
(party HP remaining at win, and turns taken). At 100% win rate, margin is the
only signal left, and it is exactly what "could I have lost if I played badly"
measures.

### Owner's damage comp on the LATER encounters (same run, 200g)

e4 74 · e5 97 · e6 100 · e7 100 · e8 57 · **e9 30** · e10 63 · e11 81 · e12 61

⚠ **e9 = 30% on MEDIUM for a coherent damage comp** — far below the 65-80
band and the worst cell in the run. e9 is a `round_reached` survival
objective, so the simFloor caveat applies and a human will do better — but
this is the cell to watch when the owner reaches it.

---

## Calibration run 3 — 2026-08-31, build 1.0.99 (escort AI + placement picker)

⚠ **This run supersedes all earlier OBJECTIVE anchors.** Runs 1–2 were taken
against a noisier (unseeded) sim and a brain with no escort doctrine, so their
objective-cell reads describe software that no longer exists. FIGHT anchors
from run 2 (e1, e2) remain comparable and are reproduced here for continuity.

**Owner's build (fixed for the whole run):** Barbarian/Whirlwind ·
Sorcerer/Ring of Fire · Warlock/Essence Drain · Rogue/Kill Shot.
A four-way damage comp with no healer and no control beyond Ring of Fire —
percentile-rank this build before reading any cell as "too easy/too hard".

| Enc | Kind | Owner's read | Anchor |
|---|---|---|---|
| e1 | FIGHT | "Fine for medium. On the easy side, but it should be for first encounter." | **Easy end of medium — INTENDED.** Do not tune. |
| e2 | FIGHT | "Very easy overall, but not overly so. Calibrate as the easy side for medium." | **Easy end of medium.** ⚠ Reverses run 2's "medium-to-hard". |
| e3 | OBJECTIVE | (no difficulty read — the run surfaced a UI defect instead) | none yet |

### ⚠ e2 anchor REVERSED — placement is now a variable

Run 2 read e2 as "medium-to-hard"; run 3 reads the same encounter, same build,
as "very easy". The owner's own hypothesis: *"Previous run might have been a
fluke, or maybe the placement made a big difference."*

The placement picker shipped between these two runs. That is not a neutral
change to balance: **opening placement is now a player-controlled lever on
every encounter**, and e2 is evidence that the lever is worth a full difficulty
band. Two consequences:

1. **Two runs of one encounter can no longer be averaged** unless the placement
   was the same. Record placement alongside every future anchor.
2. The sim's `placementOrder` default is the engine's auto-placement, i.e. the
   WORST case a competent human would accept. Sim numbers are therefore a
   floor on FIGHT cells too now, not just objective ones — by an amount e2
   suggests can reach a whole band.

Owner has calibrated e2 to the easy side. Taking the later read as authoritative
(it is the one made with the shipped feature), but this cell is the first place
to look if the medium band later feels inconsistent.

---

## [PLACE1-SIM] The sim now places melee forward — and it measures WORSE

Owner's ask, 2026-08-31: *"The sims should at least attempt to put melee units
in front and ranged units in the back."* Implemented in `src/ai/simPlacement.ts`
(`frontlineOrder`), applied by `simEncounterCell`, so every downstream
instrument — buildBattery, buildSearch, choiceReport, objectiveHarness —
inherits it. It permutes only the tiles the default already used, so the
party's footprint is unchanged and nothing else about a re-run moves.

### The measurement (owner's comp, medium, 200 games/cell, seeded)

| | e1 | e2 | e3 | e4 | e5 | e6 | e7 | e8 | e9 | e10 | e11 | e12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| slot-order default | 100 | 98 | 92 | 100 | 97 | 68 | 41 | 69 | 55 | 98 | 12 | 94 |
| melee-forward | 100 | 93 | 86 | 100 | 97 | **100** | **92** | **19** | **34** | 99 | 5 | **45** |
| delta | +0 | −5 | −6 | +0 | +0 | **+32** | **+51** | **−50** | **−21** | +1 | −7 | **−49** |

**Net across the campaign: −4.5 points.** The heuristic helps enormously on
two cells and hurts enormously on three. It does not make the sim uniformly
less pessimistic, which is what everyone (me included) expected it to do.

### What this actually tells us — placement is the dominant variable

e12 is the cleanest case. Between the two runs exactly ONE unit moved: the
Barbarian and the Warlock swapped a front tile for a back tile. Same party,
same build, same level, same seed discipline. **94% → 45%.**

No tuning lever measured in this campaign — not HP scale, not a boon, not a
deep gift — moves a cell by 49 points. Opening placement is now known to be
the largest single uncontrolled input to campaign difficulty, and until this
change the sim was sampling exactly one arbitrary point in that space and
reporting it as *the* number.

Consequences, in order of importance:

1. **Every campaign number ever recorded is one placement's worth of noise
   wide.** Bands of ±10 were being read off an input worth ±50.
2. **A single sim run is no longer a difficulty statement.** It is a difficulty
   statement *conditional on an opening*, and that condition must be reported.
3. The forward-melee opening is a *trap* on three cells. e8 is a three-room
   delve (melee eats attrition across all three), e9 is a survival objective
   (forward = exposed for the whole clock), e12 is kill-the-marshal-and-reach-
   the-tile (the Warlock's Essence Drain sustains a front tile; the Barbarian
   does not). These are real design facts about those encounters, surfaced only
   because placement finally varied.

### ⚠ Not adopted as truth — adopted as a second sample

I have NOT rebaselined the bands onto the melee-forward numbers. Doing so would
repeat the original mistake in a new costume: replacing one arbitrary opening
with a different arbitrary opening and calling it the difficulty. The honest
reading of a cell is now the PAIR, and the eventual fix is to search openings
(the `buildSearch` coordinate-ascent machinery already does exactly this shape
of search over builds and can be pointed at placement) and report the range.

Until that exists: report both rows, and treat the spread between them as the
error bar on that encounter.

### One place the heuristic deliberately does nothing

An encounter with no enemy placement has no direction to be forward in.
The first implementation invented one ("advance along +x") and it cost e8 fifty
points against the plain default before the room-wave placement was found and
used instead. `frontlineOrder` now returns the identity order when it has no
enemies to face. When the information isn't there, change nothing.

---

## [PLACE1-SEARCH] Exhaustive opening sweep — the numbers were never difficulty

`placementSearch.ts`, owner's comp, medium, all 24 openings x 80 games x 12
encounters. Full data: `balance_runs/placement_search_medium.json`.

| enc | best | worst | spread | median | frontline (rank) | slot-order (rank) |
|---|---|---|---|---|---|---|
| e1 | 100 | 99 | 1 | 100 | 100 (#7) | 100 (#12) |
| e2 | 99 | 70 | 29 | 88 | 94 (#8) | 98 (#3) |
| e3 | 96 | 36 | **60** | 84 | 84 (#14) | 96 (#1) |
| e4 | 100 | 78 | 22 | 99 | 100 (#3) | 100 (#8) |
| e5 | 100 | 75 | 25 | 99 | 96 (#19) | 99 (#13) |
| e6 | 100 | 70 | 30 | 100 | 100 (#19) | 70 (#24) |
| e7 | 100 | 10 | **90** | 62 | 91 (#8) | 35 (#18) |
| e8 | 81 | 11 | **70** | 57 | 20 (#22) | 57 (#12) |
| e9 | 96 | 15 | **81** | 51 | 29 (#16) | 53 (#12) |
| e10 | 100 | 76 | 24 | 96 | 100 (#2) | 100 (#1) |
| e11 | 94 | 4 | **90** | 37 | 4 (#24) | 14 (#19) |
| e12 | 100 | 20 | **80** | 56 | 50 (#16) | 94 (#2) |

**Mean spread: 50 points. Seven of twelve encounters exceed 60.**

### What this retires

Every certification, every band check, every tuning pass on this campaign was
performed on ONE opening out of 24, chosen by an accident of party order. The
target band is 65-80%; the average encounter's placement spread is 50 points
wide. **The measurement error was two and a half times the width of the band
being measured.** No conclusion drawn from a single-opening run survives this,
in either direction — cells that looked too hard and cells that looked too easy
alike.

The two openings the sims have actually used are not systematically good or
bad, which is the worst case: slot-order ranked #1 on e3 and #24 on e6;
frontline ranked #2 on e10 and #24 on e11. Neither is a floor, neither is a
ceiling, and their disagreement is not a bias that could be corrected — it is
noise of a size that swamps the signal.

### What replaces the old number

A cell is now reported as **median (best-worst)**. Median is the honest single
figure: what a player who places without insight tends to get. Best is a
ceiling that requires both perfect placement AND the brain playing it out as
well as a human would, which on objective cells it does not.

Medium band, read off the median column: e1 100 · e2 88 · e3 84 · e4 99 ·
e5 99 · e6 100 · e7 62 · e8 57 · e9 51 · e10 96 · e11 37 · e12 56.

⚠ Nine of twelve sit outside the 65-80 band on the median, six of them ABOVE
it. Do not act on this yet — see the calibration contract: sim medians are a
floor on objective cells and the owner's on-device reads are the anchor.

### e11 is not a difficulty problem, it is a placement trap

e11's median is 37% but its best opening is 94% — and BOTH openings the sims
used rank in the bottom six (#24 and #19). The "structural bimodality"
diagnosed at [pass 3] and blamed on `loss:main_dead` was, at least in part,
this: the encounter is winnable and the sim was placing into the trap every
single time. Re-open the e11 conclusion.
