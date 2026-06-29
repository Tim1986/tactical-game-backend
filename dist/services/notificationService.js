"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyUser = notifyUser;
exports.notifyMatchPlayers = notifyMatchPlayers;
const expo_server_sdk_1 = require("expo-server-sdk");
const pool_js_1 = require("../db/pool.js");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
const expo = new expo_server_sdk_1.Expo({
    accessToken: index_js_1.config.expo.accessToken || undefined,
});
function buildPayload(type, data) {
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
    }
}
async function notifyUser(userId, type, data = {}) {
    const payload = buildPayload(type, data);
    if (!index_js_1.config.expo.accessToken) {
        logger_js_1.logger.info({ userId, type, payload }, '[DEV] Push notification (not sent - no EXPO_ACCESS_TOKEN)');
        return;
    }
    const result = await (0, pool_js_1.query)('SELECT token FROM push_tokens WHERE user_id = $1 AND is_active = TRUE', [userId]);
    if (result.rows.length === 0) {
        logger_js_1.logger.debug({ userId }, 'No push tokens found for user');
        return;
    }
    const messages = result.rows.filter((row) => expo_server_sdk_1.Expo.isExpoPushToken(row.token)).map((row) => ({ to: row.token, sound: 'default', title: payload.title, body: payload.body, data: payload.data }));
    if (messages.length === 0) {
        logger_js_1.logger.warn({ userId }, 'No valid Expo push tokens found');
        return;
    }
    try {
        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];
        for (const chunk of chunks) {
            const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...chunkTickets);
        }
        for (const ticket of tickets) {
            if (ticket.status === 'error') {
                logger_js_1.logger.error({ ticket }, 'Push notification error');
                if (ticket.details?.error === 'DeviceNotRegistered')
                    await deactivateToken(ticket.message);
            }
        }
        logger_js_1.logger.info({ userId, type, count: messages.length }, 'Push notifications sent');
    }
    catch (err) {
        logger_js_1.logger.error({ err, userId, type }, 'Failed to send push notification');
    }
}
async function notifyMatchPlayers(playerOneId, playerTwoId, type, data = {}) {
    await Promise.allSettled([notifyUser(playerOneId, type, data), notifyUser(playerTwoId, type, data)]);
}
async function deactivateToken(errorMessage) {
    const tokenMatch = /ExponentPushToken\[[^\]]+\]/.exec(errorMessage);
    if (tokenMatch) {
        await (0, pool_js_1.query)('UPDATE push_tokens SET is_active = FALSE WHERE token = $1', [tokenMatch[0]]);
        logger_js_1.logger.info({ token: tokenMatch[0] }, 'Deactivated invalid push token');
    }
}
//# sourceMappingURL=notificationService.js.map