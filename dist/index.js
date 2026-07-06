"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = require("./app.js");
const index_js_1 = require("./config/index.js");
const pool_js_1 = require("./db/pool.js");
const backgroundJobs_js_1 = require("./jobs/backgroundJobs.js");
const logger_js_1 = require("./utils/logger.js");
async function main() {
    await (0, pool_js_1.checkDatabaseConnection)();
    const app = (0, app_js_1.createApp)();
    app.listen(index_js_1.config.port, () => {
        logger_js_1.logger.info({ port: index_js_1.config.port, env: index_js_1.config.nodeEnv }, 'Server started');
        (0, backgroundJobs_js_1.startBackgroundJobs)();
    });
}
main().catch((err) => {
    logger_js_1.logger.error({ err }, 'Failed to start server');
    process.exit(1);
});
//# sourceMappingURL=index.js.map