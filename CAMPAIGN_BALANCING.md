# CAMPAIGN_BALANCING.md — the balancing workflow (operator: Opus 5)

This is the A8 deliverable (CAMPAIGN_ROADMAP.md): campaign encounter balancing
is **operated by Opus 5** (`claude-opus-5`), with Fable reviewing once per
campaign — a spot-check at the end, not a step in the loop. Everything you
need is in this file plus the tools it names. If you hit an escalation
trigger (bottom), stop and flag for Fable instead of pushing through.

The methodology behind these rules lives in `BALANCE_GRID_METHODOLOGY.md`
(arena grid) and `mobile/CAMPAIGNS.md` → "Balancing with campaignSim"
(campaign specifics, including the measured placement-spread case studies).
This file is the operating procedure; those are the why.

---

## The loop

```bash
cd ~/Claude/backend

# 1. SMOKE — always first, and again after ANY content edit (~1 min)
npx tsx src/ai/campaignSim.ts <slug> --smoke

# 2. FULL battery (only unlocks after a smoke pass on the CURRENT content)
npx tsx src/ai/campaignSim.ts <slug> --games 200 --json results.json

# 3. Read RESULT: PASS/FAIL. On FAIL, tune (see "Choosing the lever"), then
#    GOTO 1 — every content edit invalidates the smoke marker by content hash.
```

Scoped runs while iterating (faster, same rules):

```bash
npx tsx src/ai/campaignSim.ts <slug> --encounter e3 --games 200
npx tsx src/ai/campaignSim.ts <slug> --encounter e3 --difficulty nightmare --games 200
npx tsx src/ai/campaignSim.ts <slug> --party fighter,barbarian,rogue,cleric --level 4
```

Mechanics the harness enforces so you don't have to remember them:

- **Smoke-first is a hard gate.** A full run refuses to start unless a smoke
  pass has seen a content-identical campaign (SHA of the campaign object,
  marker in `.sim-smoke/`). This exists because a 2-hour run once measured
  nothing; don't work around it with `rm`.
- **Full runs self-caffeinate** on macOS (App Nap once masqueraded as a 4×
  slowdown). You still should not run two full batteries concurrently.
- **Unmodeled mechanics refuse to sim.** An objective kind the brain can't
  play throws at cell start (`BRAIN_MODELED_WIN/LOSS` in campaignSim.ts).
  That error is an escalation, not something to patch around.
- **Validation errors are an automatic FAIL** regardless of win rates — they
  mean authoring bugs (corner placements, bad kits), and win rates from such
  runs are garbage. Fix content, re-smoke.

## Reading the output

```
e3   L3   hard      melee      52%    [ 45%, 65%]    23
       └ W:Every enemy has fallen×15  L:Your charge has fallen×12  DRAW×3
     mean  55%  [ 45%, 65%] ✓
...
RESULT: PASS | FAIL
```

- **THE DIFFICULTY PHILOSOPHY (owner, 2026-08-17 — read this before tuning
  anything).** The bar is Gloomhaven's: easy is beatable with basic strategy
  by ANY reasonable comp; comp tolerance narrows with difficulty; **nightmare
  may legitimately be beatable only with the right comps and strategies.**
  A comp having a rough encounter is IDENTITY — the campaign-level
  comp-building metagame (a tool that cracks one encounter and dead-weights
  the next is a feature) is the game. A comp hitting a retry WALL is a bug,
  because the party is locked for the whole campaign and cannot re-comp
  around it. Floors mean "no walls", never "comp-neutral". **Do NOT tune an
  encounter's identity away to equalize parties** — if satisfying a floor
  requires sanding off the carve/wave/objective that makes the fight itself,
  flag it instead of flattening it.

- **Acceptance = per encounter/difficulty: MEAN in band, no party below its
  floor, and (nightmare only) at least one party ≥ 40% (solvability).**

  | difficulty | mean band | per-party floor | extra |
  |---|---|---|---|
  | easy | 80–95% | 60% | — |
  | medium | 65–80% | 35% | — |
  | hard | 45–65% | 10% | — |
  | nightmare | 15–45% | none | best party ≥ 40% |

  Nightmare's wide mean band is deliberate: with real comp differentiation
  the mean may sit low while the right comp wins plenty. The solvability
  check is the binding constraint there.

