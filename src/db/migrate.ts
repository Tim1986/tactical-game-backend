/**
 * Simple migration runner.
 *
 * Migrations live in src/db/migrations/ as numbered SQL files:
 *   0001_initial_schema.sql
 *   0002_add_cosmetics.sql
 *   ...
 *
 * Run with: npm run migrate
 *
 * The migrations table tracks which files have already been applied.
 * Safe to run multiple times — already-applied migrations are skipped.
 */

import fs from 'fs';
import path from 'path';
import { pool, checkDatabaseConnection } from './pool.js';
import { logger } from '../utils/logger.js';

async function runMigrations(): Promise<void> {
  await checkDatabaseConnection();

  const client = await pool.connect();

  try {
    // Ensure the migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Load applied migrations
    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    // Load all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f: string) => f.endsWith('.sql'))
      .sort();

    let count = 0;

    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.debug({ file }, 'Migration already applied, skipping');
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      logger.info({ file }, 'Applying migration');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        count++;
        logger.info({ file }, 'Migration applied successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ file, err }, 'Migration failed — rolled back');
        throw err;
      }
    }

    if (count === 0) {
      logger.info('No new migrations to apply');
    } else {
      logger.info({ count }, 'Migrations complete');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  logger.error({ err }, 'Migration runner failed');
  process.exit(1);
});
