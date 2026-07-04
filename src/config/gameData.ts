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
    description: 'Restores 25 HP to an adjacent ally.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'heal', formula: 'flat', value: 25 }],
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
    description: 'Restores 20 HP to self.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'heal', formula: 'flat', value: 20 }],
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
    description: 'Kills an adjacent enemy at 20 HP or below. Unblockable. Fails silently if target is above threshold.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 9999, healthThreshold: 20 }],
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
    description: 'Deals 14 unblockable damage to all units (including allies) in a 3×3 area centered on any tile within range 3.',
    targeting_type: 'aoe',
    range: 3,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 14 }],
  },

  // ── Warlock ───────────────────────────────────────────────────────────────
  {
    slug: 'eldritch',
    name: 'Demon Blast',
    description: 'Deals 12 unblockable damage from up to 4 tiles away.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 12 }],
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
] as const;

// ---------------------------------------------------------------------------
// Unit definitions
// ---------------------------------------------------------------------------

export const UNIT_DEFS = [
  { slug: 'fighter',   name: 'Fighter',   max_health: 42, armor_class: 17, movement_range: 3, abilities: ['sword',     'second_wind'], passives: [], unlock_level: 1, asset_key: 'unit_fighter',   is_active: true },
  { slug: 'barbarian', name: 'Barbarian', max_health: 45, armor_class: 15, movement_range: 3, abilities: ['strike',    'whirlwind'],   passives: [], unlock_level: 1, asset_key: 'unit_barbarian', is_active: true },
  { slug: 'ranger',    name: 'Ranger',    max_health: 38, armor_class: 16, movement_range: 3, abilities: ['arrow',     'piercing'],    passives: [], unlock_level: 1, asset_key: 'unit_ranger',    is_active: true },
  { slug: 'rogue',     name: 'Rogue',     max_health: 35, armor_class: 15, movement_range: 4, abilities: ['twin',      'assassinate'], passives: [], unlock_level: 1, asset_key: 'unit_rogue',     is_active: true },
  { slug: 'cleric',    name: 'Cleric',    max_health: 40, armor_class: 16, movement_range: 3, abilities: ['mace',      'heal'],        passives: [], unlock_level: 3, asset_key: 'unit_cleric',    is_active: true },
  { slug: 'wizard',    name: 'Wizard',    max_health: 30, armor_class: 14, movement_range: 3, abilities: ['missile',   'freeze'],      passives: [], unlock_level: 3, asset_key: 'unit_wizard',    is_active: true },
  { slug: 'sorcerer',  name: 'Sorcerer',  max_health: 30, armor_class: 14, movement_range: 3, abilities: ['bolt',      'ffh'],         passives: [], unlock_level: 3, asset_key: 'unit_sorcerer',  is_active: true },
  { slug: 'warlock',   name: 'Warlock',   max_health: 32, armor_class: 15, movement_range: 3, abilities: ['eldritch',  'fear'],        passives: [], unlock_level: 3, asset_key: 'unit_warlock',   is_active: true },
] as const;