- **The `└ reasons` line is the mechanism check** (printed for smoke,
  out-of-band, or stalling cells; always in `--json`). Verify the fight is
  testing what it's designed to test: an escort encounter whose losses are
  not mostly "Your charge has fallen" isn't an escort fight; a deadline
  encounter with no "The deadline passed" losses has a toothless clock.
  In-band for the wrong reason is NOT balanced — fix the design pressure.
- **`⚠ draws N% (stall)`** (>10% draws): kiting/standoff signature. Usually a
  reachability problem (walls + ranged enemies, or a survive objective with
  nothing forcing engagement). Placement/design fix, not an HP fix.
- **Tutorial exemption:** the campaign's first encounter on easy (and often
  medium) may sit ABOVE band — a near-certain first win is correct UX.
  Document it in the campaign's balance report; don't tune it down.
- **Small samples lie.** Judgments at 200 games/cell only (±~7 pts at 95%
  confidence near 50%). 20–50-game runs are for direction while iterating,
  never for acceptance. SMOKE bands are pure noise — ignore them.

## Choosing the lever (by WHICH number is wrong)

The two failure modes need opposite tools:

| symptom | lever | tool |
|---|---|---|
| MEAN out of band, spread fine | `hpScaleOverride` (moves all parties together) | `npx tsx src/ai/campaignTune.ts` — binary-searches to the band MIDPOINT |
| a party under its FLOOR / spread wild | placement — enemy START DISTANCE is the dominant spread driver | `npx tsx src/ai/spreadSweep.ts` — sweeps start distance, writes nothing |

Expected effect sizes (measured, 2026-08):

- `hpScaleOverride` ±0.05 → mean moves ~5–10 pts (all parties together; it
  CANNOT fix spread — raising HP hurts/helps all three parties equally).
- Enemy start distance ±1 tile → spread swings 20–40 pts. Close starts brick
  RANGED (deny the standoff); far starts brick MELEE (crossing under fire).
  Proven both directions on lantern e3/e5 — a single tile un-bricked each.
- ±1 AC → ~±5% dodge — big, coarse. Whole-encounter mood shift.
- Enemy `maxHealth` by whole hit-breakpoints only: one HP step across an
  attack's kill-threshold can move a cell 25 pts with nothing in between
  (34→35 HP crossed a Twin-Strike boundary: 45%→20%). When the band's edge
  falls inside a cliff, park on the nearest safe side and document it.
- Composition swaps are NOT the intuitive fix — measure first. Swapping a
  melee runner for a ranged slinger to punish standoffs made spread WORSE
  (43→82 pts): ranged enemies punish the melee party more.

### THE OBJECTIVE-TYPE TUNING TABLE (measured across all three D2 retrofits)

Start every encounter from this table. It compresses ~25 batteries of
discovery; ignoring it is how a campaign takes nine passes instead of three.
"Starting scales" are first-guess `hpScaleOverride` values (easy/med/hard/nm)
from the shipped campaigns — expect to move them, but start there, not at
the kill-all defaults.

