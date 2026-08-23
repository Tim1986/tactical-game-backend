/**
 * gameData.ts — Single source of truth for all unit and ability definitions.
 *
 * This file is the ONLY place balance values should be changed.
 * Both seed.ts and ai/defaultData.ts import from here — updates
 * flow automatically to the DB (via seed) and the AI sim.
 *
 * Slug conventions: use the real in-game slugs (not namespaced).
 */

// ---------------------------------------------------------------------------
// Ability definitions
// ---------------------------------------------------------------------------

export const ABILITY_DEFS = [
  // ── Barbarian ─────────────────────────────────────────────────────────────
  {
    slug: 'strike',
    name: 'Axe',
    description: 'Deals 13 damage to an adjacent enemy.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 13 }],
  },
  {
    slug: 'whirlwind',
    name: 'Whirlwind',
    description: 'Deals 16 blockable damage to every unit around you — all 8 surrounding tiles, allies included.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 1,
    area_shape: 'ring',
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 16 }],
  },
  {
    slug: 'shockwave',
    name: 'Ground Slam',
    description: 'Deals 9 unblockable damage to every unit around you — all 8 surrounding tiles, allies included — and roots them for 1 turn.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 1,
    area_shape: 'ring',
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 9 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    // Leaping Slam. The `move_self` effect resolves FIRST, so the ring is
    // centred on the tile he LANDS on and he settles in its calm eye. The leap
    // passes over intervening units; only the landing tile must be free. It
    // works while rooted and the root SURVIVES it — one displacement, not an
    // escape from the status. The description must keep "(even if rooted)":
    // MOV-4 tells players a rooted unit cannot move, so without it nobody
    // discovers the interaction (see AC_REWORK.md).
    slug: 'roar',
    name: 'Leaping Slam',
    description: 'Leap to a tile up to 2 steps away (even if rooted, and straight over anything in the way), then deal 3 unblockable damage to every unit around where you land, allies included, and weaken them for 2 turns. You land unharmed in the centre.',
    targeting_type: 'aoe',
    range: 2,
    area_radius: 1,
    area_shape: 'ring',
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'move_self' },
      { type: 'damage', formula: 'flat', value: 3 },
      { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
    ],
  },

  // ── Cleric ────────────────────────────────────────────────────────────────
  {
    slug: 'mace',
    name: 'Mace',
    description: 'A heavy blow with a holy mace. Deals 11 damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 11 }],
  },
  {
    slug: 'heal',
    name: 'Heal',
    description: 'Restores 27 health to yourself or an ally within 2 steps.',
    targeting_type: 'single',
    range: 2,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'heal', formula: 'flat', value: 27 }],
  },
  {
    // Ward is PROACTIVE protection, not triage: grant_max_health raises the
    // target's maximum for the match and grants that much current health, so
    // unlike a heal it is never wasted on a full-health ally. Cast it BEFORE
    // the ally wades in — Heal and Purify already do reactive repair better.
    slug: 'ward',
    name: 'Ward',
    description: 'Grants an ally within 3 steps +16 maximum health for the rest of the match, and a shield that fully negates the next hit against them (even an unblockable one).',
    targeting_type: 'single',
    range: 3,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'grant_max_health', value: 16 },
      { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
    ],
  },
  {
    slug: 'purify',
    name: 'Purify',
    description: 'Removes Frozen, Rooted and Burning from yourself or an ally within 3 steps, and restores 19 health.',
    targeting_type: 'single',
    range: 3,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'remove_status', statusSlug: 'frozen' },
      { type: 'remove_status', statusSlug: 'rooted' },
      { type: 'remove_status', statusSlug: 'burning' },
      { type: 'heal', formula: 'flat', value: 19 },
    ],
  },

  // ── Fighter ───────────────────────────────────────────────────────────────
  {
    slug: 'sword',
    name: 'Sword',
    description: 'Deals 11 damage to an adjacent enemy.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 11 }],
  },
  {
    slug: 'second_wind',
    name: 'First Aid',
    description: 'Restores 18 health to yourself.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'heal', formula: 'flat', value: 18 }],
  },
  {
    slug: 'concussive',
    name: 'Concussive Blow',
    description: 'Deals 7 unblockable damage to an adjacent enemy and freezes them for 1 turn.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 7 },
      { type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'shield_bash',
    name: 'Shield Bash',
    description: 'Deals 17 unblockable damage to an adjacent enemy and knocks them 2 tiles back.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 17 },
      { type: 'push', direction: 'away_from_caster', distance: 2 },
    ],
  },

  // ── Rogue ─────────────────────────────────────────────────────────────────
  {
    slug: 'twin',
    name: 'Twin Strike',
    description: 'Two quick strikes against an adjacent enemy, 8 damage each. Each blow is rolled separately.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    is_multi_hit: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 8 },
      { type: 'damage', formula: 'flat', value: 8 },
    ],
  },
  {
    slug: 'assassinate',
    name: 'Kill Shot',
    description: 'Instantly kills an adjacent enemy at or below 22 health. Fails if the target is above that.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 9999, healthThreshold: 22 }],
  },
  {
    slug: 'dagger_toss',
    name: 'Dagger Toss',
    description: 'Throws a dagger for 16 unblockable damage at an enemy within 4 steps.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 16 }],
  },
  {
    slug: 'expose',
    name: 'Expose Weakness',
    description: 'Deals 16 unblockable damage to an adjacent enemy and exposes them for 3 turns — an exposed unit cannot dodge.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 16 },
      { type: 'apply_status', statusSlug: 'exposed', stacks: 1, durationTurns: 3 },
    ],
  },

  // ── Ranger ────────────────────────────────────────────────────────────────
  {
    slug: 'arrow',
    name: 'Arrow',
    description: 'Deals 11 damage from up to 6 steps away.',
    targeting_type: 'single',
    range: 6,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 11 }],
  },
  {
    slug: 'piercing',
    name: 'Piercing Shot',
    description: 'Deals 12 blockable damage to every unit in a straight line (including allies), up to 6 tiles.',
    targeting_type: 'line',
    range: 6,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 12 }],
  },
  {
    slug: 'pinning',
    name: 'Pinning Shot',
    description: 'Deals 7 blockable damage to an enemy within 6 steps and roots them for 2 turns.',
    targeting_type: 'single',
    range: 6,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [
      { type: 'damage', formula: 'flat', value: 7 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
    ],
  },
  {
    slug: 'longshot',
    name: 'Longshot',
    description: 'Deals 15 blockable damage to an enemy up to 8 steps away.',
    targeting_type: 'single',
    range: 8,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 15 }],
  },

  // ── Sorcerer ──────────────────────────────────────────────────────────────
  {
    slug: 'bolt',
    name: 'Flame Blast',
    description: 'Deals 10 damage to an enemy within 5 steps.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 10 }],
  },
  {
    slug: 'ffh',
    name: 'Ring of Fire',
    description: 'Deals 14 unblockable damage in a ring around any tile within 5 steps, allies included. The centre tile is spared.',
    targeting_type: 'aoe',
    range: 5,
    area_radius: 1,
    area_shape: 'ring',
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 14 }],
  },
  {
    slug: 'flame_jet',
    name: 'Flame Jet',
    description: 'Deals 16 unblockable damage to an enemy within 4 steps.',
    targeting_type: 'line',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 16 }],
  },
  {
    slug: 'ignite',
    name: 'Ignite',
    description: 'Deals 5 unblockable damage to an enemy within 5 steps and sets them burning for 3 turns.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 5 },
      { type: 'apply_status', statusSlug: 'burning', stacks: 1, durationTurns: 3 },
    ],
  },

  // ── Warlock ───────────────────────────────────────────────────────────────
  {
    slug: 'eldritch',
    name: 'Demon Blast',
    description: 'Deals 11 damage to an enemy within 4 steps.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 11 }],
  },
  {
    slug: 'fear',
    name: 'Fear',
    description: 'Drives an enemy within 4 steps 3 tiles away from you and roots them for 2 turns.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'push', direction: 'away_from_caster', distance: 3 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
    ],
  },
  {
    slug: 'grasp',
    name: 'Shadow Grasp',
    description: 'Deals 9 unblockable damage to an enemy within 5 steps, drags them 3 steps toward you and roots them for 1 turn.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 9 },
      { type: 'pull', direction: 'toward_caster', distance: 3 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'drain',
    name: 'Essence Drain',
    description: 'Drains 10 unblockable health from an enemy within 4 steps, restoring 8 health to yourself.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'lifesteal', formula: 'flat', value: 10, healValue: 8 }],
  },

  // ── Wizard ────────────────────────────────────────────────────────────────
  {
    slug: 'missile',
    name: 'Ice Blast',
    description: 'Deals 10 damage to an enemy within 5 steps.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 10 }],
  },
  {
    slug: 'freeze',
    name: 'Freeze',
    description: 'Freezes an enemy within 4 steps for 2 turns. A frozen unit cannot move or act.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 2 }],
  },
  {
    slug: 'blizzard',
    name: 'Ring of Frost',
    description: 'Freezes every unit in a ring around any tile within 3 steps for 1 turn, allies included. The centre tile is spared.',
    targeting_type: 'aoe',
    range: 3,
    area_radius: 1,
    area_shape: 'ring',
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'cold_snap',
    name: 'Cold Snap',
    description: 'Deals 9 unblockable damage to an enemy within 5 steps and freezes them for 1 turn.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 9 },
      { type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 },
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Unit definitions
// ---------------------------------------------------------------------------

// PassiveOption: a passive the player selects at team-build time. Either a
// stat boost (stat + value, added directly to the built instance) or a
// behavioral flag (passiveFlag, appended to the instance's `passives` array
// — e.g. 'immovable' blocks push/pull in abilityExecutor.ts). Exactly one
// of the two styles should be set per option.
export interface PassiveOption {
  slug: string;
  name: string;
  description: string;
  stat?: 'maxHealth' | 'armorClass' | 'movementRange';
  value?: number;
  passiveFlag?: string;
}

// Passive-option pool (mixed stat/behavioral design): frontline melee
// BEHAVIORAL PASSIVES ONLY (2026-07 rework): every passive changes decisions,
// none is a raw stat stick, so no option can strictly dominate another. Each
// class's trio is a strategic fork, not a spreadsheet answer. Swift is
// restricted to melee-basic classes (Barbarian, Rogue) — on ranged classes it
// turned the endgame drain rule into a guaranteed kiting win condition.
// Shelved-but-liked future options: Vengeful (+3 dmg below half HP),
// Stalwart (immune to rooted/weakened/exposed).
const SWIFT: PassiveOption = { slug: 'swift', name: 'Swift', description: '+1 movement range.', stat: 'movementRange', value: 1 };
// Anchor: the old Immovable minus its +6 HP rider (the rider made it strictly
// dominate Vitality). Flag string stays 'immovable' — engine + campaign
// content already key on it.
// Anchor carries a DELIBERATELY TINY max-health rider so it is not dead weight
// in matchups with no push or pull. The size is load-bearing history: the
// original Immovable had +6 and strictly dominated; a +2 retry in pass 18-20 put
// it in three of the top five teams; +1 (wizard +2) sits it 6th of 8 passives.
// If it ever drifts up again the honest conclusion is that Anchor cannot carry
// a stat rider at all. Flag string stays 'immovable' — engine and campaign
// content key on it.
const anchorWith = (hp: number): PassiveOption => ({
  slug: 'anchor', name: 'Anchor', passiveFlag: 'immovable',
  description: `Cannot be pushed or pulled. +${hp} maximum health.`,
  stat: 'maxHealth', value: hp,
});
const ANCHOR = anchorWith(1);
const ANCHOR_WIZ = anchorWith(2);
// Warded: implemented at match build — units with the 'warded' flag start
// with a long-lived 'shielded' status (consumed by the first hit as usual).
const WARDED: PassiveOption = { slug: 'warded', name: 'Warded', description: 'Begin the match with a shield that fully negates the first damaging hit against you — its damage and any effect it carries, even an unblockable one — then breaks. Costs 2 maximum health.', passiveFlag: 'warded', stat: 'maxHealth', value: -2 };
const THORNS: PassiveOption = { slug: 'thorns', name: 'Thorns', description: 'When an adjacent enemy hits you, they take 3 damage. Fighter deals 5 instead. Adjacent means the 4 neighbouring tiles — a blow from a diagonal never triggers it.', passiveFlag: 'thorns' };
// Undying pays a max-health tax for the free life — without it the passive was
// a strict upgrade on every class that could take it.
const undyingWith = (hp: number): PassiveOption => ({
  slug: 'undying', name: 'Undying', passiveFlag: 'undying',
  description: `The first time you would die each match, survive at 1 health instead. ${hp} maximum health.`,
  stat: 'maxHealth', value: hp,
});
const UNDYING_7 = undyingWith(-7);
const UNDYING_5 = undyingWith(-5);
const OPPORTUNIST: PassiveOption = { slug: 'opportunist', name: 'Opportunist', description: '+4 damage against targets suffering any status effect. Ranger deals +5 instead.', passiveFlag: 'opportunist' };
const VENGEFUL: PassiveOption = { slug: 'vengeful', name: 'Vengeful', description: '+3 damage while at or below half health. Barbarian deals +4 instead.', passiveFlag: 'vengeful' };
// Merged Stalwart (2026-08-13): absorbed the old Anchor. Now grants displacement
// immunity too (the engine resists push/pull on the 'stalwart' flag). HP starts
// at 0 — the grid will tell us how much, if any, it needs to be worth taking.
// Merged Stalwart carries a PER-CLASS HP bonus (like Undying's per-class tax) —
// a flat value can't sit "healthy" on every class because their rival passives
// differ in strength. Grid-tuned per class (owner 2026-08-13).
const stalwartWith = (hp: number): PassiveOption => ({
  slug: 'stalwart', name: 'Stalwart', passiveFlag: 'stalwart', stat: 'maxHealth', value: hp,
  description: `Immune to being pushed, pulled, Rooted, Weakened, and Exposed.${hp ? ` +${hp} maximum health.` : ''}`,
});
const STALWART_0 = stalwartWith(0);
const STALWART_1 = stalwartWith(1);
const STALWART_2 = stalwartWith(2);
const STALWART_3 = stalwartWith(3);
const STALWART_4 = stalwartWith(4);
// Channeler (Wizard): rewards holding position and casting.
const CHANNELER: PassiveOption = { slug: 'channeler', name: 'Channeler', description: '+2 damage on your damage-dealing abilities if you did not move this turn. (No effect on abilities that only apply a status, like Ring of Frost.)', passiveFlag: 'channeler' };
// Siphon (Warlock): drain-flavoured sustain.
const SIPHON: PassiveOption = { slug: 'siphon', name: 'Siphon', description: 'Heal 1 whenever one of your abilities damages an enemy.', passiveFlag: 'siphon' };

// Arena duel sims (2026-07): Warded dominated every ranged trio (87–100% vs
// siblings — one negated hit ≈ 45% of a squishy's HP) and Swift dominated
// barbarian's (74–76% — whirlwind delivery). Warded stays only on Cleric,
// where 46 HP keeps it honest; Stalwart replaces it on the ranged classes;
// Vengeful replaces barbarian's Swift.
const FIGHTER_PASSIVES: PassiveOption[] = [STALWART_1, THORNS, UNDYING_7];
const BARBARIAN_PASSIVES: PassiveOption[] = [VENGEFUL, THORNS, STALWART_0];
// Rogue's Undying dueled 71–77% over its siblings (a diving assassin that
// survives the counter-kill is too good) — Vengeful keeps the dive theme
// without the free life.
const ROGUE_PASSIVES: PassiveOption[] = [SWIFT, OPPORTUNIST, VENGEFUL];
const RANGER_PASSIVES: PassiveOption[] = [STALWART_3, THORNS, OPPORTUNIST];
const CLERIC_PASSIVES: PassiveOption[] = [STALWART_3, WARDED, UNDYING_7];
const WIZARD_PASSIVES: PassiveOption[] = [STALWART_4, OPPORTUNIST, CHANNELER];
const SORCERER_PASSIVES: PassiveOption[] = [STALWART_3, OPPORTUNIST, UNDYING_5];
const WARLOCK_PASSIVES: PassiveOption[] = [STALWART_1, OPPORTUNIST, SIPHON];

export const UNIT_DEFS = [
  { slug: 'fighter',   name: 'Fighter',   max_health: 52, armor_class: 12, movement_range: 3, abilities: ['sword',    'second_wind'], passives: [], special_options: ['second_wind', 'concussive', 'shield_bash'], passive_options: FIGHTER_PASSIVES, unlock_level: 1, asset_key: 'unit_fighter',   is_active: true },
  { slug: 'barbarian', name: 'Barbarian', max_health: 55, armor_class:  9, movement_range: 3, abilities: ['strike',   'whirlwind'],   passives: [], special_options: ['whirlwind', 'shockwave', 'roar'],      passive_options: BARBARIAN_PASSIVES, unlock_level: 1, asset_key: 'unit_barbarian', is_active: true },
  { slug: 'ranger',    name: 'Ranger',    max_health: 38, armor_class: 11, movement_range: 3, abilities: ['arrow',    'piercing'],    passives: [], special_options: ['piercing', 'pinning', 'longshot'],      passive_options: RANGER_PASSIVES,  unlock_level: 1, asset_key: 'unit_ranger',    is_active: true },
  { slug: 'rogue',     name: 'Rogue',     max_health: 45, armor_class: 8, movement_range: 4, abilities: ['twin',     'assassinate'], passives: [], special_options: ['assassinate', 'dagger_toss', 'expose'], passive_options: ROGUE_PASSIVES,  unlock_level: 1, asset_key: 'unit_rogue',     is_active: true },
  { slug: 'cleric',    name: 'Cleric',    max_health: 50, armor_class: 9, movement_range: 3, abilities: ['mace',     'heal'],        passives: [], special_options: ['heal', 'ward', 'purify'],               passive_options: CLERIC_PASSIVES,  unlock_level: 3, asset_key: 'unit_cleric',    is_active: true },
  { slug: 'wizard',    name: 'Wizard',    max_health: 32, armor_class: 11, movement_range: 3, abilities: ['missile',  'freeze'],      passives: [], special_options: ['freeze', 'blizzard', 'cold_snap'],      passive_options: WIZARD_PASSIVES,  unlock_level: 3, asset_key: 'unit_wizard',    is_active: true },
  { slug: 'sorcerer',  name: 'Sorcerer',  max_health: 34, armor_class: 9, movement_range: 3, abilities: ['bolt',     'ffh'],         passives: [], special_options: ['ffh', 'flame_jet', 'ignite'],           passive_options: SORCERER_PASSIVES,  unlock_level: 3, asset_key: 'unit_sorcerer',  is_active: true },
  { slug: 'warlock',   name: 'Warlock',   max_health: 43, armor_class: 9, movement_range: 3, abilities: ['eldritch', 'fear'],        passives: [], special_options: ['fear', 'grasp', 'drain'],               passive_options: WARLOCK_PASSIVES,  unlock_level: 3, asset_key: 'unit_warlock',   is_active: true },
];
