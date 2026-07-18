import { pool, checkDatabaseConnection } from './pool.js';
import { logger } from '../utils/logger.js';
import { ABILITY_DEFS, UNIT_DEFS } from '../config/gameData.js';

// =============================================================
// STATUS EFFECTS
// =============================================================
const STATUS_EFFECTS = [
  {
    slug: 'frozen',
    name: 'Frozen',
    description: 'Cannot move, charge, or use abilities.',
    trigger: 'on_turn_start',
    effect: { type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'rooted',
    name: 'Rooted',
    description: 'Cannot move or charge; can still use abilities.',
    trigger: 'on_turn_start',
    effect: { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'burning',
    name: 'Burning',
    description: 'Takes 5 damage per stack at the start of each of your turns.',
    trigger: 'on_turn_start',
    effect: { type: 'damage', formula: 'flat', value: 5 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'weakened',
    name: 'Weakened',
    description: 'Outgoing damage is reduced by 4 (minimum 0).',
    trigger: 'on_hit',
    effect: { type: 'apply_status', statusSlug: 'weakened', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'exposed',
    name: 'Exposed',
    description: 'Attacks against this unit always hit, bypassing the fortune meter.',
    trigger: 'on_hit',
    effect: { type: 'apply_status', statusSlug: 'exposed', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
  {
    slug: 'shielded',
    name: 'Shielded',
    description: 'Fully negates the next hit against this unit, including unblockable attacks, then expires.',
    trigger: 'on_hit',
    effect: { type: 'apply_status', statusSlug: 'shielded', stacks: 1, durationTurns: 0 },
    is_stackable: false,
    max_stacks: 1,
  },
];

// Abilities and units — edit values in src/config/gameData.ts, not here.
const ABILITIES = ABILITY_DEFS;
const UNITS = UNIT_DEFS;

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
           (slug, name, description, targeting_type, range, area_radius, cooldown_turns, is_special, is_unblockable, exclude_allies, is_multi_hit, effects)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (slug) DO UPDATE SET
           name           = EXCLUDED.name,
           description    = EXCLUDED.description,
           targeting_type = EXCLUDED.targeting_type,
           range          = EXCLUDED.range,
           area_radius    = EXCLUDED.area_radius,
           cooldown_turns = EXCLUDED.cooldown_turns,
           is_special     = EXCLUDED.is_special,
           is_unblockable = EXCLUDED.is_unblockable,
           exclude_allies = EXCLUDED.exclude_allies,
           is_multi_hit   = EXCLUDED.is_multi_hit,
           effects        = EXCLUDED.effects`,
        [ab.slug, ab.name, ab.description, ab.targeting_type,
         ab.range, ab.area_radius, ab.cooldown_turns, ab.is_special,
         (ab as typeof ab & { is_unblockable?: boolean }).is_unblockable ?? false,
         (ab as typeof ab & { exclude_allies?: boolean }).exclude_allies ?? false,
         (ab as typeof ab & { is_multi_hit?: boolean }).is_multi_hit ?? false,
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
            special_options, passive_options, unlock_level, asset_key, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (slug) DO UPDATE SET
           name            = EXCLUDED.name,
           max_health      = EXCLUDED.max_health,
           armor_class     = EXCLUDED.armor_class,
           movement_range  = EXCLUDED.movement_range,
           abilities       = EXCLUDED.abilities,
           passives        = EXCLUDED.passives,
           special_options = EXCLUDED.special_options,
           passive_options = EXCLUDED.passive_options,
           unlock_level    = EXCLUDED.unlock_level,
           asset_key       = EXCLUDED.asset_key,
           is_active       = EXCLUDED.is_active`,
        [unit.slug, unit.name, unit.max_health, unit.armor_class, unit.movement_range,
         JSON.stringify(unit.abilities), JSON.stringify(unit.passives),
         JSON.stringify(unit.special_options), JSON.stringify(unit.passive_options),
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
