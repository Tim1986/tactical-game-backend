import { pool, checkDatabaseConnection } from './pool.js';
import { logger } from '../utils/logger.js';

// =============================================================
// STATUS EFFECTS
// =============================================================
const STATUS_EFFECTS = [
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
    slug: 'shielded',
    name: 'Shielded',
    description: 'Absorbs incoming damage up to the shield value.',
    trigger: 'on_hit',
    effect: { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'rooted',
    name: 'Rooted',
    description: 'Cannot move.',
    trigger: 'on_turn_start',
    effect: { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
];

// =============================================================
// ABILITIES
// Each unit has one basic attack (cooldown 0) and one special (cooldown 99 = once per game).
// =============================================================
const ABILITIES = [
  // ── Barbarian ──────────────────────────────────────────────
  {
    slug: 'strike',
    name: 'Strike',
    description: 'A powerful melee blow. Deals 15 physical damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 15, damageType: 'physical' }],
  },
  {
    slug: 'whirlwind',
    name: 'Whirlwind',
    description: 'Spins with weapon outstretched, dealing 20 physical damage to all adjacent units — including allies. Position carefully.',
    targeting_type: 'aoe',
    range: 0,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'physical' }],
  },

  // ── Cleric ─────────────────────────────────────────────────
  {
    slug: 'mace',
    name: 'Mace',
    description: 'A heavy blow with a holy mace. Deals 7 physical damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 7, damageType: 'physical' }],
  },
  {
    slug: 'heal',
    name: 'Heal',
    description: 'Restores 30 HP to a nearby ally (range 2). The Cleric\'s low damage makes this essential — save it for when it matters.',
    targeting_type: 'single',
    range: 2,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    effects: [{ type: 'heal', formula: 'flat', value: 30 }],
  },

  // ── Fighter ────────────────────────────────────────────────
  {
    slug: 'sword',
    name: 'Strike',
    description: 'A disciplined sword strike. Deals 10 physical damage.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 10, damageType: 'physical' }],
  },
  {
    slug: 'second_wind',
    name: 'First Aid',
    description: 'Restores 20 HP to self. Use before taking a killing blow.',
    targeting_type: 'self',
    range: 0,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    effects: [{ type: 'heal', formula: 'flat', value: 20 }],
  },

  // ── Rogue ──────────────────────────────────────────────────
  {
    slug: 'twin',
    name: 'Twin Strike',
    description: 'Two rapid dagger strikes dealing 24 physical damage total. Highest single-target damage of any basic attack.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 24, damageType: 'physical' }],
  },
  {
    slug: 'assassinate',
    name: 'Kill Shot',
    description: 'Instantly kills a target at 20 HP or below. True damage, unblockable. Pairs perfectly with Twin Strike to soften first.',
    targeting_type: 'single',
    range: 1,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 9999, damageType: 'true', healthThreshold: 20 }],
  },

  // ── Ranger ─────────────────────────────────────────────────
  {
    slug: 'arrow',
    name: 'Arrow',
    description: 'Deals 10 physical damage from up to 6 tiles away. The Ranger\'s best asset is staying far back.',
    targeting_type: 'single',
    range: 6,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 10, damageType: 'physical' }],
  },
  {
    slug: 'piercing',
    name: 'Piercing Shot',
    description: 'Deals 15 true damage to every unit in a line (range 6) — including allies. True damage bypasses dodge. Line up enemies carefully.',
    targeting_type: 'line',
    range: 6,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    effects: [{ type: 'damage', formula: 'flat', value: 15, damageType: 'true' }],
  },

  // ── Sorcerer ───────────────────────────────────────────────
  {
    slug: 'bolt',
    name: 'Arcane Bolt',
    description: 'Deals 10 magical damage from up to 5 tiles away. Magical damage ignores physical armor.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 10, damageType: 'magical' }],
  },
  {
    slug: 'ffh',
    name: 'Fire from Heaven',
    description: 'Rains fire on a target tile and all adjacent tiles, dealing 20 magical damage to each unit hit — including allies. Unblockable. Range 3.',
    targeting_type: 'aoe',
    range: 3,
    area_radius: 1,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'magical' }],
  },

  // ── Warlock ────────────────────────────────────────────────
  {
    slug: 'eldritch',
    name: 'Demon Blast',
    description: 'Deals 9 true damage, unblockable. Low per-hit but spammable and undodgeable — adds up over a long game.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    is_unblockable: true,
    effects: [{ type: 'damage', formula: 'flat', value: 9, damageType: 'true' }],
  },
  {
    slug: 'fear',
    name: 'Fear',
    description: 'Pushes the target 3 tiles away and roots them in place for 1 turn. No damage — pure disruption. Range 4, unblockable.',
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

  // ── Wizard ─────────────────────────────────────────────────
  {
    slug: 'missile',
    name: 'Ice Blast',
    description: 'Deals 8 magical damage from up to 5 tiles away. Combine with Freeze for a lethal combo.',
    targeting_type: 'single',
    range: 5,
    area_radius: 0,
    cooldown_turns: 0,
    is_special: false,
    effects: [{ type: 'damage', formula: 'flat', value: 8, damageType: 'magical' }],
  },
  {
    slug: 'freeze',
    name: 'Freeze',
    description: 'Stuns the target for 2 full turns — they cannot move or act. No damage. Range 4, unblockable. Your whole team gets 2 free turns to pile on.',
    targeting_type: 'single',
    range: 4,
    area_radius: 0,
    cooldown_turns: 99,
    is_special: true,
    is_unblockable: true,
    effects: [{ type: 'apply_status', statusSlug: 'stunned', stacks: 1, durationTurns: 2 }],
  },
];

