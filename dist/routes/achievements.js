"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.achievementRouter = void 0;
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
const achievementService_js_1 = require("../services/achievementService.js");
exports.achievementRouter = (0, express_1.Router)();
exports.achievementRouter.use(auth_js_1.requireAuth);
// GET /achievements/me — all achievements, unlocked and locked
exports.achievementRouter.get('/me', async (req, res) => {
    const achievements = await (0, achievementService_js_1.getAchievementsForUser)(req.user.id);
    (0, response_js_1.sendSuccess)(res, { achievements });
});
// POST /achievements/pending — drain unshown achievement notifications
// Client calls this after a match ends. Returns newly unlocked achievements
// and marks them as notified so they won't appear again.
exports.achievementRouter.post('/pending', async (req, res) => {
    const pending = await (0, achievementService_js_1.drainPendingAchievements)(req.user.id);
    (0, response_js_1.sendSuccess)(res, { achievements: pending });
});
//# sourceMappingURL=achievements.js.map