import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { query } from '../db/pool.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const expo = new Expo({
  accessToken: config.expo.accessToken || undefined,
});

export type NotificationType =
  | 'YOUR_TURN'
  | 'MATCH_FOUND'
  | 'MATCH_COMPLETED'
  | 'CHALLENGE_RECEIVED'
  | 'CHALLENGE_ACCEPTED'
  | 'ACHIEVEMENT_UNLOCKED';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

function buildPayload(type: NotificationType, data: Record<string, string>): NotificationPayload {
  switch (type) {
    case 'YOUR_TURN':
      return { title: "It's your turn!", body: 'Your opponent has moved. Make your play.', data: { type, matchId: data.matchId ?? '' } };
    case 'MATCH_FOUND':
      return { title: 'Match found!', body: 'Your match is ready. Good luck!', data: { type, matchId: data.matchId ?? '' } };
    case 'MATCH_COMPLETED':
      return { title: data.won === 'true' ? 'Victory!' : 'Defeat', body: data.won === 'true' ? 'You won the match!' : 'You lost the match. Better luck next time.', data: { type, matchId: data.matchId ?? '' } };
    case 'CHALLENGE_RECEIVED':
      return { title: 'Challenge received!', body: (data.challengerUsername ?? 'Someone') + ' has challenged you to a match.', data: { type, challengeId: data.challengeId ?? '' } };
    case 'CHALLENGE_ACCEPTED':
      return { title: 'Challenge accepted!', body: (data.opponentUsername ?? 'Your opponent') + ' accepted your challenge.', data: { type, matchId: data.matchId ?? '' } };
    case 'ACHIEVEMENT_UNLOCKED':
      return { title: 'Achievement unlocked!', body: data.achievementName ?? 'You earned a new achievement.', data: { type, achievementSlug: data.achievementSlug ?? '' } };
  }
}

export async function notifyUser(userId: string, type: NotificationType, data: Record<string, string> = {}): Promise<void> {
  const payload = buildPayload(type, data);
  if (!config.expo.accessToken) {
    logger.info({ userId, type, payload }, '[DEV] Push notification (not sent - no EXPO_ACCESS_TOKEN)');
    return;
  }
  const result = await query<{ token: string }>('SELECT token FROM push_tokens WHERE user_id = $1 AND is_active = TRUE', [userId]);
  if (result.rows.length === 0) { logger.debug({ userId }, 'No push tokens found for user'); return; }
  const messages: ExpoPushMessage[] = result.rows.filter((row) => Expo.isExpoPushToken(row.token)).map((row) => ({ to: row.token, sound: 'default' as const, title: payload.title, body: payload.body, data: payload.data }));
  if (messages.length === 0) { logger.warn({ userId }, 'No valid Expo push tokens found'); return; }
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) { const chunkTickets = await expo.sendPushNotificationsAsync(chunk); tickets.push(...chunkTickets); }
    for (const ticket of tickets) {
      if (ticket.status === 'error') {
        logger.error({ ticket }, 'Push notification error');
        if (ticket.details?.error === 'DeviceNotRegistered') await deactivateToken(ticket.message);
      }
    }
    logger.info({ userId, type, count: messages.length }, 'Push notifications sent');
  } catch (err) { logger.error({ err, userId, type }, 'Failed to send push notification'); }
}

export async function notifyMatchPlayers(playerOneId: string, playerTwoId: string, type: NotificationType, data: Record<string, string> = {}): Promise<void> {
  await Promise.allSettled([notifyUser(playerOneId, type, data), notifyUser(playerTwoId, type, data)]);
}

async function deactivateToken(errorMessage: string): Promise<void> {
  const tokenMatch = /ExponentPushToken\[[^\]]+\]/.exec(errorMessage);
  if (tokenMatch) { await query('UPDATE push_tokens SET is_active = FALSE WHERE token = $1', [tokenMatch[0]]); logger.info({ token: tokenMatch[0] }, 'Deactivated invalid push token'); }
}
