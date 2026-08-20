/**
 * puzzleStatsService.ts — Server-side puzzle scores and Wordle-style stats.
 *
 * The client plays puzzles fully offline and keeps a local mirror, so this
 * service is written around SYNC rather than around writes: the client pushes
 * whatever it has, the server merges, and both ends end up with the same answer
 * regardless of ordering, duplication, or which device played first.
 *
 * ── THE MERGE RULE ─────────────────────────────────────────────────────────
 * Every field merges commutatively, so syncing twice, out of order, or from two
 * devices converges on the same row (last-write-wins would silently destroy a
 * better score earned on the other phone):
 *
 *   stars             → MAX          (a best score is never lowered)
 *   solved_on_attempt → the attempt that produced the winning `stars`
 *   attempts          → MAX          (never rewind effort already spent)
 *   solved_at         → EARLIEST     (first solve is the historical fact)
 *   daily_date        → COALESCE     (once a solve counts for a day, it counts)
 *
 * Taking MAX on attempts rather than summing is deliberate: two devices that
 * both played the same puzzle three times represent the same three attempts as
 * far as the player is concerned, and summing would inflate the count into an
 * unearned-looking score. MAX is the conservative reading.
 *
 * ── DERIVED, NEVER DENORMALISED ────────────────────────────────────────────
 * played / win % / streaks / distribution are all computed from the rows on
 * read. A counter column would be one bad sync away from being permanently
 * wrong with no way to detect it; aggregation is always self-consistent.
 */
import { query } from '../db/pool.js';

/** Stars awarded for a first-attempt solve. Mirrors the client's scoring. */
export const MAX_STARS = 5;
/** A solve is always worth at least this much, however long it took. */
export const MIN_STARS = 1;

/** Stars a solve on `attempt` (1-based) is worth. Must match the client. */
export function starsForAttempt(attempt: number): number {
  const n = Number.isFinite(attempt) ? Math.floor(attempt) : 1;
  return Math.max(MIN_STARS, MAX_STARS - (Math.max(1, n) - 1));
}

/** One puzzle's record as the client holds it. */
export interface PuzzleSolveInput {
  puzzleId: string;
  attempts: number;
  stars?: number | null;
  solvedOnAttempt?: number | null;
  solvedAt?: string | null;
  /** UTC 'YYYY-MM-DD' — set only when this was that day's featured daily. */
  dailyDate?: string | null;
}

export interface PuzzleSolveRecord {
  puzzleId: string;
  attempts: number;
  stars: number | null;
  solvedOnAttempt: number | null;
  solvedAt: string | null;
  dailyDate: string | null;
}

export interface PuzzleStats {
  /** Puzzles attempted at least once — Wordle's "Played". */
  played: number;
  /** Puzzles solved. */
  won: number;
  /** 0-100, rounded. 0 when nothing has been played (never NaN). */
  winPercent: number;
  currentStreak: number;
  maxStreak: number;
  /** Lifetime stars earned, and the most that was available for those solves. */
  starsEarned: number;
  starsPossible: number;
  /**
   * Solves bucketed by the attempt that cracked them: index 0 = first attempt
   * (5 stars) … index 4 = fifth-or-later attempt (1 star). This is the Wordle
   * guess-distribution histogram, and the reason `solved_on_attempt` exists.
   */
  distribution: number[];
}

interface Row {
  puzzle_id: string;
  attempts: number;
  stars: number | null;
  solved_on_attempt: number | null;
  solved_at: Date | null;
  daily_date: Date | string | null;
}

/** Postgres DATE → 'YYYY-MM-DD' without tripping over local timezone. */
function dateStr(d: Date | string | null): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toRecord(r: Row): PuzzleSolveRecord {
  return {
    puzzleId: r.puzzle_id,
    attempts: r.attempts,
    stars: r.stars,
    solvedOnAttempt: r.solved_on_attempt,
    solvedAt: r.solved_at ? r.solved_at.toISOString() : null,
    dailyDate: dateStr(r.daily_date),
  };
}

export async function getPuzzleSolves(userId: string): Promise<PuzzleSolveRecord[]> {
  const { rows } = await query<Row>(
    `SELECT puzzle_id, attempts, stars, solved_on_attempt, solved_at, daily_date
       FROM puzzle_solves WHERE user_id = $1 ORDER BY puzzle_id`,
    [userId],
  );
  return rows.map(toRecord);
}

/**
 * Merge one client record into the server's row. See THE MERGE RULE above.
 *
 * `solved_on_attempt` is chosen by the SAME comparison that picks `stars`, so
 * the pair can never disagree — the display reads "solved in N attempts" beside
 * the star row and those two must describe the same run.
 */
