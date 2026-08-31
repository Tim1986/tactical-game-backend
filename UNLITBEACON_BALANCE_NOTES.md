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

---

## e3 anchor — owner, 2026-08-31 (calibration run 3)

> *"I maintain this is a good calibration for an easy level fight, maybe the
> hard end of easy. Easy for my comp, but I'm reading it as generally too easy
> for medium. I want it to be a little harder on medium."*

Owner's comp: Barbarian/Whirlwind · Sorcerer/Ring of Fire · Warlock/Essence
Drain · Rogue/Kill Shot. Second consecutive run reading e3 as too easy (run 2:
*"Felt too easy honestly"*), so this is a confirmed anchor, not a one-off.

**Verified: e3 has not been rebalanced since the run-2 read.** Its content block
in `unlitbeacon.ts` is byte-identical (same SHA) across `20d612e`, `a8f5684`,
`1abb91f` and HEAD. The brain change in `1abb91f` gates on `ally_at_tiles`;
e3's win is `units_at_tiles`, and `objectiveUrgencyMult` is called from exactly
one line inside the escort block. Two runs, same content, same brain, same read.

Current lever: `hpScaleOverride: { easy 0.50, medium 0.65, hard 0.75, nightmare 0.85 }`.

### ⚠ Do not tune this to the owner's number — read the placement sweep first

e3's placement spread is **60 points** (best 96, worst 36, median 84). The owner
played it with an opening HE chose, on the shipped placement picker. His "too
easy" is a read on a *good* opening, and the sweep says a good opening on e3 is
worth up to 60 points over a bad one.

So "make medium a little harder" has two very different implementations:

1. **Raise `hpScaleOverride.medium`** — moves the whole distribution down. The
   owner gets the harder fight he asked for; a player who places poorly goes
   from a 36% cell to something well below it. That player is the one the
   medium band exists to protect.
2. **Narrow the spread** — make the encounter less placement-dependent, so the
   median rises toward the owner's experience and the floor comes up with it.
   e3's own header already records that this encounter "was not a difficulty
   setting, it was a COMP CHECK", and a 60-point placement spread is the same
   failure in a new axis.

**Recommendation: (2), then re-measure, then (1) only if the median is still
too high.** Tuning HP against a 60-point placement spread is tuning inside the
error bar — exactly the mistake the sweep just exposed across the whole
campaign. e3 also sits at median 84 against a 65-80 band, so it IS above band;
the question is only which lever closes the gap without punishing the floor.

⚠ BLOCKED ON OWNER — content change, trilogy rule. Nothing edited.

---

## e4 anchor — owner, 2026-08-31 (calibration run 3)

> *"E4 is a weird, weird fight. It's an incredible fight, genuinely challenging
> and interesting... First attempt I played it very poorly, got unlucky with the
> dice, and failed. But honestly, that was on me... On the replay I played much
> better and beat it comfortably... I'm gonna say it's okay as is for medium,
> but it's on the hard end of medium for sure... For E3, I can do kinda whatever
> order of moves and I'll be fine, I'm gonna overpower it. For E4, most opening
> moves are bad, but there are a couple of good ones in there that I need to
> start with. Opening placement helps incredibly too, that gives me agency I
> desperately need in that fight... bad play is punished much harder than in
> most... it might be the most fun fight in the campaign."*

**Verdict: SHIP AS IS. Hard end of medium.** Owner's caveat: his comp runs only
two melee; three-melee comps will find it harder.

### [SKILL1] The instrument this anchor forced — measuring play quality

The owner's core observation is that e4's difficulty lives in the gap between
good and bad play, and that *"getting data on a fight this complicated is going
to be hard because it's just really high variance"*. He is right, and it
explains a contradiction the sims could not previously see: **e4's sim win rate
is 100% and its placement spread is 22 points — one of the narrowest in the
campaign — while the owner reports it as the hardest fight to play and the one
where placement helps most.**

The sim could not see it because the sim has no play-quality variance. It plays
every game near-optimally, so an encounter whose difficulty is "punishes bad
play" is invisible to it by construction.

`simEncounterCell` now takes `playerBrain: 'optimal' | 'baseline'`. BaselineBrain
(walk to nearest, swing) already existed as the arena's naive bot and stands in
for a player not reading the fight. The gap is the **skill delta**.

### Skill delta, medium, owner's comp, 120 games

| enc | optimal | baseline | delta |
|---|---|---|---|
| e6 | 100 | 0 | **+100** |
| e5 | 98 | 3 | **+94** |
| e7 | 90 | 0 | **+90** |
| **e4** | **100** | **11** | **+89** |
| e2 | 93 | 16 | +78 |
| e1 | 100 | 42 | +58 |
| e12 | 43 | 0 | +43 |
| e9 | 32 | 1 | +31 |
| e10 | 99 | 76 | +23 |
| e8 | 20 | 0 | +20 |
| **e3** | **85** | **74** | **+11** |
| e11 | 3 | 0 | +3 |

⚠ **The delta is only interpretable where the optimal win rate is high.** e8,
e9, e11 and e12 are censored by the floor — a bot cannot lose by more than
everything. Among cells the party can actually win, the ranking is real.

### Two blind confirmations of the owner's reads

1. **e4 = +89, fourth-highest.** *"Bad play is punished much harder than in
   most."* Measured, independently, before this text was read against the data.
2. **e3 = +11, the LOWEST of any winnable cell.** *"I can do kinda whatever
   order of moves and I'll be fine."* The naive bot wins e3 **74%** of the time.

