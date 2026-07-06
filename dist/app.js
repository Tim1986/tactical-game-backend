"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("./config/index.js");
const auth_js_1 = require("./routes/auth.js");
const users_js_1 = require("./routes/users.js");
const units_js_1 = require("./routes/units.js");
const teams_js_1 = require("./routes/teams.js");
const matches_js_1 = require("./routes/matches.js");
const matchmaking_js_1 = require("./routes/matchmaking.js");
const challenges_js_1 = require("./routes/challenges.js");
const achievements_js_1 = require("./routes/achievements.js");
const leaderboard_js_1 = require("./routes/leaderboard.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const response_js_1 = require("./utils/response.js");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    app.use((0, helmet_1.default)());
    // CORS allowlist: only browser-based clients (web) are restricted by this; native iOS/Android apps are unaffected.
    // Add your production web domain here when you deploy a web build, e.g. 'https://yourapp.com'
    app.use((0, cors_1.default)({ origin: ['http://localhost:8081'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
    app.use(express_1.default.json({ limit: '100kb' }));
    const authLimiter = (0, express_rate_limit_1.default)({ windowMs: index_js_1.config.rateLimit.auth.windowMs, max: index_js_1.config.rateLimit.auth.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
    const apiLimiter = (0, express_rate_limit_1.default)({ windowMs: index_js_1.config.rateLimit.api.windowMs, max: index_js_1.config.rateLimit.api.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
    app.get('/health', (_req, res) => { (0, response_js_1.sendSuccess)(res, { status: 'ok', timestamp: new Date().toISOString() }); });
    app.use('/auth', authLimiter, auth_js_1.authRouter);
    app.use('/users', apiLimiter, users_js_1.userRouter);
    app.use('/units', apiLimiter, units_js_1.unitRouter);
    app.use('/teams', apiLimiter, teams_js_1.teamRouter);
    app.use('/matches', apiLimiter, matches_js_1.matchRouter);
    app.use('/matchmaking', apiLimiter, matchmaking_js_1.matchmakingRouter);
    app.use('/challenges', apiLimiter, challenges_js_1.challengeRouter);
    app.use('/achievements', apiLimiter, achievements_js_1.achievementRouter);
    app.use('/leaderboard', apiLimiter, leaderboard_js_1.leaderboardRouter);
    app.use(errorHandler_js_1.notFoundHandler);
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map