async function upsertOne(userId: string, rec: PuzzleSolveInput): Promise<void> {
  // Normalise: a solve is all-or-nothing (the table CHECK enforces it too, but
  // failing here gives a clear error instead of a constraint violation).
  const hasSolve = !!rec.solvedAt && rec.stars != null && rec.solvedOnAttempt != null;
  const stars = hasSolve ? Math.min(MAX_STARS, Math.max(MIN_STARS, Math.round(rec.stars!))) : null;
  const solvedOnAttempt = hasSolve ? Math.max(1, Math.floor(rec.solvedOnAttempt!)) : null;
  const solvedAt = hasSolve ? new Date(rec.solvedAt!) : null;
  // Attempts must cover the solving attempt: a record claiming a 3rd-attempt
  // solve with attempts=1 is incoherent, and would understate "played" effort.
  const attempts = Math.max(0, Math.floor(rec.attempts || 0), solvedOnAttempt ?? 0);

  await query(
    `INSERT INTO puzzle_solves
       (user_id, puzzle_id, attempts, stars, solved_on_attempt, solved_at, daily_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, puzzle_id) DO UPDATE SET
       attempts = GREATEST(puzzle_solves.attempts, EXCLUDED.attempts),
       -- Keep the better score, and the attempt that produced it, together.
       stars = CASE
         WHEN EXCLUDED.stars IS NULL THEN puzzle_solves.stars
         WHEN puzzle_solves.stars IS NULL OR EXCLUDED.stars > puzzle_solves.stars
           THEN EXCLUDED.stars
         ELSE puzzle_solves.stars END,
       solved_on_attempt = CASE
         WHEN EXCLUDED.stars IS NULL THEN puzzle_solves.solved_on_attempt
         WHEN puzzle_solves.stars IS NULL OR EXCLUDED.stars > puzzle_solves.stars
           THEN EXCLUDED.solved_on_attempt
         ELSE puzzle_solves.solved_on_attempt END,
       -- The first solve is a historical fact; a later device must not rewrite it.
       solved_at = LEAST(
         COALESCE(puzzle_solves.solved_at, EXCLUDED.solved_at),
         COALESCE(EXCLUDED.solved_at, puzzle_solves.solved_at)),
       daily_date = COALESCE(puzzle_solves.daily_date, EXCLUDED.daily_date),
       updated_at = NOW()`,
    [userId, rec.puzzleId, attempts, stars, solvedOnAttempt, solvedAt, rec.dailyDate ?? null],
  );
}

/**
 * Push a batch of client records and return the merged server state.
 * Idempotent: re-syncing the same batch changes nothing.
 */
export async function syncPuzzleSolves(
  userId: string,
  records: PuzzleSolveInput[],
): Promise<{ solves: PuzzleSolveRecord[]; stats: PuzzleStats }> {
  for (const rec of records) await upsertOne(userId, rec);
  const solves = await getPuzzleSolves(userId);
  return { solves, stats: computeStats(solves) };
}

const DAY_MS = 86400000;

function utcDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Wordle-style stats, derived entirely from the rows.
 *
 * Streaks count consecutive UTC days on which that day's FEATURED daily was
 * solved. `currentStreak` anchors on today if today is solved, otherwise on
 * yesterday — a streak stays alive until a full day is actually missed, so
 * opening the app before solving today does not show a scary 0.
 */
export function computeStats(solves: PuzzleSolveRecord[]): PuzzleStats {
  const played = solves.filter((s) => s.attempts > 0 || s.solvedAt).length;
  const solved = solves.filter((s) => s.solvedAt);
  const won = solved.length;

  const distribution = new Array<number>(MAX_STARS).fill(0);
  let starsEarned = 0;
  for (const s of solved) {
    starsEarned += s.stars ?? 0;
    // Attempt 1 → bucket 0 … attempt 5+ → bucket 4 (the "took a while" tail).
    const bucket = Math.min(MAX_STARS, Math.max(1, s.solvedOnAttempt ?? 1)) - 1;
    distribution[bucket] += 1;
  }

  // Streaks.
  const dailyDays = new Set(solved.map((s) => s.dailyDate).filter((d): d is string => !!d));
  let currentStreak = 0;
  let maxStreak = 0;
  if (dailyDays.size > 0) {
    const todayMs = Date.parse(utcDateStr(Date.now()) + 'T00:00:00Z');
    let anchorMs = dailyDays.has(utcDateStr(todayMs)) ? todayMs : todayMs - DAY_MS;
    if (dailyDays.has(utcDateStr(anchorMs))) {
      while (dailyDays.has(utcDateStr(anchorMs))) { currentStreak++; anchorMs -= DAY_MS; }
    }
    // Max streak: walk the sorted days once, counting consecutive runs.
    const sorted = [...dailyDays].sort();
    let run = 0;
    let prevMs = NaN;
    for (const day of sorted) {
      const ms = Date.parse(day + 'T00:00:00Z');
      run = Number.isNaN(prevMs) || ms - prevMs !== DAY_MS ? 1 : run + 1;
      if (run > maxStreak) maxStreak = run;
      prevMs = ms;
    }
  }

  return {
    played,
    won,
    winPercent: played > 0 ? Math.round((won / played) * 100) : 0,
    currentStreak,
    maxStreak,
    starsEarned,
    // What those same solves could have been worth at five stars each — the
    // honest denominator for "42 / 60", rather than the whole rotation, which
    // would punish a player for puzzles they have not reached yet.
    starsPossible: won * MAX_STARS,
    distribution,
  };
}

export async function getPuzzleStats(userId: string): Promise<PuzzleStats> {
  return computeStats(await getPuzzleSolves(userId));
}
