import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../db/pool.js';
import { createMatch } from './matchService.js';
import { notifyUser } from './notificationService.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class ChallengeNotFoundError extends Error { constructor() { super('Challenge not found'); this.name = 'ChallengeNotFoundError'; } }
export class ChallengeAccessError extends Error { constructor() { super('You are not part of this challenge'); this.name = 'ChallengeAccessError'; } }
export class ChallengeError extends Error { constructor(message: string) { super(message); this.name = 'ChallengeError'; } }

interface ChallengeRow {
  id: string;
  challenger_id: string;
  challenger_username: string;
  opponent_id: string;
  opponent_username: string;
  challenger_team_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  match_id: string | null;
  created_at: string;
  expires_at: string;
}

// Issue a challenge to an opponent by their username
export async function issueChallenge(
  challengerId: string,
  challengerTeamId: string,
  opponentUsername: string
): Promise<{ challengeId: string; opponentUsername: string; status: string }> {
  if (!opponentUsername?.trim()) throw new ChallengeError('Opponent username is required');

  // Look up opponent by username
  const opponentResult = await query<{ id: string; username: string }>(
    'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
    [opponentUsername.trim()]
  );
  const opponent = opponentResult.rows[0];
  if (!opponent) throw new ChallengeError('Player "' + opponentUsername + '" not found');
  if (opponent.id === challengerId) throw new ChallengeError('You cannot challenge yourself');

  // Verify challenger owns the team
  const teamResult = await query<{ id: string }>(
    'SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
    [challengerTeamId, challengerId]
  );
  if (!teamResult.rows[0]) throw new ChallengeError('Team not found');

  // Check for existing pending challenge between these players
  const existing = await query<{ id: string }>(
    'SELECT id FROM challenges WHERE challenger_id = $1 AND opponent_id = $2 AND status = $3',
    [challengerId, opponent.id, 'pending']
  );
  if (existing.rows[0]) throw new ChallengeError('You already have a pending challenge with this player');

  const challengerResult = await query<{ username: string }>(
    'SELECT username FROM users WHERE id = $1',
    [challengerId]
  );
  const challengerUsername = challengerResult.rows[0]?.username ?? 'Someone';

  const challengeId = uuidv4();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48); // 48-hour expiry

  await query(
    'INSERT INTO challenges (id, challenger_id, challenger_username, opponent_id, opponent_username, challenger_team_id, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [challengeId, challengerId, challengerUsername, opponent.id, opponent.username, challengerTeamId, 'pending', expiresAt.toISOString()]
  );

  // Notify opponent
  setImmediate(() => {
    void notifyUser(opponent.id, 'CHALLENGE_RECEIVED', {
      challengeId,
      challengerUsername,
    });
  });

  logger.info({ challengeId, challengerId, opponentId: opponent.id }, 'Challenge issued');
  return { challengeId, opponentUsername: opponent.username, status: 'pending' };
}

// Accept a challenge — opponent picks their team and the match is created
export async function acceptChallenge(
  challengeId: string,
  acceptingUserId: string,
  acceptingTeamId: string
): Promise<{ matchId: string }> {
  return withTransaction(async (client) => {
    const result = await client.query<ChallengeRow>(
      'SELECT * FROM challenges WHERE id = $1 FOR UPDATE',
      [challengeId]
    );
    const challenge = result.rows[0];
    if (!challenge) throw new ChallengeNotFoundError();
    if (challenge.opponent_id !== acceptingUserId) throw new ChallengeAccessError();
    if (challenge.status !== 'pending') throw new ChallengeError('This challenge is no longer pending');
    if (new Date(challenge.expires_at) < new Date()) {
      await client.query('UPDATE challenges SET status = $1 WHERE id = $2', ['expired', challengeId]);
      throw new ChallengeError('This challenge has expired');
    }

    // Verify accepting player owns the team
    const teamResult = await client.query<{ id: string }>(
      'SELECT id FROM teams WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
      [acceptingTeamId, acceptingUserId]
    );
    if (!teamResult.rows[0]) throw new ChallengeError('Team not found');

    const { matchId } = await createMatch(
      challenge.challenger_id,
      challenge.opponent_id,
      challenge.challenger_team_id,
      acceptingTeamId,
      config.game.turnDeadlineHours
    );

    await client.query(
      'UPDATE challenges SET status = $1, match_id = $2 WHERE id = $3',
      ['accepted', matchId, challengeId]
    );

    // Notify challenger their challenge was accepted
    setImmediate(() => {
      void notifyUser(challenge.challenger_id, 'CHALLENGE_ACCEPTED', {
        matchId,
        opponentUsername: challenge.opponent_username,
      });
    });

    logger.info({ challengeId, matchId }, 'Challenge accepted');
    return { matchId };
  });
}

// Decline a challenge
export async function declineChallenge(
  challengeId: string,
  decliningUserId: string
): Promise<void> {
  const result = await query<ChallengeRow>(
    'SELECT * FROM challenges WHERE id = $1',
    [challengeId]
  );
  const challenge = result.rows[0];
  if (!challenge) throw new ChallengeNotFoundError();
  if (challenge.opponent_id !== decliningUserId) throw new ChallengeAccessError();
  if (challenge.status !== 'pending') throw new ChallengeError('This challenge is no longer pending');

  await query('UPDATE challenges SET status = $1 WHERE id = $2', ['declined', challengeId]);
  logger.info({ challengeId }, 'Challenge declined');
}

// Get all pending challenges for a user (both sent and received)
export async function getChallenges(userId: string): Promise<{
  received: ChallengeRow[];
  sent: ChallengeRow[];
}> {
  // Expire old challenges first
  await query(
    'UPDATE challenges SET status = $1 WHERE status = $2 AND expires_at < NOW()',
    ['expired', 'pending']
  );

  const received = await query<ChallengeRow>(
    'SELECT * FROM challenges WHERE opponent_id = $1 AND status = $2 ORDER BY created_at DESC',
    [userId, 'pending']
  );
  const sent = await query<ChallengeRow>(
    'SELECT * FROM challenges WHERE challenger_id = $1 AND status IN ($2, $3) ORDER BY created_at DESC LIMIT 10',
    [userId, 'pending', 'accepted']
  );

  return { received: received.rows, sent: sent.rows };
}
