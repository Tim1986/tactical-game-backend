"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.withTransaction = withTransaction;
exports.checkDatabaseConnection = checkDatabaseConnection;
const pg_1 = require("pg");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
// Single shared pool — never create more than one.
exports.pool = new pg_1.Pool({
    connectionString: index_js_1.config.db.url,
    max: 20, // max connections in pool
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});
exports.pool.on('error', (err) => {
    logger_js_1.logger.error({ err }, 'Unexpected error on idle database client');
});
// Convenience wrapper: run a single query from the pool
async function query(text, params) {
    const start = Date.now();
    const result = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    logger_js_1.logger.debug({ query: text, duration, rows: result.rowCount }, 'Executed query');
    return result;
}
// Convenience wrapper: run multiple queries in a transaction
async function withTransaction(fn) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
// Health check — used on startup and by health endpoint
async function checkDatabaseConnection() {
    const result = await query('SELECT NOW()');
    logger_js_1.logger.info({ time: result.rows[0].now }, 'Database connection verified');
}
//# sourceMappingURL=pool.js.map