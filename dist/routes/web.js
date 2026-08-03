"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webRouter = exports.WEB_ROOT = void 0;
exports.webNotFound = webNotFound;
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_path_1 = __importDefault(require("node:path"));
const zod_1 = require("zod");
const index_js_1 = require("../config/index.js");
const response_js_1 = require("../utils/response.js");
const email_js_1 = require("../services/email.js");
const logger_js_1 = require("../utils/logger.js");
// Compiles to CommonJS, so __dirname is available natively.
// backend/dist/routes/web.js -> backend/web  (and src/routes -> backend/web in dev)
exports.WEB_ROOT = node_path_1.default.resolve(__dirname, '../../web');
exports.webRouter = (0, express_1.Router)();
/** Escape a string for safe embedding inside an HTML attribute or text node. */
function esc(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// ── /site-config.js — env-driven front-end config ──────────────────────────
// Static HTML stays cacheable; the environment-specific bits live here.
exports.webRouter.get('/site-config.js', (_req, res) => {
    const cfg = {
        appStoreUrl: index_js_1.config.web.appStoreUrl || '',
        playStoreUrl: index_js_1.config.web.playStoreUrl || '',
        downloadUrl: index_js_1.config.web.downloadFallbackUrl || '',
        supportEmail: index_js_1.config.web.supportEmail || '',
    };
    res.type('application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(`window.SITE_CONFIG = ${JSON.stringify(cfg)};`);
});
// ── POST /api/support — support form → Resend ──────────────────────────────
const supportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many messages. Please try again later or email us directly.' } },
});
const supportSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(120),
    email: zod_1.z.string().trim().email().max(200),
    topic: zod_1.z.string().trim().max(80).default('General question'),
    message: zod_1.z.string().trim().min(1).max(4000),
    // Honeypot: real users leave this blank; bots tend to fill every field.
    website: zod_1.z.string().max(0).optional(),
});
exports.webRouter.post('/api/support', supportLimiter, async (req, res) => {
    const parsed = supportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        (0, response_js_1.sendError)(res, 422, 'VALIDATION_ERROR', 'Please provide your name, a valid email, and a message.');
        return;
    }
    const { name, email, topic, message } = parsed.data;
    if (!(0, email_js_1.isEmailEnabled)()) {
        (0, response_js_1.sendError)(res, 503, 'EMAIL_DISABLED', `Our contact form isn't available right now. Please email us directly at ${index_js_1.config.web.supportEmail}.`);
        return;
    }
    const result = await (0, email_js_1.sendSupportMessage)({ name, email, topic, message });
    if (!result.ok) {
        logger_js_1.logger.error({ result }, 'Support message failed to send');
        (0, response_js_1.sendError)(res, 502, 'SEND_FAILED', `We couldn't send your message. Please email us directly at ${index_js_1.config.web.supportEmail}.`);
        return;
    }
    (0, response_js_1.sendSuccess)(res, { sent: true });
});
// ── GET /l/:kind/:token — smart deep link ──────────────────────────────────
// Tries to open the app via its custom scheme; if that fails (app not installed),
// falls back to the store / download page after a short delay. OG tags make the
// link preview nicely in iMessage etc.
const KIND_MAP = {
    p: { scheme: 'puzzle', label: 'Daily Puzzle' },
    i: { scheme: 'invite', label: 'Challenge' },
};
function fallbackUrl() {
    // Prefer a real store; before listings exist, use the download page.
    return (index_js_1.config.web.appStoreUrl ||
        index_js_1.config.web.playStoreUrl ||
        index_js_1.config.web.downloadFallbackUrl ||
        '/');
}
exports.webRouter.get('/l/:kind/:token', (req, res) => {
    const kindKey = String(req.params.kind);
    const kind = KIND_MAP[kindKey];
    const token = String(req.params.token);
    // Validate token shape to keep the reflected value tightly constrained.
    if (!kind || !/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
        res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>Not found</title><p>This link is invalid or has expired.</p>');
        return;
    }
    const appUrl = `${index_js_1.config.web.appScheme}://${kind.scheme}/${token}`;
    const store = fallbackUrl();
    const title = `Dungeon Combat — ${kind.label}`;
    const desc = kind.scheme === 'invite'
        ? 'A friend has challenged you to a tactical duel. Tap to accept in Dungeon Combat.'
        : 'Can you solve today\'s puzzle? Tap to play in Dungeon Combat.';
    // Per-response CSP allowing exactly one nonce'd inline script.
    const nonce = node_crypto_1.default.randomBytes(16).toString('base64');
    res.setHeader('Content-Security-Policy', `default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'`);
    const isInvite = kind.scheme === 'invite';
    const inviteCodeHtml = isInvite
        ? `<div style="margin:16px 0;padding:12px 20px;background:#e9dcb4;border:1px solid #cdbb8a;border-radius:8px;font-family:monospace;font-size:22px;letter-spacing:3px;color:#2e2013">${esc(token)}</div>
       <p style="font-size:13px;color:#7a6c50">Already installed? Open the app and tap <strong>Have an invite code?</strong> on the home screen, then enter the code above.</p>`
        : '';
    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(index_js_1.config.web.origin)}/assets/icon.png" />
<meta name="description" content="${esc(desc)}" />
<link rel="icon" href="/assets/favicon.png" />
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f1e7c9;
         color:#2e2013; font-family:Georgia,serif; text-align:center; padding:24px; }
  .box { max-width:420px; }
  img { width:96px; height:96px; border-radius:22%; box-shadow:0 10px 30px rgba(46,32,19,.25); }
  h1 { font-size:24px; margin:22px 0 6px; }
  p { color:#7a6c50; }
  a.btn { display:inline-block; margin-top:18px; padding:13px 26px; border-radius:6px;
          background:#b8892e; color:#2e2013; border:1px solid #8a6a1f; font-weight:bold;
          text-decoration:none; }
</style>
</head>
<body>
<div class="box">
  <img src="/assets/icon.png" alt="Dungeon Combat" />
  <h1>${esc(title)}</h1>
  ${inviteCodeHtml}
  <p id="msg">Opening Dungeon Combat…</p>
  <a class="btn" id="fallback" href="${esc(store)}">Get the Game</a>
</div>
<script nonce="${nonce}">
(function () {
  var appUrl = ${JSON.stringify(appUrl)};
  var store = ${JSON.stringify(store)};
  var opened = false;
  function markHidden(){ opened = true; }
  document.addEventListener('visibilitychange', function(){ if (document.hidden) markHidden(); });
  window.addEventListener('pagehide', markHidden);
  // Try to open the app.
  window.location = appUrl;
  // If we're still here after a moment, the app isn't installed.
  setTimeout(function () {
    if (!opened) {
      document.getElementById('msg').textContent = 'Don\\'t have the app yet? Download it to continue.';
      if (store && store !== '/') window.location = store;
    }
  }, 1600);
})();
</script>
</body>
</html>`);
});
// ── Universal Links / App Links association files ──────────────────────────
// Served only when the corresponding env values are set; otherwise 404 so the
// platforms treat the domain as not-yet-associated (safe default).
// ── Static SEO / crawl files ─────────────────────────────────────────────────
exports.webRouter.get('/robots.txt', (_req, res) => {
    res.type('text/plain').sendFile(node_path_1.default.join(exports.WEB_ROOT, 'robots.txt'));
});
exports.webRouter.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml').sendFile(node_path_1.default.join(exports.WEB_ROOT, 'sitemap.xml'));
});
// OG card template — owner screenshots at 1200×630 to produce og-image.png.
exports.webRouter.get('/og-template', (_req, res) => {
    res.type('html').sendFile(node_path_1.default.join(exports.WEB_ROOT, 'og-template.html'));
});
exports.webRouter.get('/.well-known/apple-app-site-association', (_req, res) => {
    if (!index_js_1.config.web.iosAppId) {
        res.status(404).end();
        return;
    }
    res.type('application/json').json({
        applinks: {
            apps: [],
            details: [{ appID: index_js_1.config.web.iosAppId, paths: ['/l/*'] }],
        },
    });
});
exports.webRouter.get('/.well-known/assetlinks.json', (_req, res) => {
    if (!index_js_1.config.web.androidSha256) {
        res.status(404).end();
        return;
    }
    res.type('application/json').json([
        {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
                namespace: 'android_app',
                package_name: index_js_1.config.web.androidPackage,
                sha256_cert_fingerprints: [index_js_1.config.web.androidSha256],
            },
        },
    ]);
});
/** Serve the branded 404 page — call this from app.ts AFTER all API routers. */
function webNotFound(_req, res) {
    res.status(404).type('html').sendFile(node_path_1.default.join(exports.WEB_ROOT, '404.html'));
}
//# sourceMappingURL=web.js.map