import { Pool, PoolClient } from 'pg';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Single shared pool — never create more than one.
export const pool = new Pool({
  connectionString: config.db.url,
  max: 20,                  // max connections in pool
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected error on idle database client');
});

// Convenience wrapper: run a single query from the pool
export async function query<T extends object = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<import('pg').QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  logger.debug({ query: text, duration, rows: result.rowCount }, 'Executed query');
  return result;
}

// Convenience wrapper: run multiple queries in a transaction
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Health check — used on startup and by health endpoint
export async function checkDatabaseConnection(): Promise<void> {
  const result = await query<{ now: string }>('SELECT NOW()');
  logger.info({ time: result.rows[0].now }, 'Database connection verified');
}