// =============================================================
// UNIT DEFINITIONS
// Stats sourced from test.tsx TEMPLATES.
// fighter/barbarian/ranger/rogue unlock at level 1 (default team).
// cleric/wizard/sorcerer/warlock unlock at level 3.
// =============================================================
const UNITS = [
  {
    slug: 'fighter',
    name: 'Fighter',
    max_health: 42,
    armor_class: 16,
    movement_range: 3,
    abilities: ['sword', 'second_wind'],
    passives: [],
    unlock_level: 1,
    asset_key: 'unit_fighter',
    is_active: true,
  },
  {
    slug: 'barbarian',
    name: 'Barbarian',
    max_health: 50,
    armor_class: 15,
    movement_range: 4,
    abilities: ['strike', 'whirlwind'],
    passives: [],
    unlock_level: 1,
    asset_key: 'unit_barbarian',
    is_active: true,
  },
  {
    slug: 'ranger',
    name: 'Ranger',
    max_health: 38,
    armor_class: 16,
    movement_range: 3,
    abilities: ['arrow', 'piercing'],
    passives: [],
    unlock_level: 1,
    asset_key: 'unit_ranger',
    is_active: true,
  },
  {
    slug: 'rogue',
    name: 'Rogue',
    max_health: 35,
    armor_class: 15,
    movement_range: 4,
    abilities: ['twin', 'assassinate'],
    passives: [],
    unlock_level: 1,
    asset_key: 'unit_rogue',
    is_active: true,
  },
  {
    slug: 'cleric',
    name: 'Cleric',
    max_health: 40,
    armor_class: 18,
    movement_range: 3,
    abilities: ['mace', 'heal'],
    passives: [],
    unlock_level: 3,
    asset_key: 'unit_cleric',
    is_active: true,
  },
  {
    slug: 'wizard',
    name: 'Wizard',
    max_health: 30,
    armor_class: 14,
    movement_range: 3,
    abilities: ['missile', 'freeze'],
    passives: [],
    unlock_level: 3,
    asset_key: 'unit_wizard',
    is_active: true,
  },
  {
    slug: 'sorcerer',
    name: 'Sorcerer',
    max_health: 30,
    armor_class: 14,
    movement_range: 3,
    abilities: ['bolt', 'ffh'],
    passives: [],
    unlock_level: 3,
    asset_key: 'unit_sorcerer',
    is_active: true,
  },
  {
    slug: 'warlock',
    name: 'Warlock',
    max_health: 32,
    armor_class: 15,
    movement_range: 3,
    abilities: ['eldritch', 'fear'],
    passives: [],
    unlock_level: 3,
    asset_key: 'unit_warlock',
    is_active: true,
  },
];

