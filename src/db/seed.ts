/**
 * Database seed script.
 *
 * Populates:
 *   - Status effect definitions
 *   - Ability definitions
 *   - Unit definitions (8 starter units)
 *
 * Safe to re-run: uses INSERT ... ON CONFLICT DO UPDATE.
 *
 * Run with: npm run seed
 */

import { pool, checkDatabaseConnection } from './pool.js';
import { logger } from '../utils/logger.js';

// =============================================================
// STATUS EFFECTS
// =============================================================
const STATUS_EFFECTS = [
  {
    slug: 'burning',
    name: 'Burning',
    description: 'Takes fire damage at the start of each turn.',
    trigger: 'on_turn_start',
    effect: { type: 'damage', formula: 'flat', value: 8, damageType: 'magical' },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'poisoned',
    name: 'Poisoned',
    description: 'Takes poison damage at the start of each turn.',
    trigger: 'on_turn_start',
    effect: { type: 'damage', formula: 'flat', value: 5, damageType: 'true' },
    is_stackable: true,
    max_stacks: 3,
  },
  {
    slug: 'stunned',
    name: 'Stunned',
    description: 'Cannot move or use abilities.',
    trigger: 'on_turn_start',
    effect: { type: 'apply_status', statusSlug: 'stunned', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'rooted',
    name: 'Rooted',
    description: 'Cannot move, but can still use abilities.',
    trigger: 'on_turn_start',
    effect: { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'shielded',
    name: 'Shielded',
    description: 'Absorbs incoming damage up to the shield value.',
    trigger: 'on_hit',
    effect: { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'weakened',
    name: 'Weakened',
    description: 'Deals reduced damage.',
    trigger: 'on_turn_start',
    effect: { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'regenerating',
    name: 'Regenerating',
    description: 'Recovers health at the start of each turn.',
    trigger: 'on_turn_start',
    effect: { type: 'heal', formula: 'flat', value: 10 },
    is_stackable: false,
    max_stacks: 1,
  },
];

// =============================================================
// ABILITIES
// =============================================================
const ABILITIES = [
  // --- Iron Golem ---
  {
    slug: 'shield_bash',
    name: 'Shield Bash',
    description: 'Slams a nearby enemy with your shield, dealing damage and pushing them back.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 2,
    effects: [
      { type: 'damage', formula: 'flat', value: 20, damageType: 'physical' },
      { type: 'push', direction: 'away_from_caster', distance: 2 },
    ],
  },
  {
    slug: 'taunt',
    name: 'Taunt',
    description: 'Forces all nearby enemies to target the Iron Golem for one turn.',
    targeting_type: 'self',
    range: 0,
    area_radius: 2,
    cooldown_turns: 3,
    effects: [
      { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 2 },
    ],
  },

  // --- Ember Witch ---
  {
    slug: 'fireball',
    name: 'Fireball',
    description: 'Launches a fireball that damages and ignites the target.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 0,
    effects: [
      { type: 'damage', formula: 'flat', value: 22, damageType: 'magical' },
      { type: 'apply_status', statusSlug: 'burning', stacks: 1, durationTurns: 2 },
    ],
  },
  {
    slug: 'flame_burst',
    name: 'Flame Burst',
    description: 'Ignites all enemies in a small area around the Ember Witch.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 2,
    cooldown_turns: 3,
    effects: [
      { type: 'damage', formula: 'flat', value: 15, damageType: 'magical' },
      { type: 'apply_status', statusSlug: 'burning', stacks: 1, durationTurns: 2 },
    ],
  },

  // --- Shadow Blade ---
  {
    slug: 'backstab',
    name: 'Backstab',
    description: 'Deals heavy damage to a single target. More effective from behind.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 1,
    effects: [
      { type: 'damage', formula: 'flat', value: 35, damageType: 'physical' },
    ],
  },
  {
    slug: 'smoke_screen',
    name: 'Smoke Screen',
    description: 'Vanishes into shadow, becoming untargetable until the next turn.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 4,
    effects: [
      { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 1 },
    ],
  },

  // --- Storm Caller ---
  {
    slug: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Sends a bolt of lightning that arcs between nearby enemies.',
    targeting_type: 'single',
    range: 3,
    area_radius: 0,
    cooldown_turns: 2,
    effects: [
      { type: 'damage', formula: 'flat', value: 28, damageType: 'magical' },
      { type: 'apply_status', statusSlug: 'stunned', stacks: 1, durationTurns: 1 },
    ],
  },
  {
    slug: 'wind_step',
    name: 'Wind Step',
    description: 'Teleports to an adjacent empty tile instantly.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 2,
    effects: [
      { type: 'apply_status', statusSlug: 'regenerating', stacks: 1, durationTurns: 1 },
    ],
  },

  // --- Plague Doctor ---
  {
    slug: 'toxic_cloud',
    name: 'Toxic Cloud',
    description: 'Releases a cloud of poison that stacks damage over time.',
    targeting_type: 'aoe',
    range: 3,
    area_radius: 1,
    cooldown_turns: 2,
    effects: [
      { type: 'apply_status', statusSlug: 'poisoned', stacks: 2, durationTurns: 3 },
    ],
  },
  {
    slug: 'field_mend',
    name: 'Field Mend',
    description: 'Quickly patches wounds, restoring health to a nearby ally.',
    targeting_type: 'single',
    range: 2,
    area_radius: 0,
    cooldown_turns: 2,
    effects: [
      { type: 'heal', formula: 'flat', value: 30 },
    ],
  },

  // --- Stone Warden ---
  {
    slug: 'ground_slam',
    name: 'Ground Slam',
    description: 'Slams the ground, rooting all adjacent enemies.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 1,
    cooldown_turns: 3,
    effects: [
      { type: 'damage', formula: 'flat', value: 18, damageType: 'physical' },
      { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
    ],
  },
  {
    slug: 'stone_skin',
    name: 'Stone Skin',
    description: 'Hardens skin into stone, gaining a powerful damage shield.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 4,
    effects: [
      { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 2 },
    ],
  },

  // --- Tide Caller ---
  {
    slug: 'tidal_surge',
    name: 'Tidal Surge',
    description: 'A wave of water pushes enemies away and deals moderate damage.',
    targeting_type: 'line',
    range: 4,
    area_radius: 0,
    cooldown_turns: 2,
    effects: [
      { type: 'damage', formula: 'flat', value: 18, damageType: 'magical' },
      { type: 'push', direction: 'away_from_caster', distance: 3 },
    ],
  },
  {
    slug: 'whirlpool',
    name: 'Whirlpool',
    description: 'Creates a whirlpool that pulls all nearby enemies toward the Tide Caller.',
    targeting_type: 'self',
    range: 0,
    area_radius: 3,
    cooldown_turns: 4,
    effects: [
      { type: 'pull', direction: 'toward_caster', distance: 2 },
      { type: 'damage', formula: 'flat', value: 12, damageType: 'magical' },
    ],
  },

  // --- Void Walker ---
  {
    slug: 'void_strike',
    name: 'Void Strike',
    description: 'Strikes with void energy, ignoring shields.',
    targeting_type: 'single',
    range: 2,
    area_radius: 0,
    cooldown_turns: 1,
    effects: [
      { type: 'damage', formula: 'flat', value: 26, damageType: 'true' },
    ],
  },
  {
    slug: 'blink',
    name: 'Blink',
    description: 'Teleports behind the target, setting up a devastating follow-up.',
    targeting_type: 'single',
    range: 3,
    area_radius: 0,
    cooldown_turns: 3,
    effects: [
      { type: 'pull', direction: 'toward_caster', distance: 1 },
    ],
  },
];

// =============================================================
// UNIT DEFINITIONS
// 8 starter units — 4 available at level 1, 4 unlock as you level.
// =============================================================
const UNITS = [
  {
    slug: 'iron_golem',
    name: 'Iron Golem',
    max_health: 130,
    movement_range: 2,
    abilities: ['shield_bash', 'taunt'],
    passives: ['fortified'],        // Reduces incoming physical damage by 3
    unlock_level: 1,
    asset_key: 'unit_iron_golem',
    is_active: true,
  },
  {
    slug: 'ember_witch',
    name: 'Ember Witch',
    max_health: 75,
    movement_range: 3,
    abilities: ['fireball', 'flame_burst'],
    passives: ['combustion'],       // Burning targets take +20% damage from all sources
    unlock_level: 1,
    asset_key: 'unit_ember_witch',
    is_active: true,
  },
  {
    slug: 'shadow_blade',
    name: 'Shadow Blade',
    max_health: 85,
    movement_range: 4,
    abilities: ['backstab', 'smoke_screen'],
    passives: ['flanker'],          // Deals +15 damage when attacking from a non-frontal tile
    unlock_level: 1,
    asset_key: 'unit_shadow_blade',
    is_active: true,
  },
  {
    slug: 'plague_doctor',
    name: 'Plague Doctor',
    max_health: 80,
    movement_range: 3,
    abilities: ['toxic_cloud', 'field_mend'],
    passives: ['virulent'],         // Poison stacks applied by this unit deal +2 damage
    unlock_level: 1,
    asset_key: 'unit_plague_doctor',
    is_active: true,
  },
  {
    slug: 'storm_caller',
    name: 'Storm Caller',
    max_health: 70,
    movement_range: 3,
    abilities: ['chain_lightning', 'wind_step'],
    passives: ['static_charge'],    // Stunned enemies take +10 damage from all sources
    unlock_level: 3,
    asset_key: 'unit_storm_caller',
    is_active: true,
  },
  {
    slug: 'stone_warden',
    name: 'Stone Warden',
    max_health: 120,
    movement_range: 2,
    abilities: ['ground_slam', 'stone_skin'],
    passives: ['immovable'],        // Cannot be pushed or pulled
    unlock_level: 3,
    asset_key: 'unit_stone_warden',
    is_active: true,
  },
  {
    slug: 'tide_caller',
    name: 'Tide Caller',
    max_health: 90,
    movement_range: 3,
    abilities: ['tidal_surge', 'whirlpool'],
    passives: ['undertow'],         // Push/pull effects deal +8 damage when they move a target
    unlock_level: 5,
    asset_key: 'unit_tide_caller',
    is_active: true,
  },
  {
    slug: 'void_walker',
    name: 'Void Walker',
    max_health: 78,
    movement_range: 4,
    abilities: ['void_strike', 'blink'],
    passives: ['nullifier'],        // True damage ignores shielded status
    unlock_level: 5,
    asset_key: 'unit_void_walker',
    is_active: true,
  },
];

// =============================================================
// SEED RUNNER
// =============================================================
async function seed(): Promise<void> {
  await checkDatabaseConnection();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Status effects
    logger.info('Seeding status effects...');
    for (const se of STATUS_EFFECTS) {
      await client.query(
        `INSERT INTO status_effect_definitions
           (slug, name, description, trigger, effect, is_stackable, max_stacks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           name         = EXCLUDED.name,
           description  = EXCLUDED.description,
           trigger      = EXCLUDED.trigger,
           effect       = EXCLUDED.effect,
           is_stackable = EXCLUDED.is_stackable,
           max_stacks   = EXCLUDED.max_stacks`,
        [se.slug, se.name, se.description, se.trigger,
         JSON.stringify(se.effect), se.is_stackable, se.max_stacks]
      );
    }
    logger.info(`Seeded ${STATUS_EFFECTS.length} status effects`);

    // Abilities
    logger.info('Seeding abilities...');
    for (const ab of ABILITIES) {
      await client.query(
        `INSERT INTO ability_definitions
           (slug, name, description, targeting_type, range, area_radius, cooldown_turns, effects)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE SET
           name           = EXCLUDED.name,
           description    = EXCLUDED.description,
           targeting_type = EXCLUDED.targeting_type,
           range          = EXCLUDED.range,
           area_radius    = EXCLUDED.area_radius,
           cooldown_turns = EXCLUDED.cooldown_turns,
           effects        = EXCLUDED.effects`,
        [ab.slug, ab.name, ab.description, ab.targeting_type,
         ab.range, ab.area_radius, ab.cooldown_turns, JSON.stringify(ab.effects)]
      );
    }
    logger.info(`Seeded ${ABILITIES.length} abilities`);

    // Units
    logger.info('Seeding units...');
    for (const unit of UNITS) {
      await client.query(
        `INSERT INTO unit_definitions
           (slug, name, max_health, movement_range, abilities, passives,
            unlock_level, asset_key, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET
           name           = EXCLUDED.name,
           max_health     = EXCLUDED.max_health,
           movement_range = EXCLUDED.movement_range,
           abilities      = EXCLUDED.abilities,
           passives       = EXCLUDED.passives,
           unlock_level   = EXCLUDED.unlock_level,
           asset_key      = EXCLUDED.asset_key,
           is_active      = EXCLUDED.is_active`,
        [unit.slug, unit.name, unit.max_health, unit.movement_range,
         JSON.stringify(unit.abilities), JSON.stringify(unit.passives),
         unit.unlock_level, unit.asset_key, unit.is_active]
      );
    }
    logger.info(`Seeded ${UNITS.length} units`);

    await client.query('COMMIT');
    logger.info('Seed complete');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Seed failed — rolled back');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  logger.error({ err }, 'Seed runner failed');
  process.exit(1);
});
