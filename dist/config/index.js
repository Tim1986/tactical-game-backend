"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
dotenv_1.default.config();
// Build stamp written by scripts/stamp-build.mjs at deploy time (see the
// `deploy` npm script). Absent in dev/tests — falls back gracefully so
// GET /version still responds.
function loadBuildInfo() {
    try {
        const raw = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), 'buildInfo.json'), 'utf8');
        const p = JSON.parse(raw);
        return {
            commit: String(p.commit ?? 'unknown'),
            commitFull: String(p.commitFull ?? 'unknown'),
            branch: String(p.branch ?? 'unknown'),
            dirty: Boolean(p.dirty),
            builtAt: p.builtAt ?? null,
        };
    }
    catch {
        return { commit: 'dev', commitFull: 'dev', branch: 'dev', dirty: false, builtAt: null };
    }
}
function requireEnv(key) {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}
function optionalEnv(key, fallback) {
    return process.env[key] ?? fallback;
}
function optionalEnvInt(key, fallback) {
    const raw = process.env[key];
    if (!raw)
        return fallback;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
    }
    return parsed;
}
exports.config = {
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    port: optionalEnvInt('PORT', 3000),
    isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
    build: loadBuildInfo(),
    db: {
        url: requireEnv('DATABASE_URL'),
    },
    jwt: {
        accessSecret: requireEnv('JWT_ACCESS_SECRET'),
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        accessExpiry: optionalEnv('JWT_ACCESS_EXPIRY', '15m'),
        refreshExpiry: optionalEnv('JWT_REFRESH_EXPIRY', '30d'),
    },
    expo: {
        accessToken: optionalEnv('EXPO_ACCESS_TOKEN', ''),
    },
    rateLimit: {
        auth: {
            max: optionalEnvInt('RATE_LIMIT_AUTH_MAX', 20),
            windowMs: optionalEnvInt('RATE_LIMIT_AUTH_WINDOW_MS', 900_000),
        },
        api: {
            max: optionalEnvInt('RATE_LIMIT_API_MAX', 300),
            windowMs: optionalEnvInt('RATE_LIMIT_API_WINDOW_MS', 60_000),
        },
    },
    game: {
        turnDeadlineHours: optionalEnvInt('TURN_DEADLINE_HOURS', 72),
        matchmakingIntervalSeconds: optionalEnvInt('MATCHMAKING_INTERVAL_SECONDS', 30),
        matchmakingInitialRange: optionalEnvInt('MATCHMAKING_INITIAL_RANGE', 100),
        matchmakingRangeIncrement: optionalEnvInt('MATCHMAKING_RANGE_INCREMENT', 25),
        // If set, all gameplay routes reject clients not on this exact version (426).
        // Leave unset in dev to skip the gate.
        requiredAppVersion: process.env.REQUIRED_APP_VERSION ?? null,
    },
    // Public website + smart links + support email. See .env.example for setup.
    web: {
        // Canonical https origin the site is served from, e.g. https://dungeoncombat.org
        // Used for OG tags and CORS. No trailing slash.
        origin: optionalEnv('WEB_ORIGIN', 'http://localhost:3000'),
        // Store listing URLs. Empty until the listings are live — the site then
        // shows "Coming soon" badges and smart links fall back to DOWNLOAD_FALLBACK_URL.
        appStoreUrl: optionalEnv('APP_STORE_URL', ''),
        playStoreUrl: optionalEnv('PLAY_STORE_URL', ''),
        // Where /l/ smart links send visitors who don't have the app (and, before store
        // listings exist, where the store badges won't point). e.g. a TestFlight/APK page.
        downloadFallbackUrl: optionalEnv('DOWNLOAD_FALLBACK_URL', ''),
        // Custom scheme for app deep links (matches mobile app.json "scheme").
        appScheme: optionalEnv('APP_SCHEME', 'dungeoncombat'),
        // Support inbox shown on the site and used as the reply-to for support mail.
        supportEmail: optionalEnv('SUPPORT_EMAIL', 'support@example.com'),
        // Universal-links / App-Links association values (optional; enable later).
        iosAppId: optionalEnv('IOS_APP_ID', ''), // "<TEAMID>.<bundleId>"
        androidPackage: optionalEnv('ANDROID_PACKAGE', 'com.dungeoncombat.app'),
        androidSha256: optionalEnv('ANDROID_SHA256_FINGERPRINT', ''), // colon-separated hex
    },
    email: {
        // Resend API key (https://resend.com). Empty => support mail is disabled and the
        // /api/support endpoint returns a friendly "email us directly" error.
        resendApiKey: optionalEnv('RESEND_API_KEY', ''),
        // Verified sender the support form mail is sent FROM (must be on a Resend-verified
        // domain), e.g. "Dungeon Combat <no-reply@dungeoncombat.org>".
        fromAddress: optionalEnv('MAIL_FROM', 'Dungeon Combat <no-reply@example.com>'),
        // Inbox that receives support submissions (defaults to SUPPORT_EMAIL).
        supportInbox: optionalEnv('SUPPORT_INBOX', process.env.SUPPORT_EMAIL ?? 'support@example.com'),
    },
};
//# sourceMappingURL=index.js.map