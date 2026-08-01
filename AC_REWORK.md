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