| type | difficulty lives in | hpScale behaviour | starting scales | the real levers |
|---|---|---|---|---|
| `kill-all` | damage race | normal (~5–10 pts per 0.05) — but CLIFFY when enemies are identical | 0.95 / 1.20 / 1.30 / 1.30 | scale; count/comp (coarse) |
| `carve` | approach geometry | normal | like kill-all, +0.1–0.2 | wall layout — cover on the APPROACH, never screening shooters |
| `boss` (kill-target) | the target's own HP pool | normal | 0.70 / 0.90 / 1.00 / 1.20 | target HP budget (100–110 + a differentiator: `undying` / `warded` / a clock); start distance for the melee-vs-kiter spread |
| `survive` (siege) | round count × wave size | **NEARLY INERT** | leave near default | round count (~25 pts/round), wave size (~10–15 pts/unit) |
| `race` (clocked kill-all) | clock × HP product | **HYPERSENSITIVE when the clock is tight** — non-monotonic, 28-pt swings on 0.01 | generous clock first, then 0.85 / 0.95 / 1.00 / 0.97 | the CLOCK. Make it generous (untimed avg + 2–3 rounds) so it catches only slow parties, then tune scale normally |
| `hold` (buttons) | how long the mark-guards survive | works, but needs BIG values | 1.30 / 1.45 / 1.70 / 2.30 | guards stand ON the marks (unguarded marks = a stroll) |
| `escape` | crossing under fire | semi — overshoots easily | 0.90 / 1.10 / 1.30 / 1.70 | door-triggered ambush waves; exit-tile count |
| `rooms` | cumulative attrition | normal but LOW values | 0.75 / 0.80 / 0.90 / 1.00 | garrison size is very coarse (±1 unit ≈ 45 pts); scale is the fine lever |
| `escort` | hunter pressure vs VIP HP | **NEARLY INERT** (balanced comp held 100% through a 0.70→2.25 sweep) | 0.70 / 1.10 / 1.20 / 1.30 | hunter COUNT is binary (2 = stroll, 3 = walls ranged); hunter SPEED is the fine dial; VIP HP (boss-tier — ranged can't body-block); a LONGER route makes it EASIER |

Cross-cutting measurements:

- **Identical-enemy encounters move in ~30-pt jumps** — every instance shares
  the same hit-breakpoints, so the whole cell crosses a cliff at once. If you
  are authoring and want smooth tuning later, mix the composition.
- **Per-enemy `nightmare` blocks are worth ~28 pts on their own** (measured:
  hard 0.98 → 54% vs nightmare 0.99 → 25%). A campaign whose enemies all
  carry them may need its nightmare scale BELOW hard.
- **⚠ Walls between melee and a RANGED enemy shield the shooter and tax only
  the crosser** (melee 52% → 35% → 4% across three such layouts while ranged
  sat at 100%). Cover belongs on the party's approach lane.
- **Melee-vs-kiting-boss spread is a START DISTANCE problem** — no scale
  fixes it; pull the court in.

Order of preference: `hpScaleOverride` → enemy maxHealth (breakpoint-aware)
→ count/composition (measured) → AC → placement (for spread). **Changing
placement invalidates the encounter's `hpScaleOverride` — re-tune HP after
moving anyone, then re-verify at 200 games.**

**Anti-oscillation discipline (added after the D2 Lantern loop failed to
converge):**

1. **One lever per battery.** Moving round count AND wave size AND walls,
   then reading one battery, tells you nothing about any of them. The e3
   walk (99→51→90→64→88) is what multi-lever "bracketing" looks like.
2. **200 games/cell has ±7-pt noise.** Never chase a delta under ~10 pts
   with another content change; re-run first if it matters.
3. **Log the calibration walk in the encounter's comment** (lever → mean) so
   the next session brackets instead of rediscovering.
4. **Two overshoots in a row on the same lever = wrong lever.** Stop and
   reread the mechanism (usually it's a breakpoint cliff or a spread problem
   wearing a mean costume).

4b. **Iterate per-encounter, accept per-campaign.** While working one
   encounter, run `--encounter eN --games 200` (~5× faster than the full
   battery). Full batteries are for the acceptance check and the centring
   survey — not for reading back a single-encounter change.

4c. **Prove the edit landed before interpreting the run.** Grep the file for
   the new value, and compare the `contentHash` in the `--json` output with
   the previous run's — an identical hash means you re-measured unchanged
   content (a silently-failed edit script cost one full battery this way).

5. **⚠ CENTRE EVERY NEAR-EDGE CELL IN ONE PASS — do not chase them one at a
   time.** This is the single biggest time sink found in the D2 Lantern
   retrofit. With ±7-pt noise, any cell sitting within ~5 points of a band
   edge flips PASS/FAIL run to run, so a battery reports a *different*
   marginal cell each time. Fixing them singly is whack-a-mole: three
   consecutive batteries each "failed" on a different edge-parked cell that
   had passed in the run before.

   **The drill, once the structural work is done** — run this against the
   battery's `--json` (it was hand-rewritten a dozen times before it was
   saved here; don't rewrite it again):
   ```bash
   python3 - <<'EOF'
   import json, collections, sys
   d=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'results.json'))
   BAND={'easy':(80,95),'medium':(65,80),'hard':(45,65),'nightmare':(15,45)}
   FLOOR={'easy':60,'medium':35,'hard':10,'nightmare':None}
   byk=collections.defaultdict(list)
   for c in d['cells']: byk[(c['encounter'],c['difficulty'])].append(c)
   for (enc,diff),cells in sorted(byk.items()):
       r={c['party']:c['winRate']*100 for c in cells}
       m=sum(r.values())/len(r); lo,hi=BAND[diff]; best=max(r.values())
       margin=min(m-lo,hi-m); fl=FLOOR[diff]
       fm=min(v-fl for v in r.values()) if fl is not None else 99
       uns=diff=='nightmare' and best<40
       flag=' << NUDGE' if (margin<5 or fm<5 or uns) else ''
       print(f"{enc}/{diff:<10} mean {m:5.1f} [mid {(lo+hi)/2:.0f}] margin {margin:+5.1f} floorMargin {fm:+4.0f}{' UNSOLV' if uns else ''}{flag}  {r.get('melee',0):.0f}/{r.get('ranged',0):.0f}/{r.get('balanced',0):.0f}")
   EOF
   ```
   Treat every `<< NUDGE` row in ONE edit: means toward midpoints, floor
   margins by the party-specific levers, then a single re-run.
   Then move ALL of them toward their band midpoints in a single edit and
   re-run once. `campaignTune.ts` exists precisely because the midpoint —
   never an edge — is the correct target; this rule is the manual version of
   the same idea applied to a whole campaign at once.

   **Caveat that cost a pass:** centring is not automatic. Verify each nudge
   against the per-party numbers, because on a steep ladder a small scale
   change can jump the cell past the midpoint entirely (lantern e1/medium:
   1.20 -> 69%, 1.17 -> 82%, a 13-pt swing for 0.03), and on some encounters
   easing the mean *breaks a floor* (lantern e4/medium: easing 1.10 -> 1.00
   moved the mean 1 pt but dropped melee 57% -> 31%, under the wall, because
   a slacker escape lets the enemy pack chase the party through the throat
   instead of dying at it). When centring and the floors disagree, **the
   floor wins** — park on the better rung and document the mean riding an
   edge, rather than trading a 2-pt mean miss for a real wall.

6. **Know when to stop.** A cell whose band falls inside a breakpoint cliff
   has no value that lands mid-band; take the nearest safe rung, write the
   calibration walk into the encounter's comment, and move on. "Documented
   and on the best available rung" is a finished cell, not a failure.

Campaign-grammar knobs (A2–A7 content) are legal too, with design intent in
mind: wave trigger rounds and sizes, room garrison composition, door mode,
hazard placement, escort HP/route, objective deadlines, `aiHints` hunts
(NOTE: hints attach to an enemy DEFINITION key — every instance of that key
hunts; give hunters their own key). Goals and boons are OUTSIDE the loop:
balance without boons (they're bonuses on top), goals never gate acceptance.

## Known measurement limits (do not over-trust the floors)

The three representative parties fight with **default loadouts** (each class's
first special/passive option — `choicesForLevel` in campaignSim.ts). Nobody
optimizes a loadout for the encounter. So "ranged 10%" means "ONE default
ranged build 10%" — the comp might be fine with the right picks, and a
passing comp might be carried by a lucky default. Before declaring a
nightmare cell unsolvable or a floor breached, probe 1–2 alternative
loadouts with `--passives` (specials require a small code change — flag if
needed). The owner's design intent (fears/roots crack one encounter, dead
weight in the next) lives exactly in the space this harness does not sweep.

## Measuring Deep Gifts (E0.4) — `giftHarness.ts`

The Deep Gift menu (`DEEP_GIFTS` in `campaigns/runtime.ts`) is a CHOICE, and a
choice is only real if different parties want different things. A gift every
party always takes — or one nobody ever takes — is a non-choice, the same
failure that killed the boon menu in E1. So the values are held to a
measurable bar, not taste:

```bash
npx tsx src/ai/giftHarness.ts --pilot        # which cells can show a delta at all
npx tsx src/ai/giftHarness.ts --games 200 --json gifts.json
```

It reports, per representative party, each gift's mean win-rate delta against
a **giftless baseline** at the same level, then states plainly whether the menu
is a real choice (different parties prefer different gifts) or an auto-pick.

⚠ **THE CEILING TRAP — the reason the pilot exists.** Gifts only exist at L7+,
but every shipped encounter is tuned for L1–L5. Run a gifted party against L3
content and it wins ~100% of the time, where **no gift can show any value** —
the run would report "all gifts are worthless" and that number would be a pure
artifact of the ceiling, not a fact about gifts. Measured: over half of all
(cell, party) pairs at L8 pin at 93–100% and are useless for measurement. The
pilot therefore drops every cell whose giftless baseline falls outside
25–80% and measures only in the rest. **The same trap applies to any future
player-power measurement** (boons, new passives): if the baseline is not
mid-band, you are measuring the ceiling.

⚠ **READ THE MEANS, NOT THE ROWS.** At 200 games a single cell's win rate
carries a binomial standard error of ~3.5 pts, so the *difference* between two
cells carries ~5 pts of noise — larger than the effect most gifts have. An
individual row showing "armor +4" is inside noise and means nothing on its own.
The per-party mean across ~13 cells cuts that to ~1.4 pts, which is why the
harness aggregates before it ranks. Never revise a gift value off one row.

### What the runs found, and the values they produced (2026-08-18)

Three iterations, 42 cell/party pairs x 200 games each, at L8.

**Run 1 (+1 / +1 / +2 — the design doc's guesses).** Both predictions were
wrong, in opposite directions. Movement was predicted weakest and measured
strongest (+20.4); armor was predicted strongest and measured second (+15.0);
damage measured a distant last (+10.6, significantly behind movement at SE 3.4).
Every party AND every objective shape preferred movement — an auto-pick.

**Run 2 (damage → +2).** Damage and movement became tied overall (+0.8, SE 3.2),
and preference split by objective shape.

**Run 3 (armor → +3) — SHIPPED VALUES: damage +2 / movement +1 / armor +3.**

| Gift | overall | melee | ranged | balanced |
|---|---|---|---|---|
| Damage +2 (per damage effect) | +21.2 | +18.9 | **+25.3** | **+20.5** |
| Movement +1 | +20.8 | +23.6 | +21.7 | +16.2 |
| Armor +3 | +23.3 | **+26.8** | +21.5 | +20.2 |

**All three pairwise gaps are inside noise** (spread 2.5 pts; damage−movement
+0.5 SE 3.3, damage−armor −2.0 SE 1.8, movement−armor −2.5 SE 3.6). No gift is
an auto-pick and none is dead.

The differentiation lives in the **objective shape**, and it is strong:

| Shape | damage | movement | armor | wants |
|---|---|---|---|---|
| escape | +20.1 | **+47.6** | +14.3 | movement, overwhelmingly |
| escort | **+8.6** | +1.6 | +1.7 | damage — movement is near-worthless here |
| survive | +19.7 | +23.3 | **+36.4** | armor |
| boss | +25.6 | +20.8 | **+28.2** | armor |
| rooms | +20.8 | +15.1 | **+27.0** | armor |
| hold | +20.5 | +3.0 | **+28.0** | armor |
| race | **+28.5** | +25.5 | +27.9 | damage (all three strong) |
| kill-all | +14.4 | **+17.2** | +15.5 | ~tied |

This is the owner's stated bar met exactly: a gift that decides an `escape`
(+47.6) is nearly worthless in an `escort` (+1.6). Because gifts are picked once
at L7/L8 and held for the rest of the run, the player is betting on the
campaign's remaining encounter MIX — a real strategic decision.

⚠ **Carry into E2:** (1) movement is worth ~+48 pts on an `escape`, so tune
campaign 2's **e7** knowing a movement party trivializes it. (2) Deltas of
+20 pts mean gifts are POWERFUL — the back half must be balanced with the
ladder modelled, not as an afterthought. (3) Shapes marked thin (n<4: hold,
hazard) are suggestive only.

Two consequences worth carrying:Two consequences worth carrying:

- The usable cells are proxies — shipped L1–L5 content forced to L8, not
  content designed for it. **Re-run the harness against campaign 2's own
  encounters once E2 exists**, and trust those numbers over these.
- `DEFAULT_GIFT_BY_CLASS` (campaignSim.ts) is the sim's model of a competent
  player's pick, and it decides what the back half of a long campaign gets
  balanced against. A bad policy means balancing against a strawman. Re-derive
  it from the harness whenever the gift values change.
- **The harness applies each gift UNIFORMLY to the whole party.** It therefore
  measures party-level preference, never per-class, and never a mixed-gift
  party — which is what real play produces. `DEFAULT_GIFT_BY_CLASS` projects
  the party result onto chassis, which is an inference, not a measurement.
- **The pilot's cell selection is unstable.** It filters at only 30 games, so
  which cells pass the mid-band gate shifts run to run (42 vs 40 pairs across
  these runs, and the positional share moved 17→12). Compare runs by their
  conclusions, not by treating individual numbers as reproducible constants.
- **Gift values now live in ONE place each** (`GIFT_DAMAGE_BONUS` in
  abilityExecutor.ts; `GIFT_MOVEMENT_BONUS`/`GIFT_ARMOR_BONUS` in runtime.ts),
  and `DEEP_GIFTS` builds its player-facing descriptions from them, so text and
  behaviour cannot drift. The rulebookSpec checks assert against the constants
  too — but `rulebook.ts` PROSE still states the numbers literally (players read
  it verbatim), so a value change means editing GFT-1/GFT-2/GFT-3 by hand.

## What you may not touch

- **Arena data** (`gameData.ts` chassis/abilities/passives) — campaign
  balance never reaches into arena. Per-encounter knobs only.
- The engine, the brain, `rulebook.ts`, the sim harness itself.
- The bands/floors in this file and campaignSim.ts (owner-set).
- Live determinism (fortune meters start at 0 in live play; the sim seeding
  random phases is intentional variance — don't "fix" either side).

## Escalation triggers — stop and flag for Fable

1. Any validation errors that survive a content fix (possible engine bug).
2. "not modeled by the brain" errors (new objective kind → brain work).
3. A cell you cannot land in band with legal knobs (often a breakpoint cliff
   or a design contradiction — needs a design change, not a bigger hammer).
4. Draw-stall flags that placement changes don't clear (brain/AI gap).
5. The mechanism histogram says the encounter isn't testing its design and
   no content knob changes that.
6. Suspicion the brain can't play a mechanic the encounter leans on (the
   sim then measures a floor, not the truth — e.g. conditional passives).

## Suggested loop shape (from the D2 Lantern retrofit)

Measured cost of that retrofit: **2 structural passes + 1 centring pass**
after the criteria were right — versus 5 thrashing passes before. Aim for:

1. **Design pass.** Set the palette, objectives, terrain, compositions. Do
   NOT tune numbers yet.
2. **Smoke + battery.** Read the *mechanism histograms* first, not the win
   rates: is each encounter being decided by its own objective? An escape
   that resolves as "Every enemy has fallen" isn't an escape yet. Fix design
   before touching a scale.
3. **Structural pass(es).** One lever at a time, for cells whose problem is
   shape (spread, walls, an objective that's the wrong difficulty *kind*).
   Expect 1–2 of these. Log each calibration walk in the encounter comment.
4. **Centring pass.** Once means are roughly right, nudge every cell within
   ~5 points of a band edge toward its midpoint IN ONE EDIT (rule 5 above).
5. **Final battery.** PASS, or a documented rung for anything cliff-locked.

The expensive mistake is doing (4) one cell at a time, and the wasteful one
is doing (3) before (2)'s histograms confirm the design works at all.

## Per-campaign checklist (done = all boxes)

- [ ] Smoke pass on final content
- [ ] Full battery at 200 games: `RESULT: PASS` (with `--json` saved)
- [ ] Mechanism histograms eyeballed for every designed-pressure encounter
      (escorts lose to escort death, deadlines to the clock, etc.)
- [ ] Boss encounter simmed on nightmare first, then all difficulties
- [ ] Deviations documented (tutorial exemption, breakpoint parks)
- [ ] Balance report written into the campaign's delivery notes
      (table + deviations), per CAMPAIGNS.md Part 2
- [ ] Fable review requested (once, end of campaign)