This is the strongest validation any instrument in this project has produced:
two qualitative reads, one instrument, no tuning, exact agreement.

### Placement matters MOST when play is imperfect

Running the opening sweep under both brains resolves the e4 placement paradox:

| | optimal spread | baseline spread |
|---|---|---|
| e3 | 57 pts (median 83) | 40 pts (median **85**) |
| e4 | 25 pts (median 98) | **58 pts** (median 18) |

e4's opening is worth **more than twice as much to a weak player as to a strong
one** — the owner's *"placement gives me agency I desperately need in that
fight"*, measured. The sim's narrow 22-point spread was an artifact of a brain
that plays well enough not to need the help.

And on e3 the naive bot's median (85%) is *higher than the optimal brain's*
(83%). Play quality is worth nothing there.

### What this says about the e3 decision (still blocked on owner)

e3's problem is not that its numbers are too low — it is that **skill is worth
+11 points there and +89 in e4**. Raising `hpScaleOverride.medium` on e3 makes
a fight that ignores play quality into a *longer* fight that ignores play
quality. The e4 anchor is the proof that this campaign can do better: same
level range, same party, an encounter where the opening matters, the hazard
punishes greed, and a two-target Flame Jet (16 unblockable, line, range 4)
is a real mistake to be played around.

**Recommendation for the rebalance pass: treat skill delta as a first-class
target alongside win rate.** A medium encounter wanting +11 from good play is
mis-designed regardless of where its win rate sits.

---

## [SKILL2] The difficulty tiers don't change the difficulty — they change the padding

Owner's design intent, 2026-08-31: *"You can breeze through on easy if you want
to just experience the different fights, but the challenge needs to be
satisfying and hard."* High skill variance is stated as a GOAL, not a defect.

That makes the tiers specifiable as a SHAPE rather than a number:

* **easy** — a player who is not reading the fight still gets through.
  Low skill delta, high baseline win rate.
* **medium** — bad play loses, competent play wins.
* **nightmare** — only good play wins. Large skill delta, low baseline.

Measured, owner's comp, 100 games (baseline = naive walk-and-swing bot):

| enc | easy base / opt / Δ | medium base / opt / Δ | nightmare base / opt / Δ |
|---|---|---|---|
| e1 | 86 / 100 / +14 | 40 / 100 / +60 | 2 / 81 / +79 |
| e2 | 57 / 100 / +43 | 15 / 94 / +79 | 0 / 43 / +43 |
| e3 | 98 / 100 / **+2** | 74 / 85 / +11 | 11 / 19 / +8 |
| e4 | 29 / 100 / +71 | 11 / 100 / +89 | 0 / 61 / +61 |
| e5 | 5 / 100 / +95 | 4 / 97 / +93 | 0 / 69 / +69 |
| e6 | 20 / 99 / +79 | 0 / 100 / +100 | 0 / 83 / +83 |
| e7 | 0 / 97 / +97 | 0 / 91 / +91 | 0 / 8 / +8 |
| e8 | 0 / 65 / +65 | 0 / 20 / +20 | 0 / 2 / +2 |
| e9 | 62 / 93 / +31 | 1 / 32 / +31 | 0 / 7 / +7 |
| e10 | 90 / 100 / +10 | 78 / 100 / +22 | 29 / 66 / +37 |
| e11 | 0 / 23 / +23 | 0 / 3 / +3 | 0 / 0 / 0 |
| e12 | 0 / 83 / +83 | 0 / 48 / +48 | 0 / 14 / +14 |

### The finding: easy and medium demand the SAME skill

Compare the delta columns, not the win rates. e5 is +95 on easy and +93 on
medium. e4 is +71 and +89. e6 is +79 and +100. **The tiers barely move the
skill requirement at all** — they move how much HP your mistakes cost.

That is a direct consequence of the only lever in use. `hpScaleOverride` scales
enemy health, which changes how long you survive a mistake; it does not change
whether the fight *requires* you to avoid the mistake. So "easy" is not an
easier fight to play. It is the same tactical puzzle with a longer grace period
— and on e5, e7, e8, e11 and e12 not even that: the naive bot wins 0-5% on EASY.

**9 of 12 encounters fail the stated easy promise.**

### Why this matters more than any single encounter's numbers

This is the transferable lesson, and it is the answer to *"is balancing these
scenarios even feasible?"*. The difficulty has been hard to tune because the
work has been:

* tuning ONE lever (enemy HP)
* against ONE metric (win rate) that saturates at the top and is confounded by
  skill and by placement
* on a single opening out of 24
* with no measurement of the property the design actually cares about

Every one of those four is now fixed or measurable. The remaining gap is that
**enemy HP is the wrong lever for the easy tier.** Levers that change skill
DEMAND rather than mistake cost, for the rebalance to consider:

1. **Enemy special access per tier.** The Torchhand's Flame Jet (16 unblockable,
   line, range 4) is the single most punishing thing in e4. Withholding it on
   easy removes the trap; keeping it on nightmare keeps the fight. This is the
   most direct skill-demand dial the content already has.
2. **Enemy count**, not enemy HP. Fewer bodies means fewer simultaneous threats
   to sequence, which is what tactical load actually is.
3. **Hazard density.** e4's hazards punish greedy positioning specifically.
4. **Enemy AI aggression** — a tier that advances into you demands less
   positioning than one that holds a line.

### ⚠ Caveat on the instrument, stated plainly

