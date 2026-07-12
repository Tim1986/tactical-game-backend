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
    name: 'Strike',
    description: 'A powerful melee blow. Deals 15 damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 15 }],
  },
  {
    slug: 'whirlwind',
    name: 'Whirlwind',
    description: 'Deals 15 damage to all adjacent units (including allies). Can be blocked.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 15 }],
  },
  {
    slug: 'shockwave',
    name: 'Shockwave',
    description: 'Deals 8 unblockable damage to all adjacent units and knocks them 2 tiles back.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 8 },
      { type: 'push', direction: 'away_from_caster', distance: 2 },
    ],
  },
  {
    slug: 'roar',
    name: 'Roar',
    description: 'Deals 5 unblockable damage to all enemies within 2 tiles and weakens them, reducing their outgoing damage for 3 turns.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 2,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    exclude_allies: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 5 },
      { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 3 },
    ],
  },

  // ── Cleric ────────────────────────────────────────────────────────────────
  {
    slug: 'mace',
    name: 'Mace',
    description: 'A heavy blow with a holy mace. Deals 8 damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 8 }],
  },
  {
    slug: 'heal',
    name: 'Heal',
    description: 'Restores 22 HP to an adjacent ally.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'heal', formula: 'flat', value: 22 }],
  },
  {
    slug: 'ward',
    name: 'Ward',
    description: 'Shields an ally within 2 tiles, healing them for 12 and fully negating the next hit against them (including unblockable attacks).',
    targeting_type: 'single',
    range: 2,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'heal', formula: 'flat', value: 12 },
      { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 3 },
    ],
  },
  {
    slug: 'purify',
    name: 'Purify',
    description: 'Cleanses frozen, rooted, and burning from an ally within 2 tiles, then heals them for 10.',
    targeting_type: 'single',
    range: 2,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'remove_status', statusSlug: 'frozen' },
      { type: 'remove_status', statusSlug: 'rooted' },
      { type: 'remove_status', statusSlug: 'burning' },
      { type: 'heal', formula: 'flat', value: 10 },
    ],
  },

  // ── Fighter ───────────────────────────────────────────────────────────────
  {
    slug: 'sword',
    name: 'Strike',
    description: 'A disciplined sword strike. Deals 10 damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 10 }],
  },
  {
    slug: 'second_wind',
    name: 'First Aid',
    description: 'Restores 16 HP to self.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'heal', formula: 'flat', value: 16 }],
  },
  {
    slug: 'concussive',
    name: 'Concussive Blow',
    description: 'A heavy strike dealing 8 unblockable damage and dazing the target, freezing them for 1 turn.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 8 },
      { type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'shield_bash',
    name: 'Shield Bash',
    description: 'Slams an adjacent enemy for 10 unblockable damage and knocks them 2 tiles back.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 10 },
      { type: 'push', direction: 'away_from_caster', distance: 2 },
    ],
  },

  // ── Rogue ─────────────────────────────────────────────────────────────────
  {
    slug: 'twin',
    name: 'Twin Strike',
    description: 'Two rapid dagger strikes, 20 damage total.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [
      { type: 'damage', formula: 'flat', value: 10 },
      { type: 'damage', formula: 'flat', value: 10 },
    ],
  },
  {
    slug: 'assassinate',
    name: 'Kill Shot',
    description: 'Kills an adjacent enemy at 18 HP or below. Unblockable. Fails silently if target is above threshold.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 9999, healthThreshold: 18 }],
  },
  {
    slug: 'dagger_toss',
    name: 'Dagger Toss',
    description: 'Throws a dagger for 14 unblockable damage from up to 4 tiles away.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 14 }],
  },
  {
    slug: 'expose',
    name: 'Expose Weakness',
    description: 'Deals 8 unblockable damage and exposes the target, causing attacks against them to always hit for 3 turns.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 8 },
      { type: 'apply_status', statusSlug: 'exposed', stacks: 1, durationTurns: 3 },
    ],
  },

  // ── Ranger ────────────────────────────────────────────────────────────────
  {
    slug: 'arrow',
    name: 'Arrow',
    description: 'Deals 12 damage from up to 6 tiles away.',
    targeting_type: 'single',
    range: 6,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 12 }],
  },
  {
    slug: 'piercing',
    name: 'Piercing Shot',
    description: 'Deals 12 damage to every unit in a straight line (including allies), up to 6 tiles. Can be blocked.',
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
    description: 'Deals 12 damage from up to 6 tiles away and roots the target for 2 turns. Can be blocked.',
    targeting_type: 'single',
    range: 6,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [
      { type: 'damage', formula: 'flat', value: 12 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
    ],
  },
  {
    slug: 'longshot',
    name: 'Longshot',
    description: 'Deals 12 damage from up to 8 tiles away. Can be blocked.',
    targeting_type: 'single',
    range: 8,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 12 }],
  },

  // ── Sorcerer ──────────────────────────────────────────────────────────────
  {
    slug: 'bolt',
    name: 'Arcane Bolt',
    description: 'Deals 8 damage from up to 5 tiles away.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 8 }],
  },
  {
    slug: 'ffh',
    name: 'Firestorm',
    description: 'Deals 12 unblockable damage to all units (including allies) in a 3×3 area centered on any tile within range 3.',
    targeting_type: 'aoe',
    range: 3,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 12 }],
  },
  {
    slug: 'flame_jet',
    name: 'Flame Jet',
    description: 'Deals 14 unblockable damage to every unit in a straight line (including allies), up to 4 tiles.',
    targeting_type: 'line',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 14 }],
  },
  {
    slug: 'ignite',
    name: 'Ignite',
    description: 'Deals 8 unblockable damage and sets the target ablaze, dealing 5 damage per turn for 3 turns.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 8 },
      { type: 'apply_status', statusSlug: 'burning', stacks: 1, durationTurns: 3 },
    ],
  },

  // ── Warlock ───────────────────────────────────────────────────────────────
  {
    slug: 'eldritch',
    name: 'Demon Blast',
    description: 'Deals 10 unblockable damage from up to 4 tiles away.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 10 }],
  },
  {
    slug: 'fear',
    name: 'Fear',
    description: 'Pushes an enemy 3 tiles away and roots them for 1 turn. Rooted units cannot move or charge.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'push', direction: 'away_from_caster', distance: 3 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'grasp',
    name: 'Eldritch Grasp',
    description: 'Pulls an enemy within 5 tiles 3 tiles toward you and roots them for 1 turn. Unblockable.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'pull', direction: 'toward_caster', distance: 3 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'drain',
    name: 'Life Drain',
    description: 'Deals 10 unblockable damage from up to 4 tiles away and heals you for 6.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'lifesteal', formula: 'flat', value: 10, healValue: 6 }],
  },

  // ── Wizard ────────────────────────────────────────────────────────────────
  {
    slug: 'missile',
    name: 'Ice Blast',
    description: 'Deals 8 damage from up to 5 tiles away.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: false,
    effects: [{ type: 'damage', formula: 'flat', value: 8 }],
  },
  {
    slug: 'freeze',
    name: 'Freeze',
    description: 'Freezes an enemy within range 4. Target loses its next 2 initiative turns. Unblockable.',
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
    name: 'Blizzard',
    description: 'Deals 4 unblockable damage and freezes every unit (including allies) in a 3×3 area within 3 tiles for 1 turn.',
    targeting_type: 'aoe',
    range: 3,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 4 },
      { type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'cold_snap',
    name: 'Cold Snap',
    description: 'Deals 12 unblockable damage from up to 5 tiles away and roots the target for 1 turn.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [
      { type: 'damage', formula: 'flat', value: 12 },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 },
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
// classes (Fighter, Barbarian) get an 'immovable' behavioral option instead
// of 'swift', since they don't rely on mobility as much as squishier classes.
const VITALITY: PassiveOption = { slug: 'vitality', name: 'Vitality', description: '+8 max health.', stat: 'maxHealth', value: 8 };
const HARDENED: PassiveOption = { slug: 'hardened', name: 'Hardened', description: '+2 armor class.', stat: 'armorClass', value: 2 };
const SWIFT: PassiveOption = { slug: 'swift', name: 'Swift', description: '+1 movement range.', stat: 'movementRange', value: 1 };
const IMMOVABLE: PassiveOption = { slug: 'immovable', name: 'Immovable', description: '+6 max health. Cannot be pushed or pulled.', stat: 'maxHealth', value: 6, passiveFlag: 'immovable' };
// Warded: implemented at match build — units with the 'warded' flag start
// with a long-lived 'shielded' status (consumed by the first hit as usual).
const WARDED: PassiveOption = { slug: 'warded', name: 'Warded', description: 'Begin the match with a shield that negates the first hit against you.', passiveFlag: 'warded' };

