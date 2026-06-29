"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBackgroundJobs = startBackgroundJobs;
const node_cron_1 = __importDefault(require("node-cron"));
const matchmakingService_js_1 = require("../services/matchmakingService.js");
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
function startBackgroundJobs() {
    const matchmakingIntervalMs = index_js_1.config.game.matchmakingIntervalSeconds * 1000;
    const matchmakingJob = setInterval(() => {
        (0, matchmakingService_js_1.runMatchmakingJob)().catch((err) => { logger_js_1.logger.error({ err }, 'Matchmaking job failed'); });
    }, matchmakingIntervalMs);
    logger_js_1.logger.info({ intervalSeconds: index_js_1.config.game.matchmakingIntervalSeconds }, 'Matchmaking job started');
    node_cron_1.default.schedule('*/5 * * * *', () => {
        (0, matchmakingService_js_1.runDeadlineEnforcer)().catch((err) => { logger_js_1.logger.error({ err }, 'Deadline enforcer job failed'); });
    });
    logger_js_1.logger.info('Deadline enforcer started (every 5 minutes)');
    process.on('SIGTERM', () => { clearInterval(matchmakingJob); logger_js_1.logger.info('Background jobs stopped'); });
    process.on('SIGINT', () => { clearInterval(matchmakingJob); logger_js_1.logger.info('Background jobs stopped'); });
}
//# sourceMappingURL=backgroundJobs.js.map