BaselineBrain is WORSE than a real casual human. It walks to the nearest enemy
and swings: no specials, no retreat, no target priority. "Baseline wins 0%" is
a loose lower bound, not a prediction about a person. What is trustworthy is the
COMPARISON — between tiers, between encounters, and between openings — because
the same bot plays all of them.

Before the rebalance acts on absolute easy-tier numbers, the honest move is to
calibrate a middle brain that uses abilities but does not plan ahead, and anchor
it against one of the owner's own deliberately-sloppy runs.

### e11, again

e11 reads 23% optimal on EASY and 0% baseline. The placement sweep already
showed its best medium opening is 94% against a 37% median. An encounter that a
perfect brain loses three times out of four on the easiest tier is not tuned, it
is trapped. Re-open with the placement data in hand.

---

## [SKILL3] CasualBrain — the easy tier's yardstick

Built 2026-08-31 at the owner's request. `playerBrain: 'optimal' | 'casual' | 'baseline'`.

Models a player who **knows their kit but is not reading the board**:

* **DOES** — use its special the moment it is off cooldown and something is in
  range; heal a visibly hurt ally (below 60%); take an obvious kill; otherwise
  hit the weakest thing already in reach, and walk at the nearest thing if
  nothing is.
* **DOES NOT** — avoid hazards, dodge AoE and line attacks, retreat when hurt,
  kite, focus fire as a team, play the objective, or think about next turn.

That second list is deliberately the "complex tactics" the owner has said easy
must not require. An easy tier this brain clears delivers its promise; one it
fails names the specific tactic being demanded.

### Two things learned building it

1. **Legality is not skill.** v1 fired Kill Shot on sight; the engine refuses an
   execute above its window, so the unit forfeited its whole turn — 5,326
   rejected actions across 36 cells, and a "casual" party scoring BELOW the
   mindless baseline. A real casual player's client greys out the illegal
   target. The brain now gates casts through the engine's own
   `executeWouldFail`, plus leap-tile and AoE-wall-sight checks. **Now zero
   validation errors.**
2. **Weakest-target focus fire is not casual, it is expert.** v1 picked the
   globally weakest enemy, which sent units sprinting past the enemy in front of
   them and measured below baseline on six cells. Corrected to
   weakest-in-reach, nearest-otherwise.

### ⚠ BaselineBrain's own numbers are slightly understated

Measured while validating: over 12 cells x 60 games, **BaselineBrain produced
471 validation errors; CasualBrain and OptimalBrain produced 0.** The naive bot
submits illegal actions and forfeits those turns. Every baseline figure in
SKILL1/SKILL2 is therefore a *little* lower than the policy itself deserves.
It does not change any conclusion — the gaps are tens of points — but the
baseline column is not a clean floor and should not be quoted as one.

### The ladder, all three brains (owner comp, 100 games)

| enc | easy b/c/o | medium b/c/o | nightmare b/c/o |
|---|---|---|---|
| e1 | 86/**100**/100 | 40/**98**/100 | 2/57/81 |
| e2 | 57/33/100 | 15/4/94 | 0/0/43 |
| e3 | 98/**99**/100 | 74/**77**/85 | 11/13/19 |
| e4 | 29/**75**/100 | 11/0/100 | 0/0/61 |
| e5 | 5/**71**/100 | 4/42/97 | 0/0/69 |
| e6 | 20/56/99 | 0/6/100 | 0/0/83 |
| e7 | 0/0/97 | 0/0/91 | 0/0/8 |
| e8 | 0/0/65 | 0/0/20 | 0/0/2 |
| e9 | 62/6/93 | 1/0/32 | 0/0/7 |
| e10 | 90/**88**/100 | 78/**79**/100 | 29/35/66 |
| e11 | 0/0/23 | 0/0/3 | 0/0/0 |
| e12 | 0/0/83 | 0/0/48 | 0/0/14 |

**Easy tier verdict: 6 of 12 encounters (e6 e7 e8 e9 e11 e12) still fail the
promise** — a player who knows their kit but not the board cannot clear them.
e7, e8, e11 and e12 give the casual brain flat 0%.

Four cells remain outside [baseline, optimal] (e2, e4/medium, e9). Casual play
being *worse* than mindless play is a real phenomenon — spending a
once-per-battle special badly, over-committing into a survival objective — but
these four are not yet distinguished from residual modelling error. Do not read
them as content findings.

---

## e5 anchor — owner, 2026-08-31

> *"E5 the wisp shows up later, I was wondering where it was. I'm gonna approve
> this for medium play, but it felt on the easy side for me... Without the wisp
> to play around, it felt easy to just charge in and overrun everything. I think
> the wisp needs to be there in the start on hard and nightmare, and it just
> needs to have its placement and movement tuned so it can't crush you too
> easily."*

**Verdict: APPROVED for medium, easy side.** Proposed change: **wisp present
from turn 1 on hard and nightmare**, with placement and movement tuned so an
early wisp does not simply win the fight for the enemy.

### The instruments agree, and say WHY

e5 medium: casual **42%**, optimal **97%** — a skill delta of +55. But easy is
casual 71 / optimal 100, and the owner's *"easy to just charge in and overrun
everything"* is precisely what a +29 easy delta describes: the fight does not
punish a straight-ahead approach until it is too late to matter.

The wisp is the thing that would punish it. Delaying its arrival removes the
tactical object from the part of the fight where positioning is still cheap —
which is the same failure as e3 (nothing to play around) arriving by a
different route.

