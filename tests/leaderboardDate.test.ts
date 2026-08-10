import { describe, it, expect } from 'vitest';
import { isoDate } from '../src/services/leaderboardService.js';

/**
 * Regression: pg returns TIMESTAMP columns as Date objects, but the row type
 * declared `snapshotted_at: string`, so `.split('T')` compiled and then threw
 * at runtime. The only caller is a fire-and-forget achievement check, so the
 * rejection went unhandled and Node 20 killed the process — every completed
 * match took the server down and users got HTTP 502.
 */
describe('leaderboard snapshot date formatting', () => {
  it('accepts a Date, which is what pg actually returns', () => {
    expect(isoDate(new Date('2026-08-10T18:14:49.301Z'))).toBe('2026-08-10');
  });

  it('still accepts an ISO string', () => {
    expect(isoDate('2026-08-10T18:14:49.301Z')).toBe('2026-08-10');
  });

  it('never throws on the shapes a driver might hand back', () => {
    for (const v of [new Date(0), '2026-01-01', '2026-01-01 00:00:00'] as (Date | string)[]) {
      expect(() => isoDate(v)).not.toThrow();
    }
  });
});
