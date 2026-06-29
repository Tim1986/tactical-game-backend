"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pool_js_1 = require("./pool.js");
const logger_js_1 = require("../utils/logger.js");
async function runMigrations() {
    await (0, pool_js_1.checkDatabaseConnection)();
    const client = await pool_js_1.pool.connect();
    try {
        // Ensure the migrations tracking table exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
        // Load applied migrations
        const { rows: applied } = await client.query('SELECT filename FROM schema_migrations ORDER BY filename');
        const appliedSet = new Set(applied.map((r) => r.filename));
        // Load all migration files
        // __dirname works fine in CommonJS (which this project compiles to)
        const migrationsDir = path_1.default.join(__dirname, 'migrations');
        const files = fs_1.default
            .readdirSync(migrationsDir)
            .filter((f) => f.endsWith('.sql'))
            .sort();
        let count = 0;
        for (const file of files) {
            if (appliedSet.has(file)) {
                logger_js_1.logger.debug({ file }, 'Migration already applied, skipping');
                continue;
            }
            const filePath = path_1.default.join(migrationsDir, file);
            const sql = fs_1.default.readFileSync(filePath, 'utf8');
            logger_js_1.logger.info({ file }, 'Applying migration');
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
                await client.query('COMMIT');
                count++;
                logger_js_1.logger.info({ file }, 'Migration applied successfully');
            }
            catch (err) {
                await client.query('ROLLBACK');
                logger_js_1.logger.error({ file, err }, 'Migration failed — rolled back');
                throw err;
            }
        }
        if (count === 0) {
            logger_js_1.logger.info('No new migrations to apply');
        }
        else {
            logger_js_1.logger.info({ count }, 'Migrations complete');
        }
    }
    finally {
        client.release();
        await pool_js_1.pool.end();
    }
}
runMigrations().catch((err) => {
    logger_js_1.logger.error({ err }, 'Migration runner failed');
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map