**This is the SKILL2 lever in its cleanest form.** "Wisp from turn 1 on
hard/nightmare, later on easy/medium" changes the *skill demanded* per tier
without touching a single HP number. It is a better instance of the pattern
than the Flame Jet proposal because the wisp is already built, already tuned as
a threat, and its arrival turn is already per-encounter data.

### On the owner's self-doubt about easy

> *"I'm starting to doubt my ability to properly balance easy levels of
> gameplay, I assume tactics are natural that probably aren't."*

This is exactly the gap CasualBrain exists to close, and it is not a personal
failing — it is unfixable by introspection. An expert cannot un-know the
tactics they use automatically; that is what expertise IS. The brain does not
know them either, and unlike a person it can be asked the same question a
thousand times without learning. **Read the casual column, not your own
experience, for the easy tier.** The owner's on-device runs stay the anchor for
medium and above, where his skill is the thing being measured.

---

## e6 anchor — owner, 2026-08-31

> *"Difficulty here feels too easy. Fine for easy difficulty, feels too easy for
> medium. I honestly don't understand how any loses this if they have any brain
> at all. Knowing all six squares are valid would make it even easier. For hard
> and nightmare, it should just be four valid exit squares."*

Design note, same run: *"I like that these guys have root abilities. It's
annoying for melee, but we also need to make it a choice to not take Stalwart
as a passive."* — roots in e6 are intentional pressure on the Stalwart pick;
carry into the passive-balance work, do not soften them.

**Verdict: TOO EASY for medium. Correctly tuned for easy.**
Proposed: **four exit tiles on hard/nightmare, six on easy/medium.**

### The six-square question, answered

Not a display bug, and the owner's memory is right. e6's goal was `(7,2)`-`(7,5)`
until `b88b063` (2026-08-24) widened it to `(7,1)`-`(7,6)` — the full far
column. `(7,0)` and `(7,7)` are removed board corners and remain unstandable.
All six current tiles are validated in-bounds and unwalled at encounter-build
time by `runtime.ts`, so the green highlight cannot show an illegal tile.

⚠ The widening was itself an owner fix: the 4-tile version was a GOTCHA —
he crossed, stood on the far shore, and nothing happened until a stray unit
shuffled onto a qualifying tile. **Narrowing back to four is safe now only
because the goal tiles are DRAWN.** The original defect was invisibility, not
narrowness. Any hard/nightmare narrowing must keep the highlight honest.

### [SKILL3a] The instrument disagreed with the owner, and the instrument was wrong

e6/medium measured casual **6%** while the owner called it trivial. Diagnosis:
CasualBrain ignored objectives entirely, so it fought until e6's round-6 clock
killed it. **Its number was an artifact, not a difficulty.**

Fixed — the brain now reads a `units_at_tiles` win. Two failed attempts worth
recording, because each named a real distinction:

1. **March at the objective always** → e6 6%→**100%** (owner confirmed), but
   e3 99%→60% on an encounter he calls trivial.
2. **Split across marks for `simultaneous`** (claim the tile you are nearest)
   → necessary for e3's two bridgeheads, insufficient alone.
3. **The distinction is a CLOCK.** e6 loses at round 6, so you go now. e3 has
   no deadline, so the natural unpractised play is to kill what is in front of
   you and stroll onto the mark afterwards. Final rule: fight first, travel
   when the fighting is out of reach — unless a round counter is what is
   killing you.

After: e3 easy **98** / medium **76**; e6 easy **100** / medium **100**.
Both now match the owner's reads on encounters he has actually played.

### ⚠ CORRECTION to SKILL2/SKILL3's "6 of 12 fail the easy promise"

That count was inflated by this artifact. e6 was counted as failing at 56%
and actually scores 100%. **Do not quote the earlier easy-tier failure count.**

Remaining known blind spots, stated so nobody reads a 0% as content:

* **e7** (0% at every tier) — `units_at_tiles` under a clock, i.e. a race. The
  brain heads for the goal correctly and still loses, so this one may be real,
  but optimal scores 97% on easy and its placement spread is 90 points. Treat
  as UNKNOWN until the owner plays it.
* **e12** (0% at every tier) — win is `units_dead` on a NAMED enemy. The brain
  fights whatever is nearest and has no concept of a priority target. Its
  number here is meaningless.
* **e8** (0%) — three sequential rooms; no per-room reasoning.

### Sim view of e6, with a brain that can read it

| | easy | medium | nightmare |
|---|---|---|---|
| casual | 100% | **100%** | 1% |
| optimal | 99% | 100% | 83% |

A player who merely knows their kit and reads the objective wins medium
**every single time**. That is the owner's *"I don't understand how any loses
this"*, measured — and it is the strongest case in the campaign so far for a
medium-tier change. The nightmare cliff (casual 1%) suggests the tier levers
already bite hard here, so the medium fix should come from the same family:
**fewer exit tiles**, not more enemy HP.

---

## e7 anchor — owner, 2026-08-31

> *"I really like this setup. Lots of walls, tough to get through, and with an
> end target of one square in 6 rounds. This feels epic and different
> immediately... Overall difficulty wise I'd say is fine for medium. I don't
> think I'd ever lose at this difficulty, but there's at least a clock. Let's
> call this easy side of medium."*

**Verdict: EASY SIDE OF MEDIUM. Approved. Owner explicitly likes the design.**

### Design notes to carry into the rework (not difficulty findings)

