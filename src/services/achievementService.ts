import { query, withTransaction } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { notifyUser } from './notificationService.js';
import { isUserInTopN } from './leaderboardService.js';

interface AchievementDefinition {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  condition: AchievementCondition;
  sortOrder: number;
}

interface AchievementCondition {
  type: 'match_count' | 'win_count' | 'elo_reached' | 'pve_difficulty_clear' | 'leaderboard_top_n';
  threshold?: number;
  n?: number;
  difficulty?: 'easy' | 'hard' | 'nightmare';
}

export interface UserAchievement {
  slug: string;
  name: string;
  description: string;
  iconKey: string;
  sortOrder: number;
  unlockedAt: string | null;
}

// ---------------------------------------------------------------
// Get all achievements for a user (unlocked + locked)
// ---------------------------------------------------------------
export async function getAchievementsForUser(userId: string): Promise<UserAchievement[]> {
  const result = await query<{
    slug: string; name: string; description: string;
    icon_key: string; sort_order: number; unlocked_at: string | null;
  }>(
    `SELECT ad.slug, ad.name, ad.description, ad.icon_key, ad.sort_order,
            ua.unlocked_at
     FROM achievement_definitions ad
     LEFT JOIN user_achievements ua
       ON ua.achievement_slug = ad.slug AND ua.user_id = $1
     ORDER BY ad.sort_order ASC`,
    [userId]
  );

  return result.rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    description: r.description,
    iconKey: r.icon_key,
    sortOrder: r.sort_order,
    unlockedAt: r.unlocked_at ?? null,
  }));
}

// ---------------------------------------------------------------
// Evaluate and unlock any newly-earned achievements for a user.
// Called after any event that could trigger an achievement.
// Returns slugs of newly unlocked achievements.
// ---------------------------------------------------------------
export async function evaluateAchievements(userId: string): Promise<string[]> {
  // Load all definitions and already-earned slugs in parallel
  const [defsResult, earnedResult, statsResult] = await Promise.all([
    query<{ slug: string; name: string; condition: AchievementCondition }>(
      `SELECT slug, name, condition FROM achievement_definitions`
    ),
    query<{ achievement_slug: string }>(
      `SELECT achievement_slug FROM user_achievements WHERE user_id = $1`,
      [userId]
    ),
    query<{ elo: number; match_count: string; win_count: string }>(
      `SELECT
         u.elo,
         COUNT(m.id)                                          AS match_count,
         COUNT(m.id) FILTER (WHERE m.winner_id = $1)         AS win_count
       FROM users u
       LEFT JOIN matches m
         ON (m.player_one_id = $1 OR m.player_two_id = $1) AND m.status = 'completed'
       WHERE u.id = $1
       GROUP BY u.elo`,
      [userId]
    ),
  ]);

  const earnedSlugs = new Set(earnedResult.rows.map((r) => r.achievement_slug));
  const stats = statsResult.rows[0] ?? { elo: 1200, match_count: '0', win_count: '0' };
  const matchCount = parseInt(stats.match_count, 10);
  const winCount = parseInt(stats.win_count, 10);
  const elo = stats.elo;

  const newlyUnlocked: string[] = [];

  for (const def of defsResult.rows) {
    if (earnedSlugs.has(def.slug)) continue;

    const cond = def.condition;
    let qualifies = false;

    if (cond.type === 'match_count' && cond.threshold !== undefined) {
      qualifies = matchCount >= cond.threshold;
    } else if (cond.type === 'win_count' && cond.threshold !== undefined) {
      qualifies = winCount >= cond.threshold;
    } else if (cond.type === 'elo_reached' && cond.threshold !== undefined) {
      qualifies = elo >= cond.threshold;
    } else if (cond.type === 'pve_difficulty_clear') {
      qualifies = false; // PvE system pending
    } else if (cond.type === 'leaderboard_top_n' && cond.n !== undefined) {
      qualifies = await isUserInTopN(userId, cond.n);
    }

    if (qualifies) {
      newlyUnlocked.push(def.slug);
    }
  }

  if (newlyUnlocked.length === 0) return [];

  // Insert with notified_at NULL so the client can drain and show banners
  await withTransaction(async (client) => {
    for (const slug of newlyUnlocked) {
      await client.query(
        `INSERT INTO user_achievements (user_id, achievement_slug, notified_at)
         VALUES ($1, $2, NULL)
         ON CONFLICT DO NOTHING`,
        [userId, slug]
      );
    }
  });

  logger.info({ userId, newlyUnlocked }, 'Achievements unlocked');

  // Fire-and-forget push notifications
  for (const slug of newlyUnlocked) {
    const def = defsResult.rows.find((d) => d.slug === slug);
    if (def) {
      setImmediate(() => {
        void notifyUser(userId, 'ACHIEVEMENT_UNLOCKED', {
          achievementSlug: slug,
          achievementName: def.name,
        });
      });
    }
  }

  return newlyUnlocked;
}

// ---------------------------------------------------------------
// Drain pending achievement notifications for a user.
// Returns achievements unlocked since last drain, then marks them notified.
// Safe to call multiple times — idempotent after first drain.
// ---------------------------------------------------------------
export async function drainPendingAchievements(userId: string): Promise<{ slug: string; name: string; description: string; iconKey: string }[]> {
  const result = await query<{ achievement_slug: string; name: string; description: string; icon_key: string }>(
    `UPDATE user_achievements ua
     SET notified_at = NOW()
     FROM achievement_definitions ad
     WHERE ua.achievement_slug = ad.slug
       AND ua.user_id = $1
       AND ua.notified_at IS NULL
     RETURNING ua.achievement_slug, ad.name, ad.description, ad.icon_key`,
    [userId]
  );
  return result.rows.map((r) => ({
    slug: r.achievement_slug,
    name: r.name,
    description: r.description,
    iconKey: r.icon_key,
  }));
}
