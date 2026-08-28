# Unlit Beacon — Medium Run Notes → Action Plan (2026-08-27)

Source: owner's full medium-difficulty playthrough (two comps). **These notes
are gospel.** Where the sim disagrees with them, the sim is counting wrong.
Initial analysis by Fable; work assigned per Claude model below.

---

## Part 0 — What the gospel says about our measurement (read first)

The battery certified this campaign "balanced end to end" at every tier. The
owner then found, at MEDIUM settings:

| Enc | shipped medium feels like | shipped medium hpScale |
|---|---|---|
| e1 | **hard (slightly easy for hard)** | 1.12 |
| e2 | below medium (can't lose) | 1.00 |
| e3 | medium ✓ | 0.65 |
| e4 | **challenging side of hard** | 1.02 |
| e5 | **nightmare (exactly)** | 1.30 |
| e6 | medium ✓ | 1.30 (⚠ > hard's 1.20 — inverted ladder) |
| e7 | medium ✓ | 1.00 |
| e8 | **hard end of hard** | 1.04 |
| e9 | medium ✓ | 4.10 (survive clock carries the difficulty, not HP) |
| e10 | medium ✓ (except Tam AI) | 1.50 |
| e11 | medium ✓ | 2.90 |
| e12 | medium ✓ | 2.45 |

Two systematic errors fall out of this:

1. **The sim's player is too good.** Our solve/median thresholds are computed
   from an optimal-ish player AI. On encounters whose difficulty is
   *structural* — spread/rear placements (e5), hazard fields + ranged AI (e4),
   room doors + initiative resets (e8), body-pressure openers (e1) — the sim
   absorbs the structure and reports a clean solve rate, while a human eats
   it. Every encounter the owner flagged as overtuned is a structural one;
   every flat kill-all read correctly. **hpScale is calibrated per-shape, and
   structural shapes need a LOWER medium than the battery suggests.**
2. **Aggregate solve rates hide comp filters.** e4 punishes melee-heavy comps;
   e5 punished them harder. Owner: a campaign may filter comps at nightmare,
   but stacked opposite filters = unbeatable nightmare. The battery must
   report per-comp-archetype (3M/1R, 2M/2R, 1M/3R) solve rates, not blends —
   and the certification gate must check that at least the 2M/2R spine
   survives EVERY encounter at nightmare.

**Calibration rule going forward (add to BALANCE_STAGE2_PLAN.md):** these 12
owner readings are fixed anchor points. Any future threshold scheme must
reproduce them from the recorded battery data before it is trusted on new
content. If it can't call e5-at-1.30 "nightmare" and e9-at-4.10 "fine
medium", it doesn't get used.

---

## Part 0b — MEASURED (Opus, 2026-08-27): the battery cannot rank difficulty

Ran the medium cells e1-e8, 150 games each, three representative comps, against
the owner's gospel labels. Spearman rank correlation between sim win rate and
the owner's difficulty ordering (a usable instrument would be strongly NEGATIVE
— harder for him, lower win rate):

| statistic | rho vs owner ranking |
|---|---|
| sim mean (what the bands are applied to) | **+0.12** |
| sim melee comp | **+0.21** |
| sim worst comp | **+0.07** |
| sim balanced comp | -0.36 |

**Zero predictive power, and the wrong sign on three of four.** The extremes
are near-inverted: the owner's HARDEST encounter (e5) is the sim's second
EASIEST; the owner's EASIEST (e2) is the sim's third HARDEST.

```
owner hardest -> easiest :  e5  e1  e4  e8 | e3  e6  e7  e2
sim   hardest -> easiest :  e8  e7  e2  e3 | e1  e4  e5  e6
```

This is not a threshold problem. No band edge, floor or target-midpoint change
can repair a rank correlation of +0.12 — the ordering itself carries no signal.
**Binary-searching hpScale against this metric (campaignTune.ts) would churn
numbers around noise and destroy the only real information we have, which is
the owner's eight labelled cells.** That is why the retune below was done by
hand from the gospel and NOT re-walked.

### Why it diverges — two opposite sim-competence artifacts

The divergence is not one bias but two, pulling opposite ways, which is exactly
how you get rho ~= 0:

1. **The sim is superhuman at approach, so approach-hard cells read EASY.**
   The battery is brain-vs-brain: the same AI that the owner calls "too good at
   abusing the ranged attacks, the fire tiles, and the extra movement of their
   rogues" is also playing HIS side, pathing perfectly and never wasting a
   turn. On e1/e4/e5/e6 — every one of them a cross-the-field-under-fire
   problem — the sim's MELEE party posts the HIGHEST win rate of the three
   comps (82%, 87%, 92%, 97%) on precisely the encounters the owner found
   melee-hostile to the point of being unwinnable. That is a sign inversion,
   not a magnitude error.
2. **The sim is incompetent at special objectives, so those read HARD.**
   e7 (race, "send one runner") and e8 (rooms/doors) are the two cells where
   the sim is HARDER than the human. e8 hands over the smoking gun: 13% DRAWS
   flagged as `(stall)` on the balanced comp, i.e. the sim does not know how to
   progress through the room sequence and times out. A stall is a competence
   bug being scored as difficulty.

### What to do about the instrument (not started — needs owner steer)

- **Cheap and certain:** fix (2). The e8 stall is a concrete bug; e7's
  scope:'any' race likely needs the sim to understand "spend the party, push
  one runner". Fixing these removes the false-hard half of the divergence.
- **Hard and open:** (1) cannot be fixed by making the AI better — the problem
  IS that it is better than a human. Options are a handicapped player policy
  (imperfect focus/approach) as a fourth baseline, or accepting that
  approach-heavy cells are owner-calibrated only. Recommend the owner decide
  before any further sim-driven tuning.
- Until then: **the eight gospel labels are the calibration set.** Any change
  to the instrument must reproduce them before it is trusted.

---

## Part 1 — Balance retune (Opus, sim-assisted, human-anchored)

The gospel gives us the hard/nightmare rungs nearly free: **the shipped
medium IS the new hard (e1, e4, e8) or the new nightmare (e5).**

- **e1**: hard := ~1.15 (shipped medium was "slightly too easy for hard");
  medium := well below (start ~0.95, re-walk); nightmare above hard.
- **e2**: raise medium a notch (owner: impossible to lose). Small bump only —
  it's the specials-tutorial beat.
- **e4**: hard := 1.02 (shipped medium, "challenging side of hard" — keep it
  there, don't add); medium re-walked below; nightmare above.
  Also content change: split enemy visuals (Part 3, #14).
- **e5**: nightmare := 1.30 (owner: "exactly right level of challenge for
  nightmare"). Medium/hard rebuilt below — AND the opener redesigned:
  the spread-apart rear placement is the real cruelty ("MISERABLE",
  "unfair-feeling"), so at easy/medium the party starts closer together
  and further forward; keep the brutal spread for nightmare only if the
  deployment feature (Part 4) doesn't land first.
- **e6**: fix the inverted ladder (medium 1.30 > hard 1.20). Owner approved
  medium's FEEL, so keep medium's effective difficulty and raise hard above
  it; re-walk nightmare.
- **e8**: hard := ~1.04 (shipped medium, "hard end of hard" — shade to 1.00);
  medium re-walked below; room-3 HP is the named offender at medium.
- **Re-walk protocol**: per-comp battery (three archetypes), report worst-comp
  and 2M/2R separately; anchors above are acceptance tests.

**Growth chart (Opus, small + owner-specified):**
- `runtime.ts GROWTH_BY_CLASS.rogue` HP rungs → **field values (3/3/6/6/9)**.
  Owner: "Rogue should be getting as much max HP as the others, for SURE."
  The damage row already matches his intent (+1/effect at L9-10 while field
  gets +2) — leave it. Delete the "lighter HP rung" rationale comment; it is
  overruled. Re-run the L8+ encounter battery after (small player buff).
- **Deep gifts audit** (giftPerClass harness): is +3 AC ≈ +2 dmg +1 move per
  class? Is +6 HP vs +2 AC a real choice when AC stacks to +5 across a party?
  Owner suspects not. Measure per class, propose per-class gift menus or
  costs; owner signs off before any change.
- **e9 4.10 medium**: verified intentional-looking (survive clock carries
  difficulty; owner felt fine). Add a comment explaining WHY it's sane so a
  future pass doesn't "fix" it.

## Part 2 — Encounter mechanics & AI (Opus)

- **e8 room flow — redesign, owner-directed:**
  - Rooms **auto-advance when cleared** (no walking to the door), with a
    clear on-screen beat announcing the advance.
  - The room-2 **wave must be time-triggered, never door-triggered** —
    "going through the door implies going to the next room"; a door-spawned
    ambush "deceives the player."
  - **Clear dead enemies from the initiative column** on room transition.
  - Fix the door-turn initiative bug: entering a room let enemies act
    immediately AND skipped the rest of the player's non-frozen units before
    jumping to the top. Entering a new room should start a clean round at the
    top of initiative with the player's units intact.
- **e10 Tam (escort) AI**: behavior must be *predictable and communicated* —
  players need to know if/when he moves, heals, charges. Simplest compliant
  design: Tam follows a fixed, stated rule ("Tam moves 2 toward the Vigil
  every round; he will not fight") shown in the briefing + his unit panel.
- **AI passivity bug**: lone skeleton refused to advance on a player it
  couldn't beat, letting itself be plinked from range. A doomed unit should
  still maximize damage. Find the retreat/hold heuristic and floor it.
- **Round counter bug** (seen in e9): increments after the first initiative
  slot sometimes; display said R7/7 while state said R8. Find and fix the
  increment point; counter must tick exactly once, before the first slot.
- **e3b marks**: verify seizing both green tiles actually wins while enemies
  live; if yes it stayed ambiguous, if no the text lied — either way Part 3
  objective-text task covers the wording, this task covers the mechanics
  check.
- **e6 safe row**: owner believed corners weren't safe but all six back-row
  tiles are marked safe. Verify data vs render; make them agree.
- **e7**: owner cleared guards and won without entering the door — confirm
  that is the designed win (single room, green door = exit flavor); if a
  second beat was ever intended, decide now. Text task in Part 3.
- **e12**: rooted Winter's Voice logged "moved" — root should suppress the
  move log line (or log "strains against the roots"). Plus achievement for
  the hard path (kill the Marshal instead of seizing the standard) — owner
  explicitly wants it.

## Part 3 — Mobile UI & text (Sonnet)

1. **Special-select**: Rogue Kill Shot shows the green "level 6" line TWICE at
   first display; fine at next level. Dedupe.
2. **Passive-select copy is class-generic**: Rogue's Opportunist/Vengeful
   mention Ranger/Barbarian levels; Fighter's Thorns says generic damage
   instead of Fighter's 5. Every class shows ITS OWN numbers/levels only.
3. **Objective text is mechanical, never flavor** (sweep all 12):
   - e9 "Hold the Cave Mouth until the column passes" → "Survive N rounds"
     (flavor lives in preText).
   - e12 standard win → say explicitly the HERO must reach the standard.
     (Related UI-progress fix already spawned: task_9853b963.)
   - e3b → state the marks-win rule exactly.
   - e7 → state the actual win ("Any one unit reaches the door — or every
     enemy falls", whichever Part 2 confirms).
4. **Combat-log header**: two-line objective now truncates the room status
   ("Stair Locked — Clear…"). Give the status its own line or ellipsize the
   objective instead of the state line.
5. **Endgame retreat-cost banner** pushed the top-left log box down over the
   board — "serious, serious UI issue." Move the announcement into the log
   as a normal entry + a transient toast; the log box must never grow.
6. **Back-button loop** at campaign end (and daily puzzles): one back-press
   per loss stacked — up to ~20. Fix the navigation stack (replace, don't
   push, on retry/loss).
7. **e4 enemy art split** (with backend enemy-def change): Cultist image for
   Ignite/Flame Jet casters; skeleton art for the melee bruisers. Different
   archetypes must read as different models.

## Part 4 — Player-chosen deployment (owner: "must have")

Gloomhaven-style: scenario opens showing the map + enemy placements; the
player assigns their units among the marked start squares (the existing
`playerPlacement` tiles become *candidate* squares).

> **STATUS 2026-08-27: NOT IMPLEMENTED.** Verified — there is no deployment
> phase anywhere in the engine or campaign runtime. (`tests/deploymentZones.
> test.ts` is unrelated: it guards the ARENA's x0-2 / x5-7 column bands and the
> p2 mirror, not player choice.) This is still only the spec below.
>
> ⚠ **e5 wants MORE candidate squares than the usual four** (owner, 2026-08-27:
> "I'd recommend for E5 is to give more opening space options than usual, once
> that update is done"). e5 is the encounter this feature most directly cures:
> its authored spread exists solely to stop an AoE the player never chose to
> line up for, and letting him pick his own opening formation dissolves that
> whole class of problem rather than trading one complaint for another.

- **Opus — spec + backend**: pre-battle `deployment` phase in campaign match
  creation; validate assignment is a bijection onto the candidate squares.
  Check against the engine freeze: this is encounter-start flow, not engine
  types — flag for owner sign-off if any frozen type needs a field.
- **Sonnet — UI**: tap-to-place flow on the board before round 1; default =
  current auto-placement so it's one tap to accept.
- Note interaction with e5's redesign: player-chosen placement largely cures
  the "spread apart way in the back" misery on every encounter at once —
  build this first if sequencing allows.

## Sequencing

1. Sonnet Part 3 items 1-6 (small, independent, all pure client) — anytime.
2. Opus growth-chart fix + e6 inversion + counter bug (small, unblocks
   re-walks).
3. Opus Part 1 retune (needs 2's fixes in first).
4. Opus Part 2 e8/e10/AI work (bigger; e8 re-walk after).
5. Part 4 deployment (spec → owner sign-off → build) — start spec now, it
   changes what "placement misery" tuning even means.

### DONE this session (Opus, 2026-08-27)

- **Rogue growth fixed** — `runtime.ts GROWTH_BY_CLASS.rogue` HP 2/3/4/5/6 ->
  **3/4/6/6/9**. Field-equal at L6/L8/L9/L10 and +1 at L7. NOT a straight copy
  of the field row: the field takes L7 and L9 as DAMAGE, and Rogue's damage is
  deliberately delayed to the cap, so copying 3/3/6/6/9 would have left Rogue
  with literally NOTHING at L7. Damage row untouched (owner confirmed intent).
  ⚠ Growth-curve edit under the engine freeze — permitted as an owner-reported
  fix. **Invalidates the L6+ rows of every campaign** (Unlit Beacon e7-e12);
  they must be re-certified once the instrument is trustworthy again.
- **Ladders re-anchored by hand from the gospel**: e1 (1.12 -> hard@1.15,
  medium 0.98), e2 (lifted a notch, medium 1.12), e4 (1.02 -> hard, medium
  0.90), e6 (inversion repaired by RAISING hard to 1.45 — medium 1.30 is an
  owner-approved anchor and did not move).
- **DEFERRED ON PURPOSE — wrong lever, do not tune HP yet:**
  - **e5**: the owner's complaint is explicitly PLACEMENT ("spread apart and
    way in the back", "no way to get across"). §0 says pick the lever by what
    is wrong; that is spreadSweep/placement, not hpScale. Also the single
    encounter most cured by Part 4 deployment. Decide placement first.
  - **e8**: has live MECHANICS bugs (door-triggered wave, initiative reset,
    locked-stair walk) that inflated its difficulty, and the sim stalls on it.
    Fix Part 2 first, then measure, then tune.
- e9's stale comment corrected (said "medium 2.95", value is 4.10). Its
  non-monotone ladder is left alone: documented-deliberate, clock and scale
  read together, and the owner approved the feel.

---

# The calibration ledger (start here next session)

Owner's framing (2026-08-27), which supersedes my "the instrument is broken"
conclusion: **the sim is a ballpark tool, not truth.** Its near-perfect AI
measures COMPLEXITY under optimal play. The owner supplies the translation to
human difficulty, and the job is to learn that mapping and keep sharpening it.

His bar, stated: *"Normies should be able to beat medium if they play
competently. Very smart players should be able to figure out a path on
nightmare."* And the calibration mechanic: *"If you guessed 40% win rate in
simulation was good for mediums, and I report that that feels too hard, that
means you need higher than 40% win rate for future mediums."*

⚠ Weight his readings accordingly. He is a very strong tactical player (former
world's best at Tactics Arena Online, dropless grey) but explicitly does NOT
claim to be the ceiling: *"there are definitely better game players than me out
there... But if I can't solve it, it should be considered tough nightmare at
minimum. If I can't solve it, it's definitely not medium difficulty."*

**So his failure is a ONE-SIDED bound, and that is how to use it:** an
encounter he cannot solve is nightmare-or-harder, full stop — it is never
medium, whatever the sim says. His success does NOT symmetrically prove a cell
is easy, because he plays far above a normie.

## Acceptance criteria for UNLIT BEACON specifically (owner, 2026-08-27)

* **Medium must be manageable with 3 melee + 1 ranged.** Not merely winnable by
  the ideal comp — this campaign's medium has to work for a melee-heavy party.
* **Hard/nightmare MAY require 2 ranged.** That is a fine outcome and does not
  need fixing: *"If you need 2 ranged to do well in the overall campaign for
  hard and nightmare, that is a perfectly fine outcome."*
* **⚠ The thing to actually check is CONTRADICTORY filters.** A campaign may
  filter one way; it must not filter both ways, or the player is "damned if you
  do and damned if you don't" with a comp locked for the whole run. Unlit
  Beacon currently filters MELEE at e4, e5 and e8 — all in the same direction,
  which is legal. Verify no later encounter punishes 2-ranged comps equally
  hard before certifying nightmare.
* **Log the FILTER TYPE per campaign, not just the difficulty.** Owner: "we
  don't want every campaign to basically require the same comp." Unlit Beacon's
  filter is *approach-under-ranged-fire + hazard control*. Campaign N+1 should
  demand something else. This belongs in CAMPAIGN_BEATS.md alongside the beats
  registry — TODO, not yet written there.

## Rule: log every (sim number → owner verdict) pair here, forever

| enc | comp he played | sim (that comp) | sim mean | his verdict @ medium | notes |
|---|---|---|---|---|---|
| e1 | 3M/1R | melee 82% | 66% | **hard** | approach-heavy |
| e2 | 3M/1R | melee 53% | 50% | **too easy** | |
| e3 | 3M/1R | melee 46% | 60% | medium ✓ | |
| e4 | 3M/1R, then 2M/2R | melee 87% / bal 55% | 66% | **hard** both times | hazards + ranged AI |
| e5 | 3M/1R, then 2M/2R | melee 92% / bal 80% | 81% | **nightmare** | PLACEMENT, not HP |
| e6 | 2M/2R | bal 100% | 99% | medium ✓ | escape; clock is the lever |
| e7 | 2M/2R | bal 39% | 45% | medium ✓ | race; sim is bad at races |
| e8 | 2M/2R | **bal 68%** (post stall-fix) | 46% | **hard end of hard** | |

**The one clean anchor so far:** e8 balanced **68% ≈ "hard end of hard"**, on
the comp he actually played, after the stall was removed. Everything else is
contaminated by one of the two artifacts in Part 0b.

### What the ledger already suggests (LOW confidence, n=8 — do not over-fit)

* Matching the sim comp to the comp he actually played beats using the mean.
  The mean blends three very different parties and is close to meaningless.
* On approach-heavy cells the sim's MELEE number is anti-signal: it posts its
  HIGHEST win rates (82/87/92%) on exactly the encounters he found
  melee-hostile. Do not read a high melee number as "melee is fine" there.
* Cells with a known sim-competence artifact (races, rooms pre-fix) must be
  excluded from calibration until the artifact is fixed — e8 has now graduated
  out of that set and should be re-anchored on his next play.

### Next best measurement

Re-run e8 medium and ask him to re-play it. If he now reads it as EASIER than
"hard end of hard", the stall was inflating his experience too (it is a live
game bug, not just a sim one, so it may well have been). That single
before/after gives us a calibrated point with the artifact removed.

---

## DONE 2026-08-27 (session 2): the e8 stall

**Root cause — a live game softlock, not merely a sim artifact.**
`turnProcessor.ts` only ran `maybeRoomTransition` when the acting unit had
MOVED that turn. So: a unit steps onto an 'on_clear' door while enemies live
(door shut, transition correctly declines) → the party kills the last enemy →
the door opens → but that unit is already standing on it and has no reason to
move again → the transition never fires again → the party mills at an open door
until the 150-turn cap.

Every stalled game had the identical fingerprint (verified by instrumenting the
harness): room cleared, `foesAlive: 0`, door active, and a party unit parked ON
the door tile.

**A human hits this too** — park a unit on the door before clearing the room
and you must step off and back on to unstick it. This is very likely part of
what the owner ran into as "it won't let me charge, after I move it ends my
turns."

**Fix:** run the transition whenever a unit ENDS ITS TURN on an ACTIVE door,
moved or not — which is exactly what `maybeRoomTransition`'s own docstring
says the rule is. The movement test was never what fixed the D2 Goblinopolis
bug; that fix was about TIMING (end-of-turn so queued actions resolve in the
old room's geometry) and is untouched and still covered.

⚠ A regression test asserted the buggy behaviour ("a unit that merely ENDS its
turn on a door without moving does not transition"). It encoded an incidental
implementation detail as a requirement. Inverted, with the reasoning recorded
in the test, and a NEW test added for the other half of the invariant (an
on_clear door with enemies still standing must still NOT transition).

**Measured:** e8 medium draws 13-15% → **0**. Balanced comp **51% → 68%** and
back in band. 499/499 tests pass.

**Still open on e8:** the MELEE comp remains walled at 11%. That is a genuine
comp filter, and it compounds the owner's stated worry — e4 and e5 already
punish melee, so Unlit Beacon filters melee at three separate points. Worth
his attention before nightmare certification.

---

## DONE 2026-08-27 (session 3): e5 placement + e8 flow

### e5 — the wisp comes in on a clock now
Two of the owner's rulings had been fighting each other: "I didn't choose to
bunch them up, YOU did" (2026-08-24) forced the party SPREAD to cap Ring of
Frost at 2 units, and that same spread produced "completely spread apart and
way in the back... no way to get across the field" (2026-08-27).

His steer — put the wisp far enough back that it cannot nail the party turn 1 —
provably cannot work by distance: the wisp moves 3, PHASES (the ice pillars do
not slow it), blizzard has range 3 and the ring adds 1. Turn-1 reach is **7 on
an 8-wide board**; there is nowhere to put it. Verified against every legal
ring centre.

**Removing it from turn 1 achieves what moving it back could not.** The wisp is
now a round-2 wave from the back edge, so there is no turn-1 AoE to dodge and
the formation is free — and by the time it arrives the party has moved under
its OWN control, which honours the actual principle of the opening-formation
rule rather than its letter. It still has to commit and strand itself to land a
ring, so the designed trade survives.

Formation tightened y1-y6 -> y2-y5 (it used to overhang the enemy line, so two
units opened by walking sideways to rejoin their own party).

⚠ **A forward x=2 start was tried and rejected** — melee 87% / ranged **25%
WALL** / balanced 84%. It buys the melee approach precisely what it costs the
ranged standoff. The x=1 compromise measures **72 / 56 / 75, mean 68% in band,
no walls** — the tightest comp spread of the three and the only wall-free one.

### e8 — three flow fixes
1. **Door-triggered wave -> room clock.** New `rounds_after_entry` trigger
   (with `roomEnteredRound` on encounter progress), because an absolute round
   is unusable in a later room — it fires on entry or never. Owner: a
   door-sprung ambush "deceives the player, makes him feel cheated."
2. **Dead enemies cleared from the initiative strip on room transition.**
   ⚠ ENEMIES ONLY. `winCondition`'s `ally_dead` loss detects a fallen escort by
   finding it PRESENT-BUT-DEAD; purging every corpse would delete the evidence
   and silently disable escort-death losses. Party corpses left alone too.
3. (Session 2) the door softlock.

⚠ **Making the wave honest made it UNDODGEABLE** — it had been avoidable by
never stepping on one tile, so the encounter was quietly banking on players
eating an ambush they could have walked around. Unconditional it cost melee
11% -> 1% and balanced 68% -> 44%, and at the top tiers it made nightmare
**UNSOLVABLE** (best party 10% vs the 40% bar). Resolved per the owner's
difficulty policy: the clock is kept at hard/nightmare and dropped at
easy/medium, and hard/nightmare scale drops to pay for the extra body
(1.13/1.17 -> 0.92/1.00). e8 now reads medium 66% / hard 51% / nightmare 24%
— a real ladder, with hard 15pt under medium (an earlier 0.88 probe sat only
3pt from medium, inside the noise floor, i.e. not a different difficulty).

### Pre-existing walls found by the full medium battery (NOT caused by this work)
`e3` ranged 35%, `e7` ranged 31%, `e9` ranged **2%**, `e10` melee 31%. e9's is
the striking one — a ranged comp essentially cannot hold that cave mouth. None
of these were touched this session; flagged for a later pass. Note the owner
approved e9's FEEL at medium playing 2M/2R, so this is a comp-filter question,
not a "make e9 easier" one.

### Also
`e4` medium now reads mean 90% (was 66%) after its 1.02 -> 0.90 re-anchor —
above band by the sim, which is the intended direction given he called the old
medium "hard", but it may have overshot. His retest rules.