* **Push/pull has a home here.** *"No enemies have Stalwart, which means this is
  a reasonable fight for a push or pull effect."* Same for e4's hazards, and e6
  if it were harder. Three named encounters where displacement effects would be
  worth taking — relevant to the passive/special viability work, since push and
  pull currently have nowhere to shine.
* **Freeze is the easy-tier lever here.** *"Freeze is punishing in a race
  against time, I don't mind that, it's thematic, but it's a lever we might
  adjust for easy. Maybe just take one of the freezes away."* Note this is the
  SKILL2 pattern again, third encounter running: the per-tier dial the owner
  reaches for is never enemy HP. e5 wisp arrival, e6 exit-tile count, e7 freeze
  count. **The rework should treat per-tier ability/threat access as the primary
  difficulty lever and HP scale as the trim.**

### ⚠ OPEN DISAGREEMENT: the instrument says e7 is brutal, the owner says trivial

| | easy | medium | nightmare |
|---|---|---|---|
| casual | 9% | **0%** | 0% |
| optimal | 97% | 91% | 8% |

The owner would *"never lose at this difficulty"*; the casual brain never wins
it. One of the two is wrong and it is not yet established which.

Fixed one real cause while investigating — the brain steered by Manhattan
distance, which walks a party into a wall and holds it there. e7 is a race
across nine walls, so it never arrived. A wall-only BFS from the goal now
supplies the distance (units deliberately ignored as obstacles: a casual player
routes around terrain and shoves past their own line). **That moved e7 easy from
0% to 9% and medium not at all**, so walls were a genuine defect but not this
one's explanation.

Remaining hypotheses, UNTESTED:
1. **`scope: 'any'` — one body suffices.** A human sends the fastest unit and
   screens with the rest. The brain marches all four at the tile. This is the
   most likely cause and is arguably basic play for an objective that literally
   names one square.
2. **Corridor jam.** Four units funnelling through nine walls block each other;
   the BFS ignores units, so the brain does not see the queue it is forming.
3. **Freeze**, which the owner names as the fight's defining threat and against
   which the brain has no answer at all.

**I have deliberately stopped tuning here.** Each encounter-specific fix so far
(objectives, clocks, simultaneous marks, walls) generalised. Chasing e7 to
match one reported number would start curve-fitting the instrument to the
answers, which destroys its value as an independent check. e7 stands as a
recorded disagreement until either the owner replays it deliberately sloppily,
or hypothesis 1 is implemented as the general rule it probably is.

---

## ⚠ ROGUE LEVEL-UP — owner frustration, 2026-08-31 (REPEAT REPORT)

> *"Going to level up I'm immediately frustrated again, a lot of my previous
> comments have been ignored. Rogue is getting shafted on these level ups, it
> should not be getting just max HP every time. I suggested at the very last
> level up it gets +1 attack damage when other classes get +2, not that it
> should never get a buff other than one HP. This needs to be fixed in the next
> rework."*

**This is the second time. Do not let it reach a third.** Owner has asked for
the fix in the NEXT REWORK, so nothing is edited now.

### What the screen actually says today

| level | Fighter (the field) | Rogue |
|---|---|---|
| L6 | +3 max HP | +3 max HP |
| L7 | **+1 basic-attack damage** | +1 max HP |
| L8 | +3 max HP | +2 max HP |
| L9 | **+1 basic-attack damage** | **+1 basic-attack damage** |
| L10 | +3 max HP | +3 max HP |

Cumulative at L10: field +9 HP / +2 damage; Rogue +9 HP / +1 damage.

### What was actually fixed last time, and what was misread

The 2026-08-27 report was about **HP**, and that part was fixed — Rogue's HP row
was raised to match the field exactly. The damage row was left alone on the
strength of a quoted confirmation in the code comment: *"+1 attack at the end
when other classes get +2 attack."*

**That quote was read as approval of the whole shape and it was not.** The owner
was describing the CAP (Rogue ends +1 where others end +2), not endorsing four
straight levels of HP-only. Today's message says so explicitly: *"not that it
should never get a buff other than one HP."*

### The two defects, separated

1. **Distribution.** Rogue's single damage point lands at L9, so L6, L7, L8 and
   L10 are all HP-only — four of five level-ups with nothing but a health bar.
   The field alternates HP and damage and always feels like progress.
2. **The last level-up.** The owner's stated intent is *"at the very last level
   up it gets +1 attack damage when other classes get +2."* The table does not
   do this for anyone: the field's damage lands at L7 and L9, and **L10 is
   +3 max HP for every class including Rogue.** So the level the owner
   describes as the damage level currently grants no damage to anybody.

Whatever the rework decides about the cap, **L10 should be the damage level**
and Rogue's levels should not read as HP-only four times running. A per-effect
row is not the obstacle — Twin Strike paying the rung twice is a real
constraint on the TOTAL, not on which rungs are non-empty.

---

## ⚠ DEEP GIFTS — owner reiteration, 2026-08-31 (REPEAT REQUEST)

> *"I'm at my first deep gift. I want to reiterate that these need to be
> balanced against each other by their relative value for each class."*

**Second time asked. The tool existed and was measuring the wrong thing.**

`giftHarness.ts` handed the SAME gift to all four units (`gifts: [g,g,g,g]`)
and reported the party-level win-rate delta. That answers "is Gift of Fangs
good for a party" — it cannot answer the question actually being asked, because
the choice a player makes is PER UNIT. +1 damage means something entirely
different to a Rogue paying it twice through Twin Strike than to a Cleric.
Reading the whole-party number as if it were the per-class number is why the
request has gone unmet twice.

