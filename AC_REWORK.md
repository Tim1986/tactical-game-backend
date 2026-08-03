# AC Reduction Rework — sim ledger (started 2026-08-01)

Owner directive: cut every unit's AC ~4–5 so most attacks hit ("players really
mind not hitting"); keep attack rolls and AC as mechanics; HP buffs are the
sanctioned compensation lever ("not too much, but somewhat"), tanks keep their
identity via HP + still-highest AC. Rebalance iteratively — owner speaks into
each pass. NO gameData changes until a pass is approved; all sims run AC/HP
deltas in memory via `src/ai/acExperiment.ts` (`--sweep`, `--delta`,
`--preset <name>`; presets in the file are the working numbers).

Audit (pre-work, 2026-08-01): AI brain needs NO changes for AC shifts — it
imports the engine's `missChanceOf` and reads AC off unit instances; its four
duplicated constants (weakened 4, opportunist 4, vengeful 3, thorns 3) match
the engine. Hit math: hit% = (26 − AC) × 5%. Pre-existing smoke-test failure
noted (brain uses Charge in round 11 — unrelated, fix separately). gameData has
8 active classes (bard/monk/druid/paladin absent despite July notes).

## Flat sweep (60 games/pair, 0 validation errors everywhere)

Class win% by flat AC delta (Stage A mirror-stack matrix):

| class     | ±0  | −3  | −4  | −5  |
|-----------|-----|-----|-----|-----|
| sorcerer  | 58% | 52% | 64% | 65% |
| warlock   | 56% | 37% | 30% | 25% |
| cleric    | 54% | 56% | 51% | 49% |
| ranger    | 52% | 61% | 67% | 74% |
| wizard    | 50% | 65% | 65% | 69% |
| barbarian | 45% | 52% | 54% | 52% |
| rogue     | 41% | 38% | 37% | 39% |
| fighter   | 37% | 30% | 27% | 23% |

avg turns/game: 72 → 59 → 55 → 52. Comp extremes at −5: snipe 83%,
skirmish 65%, heal-tank 28%.

Findings:
1. Owner's predictions confirmed: warlock (unblockable) collapses; wizard
   (freeze) soars; games get ~27% shorter at −5.
2. **Dominant distortion is RANGED vs MELEE**, not tank vs squishy: closing
   distance costs reliable hits every approach turn; ranged never pays it.
   Rogue LOSES value despite the biggest hit% gain (melee approach tax).
3. Baseline fighter is already the weakest class TODAY (37%) — the rework is
   the moment to fix that too.

## Pass 1 (preset `pass1`): flat AC −5, HP comp skewed to melee

HP: fighter 45→58, barbarian 45→54, rogue 35→43, warlock 32→40,
cleric 46→50, ranger/wizard/sorcerer unchanged.

Result (60 games/pair): ranger 63▲, wizard 63▲, cleric 52, sorcerer 51,
barbarian 50, fighter 43, rogue 37▼, warlock 33▼. avg turns 59.8.
Comps: snipe 69▲, bruiser-wall 68▲, classic 59, heal-tank 59, skirmish 54,
rogue-heal 36, full-caster 36, control 35, double-rogue 31▼.

Reading:
- HP comp WORKS for the pure melees: fighter 23→43 (and above his own current
  live 37%), barbarian 50, cleric 52. Bruiser-wall 41→68 and heal-tank 28→59
  show front-lines are genuinely playable again (bruiser-wall possibly a hair
  hot now).
- **Warlock (33%) and rogue (37%) are NOT durability problems.** HP helped
  little; their VALUE propositions shrank (unblockable premium gone; rogue's
  relative-evasion niche gone). They need effect/damage attention in pass 2,
  not more HP.
