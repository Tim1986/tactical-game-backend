import { query, withTransaction } from '../db/pool.js';
import { createMatch } from './matchService.js';
import { notifyMatchPlayers, notifyUser } from './notificationService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class AlreadyInQueueError extends Error { constructor() { super('You are already in the matchmaking queue'); this.name = 'AlreadyInQueueError'; } }
export class NotInQueueError extends Error { constructor() { super('You are not in the matchmaking queue'); this.name = 'NotInQueueError'; } }
export class ActiveMatchExistsError extends Error { constructor() { super('You already have an active match'); this.name = 'ActiveMatchExistsError'; } }
export class TeamNotFoundError extends Error { constructor() { super('Team not found'); this.name = 'TeamNotFoundError'; } }
export class ChallengeError extends Error { constructor(message: string) { super(message); this.name = 'ChallengeError'; } }

interface QueueRow { id: string; user_id: string; team_id: string; elo: number; elo_search_range: number; entered_at: string; }

export async function enterQueue(userId: string, teamId: string): Promise<{ position: number }> {
  const teamResult = await query<{ id: string }>('SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE', [teamId, userId]);
  if (!teamResult.rows[0]) throw new TeamNotFoundError();
  const activeMatch = await query<{ id: string }>('SELECT id FROM matches WHERE (player_one_id = $1 OR player_two_id = $1) AND status = $2 LIMIT 1', [userId, 'active']);
  if (activeMatch.rows.length > 0) throw new ActiveMatchExistsError();
  const userResult = await query<{ elo: number }>('SELECT elo FROM users WHERE id = $1', [userId]);
  const elo = userResult.rows[0]?.elo ?? 1200;
  try {
    await query('INSERT INTO matchmaking_queue (user_id, team_id, elo, elo_search_range) VALUES ($1, $2, $3, $4)', [userId, teamId, elo, config.game.matchmakingInitialRange]);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code?: string }).code === '23505') throw new AlreadyInQueueError();
    throw err;
  }
  const posResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM matchmaking_queue WHERE elo BETWEEN $1 AND $2', [elo - 200, elo + 200]);
  const position = parseInt(posResult.rows[0].count, 10);
  logger.info({ userId, teamId, elo }, 'Player entered matchmaking queue');
  return { position };
}

export async function leaveQueue(userId: string): Promise<void> {
  const result = await query('DELETE FROM matchmaking_queue WHERE user_id = $1', [userId]);
  if (!result.rowCount || result.rowCount === 0) throw new NotInQueueError();
  logger.info({ userId }, 'Player left matchmaking queue');
}

export async function getQueueStatus(userId: string): Promise<{ inQueue: boolean; enteredAt?: string; elo?: number; searchRange?: number; waitSeconds?: number; }> {
  const result = await query<QueueRow>('SELECT * FROM matchmaking_queue WHERE user_id = $1', [userId]);
  const entry = result.rows[0];
  if (!entry) return { inQueue: false };
  const waitSeconds = Math.floor((Date.now() - new Date(entry.entered_at).getTime()) / 1000);
  return { inQueue: true, enteredAt: entry.entered_at, elo: entry.elo, searchRange: entry.elo_search_range, waitSeconds };
}

export async function sendChallenge(challengerId: string, challengerTeamId: string, opponentId: string): Promise<void> {
  if (challengerId === opponentId) throw new ChallengeError('You cannot challenge yourself');
  const teamResult = await query<{ id: string }>('SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE', [challengerTeamId, challengerId]);
  if (!teamResult.rows[0]) throw new TeamNotFoundError();
  const opponentResult = await query<{ id: string; username: string }>('SELECT id, username FROM users WHERE id = $1', [opponentId]);
  if (!opponentResult.rows[0]) throw new ChallengeError('Opponent not found');
  const challengerResult = await query<{ username: string }>('SELECT username FROM users WHERE id = $1', [challengerId]);
  const { matchId } = await createMatch(challengerId, opponentId, challengerTeamId, challengerTeamId, config.game.turnDeadlineHours);
  await notifyUser(opponentId, 'CHALLENGE_RECEIVED', { challengeId: matchId, challengerUsername: challengerResult.rows[0]?.username ?? 'Someone' });
  logger.info({ challengerId, opponentId, matchId }, 'Direct challenge created');
}

export async function runMatchmakingJob(): Promise<void> {
  logger.debug('Running matchmaking job');
  await withTransaction(async (client) => {
    const queueResult = await client.query<QueueRow>('SELECT * FROM matchmaking_queue ORDER BY entered_at ASC FOR UPDATE SKIP LOCKED');
    const entries = queueResult.rows;
    if (entries.length < 2) { logger.debug({ queueSize: entries.length }, 'Not enough players to match'); return; }
    const matched = new Set<string>();
    let matchesCreated = 0;
    for (let i = 0; i < entries.length; i++) {
      const p1 = entries[i];
      if (matched.has(p1.user_id)) continue;
      for (let j = i + 1; j < entries.length; j++) {
        const p2 = entries[j];
        if (matched.has(p2.user_id)) continue;
        const p1Min = p1.elo - p1.elo_search_range; const p1Max = p1.elo + p1.elo_search_range;
        const p2Min = p2.elo - p2.elo_search_range; const p2Max = p2.elo + p2.elo_search_range;
        if (p1Min <= p2Max && p2Min <= p1Max) {
          try {
            const { matchId } = await createMatch(p1.user_id, p2.user_id, p1.team_id, p2.team_id, config.game.turnDeadlineHours);
            await client.query('DELETE FROM matchmaking_queue WHERE user_id = ANY($1)', [[p1.user_id, p2.user_id]]);
            matched.add(p1.user_id); matched.add(p2.user_id); matchesCreated++;
            logger.info({ matchId, p1: p1.user_id, p2: p2.user_id }, 'Match created by matchmaking');
            setImmediate(() => { void notifyMatchPlayers(p1.user_id, p2.user_id, 'MATCH_FOUND', { matchId }); });
            break;
          } catch (err) { logger.error({ err, p1: p1.user_id, p2: p2.user_id }, 'Failed to create match during matchmaking'); }
        }
      }
    }
    const unmatchedIds = entries.map((e) => e.user_id).filter((id) => !matched.has(id));
    if (unmatchedIds.length > 0) {
      await client.query('UPDATE matchmaking_queue SET elo_search_range = elo_search_range + $1 WHERE user_id = ANY($2)', [config.game.matchmakingRangeIncrement, unmatchedIds]);
    }
    if (matchesCreated > 0) logger.info({ matchesCreated }, 'Matchmaking job complete');
  });
}

export async function runDeadlineEnforcer(): Promise<void> {
  logger.debug('Running deadline enforcer');
  const expiredMatches = await query<{ id: string; active_player_id: string; player_one_id: string; player_two_id: string; }>(
    'SELECT id, active_player_id, player_one_id, player_two_id FROM matches WHERE status = $1 AND turn_deadline IS NOT NULL AND turn_deadline < NOW()',
    ['active']
  );
  for (const match of expiredMatches.rows) {
    const winnerId = match.active_player_id === match.player_one_id ? match.player_two_id : match.player_one_id;
    try {
      await query('UPDATE matches SET status = $1, winner_id = $2, completed_at = NOW() WHERE id = $3', ['completed', winnerId, match.id]);
      logger.info({ matchId: match.id, winnerId }, 'Match forfeited due to turn deadline');
      await notifyUser(winnerId, 'MATCH_COMPLETED', { matchId: match.id, won: 'true' });
    } catch (err) { logger.error({ err, matchId: match.id }, 'Failed to enforce deadline for match'); }
  }
}