const FRONTLINE_PASSIVES: PassiveOption[] = [VITALITY, HARDENED, IMMOVABLE];
const RANGER_PASSIVES: PassiveOption[] = [HARDENED, SWIFT, WARDED];
const SKIRMISH_PASSIVES: PassiveOption[] = [VITALITY, SWIFT, WARDED];
const CASTER_PASSIVES: PassiveOption[] = [VITALITY, HARDENED, WARDED];

export const UNIT_DEFS = [
  { slug: 'fighter',   name: 'Fighter',   max_health: 42, armor_class: 17, movement_range: 3, abilities: ['sword',    'second_wind'], passives: [], special_options: ['second_wind', 'concussive', 'shield_bash'], passive_options: FRONTLINE_PASSIVES, unlock_level: 1, asset_key: 'unit_fighter',   is_active: true },
  { slug: 'barbarian', name: 'Barbarian', max_health: 45, armor_class: 15, movement_range: 3, abilities: ['strike',   'whirlwind'],   passives: [], special_options: ['whirlwind', 'shockwave', 'roar'],      passive_options: FRONTLINE_PASSIVES, unlock_level: 1, asset_key: 'unit_barbarian', is_active: true },
  { slug: 'ranger',    name: 'Ranger',    max_health: 38, armor_class: 16, movement_range: 3, abilities: ['arrow',    'piercing'],    passives: [], special_options: ['piercing', 'pinning', 'longshot'],      passive_options: RANGER_PASSIVES,  unlock_level: 1, asset_key: 'unit_ranger',    is_active: true },
  { slug: 'rogue',     name: 'Rogue',     max_health: 35, armor_class: 13, movement_range: 4, abilities: ['twin',     'assassinate'], passives: [], special_options: ['assassinate', 'dagger_toss', 'expose'], passive_options: SKIRMISH_PASSIVES,  unlock_level: 1, asset_key: 'unit_rogue',     is_active: true },
  { slug: 'cleric',    name: 'Cleric',    max_health: 40, armor_class: 16, movement_range: 3, abilities: ['mace',     'heal'],        passives: [], special_options: ['heal', 'ward', 'purify'],               passive_options: CASTER_PASSIVES,  unlock_level: 3, asset_key: 'unit_cleric',    is_active: true },
  { slug: 'wizard',    name: 'Wizard',    max_health: 30, armor_class: 16, movement_range: 3, abilities: ['missile',  'freeze'],      passives: [], special_options: ['freeze', 'blizzard', 'cold_snap'],      passive_options: CASTER_PASSIVES,  unlock_level: 3, asset_key: 'unit_wizard',    is_active: true },
  { slug: 'sorcerer',  name: 'Sorcerer',  max_health: 30, armor_class: 14, movement_range: 3, abilities: ['bolt',     'ffh'],         passives: [], special_options: ['ffh', 'flame_jet', 'ignite'],           passive_options: CASTER_PASSIVES,  unlock_level: 3, asset_key: 'unit_sorcerer',  is_active: true },
  { slug: 'warlock',   name: 'Warlock',   max_health: 32, armor_class: 15, movement_range: 3, abilities: ['eldritch', 'fear'],        passives: [], special_options: ['fear', 'grasp', 'drain'],               passive_options: SKIRMISH_PASSIVES,  unlock_level: 3, asset_key: 'unit_warlock',   is_active: true },
];