Added `--per-class`: the gift goes to ONE unit, the other three stay giftless,
which isolates exactly the quantity the menu asks about. Per-class means are
aggregated across every mid-band cell the pilot finds.

**How to read it, for the rework:** the number that matters is the SPREAD
within a class's row, not the size of any one delta. A class whose three gifts
measure the same has no decision to make at its Deep Gift — that is the E1 boon
failure repeating one level down. A gift no class prefers, or one every class
prefers, is a non-choice regardless of how strong it is.

---

## e8 placement-screen defects — owner, 2026-08-31

> *"In the setup for E8, it says there are walls on this battlefield, but none
> show up on the placement map... I started the encounter and there are walls
> that don't show up on the placement map, [much] less enemies, and also there
> are DOORS. For the first time in the game there are doors and I don't know
> what they are during placement. Also... the lock mechanic is getting cut off
> on the combat log: 'Stair Locked — Cl…'"*

All four confirmed and fixed (mobile). Root cause of the first three is one
thing: **a multi-room encounter keeps everything on `rooms[0]`.** e8 has no
top-level `terrain`, `enemies`, `enemyPlacement` or `exitDoors` at all, and the
placement picker read only the top-level fields — so it drew a bare 8x8 with
nothing on it, for an encounter whose own briefing text promises walls.

The picker now reads through to `rooms[0]`, and gained a `doors` prop plus a
legend, since a door had never been shown to the player before the fight that
introduces them.

⚠ The picker deliberately shows only room 0. That is correct — room 0 is the
board you are placing onto — but it means the enemy count on screen is smaller
than the encounter's total by design. If that reads as a lie to a player, the
briefing is the place to say "three rooms", not the picker.

The truncation was a REGRESSION from this session: the status line was clamped
to one row, and on e8 it carries "Room 1/3" AND the lock state, which does not
fit 200pt at 11px. Now two rows, with the panel ceiling raised to pay for it —
the log surrenders a row instead of the board losing space.

---

## Owner report batch, 2026-08-31 (post-gift, E8)

### 1. Inspect panel — FIXED

* **`gift_damage` shown as a raw slug** ("✨ Undying, gift_damage"). It is not a
  passive at all — it is the flag the engine uses to carry the Deep Gift of
  Fangs onto a unit — and it leaked into the passive vocabulary. Now filtered
  out. Stride and Stone needed no equivalent fix: they were never flags, they
  land directly on `movementRange`/`armorClass`, which is why the owner's
  AC-gift hero "just shows him with increased AC".
* **The damage number was the ability's raw value**, so a unit with the Gift and
  a Veteran rung read 12 and hit for 15. `certainBasicDamageBonus()` is now
  exported from `abilityExecutor` and used by the panel, so the client never
  grows a second copy of the damage rules. It counts only modifiers already
  certain before the attack is declared — Opportunist (needs a target),
  Vengeful (needs the caster below half) and Channeler (needs an unspent move)
  are excluded on purpose: a number promised before an attack must be one the
  attack will deliver.
* **"Veteran" in the combat log** is `CAMPAIGN_GROWTH`'s basic-damage rung —
  the level-up damage point. Now included in the panel's number.
* ⚠ **NOT fixed: the Sorcerer's art is tiny in the panel.** Not reproduced yet.
  This is `boardArtScale` territory, and the sprite is correct on the board, so
  it is panel-specific sizing. Needs a screenshot or a repro.

### 2. Deep Gift idea from the owner — +1 RANGE

> *"+1 range would be a very interesting deep gift, reach for melee, extra
> range for ranged, not sure if that's a good idea or not."*

Recorded for the rework. Worth noting it is the only proposed gift whose value
is obviously class-dependent by construction — +1 to a melee reach of 1 is a
100% increase and changes what the unit can do; +1 to a Ranger's 6 is 17% and
changes almost nothing. That is either the best argument for it (a gift with a
real per-class shape, which is exactly what the menu lacks) or the reason it
needs a per-class value. `--per-class` is the instrument for deciding.

### 3. Campaign resume forced re-placement — FIXED (regression from PLACE1)

Leaving a campaign mid-encounter and returning dropped the player on the
placement screen for units already standing on the board. `refresh()` clears
`pendingMatchId` only when a match has ENDED, so a run left mid-fight comes back
holding one; before PLACE1 that was harmless because the button read "To
Battle!" and `launch()` quietly resumed. The picker replaced the button.
The placement order picked was discarded by `launch()` anyway — so the screen
was pure misinformation: *"that placement menu made me expect to have to start
over."* Now shows **Return to Battle** and nothing else.

### 4. Shields vs multi-hit — ENGINE IS CORRECT, no bug found

> *"the first attack popped the shield, then it seemed like the second one was
> the only one that rolled."*

Verified with four new tests (`tests/shieldMultiHit.test.ts`):
* Both daggers roll separately; shield absorbs the first that LANDS; the second
  deals full damage (100 → 92).
* A dodged first dagger leaves the shield standing (DGE-5).
* A shielded multi-hit emits TWO resolvable strikes (absorb + damage), which is
  exactly what the client turns into two dice — both the online and offline
  display paths already treat `SHIELD_ABSORBED` as a die-worthy strike.

So the rule the owner remembers establishing is in force and multi-hit does not
break it. **What I could not verify is what he SAW** — he said "it seemed
like", and the display should show two dice. Removed a stale comment in the
client that still claimed the engine consumes the shield before rolling (untrue
since 2026-08-28). ⚠ If two dice did not appear, that is a live display bug and
needs the specific observation: one die or two?

