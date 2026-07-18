/**
 * THE RULEBOOK — single source of truth for every functional game rule.
 *
 * Each rule has a stable id. Two consumers depend on this file:
 *   1. The in-app Rulebook screen (mobile/app/rules.tsx) renders these
 *      sections verbatim — players read exactly what is written here.
 *   2. rulebookSpec.ts holds at least one executable check per rule id,
 *      and a meta-test fails the build if any rule here has no check.
 *
 * So: adding a rule without a test breaks CI, and changing engine behavior
 * that contradicts a rule breaks CI. If you change a rule's text, make sure
 * its checks still verify what the text now claims.
 */

export interface Rule {
  /** Stable id, e.g. 'MOV-3'. Never reuse a retired id. */
  id: string;
  /** Player-facing rule text. Written for players — keep it plain. */
  text: string;
}

export interface RuleSection {
  id: string;
  title: string;
  rules: Rule[];
}

export const RULEBOOK: RuleSection[] = [
  {
    id: 'BRD',
    title: 'The Board',
    rules: [
      { id: 'BRD-1', text: 'The battlefield is an 8×8 grid with the four extreme corner tiles removed — 60 playable tiles. Nothing can enter or land on a removed corner.' },
      { id: 'BRD-2', text: 'Only one unit can occupy a tile. You can never end a move on an occupied tile.' },
    ],
  },
  {
    id: 'TRN',
    title: 'Turns & Initiative',
    rules: [
      { id: 'TRN-1', text: 'Round 1 sets the initiative order. Players alternate turns; on each turn you commit one unit by taking its turn (move and/or ability). The order units are committed becomes their place in the initiative.' },
      { id: 'TRN-2', text: 'In round 1 you must commit a unit — you cannot pass. (If every uncommitted unit is dead or frozen, one is committed for you automatically.)' },
      { id: 'TRN-3', text: 'From round 2 on, units act in a fixed interleaved order: the first player’s units take slots 1, 3, 5, 7 and the other player’s take slots 2, 4, 6, 8, in the order each side committed them. This order never changes for the rest of the match.' },
      { id: 'TRN-4', text: 'On its turn a unit may move once and use one ability, in either order. Both are optional.' },
      { id: 'TRN-5', text: 'A dead unit’s initiative slot is skipped.' },
      { id: 'TRN-6', text: 'A frozen unit’s initiative slot is skipped entirely — it neither moves nor acts. Burning damage and status durations still tick on the skipped turn.' },
      { id: 'TRN-7', text: 'Charge: instead of using an ability, a unit may move a second time (up to its full movement). Charge follows all normal movement rules, can be used at most once per turn, and is only available during the first 10 rounds.' },
    ],
  },
  {
    id: 'MOV',
    title: 'Movement',
    rules: [
      { id: 'MOV-1', text: 'A unit moves up to its Movement stat in steps. Each step is one tile up, down, left, or right — a diagonal counts as 2 steps.' },
      { id: 'MOV-2', text: 'You can move THROUGH allied units, but you cannot end your move on their tile.' },
      { id: 'MOV-3', text: 'You can NEVER move through an enemy unit’s tile. Enemies block movement completely — there is no way around except an open path.' },
      { id: 'MOV-4', text: 'A rooted unit cannot move or Charge. It can still use abilities, and it may "hold position" (a zero-tile move) in round 1 to commit to the initiative.' },
      { id: 'MOV-5', text: 'A unit may move at most once per turn (plus one Charge as its action, if it charges instead of using an ability).' },
    ],
  },
  {
    id: 'DGE',
    title: 'Dodge & the Fortune Meter',
    rules: [
      { id: 'DGE-1', text: 'Every unit has a dodge chance of 5% per point of Armor Class above 6. Example: AC 16 → 50% dodge.' },
      { id: 'DGE-2', text: 'Dodging is not random — it uses a fortune meter. Each time a dodgeable attack comes in, the unit’s dodge chance is added to its meter. If the meter reaches 100%, the attack MISSES and the meter drops by 100. Otherwise the attack hits.' },
      { id: 'DGE-3', text: 'The meter starts empty, so a unit’s displayed "current dodge" starts at exactly its base dodge chance. If the first attack hits, current dodge goes up; when an attack misses, it drops.' },
      { id: 'DGE-4', text: 'Unblockable abilities skip the fortune meter entirely: they always hit and do not change the meter.' },
      { id: 'DGE-5', text: 'Attacks against an EXPOSED unit always hit and leave its fortune meter untouched.' },
      { id: 'DGE-6', text: 'Multi-hit abilities (like Twin Strike) roll the fortune meter separately for each hit — one dagger can hit while the other misses.' },
      { id: 'DGE-7', text: 'A SHIELD negates the next damaging hit completely — even an unblockable one — and is then used up. The fortune meter is not touched by a shielded hit. Against a multi-hit ability, the shield absorbs only the first hit.' },
      { id: 'DGE-8', text: 'Abilities that deal no damage (heals, buffs, pushes without damage) never miss.' },
    ],
  },
  {
    id: 'ABL',
    title: 'Abilities & Combat',
    rules: [
      { id: 'ABL-1', text: 'A unit can use one ability per turn. After use, an ability with a cooldown is unavailable for that many of the unit’s own turns; cooldowns tick down at the end of each of its turns.' },
      { id: 'ABL-2', text: 'Ability range is counted in steps like movement (up/down/left/right; diagonal counts as 2).' },
      { id: 'ABL-3', text: 'Single-target abilities need line of sight: if attacker and target are on the same straight line (orthogonal or diagonal) and any living unit stands directly between them, the shot is blocked. Targets not on a straight line are never blocked. Push abilities, area abilities, line abilities, and self abilities ignore line of sight.' },
      { id: 'ABL-4', text: 'A unit dies when its health reaches 0. Health never goes below 0.' },
      { id: 'ABL-5', text: 'Healing cannot raise a unit above its maximum health. Life-stealing attacks heal the attacker by a fixed amount, also capped at maximum health.' },
      { id: 'ABL-6', text: 'Execute-style abilities (like Kill Shot / Assassinate) only work if the target’s health is at or below the stated threshold; otherwise they fail and do nothing.' },
      { id: 'ABL-7', text: 'Pushes and pulls slide the target in a straight line, tile by tile. The slide stops early at the board edge, a removed corner, or an occupied tile.' },
    ],
  },
  {
    id: 'STA',
    title: 'Status Effects',
    rules: [
      { id: 'STA-1', text: 'A status lasting "N turns" is in force for N of the affected unit’s own turns. It wears off at the end of that unit’s Nth turn — so a 1-turn debuff still affects that whole turn.' },
      { id: 'STA-2', text: 'BURNING deals 5 damage per stack at the START of the burning unit’s turn (before it acts). Burning stacks up to 3 times. A unit can die to its own burn before it gets to act.' },
      { id: 'STA-3', text: 'ROOTED: cannot move or Charge; can still use abilities.' },
      { id: 'STA-4', text: 'FROZEN: the unit’s turns are skipped completely while frozen.' },
      { id: 'STA-5', text: 'WEAKENED: the unit’s outgoing damage is reduced by 4 (never below 0).' },
      { id: 'STA-6', text: 'Reapplying a status refreshes its duration to the longer of the two, and adds stacks (up to the cap of 3).' },
    ],
  },
  {
    id: 'PAS',
    title: 'Passives',
    rules: [
      { id: 'PAS-1', text: 'Vitality: bonus maximum health (amount varies by class).' },
      { id: 'PAS-2', text: 'Hardened: bonus dodge chance (+5% or +10% by class).' },
      { id: 'PAS-3', text: 'Swift: +1 movement.' },
      { id: 'PAS-4', text: 'Immovable: +6 maximum health, and the unit can never be pushed or pulled.' },
      { id: 'PAS-5', text: 'Warded: the unit starts the match with a shield that negates the first hit against it.' },
    ],
  },
  {
    id: 'WIN',
    title: 'Winning',
    rules: [
      { id: 'WIN-1', text: 'You win when every enemy unit is defeated. You lose when all of your units are defeated.' },
    ],
  },
];

/** Flat list of every rule (for the meta-test and for search). */
export const ALL_RULES: Rule[] = RULEBOOK.flatMap((s) => s.rules);
