import { describe, it, expect } from 'vitest';
import {
  computeStats, starsForAttempt, MAX_STARS, MIN_STARS,
  type PuzzleSolveRecord,
} from '../src/services/puzzleStatsService.js';

/** A solved record. `day` set = it counted as that date's featured daily. */
function solved(
  puzzleId: string, onAttempt: number, day?: string, attempts = onAttempt,
): PuzzleSolveRecord {
  return {
    puzzleId, attempts,
    stars: starsForAttempt(onAttempt),
    solvedOnAttempt: onAttempt,
    solvedAt: `${day ?? '2026-08-01'}T12:00:00.000Z`,
    dailyDate: day ?? null,
  };
}

/** An attempted-but-unsolved record. */
function attempted(puzzleId: string, attempts: number): PuzzleSolveRecord {
  return { puzzleId, attempts, stars: null, solvedOnAttempt: null, solvedAt: null, dailyDate: null };
}

/** Today/yesterday in UTC — the streak anchors on real time. */
const DAY_MS = 86400000;
const utc = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY_MS).toISOString().slice(0, 10);

describe('puzzle star scoring (server mirror of the client rule)', () => {
  it('matches the client ladder exactly', () => {
    expect([1, 2, 3, 4, 5, 6, 99].map(starsForAttempt)).toEqual([5, 4, 3, 2, 1, 1, 1]);
  });

  it('never mints more than the max or less than the min', () => {
    for (let a = -5; a < 50; a++) {
      const s = starsForAttempt(a);
      expect(s).toBeGreaterThanOrEqual(MIN_STARS);
      expect(s).toBeLessThanOrEqual(MAX_STARS);
    }
  });
});

describe('computeStats — the Wordle panel', () => {
  it('is all zeroes for a new account, never NaN', () => {
    const s = computeStats([]);
    expect(s).toMatchObject({
      played: 0, won: 0, winPercent: 0, currentStreak: 0, maxStreak: 0,
      starsEarned: 0, starsPossible: 0,
    });
    expect(s.distribution).toEqual([0, 0, 0, 0, 0]);
    expect(Number.isNaN(s.winPercent)).toBe(false);
  });

  it('counts played as attempted, won as solved, and rounds win %', () => {
    const s = computeStats([
      solved('p1', 1), solved('p2', 3), attempted('p3', 4),
    ]);
    expect(s.played).toBe(3);
    expect(s.won).toBe(2);
    expect(s.winPercent).toBe(67); // 2/3
  });

  it('buckets the distribution by the attempt that CRACKED it', () => {
    const s = computeStats([
      solved('a', 1), solved('b', 1), solved('c', 2), solved('d', 4),
    ]);
    //          attempt: 1  2  3  4  5+
    expect(s.distribution).toEqual([2, 1, 0, 1, 0]);
  });

  it('lumps every slow solve into the 5+ bucket', () => {
    const s = computeStats([solved('a', 5), solved('b', 9), solved('c', 40)]);
    expect(s.distribution).toEqual([0, 0, 0, 0, 3]);
    // …and each is still worth the floor, not zero.
    expect(s.starsEarned).toBe(3 * MIN_STARS);
  });

  it('uses solvedOnAttempt for the bucket, NOT the running attempts counter', () => {
    // Solved on attempt 2 (4 stars), then replayed badly eight more times.
    const replayed: PuzzleSolveRecord = { ...solved('a', 2), attempts: 10 };
    const s = computeStats([replayed]);
    expect(s.distribution).toEqual([0, 1, 0, 0, 0]);
    expect(s.starsEarned).toBe(4);
  });

  it('scores starsPossible against solves attained, not the whole rotation', () => {
    // Two solves at 5 and 3 → 8 of a possible 10. A player is never shown a
    // denominator inflated by puzzles they have not reached.
    const s = computeStats([solved('a', 1), solved('b', 3), attempted('c', 2)]);
    expect(s.starsEarned).toBe(8);
    expect(s.starsPossible).toBe(10);
  });
});

describe('computeStats — streaks', () => {
  it('counts consecutive days ending today', () => {
    const s = computeStats([
      solved('a', 1, utc(0)), solved('b', 2, utc(-1)), solved('c', 1, utc(-2)),
    ]);
    expect(s.currentStreak).toBe(3);
    expect(s.maxStreak).toBe(3);
  });

  it('stays alive on the day before a solve — no scary 0 before you play', () => {
    const s = computeStats([solved('a', 1, utc(-1)), solved('b', 1, utc(-2))]);
    expect(s.currentStreak).toBe(2);
  });

  it('breaks after a full missed day', () => {
    const s = computeStats([solved('a', 1, utc(-2)), solved('b', 1, utc(-3))]);
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(2); // the run still counts toward the record
  });

  it('remembers the best run even when the current one is shorter', () => {
    const s = computeStats([
      solved('old1', 1, '2026-01-01'), solved('old2', 1, '2026-01-02'),
      solved('old3', 1, '2026-01-03'), solved('old4', 1, '2026-01-04'),
      solved('now', 1, utc(0)),
    ]);
    expect(s.maxStreak).toBe(4);
    expect(s.currentStreak).toBe(1);
  });

  it('ignores solves that were NOT that day\'s featured daily', () => {
    // Shared-link and back-catalogue solves carry no dailyDate and must never
    // manufacture a streak.
    const s = computeStats([solved('shared1', 1), solved('shared2', 1)]);
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(0);
    expect(s.won).toBe(2); // they still count as wins
  });

  it('does not double-count two puzzles solved on the same UTC day', () => {
    const s = computeStats([solved('a', 1, utc(0)), solved('b', 1, utc(0))]);
    expect(s.currentStreak).toBe(1);
  });
});