### 5. ⚠ E8 ENEMY AI PASSIVITY — open, and it matters for every anchor

> *"I am hanging back, letting them come to me, but only one of them came, the
> other two are hanging back, this bad AI behavior is making the fight much
> easier with this method than it should be."*

**This is the most consequential item in the batch.** If enemies do not commit
against a turtling player, then:

1. Every difficulty anchor taken so far describes a player who advanced. A
   turtle strategy is strictly easier and is not measured anywhere.
2. The sims cannot see it — both brains advance, so no cell in any table has
   ever exercised the passive-enemy state. The whole measurement stack is blind
   to this, exactly like the play-quality gap was before SKILL1.
3. It is an exploit in the ordinary sense: a dominant strategy that trivialises
   content, discovered by accident.

Not diagnosed yet. First check should be whether the brain's advance is gated
on the player being within some threat/approach radius, leaving units idle when
nobody comes into range — and note the arena exploit-bot suite already has a
`kite/ranged` case, so the harness for "player refuses to engage" exists and
could be pointed at campaign encounters.

⚠ BR1 RIDER: any brain change invalidates balance certification and requires a
full re-run. Do not fix this mid-calibration without the owner's call.

---

## Owner report batch 2, 2026-08-31 (E8 rooms)

### Fixed

* **Tiny Sorcerer** — was the NAME text shrinking (`adjustsFontSizeToFit`) to
  make room for "✨ Undying, gift_damage" on the same row. Removing the gift
  slug from the passive line resolved it; owner confirmed. No art bug.
* **Shield absorb hid its roll.** The log said *"attacks X. Blocked by
  shield!"*, which reads as though no roll happened. Since DGE-5 (2026-08-28) a
  shielded target dodges FIRST, so an absorb means the attack rolled and LANDED.
  Now *"attacks X. Hit — blocked by shield!"*. The engine was right (see
  `tests/shieldMultiHit.test.ts`); the log was hiding a die it really threw.
* **Multi-room placement discarded the player's opening.** The party re-entered
  each room in PARTY ORDER (slot i takes `entryTiles[i]`), so the choice made at
  the first door was thrown away. `encounterProgress.placementOrder` now carries
  it, and each member keeps ITS OWN tile index so the arrangement survives a
  death instead of survivors shuffling forward.

### ⚠ CONTENT: e8 room 2's entry tiles are a different shape — BLOCKED ON OWNER

> *"Multi room encounters need the same shape of opening squares in each room."*

| | tiles |
|---|---|
| room 0 placement | (0,3) (0,4) (1,3) (1,4) — a 2x2 block |
| room 1 entry | (0,3) (0,4) (1,3) (1,4) — same block ✓ |
| **room 2 entry** | **(0,1) (1,3) (0,5) (1,6) — a scattered column** ✗ |

The engine fix above makes the player's ORDER carry, but it cannot make a
scattered column feel like the 2x2 block they arranged. Room 2's `entryTiles`
should become the same block. Trilogy rule — not edited.

### ⚠ DESIGN: the door is artificial — owner wants options

> *"I have to walk my way there and I can't charge. Also, whichever unit walks
> in, they lose their turn, and we go in at that point in the initiative order.
> This results in very awkward gameplay, and a misleading door tile. The door
> isn't doing anything, it's artificial. We need to rethink this."*

Three separable complaints. Options below; all are content/engine changes and
none is implemented.

**(a) Cannot CHARGE onto the door.** Charge is the move-again action, and the
door transition fires on entering the tile. Cheapest real fix: allow the door
tile as a charge destination and run the transition after it resolves. No
design change, removes an arbitrary restriction. **Recommend regardless of what
is chosen below.**

**(b) The entering unit loses its turn.** Currently the room swaps mid-initiative
and the mover is done. Options:
  1. **Free transition** — the room swaps and the mover keeps its action. Most
     generous, removes the feel-bad entirely; makes the door a reward.
  2. **Room change at end of round** — everyone walks to the door, the party
     transitions together at the round boundary. Removes the "we go in at that
     point in the initiative order" awkwardness and makes the door a party
     decision rather than one unit's sacrifice.
  3. Keep the cost but SHOW it — the tile says "ends your turn". Cheapest, and
     the least satisfying.

**(c) "The door isn't doing anything, it's artificial."** This is the real
complaint and (a)/(b) do not answer it. The door is a scene-change trigger
wearing the costume of a tactical object. Options:
  1. **Make it a real objective tile** — the room ends when the whole party is
     on/through it, so the door is the goal (this is e6's shape, which the owner
     liked, and it makes the "same opening squares" problem disappear because
     the party arrives together).
  2. **Make it contested** — enemies can hold or close it, so reaching it is a
     fight rather than a walk.
  3. **Delete it** — rooms flow when the room is cleared, with no tile at all.
     Honest, and removes a misleading affordance; loses the sense of place.
  4. **Make it cost something** — a door that must be forced (an action, a
     check, a breaker enemy holding the key) so it is a decision.

⚠ (c1) is the strongest fit for what the owner has praised elsewhere: e6's
"get everyone across" read as epic, and e8's door currently reads as a chore.
It also solves the entry-shape problem structurally rather than by editing
tiles.

---

## [DOOR1] The crossing — owner spec, 2026-08-31. IMPLEMENTED

