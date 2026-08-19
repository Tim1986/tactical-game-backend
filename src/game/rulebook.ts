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
      { id: 'BRD-1', text: "The battlefield is an 8×8 grid with the four extreme corner tiles removed — 60 playable tiles. Nothing can enter or land on a removed corner." },
      { id: 'BRD-2', text: "Only one unit can occupy a tile. You can never end a move on an occupied tile." },
    ],
  },
  {
    id: 'TRN',
    title: 'Turns & Initiative',
    rules: [
      { id: 'TRN-1', text: "Round 1 sets the initiative order. Players alternate turns; on each turn you commit one unit by taking its turn (move and/or ability). The order units are committed becomes their place in the initiative." },
      { id: 'TRN-2', text: "In round 1 you must commit a unit — you cannot pass. (If every uncommitted unit is dead or frozen, one is committed for you automatically.)" },
      { id: 'TRN-3', text: "From round 2 on, units act in a fixed interleaved order: the first player's units take slots 1, 3, 5, 7 and the other player's take slots 2, 4, 6, 8, in the order each side committed them. This order never changes for the rest of the match." },
      { id: 'TRN-4', text: "On its turn a unit may move once and use one ability, in either order. Both are optional." },
      { id: 'TRN-5', text: "A dead unit's initiative slot is skipped." },
      { id: 'TRN-6', text: "A frozen unit's initiative slot is skipped entirely — it neither moves nor acts. Burning damage and status durations still tick on the skipped turn." },
      { id: 'TRN-7', text: "Charge: instead of using an ability, a unit may move a second time (up to its full movement). Charge follows all normal movement rules and can be used at most once per turn." },
    ],
  },
  {
    id: 'MOV',
    title: 'Movement',
    rules: [
      { id: 'MOV-1', text: "A unit moves up to its Movement stat in steps. Each step is one tile up, down, left, or right — a diagonal counts as 2 steps." },
      { id: 'MOV-2', text: "You can move THROUGH allied units, but you cannot end your move on their tile." },
      { id: 'MOV-3', text: "You can NEVER move through an enemy unit's tile. Enemies block movement completely — there is no way around except an open path." },
      { id: 'MOV-4', text: "A rooted unit cannot move or Charge. It can still use abilities, and it may \"hold position\" (a zero-tile move) in round 1 to commit to the initiative." },
      { id: 'MOV-5', text: "A unit may move at most once per turn (plus one Charge as its action, if it charges instead of using an ability)." },
    ],
  },
  {
    id: 'DGE',
    title: 'Hit Resolution',
    rules: [
      { id: 'DGE-1', text: "Each unit has an Armor Class (AC) between 8 and 12. Attacks roll a d20 +5 — a result equal to or above the target's AC is a hit; below is a Miss. Each attack rolls fresh — there is no memory between attacks." },
      { id: 'DGE-2', text: "Unblockable abilities always hit regardless of dodge chance or any status effects on the target." },
      { id: 'DGE-3', text: "Attacks against an EXPOSED unit always hit — their dodge chance is ignored." },
      { id: 'DGE-4', text: "Multi-hit abilities (like Twin Strike) apply each damage effect independently." },
      { id: 'DGE-5', text: "A SHIELD negates the next damaging hit completely — and 'completely' means the whole hit, not just its damage. Any root, weaken, expose, push, pull or other effect the SAME attack would have applied is prevented along with the damage (so Pinning Shot's root, or Shadow Grasp's pull-and-root, never lands on a shielded target). This holds even against an unblockable hit. The shield is then used up. Against a multi-hit ability, the shield absorbs only the first hit; later hits land normally. A shield only triggers on an attack that deals damage — a purely non-damaging effect is not what it is there to stop and passes through." },
      { id: 'DGE-6', text: "Abilities that deal no damage (heals, buffs, pushes without damage) always land." },
    ],
  },
  {
    id: 'ABL',
    title: 'Abilities & Combat',
    rules: [
      { id: 'ABL-1', text: "A unit can use one ability per turn. After use, an ability with a cooldown is unavailable for that many of the unit's own turns; cooldowns tick down at the end of each of its turns." },
      { id: 'ABL-2', text: "Ability range is counted in steps like movement (up/down/left/right; diagonal counts as 2)." },
      { id: 'ABL-3', text: "Single-target abilities need line of sight: if attacker and target are on the same straight line (orthogonal or diagonal) and any living unit stands directly between them, the shot is blocked. Targets not on a straight line are never blocked. Push abilities, area abilities, line abilities, and self abilities ignore line of sight." },
      { id: 'ABL-4', text: "A unit dies when its health reaches 0. Health never goes below 0." },
      { id: 'ABL-5', text: "Healing cannot raise a unit above its maximum health. Life-stealing attacks heal the attacker by a fixed amount, also capped at maximum health." },
      { id: 'ABL-6', text: "Execute-style abilities (like Kill Shot / Assassinate) only work if the target's health is at or below the stated threshold; otherwise they fail and do nothing." },
      { id: 'ABL-7', text: "A push shoves the target in ONE straight cardinal direction (up, down, left or right) — never diagonally. When the target stands exactly diagonal from the caster, neither direction wins, so you choose which of the two the target is shoved along. A pull drags the target toward the caster, preferring diagonal steps but spending two of its pull tiles per diagonal, so a diagonal drag never covers more ground than a straight one. A pull stops one tile short of the caster and never lands on them; when the drag would end diagonally next to the caster you choose which of the two tiles beside them it finishes on (an enemy to your northwest can be drawn to the tile north of you or the tile west of you). Either displacement stops early at the board edge, a removed corner, or an occupied tile." },
      { id: 'ABL-8', text: "Area abilities hit every unit within their radius, including diagonals (a radius-1 blast covers a full 3×3 square). Orthogonal area abilities — Whirlwind and Ground Slam — hit only the 4 tiles directly adjacent to the caster, never diagonals." },
      { id: 'ABL-9', text: "Line abilities (Piercing Shot) fire a ray in one of the 8 directions and hit EVERY unit along it — friend and foe — for the ability's full range. The tile you tap only chooses the direction: the ray does not stop at it, nor at the first unit it hits. It stops only at the board edge or a removed corner." },
      { id: 'ABL-10', text: "EVERY area and line ability hits allies caught in it, including your own teammates — there are no enemies-only blasts. The caster itself is never hit by its own self-centred blast, and a ring never hits the tile it was aimed at." },
      { id: 'ABL-11', text: "Ring abilities (Ring of Fire, Ring of Frost) hit every tile within their radius EXCEPT the centre tile you aimed at. The calm eye is how you spare a unit standing in the middle — including your own." },
      { id: 'ABL-12', text: "Leaping abilities (Leaping Slam) move the caster to the tile it targets, then resolve from there. The leap passes clean over anything in the way — allies, enemies, any distance within range — but the landing tile itself must be empty. Anchor does not stop a unit from leaping under its own power." },
    ],
  },
  {
    id: 'STA',
    title: 'Status Effects',
    rules: [
      { id: 'STA-1', text: "A status lasting \"N turns\" is in force for N of the affected unit's own turns. It wears off at the end of that unit's Nth turn — so a 1-turn debuff still affects that whole turn." },
      { id: 'STA-2', text: "BURNING deals 7 damage per stack at the START of the burning unit's turn (before it acts). Burning stacks up to 3 times. A unit can die to its own burn before it gets to act." },
      { id: 'STA-3', text: "ROOTED: cannot move or Charge; can still use abilities." },
      { id: 'STA-4', text: "FROZEN: the unit's turns are skipped completely while frozen." },
      { id: 'STA-5', text: "WEAKENED: the unit's outgoing damage is reduced by 4 (never below 0)." },
      { id: 'STA-6', text: "Reapplying a status refreshes its duration to the longer of the two, and adds stacks (up to the cap of 3)." },
      { id: 'STA-7', text: "Only BURNING uses its stack count for anything: each stack adds 7 damage per tick (STA-2). For FROZEN, ROOTED and WEAKENED the stack count is inert — a second application refreshes the duration (STA-6) but the extra stack changes nothing, so weakened stays −4 and frozen/rooted stay all-or-nothing no matter how many times they are re-applied." },
    ],
  },
  {
    id: 'PAS',
    title: 'Passives',
    rules: [
      { id: 'PAS-1', text: "Swift: +1 movement. Only offered to classes with a melee basic attack." },
      { id: 'PAS-3', text: "Warded: the unit starts the match with a shield that negates the first hit against it, in exchange for 2 maximum health." },
      { id: 'PAS-4', text: "Thorns: when an enemy on a directly adjacent tile (not diagonal) lands a hit on this unit, the attacker takes 3 damage." },
      { id: 'PAS-5', text: "Undying: the first time this unit would die each match, it survives at 1 health instead. Works against any damage, including executes, burning, and endgame drain. Once per match." },
      { id: 'PAS-6', text: "Opportunist: this unit deals +4 damage against targets suffering any status effect. A Ranger deals +5 instead." },
      { id: 'PAS-7', text: "Vengeful: this unit deals +3 damage while at or below half of its maximum health. A Barbarian deals +4 instead." },
      { id: 'PAS-8', text: "Stalwart: this unit can never be pushed or pulled, and is immune to Rooted, Weakened, and Exposed. It also gains extra maximum health, the amount depending on the class. A negated push, pull, or status is announced as \"Resisted\". Frozen and Burning still apply normally." },
      { id: 'PAS-9', text: "Channeler: this unit deals +2 damage with its damage-dealing abilities on any turn it did not move. Abilities that only apply a status, like Ring of Frost, don't benefit. Offered to the Wizard." },
      { id: 'PAS-10', text: "Siphon: whenever one of this unit's abilities damages an enemy, it heals 1 (never above its maximum). Offered to the Warlock." },
    ],
  },
  {
    id: 'GFT',
    title: 'Deep Gifts & the Second Charge (campaigns)',
    rules: [
      { id: 'GFT-1', text: "Deep Gift of Fangs: this unit deals +2 damage on every damaging effect of its abilities. Abilities that strike more than once benefit on each strike." },
      { id: 'GFT-2', text: "Deep Gift of Stride: +1 movement range." },
      { id: 'GFT-3', text: "Deep Gift of Stone: +3 armor class." },
      { id: 'GFT-4', text: "Second Charge (max level): this unit's special can be used twice per encounter instead of once. The two uses may come on back-to-back turns; after the second, the special is done for the encounter." },
    ],
  },
  {
    id: 'END',
    title: 'Endgame',
    rules: [
      { id: 'END-1', text: "Starting in round 11, the match enters Endgame. A warning is announced at the start of round 11." },
      { id: 'END-2', text: "In Endgame, any unit that ends its turn farther from its nearest enemy than when its turn started takes 1 damage. Holding position or advancing is safe; retreating costs HP." },
      { id: 'END-3', text: "Distance is measured in Manhattan steps (orthogonal only). Diagonal movement that increases the Manhattan distance counts as retreating." },
    ],
  },
  {
    id: 'WIN',
    title: 'Winning',
    rules: [
      { id: 'WIN-1', text: "You win when every enemy unit is defeated. You lose when all of your units are defeated." },
    ],
  },
];

/** Flat list of every rule (for the meta-test and for search). */
export const ALL_RULES: Rule[] = RULEBOOK.flatMap((s) => s.rules);