// =============================================================
// ACHIEVEMENTS
// condition types:
//   { type: 'match_count', threshold: N }  — completed N matches
//   { type: 'win_count',   threshold: N }  — won N matches
//   { type: 'elo_reached', threshold: N }  — reached ELO ≥ N
//   { type: 'pve_difficulty_clear', difficulty: 'easy'|'hard'|'nightmare' }  — future
// =============================================================
const ACHIEVEMENTS = [
  // PvP — participation
  { slug: 'first_match',      name: 'First Blood',        description: 'Complete your first match.',             icon_key: 'ach_sword',    condition: { type: 'match_count', threshold: 1  }, sort_order: 10 },
  { slug: 'first_win',        name: 'Victory!',           description: 'Win your first match.',                  icon_key: 'ach_trophy',   condition: { type: 'win_count',   threshold: 1  }, sort_order: 20 },
  { slug: 'wins_10',          name: 'Seasoned Warrior',   description: 'Win 10 matches.',                        icon_key: 'ach_shield',   condition: { type: 'win_count',   threshold: 10 }, sort_order: 30 },
  { slug: 'wins_50',          name: 'Veteran',            description: 'Win 50 matches.',                        icon_key: 'ach_crown',    condition: { type: 'win_count',   threshold: 50 }, sort_order: 40 },
  // PvP — ladder
  { slug: 'elo_1300',         name: 'Rising Threat',      description: 'Reach 1300 ELO.',                        icon_key: 'ach_flame',    condition: { type: 'elo_reached', threshold: 1300 }, sort_order: 50 },
  { slug: 'elo_1500',         name: 'Elite Commander',    description: 'Reach 1500 ELO.',                        icon_key: 'ach_star',     condition: { type: 'elo_reached', threshold: 1500 }, sort_order: 60 },
  { slug: 'elo_1700',         name: 'Dungeon Legend',     description: 'Reach 1700 ELO.',                        icon_key: 'ach_legend',   condition: { type: 'elo_reached', threshold: 1700 }, sort_order: 70 },
  // Leaderboard
  { slug: 'leaderboard_top10', name: 'Top 10',            description: 'Appear in the top 10 on the daily leaderboard.', icon_key: 'ach_board',  condition: { type: 'leaderboard_top_n', n: 10 }, sort_order: 80 },
  { slug: 'leaderboard_top3',  name: 'Podium',            description: 'Reach the top 3 on the daily leaderboard.',      icon_key: 'ach_podium', condition: { type: 'leaderboard_top_n', n: 3  }, sort_order: 85 },
  { slug: 'leaderboard_top1',  name: '#1',                description: 'Reach #1 on the daily leaderboard.',             icon_key: 'ach_crown',  condition: { type: 'leaderboard_top_n', n: 1  }, sort_order: 90 },
  // PvE — placeholder until PvE is built
  { slug: 'pve_easy',         name: 'Dungeon Delver',     description: 'Clear all Easy encounters.',             icon_key: 'ach_door',     condition: { type: 'pve_difficulty_clear', difficulty: 'easy'      }, sort_order: 110 },
  { slug: 'pve_hard',         name: 'Monster Slayer',     description: 'Clear all Hard encounters.',             icon_key: 'ach_axe',      condition: { type: 'pve_difficulty_clear', difficulty: 'hard'      }, sort_order: 120 },
  { slug: 'pve_nightmare',    name: 'Nightmare Cleared',  description: 'Clear all Nightmare encounters. Few have.', icon_key: 'ach_skull', condition: { type: 'pve_difficulty_clear', difficulty: 'nightmare' }, sort_order: 130 },
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
           (slug, name, description, targeting_type, range, area_radius, cooldown_turns, is_special, is_unblockable, effects)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (slug) DO UPDATE SET
           name           = EXCLUDED.name,
           description    = EXCLUDED.description,
           targeting_type = EXCLUDED.targeting_type,
           range          = EXCLUDED.range,
           area_radius    = EXCLUDED.area_radius,
           cooldown_turns = EXCLUDED.cooldown_turns,
           is_special     = EXCLUDED.is_special,
           is_unblockable = EXCLUDED.is_unblockable,
           effects        = EXCLUDED.effects`,
        [ab.slug, ab.name, ab.description, ab.targeting_type,
         ab.range, ab.area_radius, ab.cooldown_turns, ab.is_special,
         (ab as typeof ab & { is_unblockable?: boolean }).is_unblockable ?? false,
         JSON.stringify(ab.effects)]
      );
    }
    logger.info(`Seeded ${ABILITIES.length} abilities`);

    // Units
    logger.info('Seeding units...');
    for (const unit of UNITS) {
      await client.query(
        `INSERT INTO unit_definitions
           (slug, name, max_health, armor_class, movement_range, abilities, passives,
            unlock_level, asset_key, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (slug) DO UPDATE SET
           name           = EXCLUDED.name,
           max_health     = EXCLUDED.max_health,
           armor_class    = EXCLUDED.armor_class,
           movement_range = EXCLUDED.movement_range,
           abilities      = EXCLUDED.abilities,
           passives       = EXCLUDED.passives,
           unlock_level   = EXCLUDED.unlock_level,
           asset_key      = EXCLUDED.asset_key,
           is_active      = EXCLUDED.is_active`,
        [unit.slug, unit.name, unit.max_health, unit.armor_class, unit.movement_range,
         JSON.stringify(unit.abilities), JSON.stringify(unit.passives),
         unit.unlock_level, unit.asset_key, unit.is_active]
      );
    }
    logger.info(`Seeded ${UNITS.length} units`);

    // Achievements
    logger.info('Seeding achievements...');
    for (const ach of ACHIEVEMENTS) {
      await client.query(
        `INSERT INTO achievement_definitions (slug, name, description, icon_key, condition, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE SET
           name        = EXCLUDED.name,
           description = EXCLUDED.description,
           icon_key    = EXCLUDED.icon_key,
           condition   = EXCLUDED.condition,
           sort_order  = EXCLUDED.sort_order`,
        [ach.slug, ach.name, ach.description, ach.icon_key,
         JSON.stringify(ach.condition), ach.sort_order]
      );
    }
    logger.info(`Seeded ${ACHIEVEMENTS.length} achievements`);

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