- **Ranger (63%) and wizard (63%) still over-band**, snipe 69%. Candidate pass-2
  levers: ranger damage −1..2 or arrow range 5 (from 6); freeze duration or
  range; NOT HP nerfs (they're already the squishiest by EHP).
- full-caster/control collapse is warlock-driven — fixing warlock likely fixes
  those comps for free.

## Pass 2 — OPEN QUESTIONS FOR OWNER (nothing run yet)

1. Confirm base cut −5 (vs −4). Pass 1 used −5.
2. Warlock value fix: raise eldritch/fear/grasp/drain damage? Make fear's
   push+root stronger? (HP is done; 40 HP is already the comp.)
3. Rogue value fix: twin damage +1 per hit? assassinate threshold up? (His
   90% hit on twin daggers is the roster's most reliable damage — small
   numbers go far.)
4. Ranger: shave damage or range? Wizard: freeze duration is sacred (2 turns)
   or touchable?
5. Accept bruiser-wall at 68% short-term, or trim fighter to +10 HP?

Process note: every pass = edit preset in acExperiment.ts → run → record here.
The exploit battery + campaign sims must be re-run before any approved values
ship (campaign hpScaleOverrides were tuned against current ACs and WILL need
retuning — see CAMPAIGNS.md difficulty bands).

## Pass 2 (owner calls): −5 locked; fighter 56 HP; eldritch 9→10; twin +1/dagger; arrow 11→10

Class matrix: wizard 67▲, rogue 53, sorcerer 53, barbarian 53, cleric 47,
ranger 42, warlock 40, fighter 40. Comps all within 37–60 (snipe tamed to 56).

## Pass 2b (identical but eldritch 9→11)

Class matrix: wizard 65▲, sorcerer 50, warlock 50, rogue 47, barbarian 47,
cleric 46, fighter 45, ranger 43. Comps 34–62 (control 62 = wizard-driven).
**Every class except wizard inside the 43–53 band.**

Readings:
- Twin +1/dagger fixed rogue exactly (37→53 pass2, 47 pass2b).
- Eldritch +1 → warlock 40; +2 → 50. The +2 (11, tying sword/mace) exits the
  letter of "low end" but is what balances; alternative is +1 with a fear or
  grasp buff on top.
- **Arrow −1 shows extreme elasticity: ranger 63→42 from one damage point.**
  Likely kill-breakpoint crossing. Candidate: revert to 11 and trim RANGE
  (6→5) instead if ranger needs a brake — or accept ~43 and watch.
- Wizard is the sole remaining outlier (65–67) regardless of variant.
  Marginals show BOTH freeze (58|64) and cold_snap (66▲) strong — turn-denial
  itself is the power. Candidate: freeze range 4→3 (wizard must step closer).
  Duration stays 2 (owner: 1-turn guts it).

Marginals (pass2, duel%|ref%): standout imbalances within classes —
- DEAD specials: blizzard 23▼ (wizard), ffh 26▼ (sorcerer), grasp 30▼
  (warlock). DOMINANT: ignite 72▲ (sorcerer), concussive 62▲ (fighter),
  cold_snap 66▲ (wizard).
- Passive outliers: sorcerer/undying 65▲, barbarian/thorns 63▲,
  barbarian/anchor 34▼.
- Method note: cleric ref% columns (23–36) reflect the 4-cleric-stack
  methodology (no kill pressure), not cleric weakness — read cleric loadouts
  from the duel column.

## Pass 3 — OPEN QUESTIONS FOR OWNER

1. Adopt eldritch 11 (pass2b, warlock 50) or keep 10 + buff fear/grasp?
2. Arrow: revert to 11 (ranger 63 problem returns?) / keep 10 (ranger 42) /
   revert to 11 AND cut range 6→5?
3. Wizard brake: freeze range 4→3? (Tool needs an ability-range knob — small
   extension.) Or accept 65 for now and fix in specials pass?
4. Within-class fixes (blizzard/ffh/grasp floors, ignite/concussive/cold_snap
   ceilings) — fold into pass 3 or defer to a dedicated specials pass 4?

## Pass 3 (owner calls): eldritch 11; arrow stays 10; freeze range 4→3;
## ignite upfront 6→4; grasp root 1→2; First Aid 14→16

Class matrix: wizard 67▲, barbarian 56, sorcerer 49, warlock 49, fighter 47,
ranger 43, cleric 43, rogue 41. Comps 40–61 (bruiser-wall 61 top).
avg turns 58.9, 0 validation errors.

What landed:
- Eldritch 11 holds warlock at 49 ✓. Grasp fixed: 30→51 duel (root-2 works;
  drain's duel share dropped to 39 — watch, its ref is 76 so likely fine).
- First Aid 42|59 (was 40|48) — modest, acceptable.
- Ranger 43 with arrow 10 — owner accepts weak-side ranger (anti-2-ranger-meta).
- Ignite dented but still top intra-class (69▲ duel, ref crashed to 39);
  ffh still dead (26▼) — data keeps insisting Firestorm is bad even as its
  competition weakens.

What didn't:
- **Freeze range 4→3 was a NO-OP: wizard 65→67.** The AI repositions freely;
  range 3 is still easy delivery. The wizard package is cold_snap (66▲ duel,
  77 ref — the class's real carry) + freeze both being turn-denial at high
  hit rates. Next candidate knobs: cold_snap damage 10→7 (it currently does
  near-basic damage AND denies a turn), or cold_snap blockable, or freeze
  range harder cut (4→2). Blizzard still dead (25▼ — the 2-turn self-root
  prices it out; candidate self-root 2→1).

## Pass 4 — OPEN QUESTIONS FOR OWNER

1. Wizard: cold_snap damage 10→7? (my lead recommendation — keeps both
   freezes, prices the damage rider out of "free basic attack + freeze")
2. Blizzard revival: self-root 2→1 alongside? (Both changes together risk
   overshooting wizard downward; could stage them.)
3. ffh (Firestorm): buff now (damage 12→14? radius?) or accept the sims may
   undervalue AoE and let playtest decide?
4. Rogue drifted 53→47→41 across passes with no rogue changes — inside noise
   bands (±7 at 60 games/pair) but worth a high-games confirm run before
   shipping.
5. Passive outliers (sorc/undying 66▲, barb/thorns 64▲, barb+cleric/anchor
   34–37▼) — fold into pass 4 or dedicated pass 5?

## Pass 3 addendum — owner's grasp-synergy comps (new battery members)

Owner asked whether the battery tests warlock×2+bruiser×2 pulls. It didn't —
added `grasp-spin` (warlock:grasp ×2 + barbarian ×2) and `grasp-wall`
(warlock:grasp ×2 + fighter ×2) with new "class:special" forced-loadout comp
syntax (defaults would have given the warlocks Fear).

Result under pass3: **grasp-spin 77% ▲ — top of the whole battery** (snipe 57,
grasp-wall 56, control 55). The engine of it is pull-into-WHIRLWIND
specifically (fighters convert the same pull at only 56%): root-2 victims eat
multiple 18-dmg AoE turns with no escape. The root-2 buff is fair intra-class
(51%) but oppressive with an AoE payoff — the exact blind spot of mirror
duels; owner's tactical instinct caught it.

Pass-4 candidates on the table: (1) grasp root→1 + damage 4→9 [recommended],
(2) keep root 2 + pull 3→2, (3) accept as power comp [advised against at 77%].
Plus cold_snap 10→7 for the wizard outlier. Blizzard/ffh staged to pass 5.

## Pass 4 (owner-approved): grasp root→1 + dmg 4→9; cold_snap 10→7

Class matrix: wizard 58, barbarian 54, sorcerer 54, warlock 50, fighter 47,
ranger 46, cleric 43, rogue 43. **ALL EIGHT INSIDE 43–58 — the class ladder
is band-healthy for the first time.** avg turns 58.6, 0 errors.

- cold_snap −3 tamed wizard (67→58) without killing the special (61 duel).
- Grasp mirror-duel fell to 37▼ BUT stays the engine of the bruiser comp:
  grasp-spin still 76% in Stage B, and Stage E isolates it — within
  barb²/warlock², grasp cells mean 91% (fear 70, drain 81), with
  whirlwind+grasp cells at 98–100% vs classic. Root duration was never the
  knob: THE 3-TILE PULL IS. Pass-5 candidate: pull 3→2 (keeps dmg-9 solo
  value, shortens the delivery into double-Whirlwind range).
- Persisting within-class outliers: ignite 71▲, blizzard 32▼, ffh 28▼,
  sorc/undying 66▲, barb/thorns 65▲, barb+fighter/anchor 33–37▼.

## Stage E (new battery): 28 pair-comps × 81 loadout combos, 40 games/cell

Methodology finding first: **the classic reference party is BELOW AVERAGE
under pass-4 values** — grand mean vs-classic ≈ 63%, so absolute numbers are
inflated ~+13 and 1425/2268 cells flag as "outliers". Read RELATIVE ranking
only; next tool iteration should use a mid-band reference (or median of 3).

Pair ranking (top): fighter²/barb² 80, barb²/rogue² 79, fighter²/warlock² 76,
fighter²/rogue² 76, barb²/warlock² 74 — the ENTIRE top tier is melee-pair
comps, echoing that pass-1's melee HP compensation may now slightly
overcorrect when doubled up. Bottom: ranger²/sorcerer² 41, ranger²/wizard² 46.

## Pass 5 — OPEN QUESTIONS FOR OWNER

1. Grasp pull 3→2 (the synergy knob; dmg 9 + root 1 kept)?
2. Melee-pair tier: trim fighter/barb HP comp by 2 each, or wait for the
   grasp fix + better yardstick before judging?
3. Stage E yardstick: adopt median-of-3 references (classic + snipe + a
   caster comp)?
4. blizzard (32▼)/ffh (28▼) floors + ignite (71▲) ceiling — now or later?

## Pass 5 (owner calls): grasp pull 3→2; fighter/barb −2 HP (54/52); ffh 14→15

Class matrix: wizard 65▲, sorcerer 54, warlock 54, barbarian 50, ranger 46,
cleric 46, fighter 40, rogue 39. Stage B: grasp-spin 74▲ still top; field
mean sank (classic 41, heal-tank 38, bruiser-wall 46).

Honest read — attribution is getting muddy:
- **Grasp pull-2 worked where it was aimed**: within barb²/warlock², the
  grasp premium over fear halved (+21 → +9; grasp 82 / fear 73 / drain 76).
  What remains strong is the warlock+barb PAIR generally (70% mean) — closer
  to the owner's "skill comp, fine" than the 98–100% cells of pass 4.
- **Fighter/barb −2 HP overshot**: fighter 47→40, rogue dragged to 39, all
  front-line comps sank, and wizard rebounded 58→65 (Stage A fills use
  fighter/barb — weakening fills amplifies casters; plus ±7 noise at 60
  games). Recommend REVERTING the trim (fighter 56/barb 54) — pass-4's
  Stage A was the healthiest state yet (43–58 band).
- **Median-of-3 refs did NOT deflate the grid** (mean still ~63, 1351/2268
  flagged). Root cause found: refs play DEFAULT loadouts while grid cells
  sweep optimized ones — a structural handicap no ref-party choice fixes.
  Tool fix for next iteration: give each reference party its best-known
  loadout from the marginals (or z-score cells against the grid's own mean).
- ffh 15: intra-class still weak (see log); the 3×3 ally-hitting AoE needs
  the contextual-balance analysis (owner philosophy, below) more than +1s.

OWNER PHILOSOPHY (recorded for the dedicated specials/passives pass):
contextual balance. A build-around special being weak comp-agnostic is FINE.
Balance each special at its BEST context: every special/passive must have at
least one comp where it is solid; no context may be overwhelming. Stage E's
per-cell grid is the instrument — rank specials by best-context cells, flag
only "no good context exists" and "best context oppressive" as defects.

## Pass 6 — RECOMMENDATION

1. Revert fighter/barb HP trim (back to 56/54) — restores pass-4's band.
2. Keep: grasp pull 2, ffh 15, everything else.
3. Re-run Stage A at 150 games/pair for stable attribution (token-cheap).
4. Tool: optimized-loadout reference parties for Stage E.
5. Then the dedicated specials/passives pass under the contextual-balance
   philosophy.

## Pass 6 Stage A @ 150 games/pair (HP revert to 56/54; else = pass 5)

wizard 65▲, warlock 51, barbarian 50, sorcerer 50, ranger 47, rogue 44,
fighter 44, cleric 43. avg turns 59.2, 0 errors.

High-precision verdict: seven classes in a tight 43–51 band — the revert
restored the front line as predicted. **Wizard 65 is REAL, not noise**
(pass-4's 58 was the noisy read). cold_snap −3 was not enough; unblockable
turn-denial delivered at range is simply the premium mechanic of the
high-hit-rate game. Candidate knobs (owner to choose): make cold_snap
blockable; missile 11→10; freeze the "significant specials rework" (owner
foresaw it); or accept ~60-65 wizard as the price of the freeze fantasy.

## AI-brain bug found via grid validation errors (2026-08-01): Blizzard self-root

The pass-6 grid's 3,659 validation errors ("Unit is rooted and cannot move",
wizard pairs only) exposed a real brain bug: the hit-and-run planner queued
[cast Blizzard, MOVE retreat], but Blizzard's selfStatus roots the caster AT
THE CAST — the queued retreat throws and forfeits the action. This has
silently sabotaged Blizzard in EVERY battery ever run (its perpetual 23–32%▼
is partly the AI throwing turns, not the ability being weak) — the owner's
"something is fishy" instinct was right twice (Purify measurement blindness +
this). Fix: planBestTurn skips act-then-move candidates for self-rooting/
freezing casts. Verified: wizard-pair cells now 0 errors; 298 tests green.
Grid re-run required (previous pass-6 grid data is tainted for wizard cells).

## Pass 6 grid v2 (post brain-fix): 545k games, 0 validation errors

Pair means (deflated vs optimized refs — read relative): barb²/rogue² 54 top;
fighter pairs 44–48; ALL cleric pairs bottom-third (26–34) on MEAN — but see
Purify. Top outlier cells:
  95/93/88% barb²/rogue² ROAR + dagger_toss/expose+opportunist
  89/88%   fighter²/warlock² concussive+undying + grasp/drain+opportunist
  88%      cleric²/warlock² PURIFY+undying + drain+anchor
  83%      ranger²/cleric² pinning+stalwart + PURIFY+undying
  83%      cleric²/wizard² PURIFY+undying + freeze+stalwart
  68%      cleric²/wizard² PURIFY + BLIZZARD+stalwart (cleanse-your-own-
           frozen-allies tech — blizzard's first-ever solid context)

Verdicts:
1. **Owner fully vindicated on Purify**: 3 of the top-12 cells are purify
   comps (83–88%). It was measurement blindness, not weakness. Purify is a
   premier meta pick; arguably watch it doesn't become oppressive.
2. **Heal and Ward are the real cleric problems** (their outlier appearances
   are overwhelmingly low-side; cleric pair MEANS sit bottom because 2 of 3
   specials drag). Matches owner: "Heal cannot possibly be balanced."
3. **Blizzard post-fix**: still weak generally but now owns a real context
   (68% with purify support). Under contextual-balance philosophy this may
   be acceptable; revisit in specials pass.
4. **NEW DISCOVERY — Roar is the sleeper synergy king**: 95/93/88% cells
   with multi-attack partners (dagger rogues). Weaken(-4 dmg, 2t) on all
   enemies within 2 + the fast-hitting comp = both halves multiply. Duel
   marginals showed roar ~51-54 (context-blind again). Watch as the possible
   next grasp-spin.
5. grasp/drain+opportunist with concussive fighters 88-89% — warlock comps
   healthy-strong, no longer degenerate.

Next: dedicated specials/passives pass (owner's contextual-balance
philosophy) with per-special BEST-CONTEXT aggregates added to the tool;
heal/ward redesign candidates; roar ceiling check; wizard basic 11→10 still
in owner's pocket if wizard stays high after Stage A rerun on final values.

## Pass 7 (owner-approved 9-knob batch) — results

Stage A @150: warlock 59, barbarian 53, wizard 53, cleric 51, rogue 48,
fighter 46, sorcerer 46, **ranger 38▼**. Stage B: grasp-spin 79▲ (stubborn
across every pass), bruiser 57 … control 36, snipe 33 (wizard-nerf ripple).
Grid v3: 0 validation errors.

**BEST-CONTEXT BY SPECIAL (the philosophy instrument) — every special now
has a real home.** Max | top-5 mean: concussive 91|87, ffh 88|82 (!! the
range+1 unlocked the perennial 26%▼ special), pinning 84|81, second_wind
84|81, grasp 91|79, purify 80|78, roar 83|78 (ceiling worked: was 95-cell),
… floor: shockwave 73|65, longshot 70|64, ward 66|59 (weakest but now has
solid homes post-buff). Spread of top-5 means 59–87: compressed, healthy.

Wins: wizard 65→53 (missile), cleric 43→51 (heal/ward floors), roar tamed,
ffh alive. New/remaining issues for pass 8:
1. Ranger 38▼ + snipe 33: the arrow −1 finally bites in the evolved field.
   Candidate: arrow back to 11 (the anti-2-ranger fear may now be priced by
   the field itself; longshot/pinning got their own bumps).
2. Warlock 59 + grasp-spin 79: the one comp that never yields (76-79 across
   FIVE configurations). Either accept as the defining skill comp (owner
   earlier: strong-but-not-98% ok — is 79 ok?) or take the cast-range knob
   (grasp range 5→4).
3. Concussive 91|87 is now the hottest special context. Watch.

## Pass 8 (owner-approved, candidate ship values): arrow→11, grasp cast
## range→4, concussive→6, ward rider→14, ffh damage→14 (range 5 kept)

Undying: owner "very concerned" — PENDING tool work (passive constants are
not preset-able; engine refactor needed to knob them). Nerf directions to
test once the knob exists: survivor loses next action, or −3 max HP tax.
Do NOT eyeball-nerf it without sims.

## HANDOFF NOTES (Fable → Opus 5, 2026-08-02) — read before continuing

1. **Process**: NO gameData changes until the owner approves shipping. The
   presets in src/ai/acExperiment.ts are the working values — pass8 is the
   candidate. Owner speaks into EVERY pass; give recommendations, wait.
2. **Shipping checklist when approved**: translate the preset into
   src/config/gameData.ts (stats + ability values + DESCRIPTIONS — every
   description states its numbers and must be updated to match); check
   rulebook.ts/rulebookSpec.ts for encoded numbers; npm test; sync-engine in
   mobile before any build; then re-run campaignSim and retune every
   campaign's hpScaleOverride bands (CAMPAIGNS.md difficulty rules — they
   were tuned against OLD ACs and WILL be wrong; e.g. lantern e3's band
   cliff comment).
3. **Methodology (hard-won)**: duel/ref marginals are CONTEXT-BLIND — never
   judge a special on them alone (Purify, Firestorm, and Roar all looked
   dead/mid while being great; the fixes were measurement, not balance).
   The Stage E grid + BEST-CONTEXT tables are the owner's chosen instrument
   (philosophy: every special/passive solid somewhere; no context
   overwhelming). Grid ABSOLUTE numbers are yardstick-relative — read
   relative rankings and best-context, not raw win%.
4. **Validation errors are gold**: the count exposed the Blizzard self-root
   brain bug that had silently sabotaged every earlier battery. Bar is 0;
   any nonzero = investigate BEFORE trusting the data (add --pair X,Y for
   cheap repro; sampleErrors prints distinct messages).
5. **Noise bands**: ±7 at 60 games/pair, ±4 at 150. Stage A fills are
   fighter/cleric/barbarian/ranger — nerfing those classes distorts the
   whole matrix (pass-5 lesson; fills weakened → casters inflated).
6. **Sim mechanics**: token-cheap, CPU-heavy — run big batteries in
   background; cwd RESETS in background shells (cd inside the command);
   owner's Mac sleeps after 1 MINUTE idle — pin `caffeinate -i -w <simpid>`
   or a `-t` window alongside every long run. Owner: never drive the iOS
   simulator for verification; hand them a test checklist.
7. **Wrong-spec trap**: tests can encode bugs (rootedTick asserted the buggy
   freeze duration). When a principled fix reds a test, judge from
   rulebook.ts, not the test.
8. Full history: this file top-to-bottom + scratchpad ac_*.log files
   (scratchpad dies with the session — the tables that matter are inline
   above).

## Pass 8 results (candidate ship values run)

A@150: ranger 60, warlock 56, cleric 51, wizard 50, barbarian 49, rogue 45,
fighter 43, sorcerer 39. B: grasp-spin 80▲ (SIX configs, never moves),
rest 40–57. Grid: 0 errors. Best-context: compressed further — top
second_wind 91|86, floor ward 64|55; every special alive.

Two structural lessons:
1. **Arrow is a 20-point knob**: 10↔11 swings ranger 38↔60 (both directions
   now confirmed at 150 games). Damage points cross kill-breakpoints; the
   FINER ranger levers are range (6→5) or piercing (now 86|81).
2. **Grasp-spin is NOT about grasp**: comp held 74-80% while grasp's own
   best-context fell 91→75 and root/pull/cast-range were each nerfed. The
   warlock²+barb² PAIRING is inherently strong (drain sustain + whirlwind
   AoE + pull utility). Stop knobbing grasp. Either accept the comp as the
   meta's top skill comp, or address whirlwind/drain — NOT grasp.

## Pass 9 recommendation (likely final before ship)

- arrow stays 11; ranger brake via RANGE 6→5 (the finer lever; owner
  himself called range "so significant tactically").
- ignite upfront back to 4 (sorcerer 39 needs the give-back; ignite fell to
  80|... mid-pack after the field moved).
- HOLD everything else including grasp-spin (owner to ruling: accept at
  ~80% or schedule a whirlwind/drain look post-ship).
- If A@150 lands 43–57: SHIP pass9 into gameData per handoff checklist.

## Grid CSV/Excel format (owner's analysis export — reuse on request)

`npx tsx src/ai/acExperiment.ts --preset <p> --stage e --cellgames 40 --csv <path>`
dumps every grid cell, then convert to .xlsx (openpyxl). Columns:
  A Team Combination — "Barbarian/Warlock" (classes alphabetical)
  B Class 1 Special / C Class 1 Passive   (alphabetical-first class)
  D Class 2 Special / E Class 2 Passive
  F Median Win % — reported only, NOT the score (see below)
  G Mean Win % — **THE SCORE** used in all reports/outliers/best-context
  H–M Win % vs each named reference comp (bruisers, snipers, classic+,
      spellstorm, grasp-spin, blade-rush) — shows WHICH style a comp beats
  +4 analysis columns: Worst Ref %, Best Ref %, Spread, Refs Beaten.
**Sort by MEAN (G), not median (F).** With 9 references the median is a
single order statistic, so a BIMODAL cell reads as its dominant side: the
pass-12 #1-by-median cell scored median 95 on values
[0, 7.5, 22.5, 40, 95, 95, 95, 100, 100] — it crushes 5 references and is
crushed by 3, and its mean is 61.7. Sanity check: the top-20 by mean actually
beat 6.8 of 9 references; the top-20 by median only 6.0. Median and mean
disagree by an average of 226 rank places (max 1271), so this is not cosmetic.
2268 rows (28 pairs × 81 loadout combos). The "91|86"-style numbers in the
BEST-CONTEXT tables are per-SPECIAL aggregates over these cells: max cell |
mean of its top-5 cells.

## Owner's grid analysis (2026-08-02, Opus) — THREE FINDINGS

Owner filtered the pass-8 xlsx on column F and found 33-34 of the top 36 cells
contain Fighter, concluding the Fighter CHASSIS (not its specials) is the
problem. Verified and extended:

**1. METHODOLOGY BUG — Stage A and Stage B run with NO PASSIVES AT ALL.**
`simHarness.buildUnitInstance` only applies a passive when a customization
supplies `passiveSlug`; Stage A/B pass no customizations. So every "class
ladder" number in this ledger (all 8 passes) measured a passive-less game.
Only Stage E (the grid) sweeps passives. This is why Stage A ranks Fighter
7th (43%) while the grid ranks his chassis 1st — they are different games.
FIX BEFORE PASS 9. All prior ladder numbers must be re-baselined.

**2. Fighter's chassis is only MILDLY ahead; UNDYING is the real dominator.**
Grid means over all 567 cells containing each class:
  Fighter 44.8 | Barbarian 37.5 | Ranger 37.1 | Wizard 35.6 | Sorcerer 35.3
  | Warlock 34.6 | Rogue 34.6 | Cleric 30.8
Fighter split BY ITS OWN PASSIVE: undying 55.9 / thorns 44.5 / anchor 33.9.
**Fighter without undying = 39.2 vs Barbarian 37.5 — a 1.7-point edge, i.e.
noise.** Undying delta by class: Sorcerer +17.7, Fighter +16.7, Cleric +10.5.
Mechanism: Undying's value scales with EHP (a free extra life buys more turns
on a unit that takes more hits to kill), so it compounds hardest on the
tankiest chassis — Fighter EHP 80 vs Barbarian 68, Sorcerer 40.
Only fighter/cleric/sorcerer can take it; it is the best passive for all 3.

**3. Swinginess is SYSTEMIC, not a Fighter artifact.** Spread between each
cell's best and worst reference matchup: mean 67 points, median 68. 43% of
cells spread >70; 1422 of 13608 individual matchups are near-total blowouts
(>=97.5% or <=2.5%). Worst offenders are melee pairs: 0% vs bruisers and
100% vs spellstorm in the SAME cell. Owner's target is ~70-80% on a good
matchup. Cause not yet established — leading hypothesis is alpha-strike
dominance in the post-AC-cut game (everything hits, so the side that lands
the first full sequence snowballs) plus fixed reference comps making each
matchup near-deterministic. NEEDS DIAGNOSIS, not knobs.

**Ranger correction:** the grid puts Ranger 3rd by chassis (37.1), NOT
first. Stage A's "ranger 60" was a passive-blind artifact. Owner is right
that Ranger is not the strongest unit — DROP the proposed arrow-range nerf
(owner: range is core to the class identity and must not be cut).

## Pass 9 results — THE UNDYING PASS (first run with passives in Stage A/B)

Ladder @150 (now passive-aware, NOT comparable to passes 1-8):
  fighter 57, ranger 55, sorcerer 47, cleric 47, rogue 45, warlock 44,
  wizard 44, **barbarian 33▼**. avg turns 65.3.
Comps: classic 69▲, bruiser-wall 69▲, heal-tank 63 … grasp-spin 41 (!),
grasp-wall 27▼. Grid: 0 errors.

**Undying tax worked.** Delta vs that class's other passives:
  Fighter +11.4 → **+4.0**   Cleric +8.7 → +7.8   Sorcerer +15.9 → +10.7
Fighter in top-36 cells: 33/36 → **24/36**. Chassis spread compressed from
14.0 pts (44.8-30.8) to **8.8** (Fighter 43.5 … Cleric 34.7).
Remaining: sorcerer/cleric undying still ahead of their alternatives
(+10.7/+7.8) — a second, smaller tax increment is justified (sorcerer -6,
cleric -4) OR accept as "best passive but not mandatory".

**Buffs landed** (no-Fighter, no-undying view):
  Ward 23.5 → 28.5 (still last for cleric; range helped, more needed)
  Drain 29.3 → **42.2 — now warlock's BEST special** (was last). The heal
  6→9 overshot slightly; drain 42.2 > grasp 40.6 > fear 35.3. Consider
  heal 9→8 next pass.

**Grasp-spin finally broke**: 80% → 41%. Not from grasp nerfs (those did
nothing across 5 passes) but from the passive fix — the comp's dominance
was partly an artifact of references playing passive-less units.

**Barbarian 33▼ is the new problem.** He has no undying access, no
opportunist, and lost roar's 2-turn weaken in pass 7. Prime suspect: the
pass-7 roar nerf plus every other class gaining a passive in the ladder.
Candidate: roar weaken back to 2 turns, or barbarian HP/damage.

**SWINGINESS DIAGNOSIS — alpha-strike hypothesis REJECTED.**
  cells spread>70pts: 950, avg turns 47.4
  cells spread<=40pts: 225, avg turns 47.6
Blowout cells and balanced cells finish in the SAME number of turns, so
swings are NOT snowball/alpha-strike. The cause is matchup structure
(rock-paper-scissors between fixed comps), not tempo. To reduce swing you
must reduce hard counters (e.g. AoE vs clumped melee, reach vs no-reach),
not game speed. Recommend treating this as a design property to bound, not
a bug to fix: the 6 references are FIXED optimized comps, so extremes are
partly an artifact of measuring against a small fixed panel.

## Pass 10 — owner's per-class high-end pass (Ward redesigned)

Ladder @150: sorcerer 67▲, fighter 55, ranger 52, cleric 48, rogue 42,
wizard 39, warlock 36▼, barbarian 30▼. Comps: bruiser 66 … grasp-wall 26▼.
Grid 0 errors. NEW ENGINE EFFECT: grant_max_health (Ward).

FIRST-APPEARANCE RANK (class-rank/global) — the owner's instrument:
  Barbarian roar #1/g11 | whirlwind #8 | shockwave #24 (was #12) ✗ WORSE
  Cleric    purify #1/g5 | heal #8 | ward #111/g785 (was #38) ✗✗ MUCH WORSE
  Ranger    piercing #1 | pinning #2 (was #1) ✓ | longshot #22 (was #18) ✗
  Rogue     expose #1 | dagger #2 | assassinate #17 (was #10) ✗
  Sorcerer  ignite #1/g1 | flame_jet #2 | ffh #15 (was #2) ✗
  Warlock   drain #1/g6 | grasp #4 (was #9) ✓ | fear #19
  Wizard    cold_snap #1 (was #4) ✓ | freeze #2 | blizzard #17/g59 (was #28) ✓✓
  Fighter   second_wind #1/g1 | shield_bash #2/g2 | concussive #5

WHAT WORKED:
- Pinning nerf: ranger's specials now piercing #1 / pinning #2 — spread fixed.
- Blizzard: #28 -> #17 (global 104 -> 59). The self-root 2->1 + range 3 combo
  finally gave it a home. Cold_snap #1 over freeze — wizard's specials are
  the most balanced trio in the game now.
- Grasp: #9 -> #4 (range revert justified).
- Sorcerer chassis: bolt +2 put ignite at GLOBAL #1.

WHAT BACKFIRED — 4 items, same mechanism (relative-value shift):
1. **WARD IS NOW MUCH WORSE (#38 -> #111, global 785)** despite the redesign.
   +6 max health is simply worth less than the 14 heal it replaced, and the
   AI casts it early (per its design) where it converts to less tempo. The
   DESIGN is right; the NUMBER is far too small. Needs ~+12-15 max health,
   or +6 max health AND keep a partial heal.
2. Shockwave #12 -> #24 despite +5 damage — because roar/whirlwind ride the
   barbarian's improved partners; relative rank fell while absolute rose.
3. Assassinate #10 -> #17 despite threshold +3.
4. FFH #2 -> #15: collateral from the ignite buff (bolt +2 lifted ignite's
   whole package to global #1).
LESSON: first-appearance RANK is relative — a buffed special can fall if its
in-class rivals gained more. Read rank AND absolute score together.

NEW PROBLEMS:
- Sorcerer 67▲ overshot (bolt +2 was too much; ignite now global #1).
- Barbarian 30▼ and Warlock 36▼ at the bottom of the ladder.
- Fighter's own specials are now #1/#2/#5 globally — second_wind+undying is
  global #1 again.

## Pass 11 recommendation
- Ward: grant_max_health 6 -> 14 (owner's design, properly sized).
- Sorcerer: bolt +2 -> +1 (revert half).
- Barbarian: small chassis help now warranted (+3 HP) — 2 passes at 30-33%.
- Warlock: watch (drain trim + grasp revert may have crossed).
- Shockwave/assassinate: hold, re-read absolutes not ranks.

## Fear investigation (owner's question, 2026-08-03) — counters are NOT the problem

Owner asked whether we have matchup data separating Fear-with-counter from
Fear-without. We do (grid columns H-M). Reference counter inventory:
  ANCHOR (blocks push/pull): spellstorm, grasp-spin (2 units each)
  STALWART (blocks root):    **NONE of the 6 references**

Warlock specials, win% split (pass-10 grid):
  special   vs ANCHOR refs   vs no-anchor   | vs melee(bruisers)  vs ranged(snipers)
  fear         37.6%            34.0%       |      30.6%               50.6%
  grasp        40.2%            41.7%       |      27.8%               65.4%
  drain        44.8%            38.8%       |      24.7%               59.6%

Findings:
1. **Anchor does not measurably punish Fear** (it scores slightly BETTER into
   anchor comps). Its root is never countered at all — no reference carries
   stalwart. So Fear's weakness is NOT counterplay.
2. **All warlock specials lose hard to melee comps** (-20 to -38 vs ranged).
   That is a warlock CHASSIS property, not a Fear property. Notably Fear has
   the SMALLEST melee penalty of the three, so it IS relatively the warlock's
   best anti-melee tool — the owner's design intent holds directionally, but
   single-target peel cannot answer a 4-melee comp, and the warlock cannot
   survive the units it did not peel.
3. **Fear is nearly DOMINATED BY GRASP**: grasp = 9 dmg + pull 2 + root 1;
   fear = push 3 + root 1, no damage. Its only edge is one tile of
   displacement. That is why it sits #19 in class while grasp is #4.
FIX (pass 11): fear root 1 -> 2 turns, giving it a control identity distinct
from grasp's damage identity. Damage was rejected — it would make fear a
worse copy of grasp rather than a different tool.

METHODOLOGY GAP: with no stalwart in the reference panel, root counterplay is
invisible, and anchor appears on only 2 of 6 refs. Consider adding a
counter-heavy 7th reference (would break median-of-6 comparability with
passes 9-10, so owner should decide).

## Pass 11 results (last 6-reference run)

Ladder @150: sorcerer 62, fighter 56, ranger 55, cleric 47, warlock 41,
rogue 41, barbarian 35▼, wizard 34▼. Comps: bruiser-wall 74▲ … grasp-wall 24▼.

FIRST-APPEARANCE (class-rank/global) vs pass 10:
  Warlock   **fear #1/g1 (was #19)** | drain #4/g16 (was #1) | grasp #9/g43
  Cleric    purify #1 | heal #2 (was #8)✓ | **ward #60/g524 (was #111)** ✓
  Sorcerer  **ffh #1/g1 (was #15)** | ignite #3 | flame_jet #5
  Wizard    freeze #1 | cold_snap #3 | **blizzard #5/g16 (was #17)** ✓✓
  Ranger    pinning #1 | piercing #2 | longshot #9 (was #22) ✓
  Rogue     dagger #1 | expose #2 | assassinate #20 (was #17)
  Barbarian roar #1 | whirlwind #11 | shockwave #38 (was #24) ✗
  Fighter   concussive #1 | shield_bash #7 | second_wind #8 (was #1) ✓

**FEAR OVERSHOT — owner's nervousness was correct.** root 1->2 took it from
#19 to #1 in class AND global #1 (83.7 w/ sorcerer ffh; also g7, g8). We did
not balance warlock, we swapped which special dominates (drain #1 -> fear #1).
Fear is now a 2-turn root + 3-tile push with the class's best cells.
FIX: keep root 2 (the control identity owner wants) but cut push 3 -> 2.
Fear becomes pure control; grasp keeps displacement+damage as the aggressive
option. Smaller knob than reverting the root.

**Blizzard is FIXED**: #28 -> #17 -> **#5/g16**. Wizard's trio (freeze #1,
cold_snap #3, blizzard #5) is the best-balanced in the game. But wizard the
CLASS is now last at 34% — good specials, weak chassis.

**Ward still last by a mile**: #60, global 524, best cell only 51.2%. The
6->10 grant moved it +51 ranks but it remains the worst special in the game.
Owner's pricing concern (must stay under Heal's 28) is real, but 10 is
clearly still too low. Recommend 13 and accept near-parity with Heal, since
Heal is capped by missing HP while Ward never is.

WORST SPECIALS (global first-appearance): ward g524, shockwave g159,
assassinate g112, longshot g74, whirlwind g60, grasp g43.

## Pass 12 recommendation (with the new 7-reference panel)
1. Fear push 3 -> 2 (trim the overshoot, keep root 2).
2. Ward grant 10 -> 13.
3. Wizard chassis: +3 HP (34 -> 37). Specials are balanced; the class is not.
4. Barbarian: shockwave is now the game's 2nd-worst special (+5 dmg did not
   help its RANK because roar/whirlwind rose). Give it utility instead of
   damage: knockback 2 -> 3, or a self-heal. Owner input wanted.
5. Sorcerer still 62% — ffh at global #1 suggests trimming ffh damage 14->13
   rather than touching the chassis again.
6. Hold: assassinate, longshot, grasp (all mid-band and moving).

## Pass 12 — first 9-reference run (counter-play finally measurable)

Ladder @150: fighter 56, ranger 56, warlock 51, sorcerer 50, rogue 47,
cleric 44, barbarian 37▼, wizard 35▼. Comps: bruiser-wall 74▲ … grasp-wall 30▼.
0 validation errors.

**Sorcerer fix worked**: 62% -> 50%. The two-knob approach (class -2 HP +
undying tax -5) landed it exactly in the owner's "top half" target.
**Warlock 41 -> 51 without touching it** — the owner's call to hold Fear was
right; nerfing the sorcerer resolved fear's apparent dominance indirectly
(fear is now #34 globally, was #1).

### PANEL CALIBRATION — my prediction was WRONG
  bruisers 17.8% | vanguard 18.2% | classic+ 30.6% | grasp-spin 31.6%
  skirmishers 43.0% | blade-rush 46.2% | snipers 53.5% | wardens 57.8%
  spellstorm 59.5% | PANEL MEAN 39.8% (was ~41% — I predicted ~45%)
vanguard measured 75.0 as a CELL but is near-unbeatable as a REFERENCE
(18.2%), because a cell is scored against a panel that does not include
itself. **Lesson: cell strength does NOT predict reference difficulty.**
The panel now has TWO near-unbeatable refs, which compresses medians further
rather than relieving them. Fix options for pass 13: drop one of
bruisers/vanguard, or report percentile rank instead of raw median.

### COUNTER-PLAY (normalized against each reference's own difficulty)
Penalty = (relative perf vs wardens[anchor+stalwart]) - (vs the 6 non-counter refs):
  PUNISHED: pinning -20.5 | freeze -13.3 | grasp -13.1 | fear -11.6 | cold_snap -9.2
  NEUTRAL:  blizzard -4.2 | concussive +1.6 | drain +4.2
  IGNORES:  shield_bash +6.4 | expose +6.6 | roar +9.4 | shockwave +14.8
**Counter-play is real and working.** Root/push control specials lose 9-21
points against a comp built to resist them; raw-damage and debuff specials
are unaffected. This validates the owner's design intuition that Fear-style
control SHOULD have counters — and it was completely invisible for 11 passes.
Note pinning takes the largest penalty, which argues AGAINST further pinning
nerfs: it already has the strongest counterplay in the game.

### SPECIALS — every one has a home (global first-appearance)
  second_wind #1, expose #1, concussive #2, roar #3, cold_snap #6,
  whirlwind #11, pinning #12, shield_bash #15, dagger_toss #16,
  assassinate #17 (was #112 — the threshold buff finally shows), purify #22,
  piercing #23, drain #31, fear #34, ffh #38, longshot #52, grasp #55,
  blizzard #59, freeze #62, ignite #67, **ward #75 (was #524)**,
  shockwave #81, flame_jet #98, heal #114
Ward at 13 max health WORKS: #524 -> #75, best cell 67.5%. Heal is now the
weakest cleric special (#114) — the inversion the owner predicted.

### Pass 13 candidates
1. Panel: resolve the two-near-unbeatable-references problem (drop one, or
   switch reporting to percentile rank).
2. Barbarian 37 / Wizard 35 are the persistent floor. Wizard's specials are
   healthy (cold_snap #6, blizzard #59, freeze #62) — it is a chassis issue.
3. Heal #114 now needs the attention Ward used to.
4. Fighter/Rogue second_wind+undying | expose+opportunist at 95.0 is the new
   top cell — watch it.

## METHODOLOGY (owner, 2026-08-03): judge classes by CEILING, not average

The grid runs every loadout permutation, so a large share of its 2268 cells
are builds nobody would ever field. Averaging a class over all 567 of its
cells therefore measures "how good is this class when built badly" — which
systematically FLATTERS generically-strong classes (Fighter needs no synergy,
so its junk builds are still fine) and PUNISHES synergy-dependent ones
(Barbarian, Warlock, Sorcerer, whose value is concentrated in specific pairings).

Pass-12 data, both lenses:
  class      top10mean  best  top50  top100 | ALL-cell mean
  Rogue          71.6   75.0    28     45   |     41.2  (avg rank #3)
  Barbarian      70.3   74.2    25     50   |     45.3  (avg rank #2)
  Fighter        68.1   75.0    24     53   |     45.7  (avg rank #1)
  Warlock        64.5   70.6     7     16   |     39.9
  Ranger         64.3   66.7     8     15   |     38.8
  Wizard         62.5   69.2     3      8   |     38.3
  Sorcerer       61.5   70.6     3      6   |     34.8
  Cleric         61.2   64.2     2      7   |     34.6
Fighter is #1 by average but only #3 by ceiling; Rogue is #3 by average and
#1 by ceiling. **The all-cell mean inverted the top of the ladder.**

Ceiling spread is also much tighter (71.6 -> 61.2, 10.4 points) than the
average spread (45.7 -> 34.6, 11.1) and, more importantly, the ORDER is the
one that matches how the game is actually played.

Note the top-50/top-100 columns tell a harsher story than top-10 mean:
Rogue/Barbarian/Fighter occupy 77 of the global top 100 between them, while
Sorcerer+Cleric together hold 13. That concentration — not the mean — is the
real statement about class balance.

TOOL: Stage E now prints a CLASS CEILING block automatically. All-cell chassis
means are deprecated for class balance and should not be quoted.

## Pass 13 — the three-ceiling nerf (Rogue twin, Fighter HP 52, Barbarian strike 13)

Ladder @150: ranger 61, sorcerer 61, cleric 57, fighter 53, barbarian 39,
wizard 36▼, rogue 35▼, warlock 30▼. Comps: classic 68▲ … grasp-wall 22▼.

CLASS CEILING (top-10 mean | best | top50 | top100), vs pass 12:
  Rogue      67.9  70.8  18  29   (71.6 → -3.7)
  Barbarian  67.7  70.8  26  49   (70.3 → -2.6)
  Cleric     66.0  68.1  12  27   (61.2 → +4.8)
  Ranger     65.6  70.0  12  28   (64.3 → +1.3)
  Warlock    64.2  68.1  10  19   (64.5 → -0.3)
  Wizard     63.3  67.5   9  17   (62.5 → +0.8)
  Fighter    63.1  67.5  10  24   (68.1 → -5.0)
  Sorcerer   61.4  67.8   3   7   (61.5 → -0.1)

**The ceiling spread collapsed from 10.4 to 6.5 points** (71.6-61.2 → 67.9-61.4)
and the top cell fell from 75.0 to 70.8. All three nerfs landed in proportion:
Fighter -5.0 (biggest, as intended — it was intrinsic), Rogue -3.7, Barbarian
-2.6 (lightest touch, plus indirect rogue effect). Cleric +4.8 from its HP buff.

Concentration also improved: Rogue+Barbarian+Fighter held 77 of the global
top 100 in pass 12; they now hold **102 of 300**... i.e. 34% vs the ~33% an
even split would give. Barbarian is the remaining concentration (26 top-50).

REMAINING ISSUES:
1. **Ladder vs ceiling disagree sharply** — Stage A says rogue 35/warlock 30
   are worst while the ceiling says they are mid-pack. Stage A is a 4-stack
   mirror format (a class fights ITSELF ×4), which punishes classes needing
   partners. The ceiling lens is the owner's; treat Stage A as secondary.
2. Sorcerer's top50 count is 3 (next lowest is 9) — its ceiling is fine but
   it has very FEW good builds. Breadth problem, not power problem.
3. grasp-wall 22▼ has been the weakest comp for many passes.
4. Blizzard/ward/heal need re-reading now that the field moved.

TOOL BUG FIXED: the CLASS CEILING console report compared capitalised class
names against lowercase cell.pair keys and printed NaN. The xlsx tab was
unaffected (the CSV capitalises). Fixed; numbers above computed from the CSV.
