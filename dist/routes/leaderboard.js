"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaderboardRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
const leaderboardService_js_1 = require("../services/leaderboardService.js");
exports.leaderboardRouter = (0, express_1.Router)();
exports.leaderboardRouter.use(auth_js_1.requireAuth);
// GET /leaderboard — current top 10
exports.leaderboardRouter.get('/', async (_req, res) => {
    const entries = await (0, leaderboardService_js_1.getLeaderboard)();
    (0, response_js_1.sendSuccess)(res, { leaderboard: entries });
});
// POST /leaderboard/refresh — trigger manual snapshot (admin use / cron)
exports.leaderboardRouter.post('/refresh', async (_req, res) => {
    await (0, leaderboardService_js_1.refreshLeaderboardSnapshot)();
    (0, response_js_1.sendSuccess)(res, { refreshed: true });
});
//# sourceMappingURL=leaderboard.js.map