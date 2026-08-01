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