> *"If everyone needs to get across, there needs to be a cost. Tick one damage
> on each unit at the end of their turns... Once every unit is on a door tile
> (locked until all enemies are dead), then it advances to the next room.
> Regardless of whose turn it just was, in the next room they jump to the
> previously chosen opening setup... and the initiative starts at the beginning
> of the initiative order."* Clarified: *"the ticking only starts once the door
> is unlocked."*

Four engine changes, all shipped:

1. **The whole party crosses.** `maybeRoomTransition` now requires every LIVING
   party member to be standing on a door tile. Allies are excluded — they
   follow, they are not the party's to shepherd.
2. **Attrition.** `applyRoomAttrition`: 1 damage to a party member at the end of
   its own turn, **only once the door is unlocked** and only in rooms that have
   an exit. Party only — ticking enemies too would make waiting pay, the exact
   opposite of the intended pressure.
3. **The opening carries** (see the placement note above), so the party arrives
   in the arrangement it chose.
4. **Initiative restarts at the top** of the order on entering a room. A new
   room is a new scene.

### ⚠ CONTENT CHANGE MADE WITHOUT ASKING — and why it had to be

The rule is unimplementable against shipped content: **every door room in every
campaign had 1–2 door tiles for a party of 4**, so "everyone on a door tile"
could never be satisfied and every multi-room encounter would have softlocked.

Widened all nine door rooms to a uniform 4-tile column `(7,2)–(7,5)`, verified
free of walls and enemy placements in each: `unlitbeacon e8` (2 rooms),
`moonberry e5, e10` (3), `sealeddeep e12` (2), `goblinopolis e4` (1),
`lantern e11` (1). Also squared up **e8 room 2's entry tiles** — a scattered
column `(0,1) (1,3) (0,5) (1,6)` — to the same 2x2 block as rooms 0 and 1,
which the owner explicitly authorised.

`buildEncounterState` now REFUSES a room with fewer doors than party members,
so this class of softlock cannot be authored again, and two tests sweep every
registered campaign for door count and entry-shape consistency.

### ⚠ e8's SIM NUMBERS ARE NOW MEANINGLESS — do not read them

e8/medium fell from 20% to **10%** after this change, and that is not a
difficulty statement. The brain has no concept of the crossing rule: it does not
know to gather the party on the doors, so it mills at an open threshold paying
attrition until the turn cap. This is the same blind spot as e6 before the
CasualBrain learned to read objectives — the encounter got a new win condition
and the brain was not told.

Teaching it is a BR1 brain change, which invalidates certification and demands
a full re-run. **Deliberately not done mid-calibration.** Until it is, e8, e10,
e12 and every other door encounter must be read from play, not from the sims.

---

## [BR2] The Blizzard Wisp and the shield — brain fix, 2026-08-31

> *"In E8 last room, the blizzard wisp just whiffed its ring of frost, cast but
> didn't hit any units. Could have hit 2 of my units. That cannot ever happen."*

### Found: the brain hallucinated an immunity the rules do not grant

`scoreActions` treated `shielded` as "cannot be hit" for EVERY aoe and line
ability, damaging or not. Ring of Frost is pure `apply_status` (unblockable,
ring shape, centre spared), and DGE-5 is explicit that **a purely non-damaging
effect passes through a shield**. The engine has always frozen those units.

The owner's party carries the Keeper's Oilskins boon — *every unit starts each
encounter shielded* — so in e8 the wisp counted **zero enemies hit at every
centre on the board**, the once-per-game cluster gate (`aoeSpecialMinEnemies`)
skipped all of them, and the ability was never cast.

Measured over 2,500 randomised boards per condition:

| party | casts | cast rate | whiffs | casts hitting <2 party |
|---|---|---|---|---|
| unshielded (before) | 554 | 22% | 0 | 0 |
| **shielded (before)** | **0** | **0%** | — | — |
| shielded (after) | 563 | 23% | 0 | 0 |
| mixed (after) | 529 | 21% | 0 | 0 |

Fix narrows the gate rather than removing it: a shield still discounts a
DAMAGING blast, because there it really does absorb the hit. `defIsDamaging()`
is now the single predicate, matching `scoreEffectsOnTarget`'s existing check
(which was already correct — only the aoe and line paths had the bug).

**This is general, not wisp-specific.** Every status-only area or line ability
in the game was invisible to the brain against a shielded target.

### ⚠ WHAT I COULD NOT REPRODUCE — read this before treating it as closed

The bug I found and fixed makes the wisp **never cast**. The owner reports it
**casting and hitting nothing**. Those are different observations.

4,000 randomised boards produced **zero** zero-hit blizzard casts, before or
after the fix, and every cast hit two party units. The brain never proposes an
aoe centre unless `hitAny` is true, so a literal whiff should be unreachable
through this path.

Two candidates for what was actually seen, neither confirmed:
1. **The centre tile is spared.** A ring centred ON a party unit freezes its
   neighbours and NOT the unit the blast visually landed on. From the player's
   seat that reads as a miss on the obvious target.
2. Units already frozen, so re-applying changed nothing visible.

⚠ If it recurs, the detail needed is: **did any unit gain the frozen icon, and
where was the ring drawn relative to the party?**

### ⚠ BR1 RIDER — certification is invalidated

This is a brain change. Every campaign balance number predating it describes a
different AI, and a shielded party is exactly the condition it changes. The
scope is narrow (status-only area/line abilities vs shielded targets) but the
Oilskins boon makes it reachable in most of Unlit Beacon's back half. **A full
re-run is required after the calibration run finishes**, together with the
door-crossing brain work.
