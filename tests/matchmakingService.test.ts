import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/db/pool.js', () => ({ query: vi.fn(), withTransaction: vi.fn() }));
vi.mock('../src/services/matchService.js', () => ({ createMatch: vi.fn() }));
vi.mock('../src/services/notificationService.js', () => ({ notifyMatchPlayers: vi.fn(), notifyUser: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/config/index.js', () => ({ config: { game: { matchmakingInitialRange: 100, matchmakingRangeIncrement: 25, turnDeadlineHours: 72 }, expo: { accessToken: '' }, isDevelopment: true } }));
vi.mock('../src/utils/logger.js', () => ({ logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { AlreadyInQueueError, NotInQueueError, TeamNotFoundError, ActiveMatchExistsError } from '../src/services/matchmakingService.js';

describe('Matchmaking error classes', () => {
  it('AlreadyInQueueError has correct name', () => { const err = new AlreadyInQueueError(); expect(err.name).toBe('AlreadyInQueueError'); expect(err instanceof Error).toBe(true); });
  it('NotInQueueError has correct name', () => { const err = new NotInQueueError(); expect(err.name).toBe('NotInQueueError'); });
  it('TeamNotFoundError has correct name', () => { const err = new TeamNotFoundError(); expect(err.name).toBe('TeamNotFoundError'); });
  it('ActiveMatchExistsError has correct name', () => { const err = new ActiveMatchExistsError(); expect(err.name).toBe('ActiveMatchExistsError'); });
});

describe('Notification service', () => {
  it('notifyUser mock is callable', async () => {
    const { notifyUser } = await import('../src/services/notificationService.js');
    await expect(Promise.resolve(notifyUser('user-1', 'YOUR_TURN', { matchId: 'match-1' }))).resolves.not.toThrow();
  });
});
