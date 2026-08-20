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
const version_js_1 = require("./routes/version.js");
const web_js_1 = require("./routes/web.js");
const errorHandler_js_1 = require("./middleware/errorHandler.js");
const versionCheck_js_1 = require("./middleware/versionCheck.js");
const response_js_1 = require("./utils/response.js");
function createApp() {
    const app = (0, express_1.default)();
    app.set('trust proxy', 1);
    // CSP tuned for the marketing site: same-origin scripts, same-origin + Google Fonts
    // styles, self + data images. The /l/ smart-link route overrides this per response
    // with its own nonce'd policy.
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:'],
                connectSrc: ["'self'"],
                baseUri: ["'none'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        // Allow the app icon to be embedded in link previews on other origins.
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // CORS allowlist: only browser-based clients (web) are restricted by this; native iOS/Android apps are unaffected.
    const corsOrigins = ['http://localhost:8081', index_js_1.config.web.origin].filter(Boolean);
    app.use((0, cors_1.default)({ origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version'] }));
    app.use(express_1.default.json({ limit: '100kb' }));
    const authLimiter = (0, express_rate_limit_1.default)({ windowMs: index_js_1.config.rateLimit.auth.windowMs, max: index_js_1.config.rateLimit.auth.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
    const apiLimiter = (0, express_rate_limit_1.default)({ windowMs: index_js_1.config.rateLimit.api.windowMs, max: index_js_1.config.rateLimit.api.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
    app.get('/health', (_req, res) => { (0, response_js_1.sendSuccess)(res, { status: 'ok', timestamp: new Date().toISOString() }); });
    // Public website: dynamic routes (smart links, support, config, association files)
    // first, then static assets from backend/web (serves index.html at '/').
    app.use('/', web_js_1.webRouter);
    app.use(express_1.default.static(web_js_1.WEB_ROOT, { extensions: ['html'], maxAge: '1h' }));
    app.use('/auth', authLimiter, auth_js_1.authRouter);
    app.use('/users', apiLimiter, users_js_1.userRouter);
    app.use('/units', apiLimiter, units_js_1.unitRouter);
    app.use('/teams', apiLimiter, teams_js_1.teamRouter);
    app.use('/matches', apiLimiter, versionCheck_js_1.requireAppVersion, matches_js_1.matchRouter);
    app.use('/matchmaking', apiLimiter, versionCheck_js_1.requireAppVersion, matchmaking_js_1.matchmakingRouter);
    app.use('/challenges', apiLimiter, versionCheck_js_1.requireAppVersion, challenges_js_1.challengeRouter);
    app.use('/achievements', apiLimiter, achievements_js_1.achievementRouter);
    app.use('/leaderboard', apiLimiter, leaderboard_js_1.leaderboardRouter);
    app.use('/version', apiLimiter, version_js_1.versionRouter);
    // API paths get a JSON 404; everything else gets the branded web 404.
    const API_PREFIXES = ['/auth', '/users', '/units', '/teams', '/matches', '/matchmaking', '/challenges', '/achievements', '/leaderboard', '/version'];
    app.use((req, res, next) => {
        if (API_PREFIXES.some(p => req.path.startsWith(p)))
            return (0, errorHandler_js_1.notFoundHandler)(req, res);
        (0, web_js_1.webNotFound)(req, res);
    });
    app.use(errorHandler_js_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map