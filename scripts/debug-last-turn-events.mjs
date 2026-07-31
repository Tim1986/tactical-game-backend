// Read-only diagnostic: dump last_turn_events + turnContext for a match.
// Usage: railway run node scripts/debug-last-turn-events.mjs <matchId>
import pg from 'pg';

const matchId = process.argv[2] ?? '8721d9f1-9475-4f31-9355-e3e46959c135';
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
console.log('connecting to host:', new URL(url).hostname);
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const r = await pool.query(
  `SELECT turn_number, active_player_id, last_turn_events, match_state->'turnContext' AS tc
   FROM matches WHERE id = $1`, [matchId]);
if (!r.rows[0]) { console.log('match not found'); process.exit(1); }
const m = r.rows[0];
console.log('turn_number:', m.turn_number, ' active_player:', m.active_player_id);
console.log('turnContext:', JSON.stringify(m.tc)?.slice(0, 400) ?? 'absent');
const evs = m.last_turn_events ?? [];
console.log(`last_turn_events (${evs.length}):`, evs.map(e => e.type).join(', ') || '(empty)');
process.exit(0);
