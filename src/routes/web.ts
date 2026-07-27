import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { config } from '../config/index.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { sendSupportMessage, isEmailEnabled } from '../services/email.js';
import { logger } from '../utils/logger.js';

// Compiles to CommonJS, so __dirname is available natively.
// backend/dist/routes/web.js -> backend/web  (and src/routes -> backend/web in dev)
export const WEB_ROOT = path.resolve(__dirname, '../../web');

export const webRouter = Router();

/** Escape a string for safe embedding inside an HTML attribute or text node. */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── /site-config.js — env-driven front-end config ──────────────────────────
// Static HTML stays cacheable; the environment-specific bits live here.
webRouter.get('/site-config.js', (_req: Request, res: Response): void => {
  const cfg = {
    appStoreUrl: config.web.appStoreUrl || '',
    playStoreUrl: config.web.playStoreUrl || '',
    downloadUrl: config.web.downloadFallbackUrl || '',
    supportEmail: config.web.supportEmail || '',
  };
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(`window.SITE_CONFIG = ${JSON.stringify(cfg)};`);
});

// ── POST /api/support — support form → Resend ──────────────────────────────
const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many messages. Please try again later or email us directly.' } },
});

const supportSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  topic: z.string().trim().max(80).default('General question'),
  message: z.string().trim().min(1).max(4000),
  // Honeypot: real users leave this blank; bots tend to fill every field.
  website: z.string().max(0).optional(),
});

webRouter.post('/api/support', supportLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = supportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    sendError(res, 422, 'VALIDATION_ERROR', 'Please provide your name, a valid email, and a message.');
    return;
  }
  const { name, email, topic, message } = parsed.data;

  if (!isEmailEnabled()) {
    sendError(res, 503, 'EMAIL_DISABLED', `Our contact form isn't available right now. Please email us directly at ${config.web.supportEmail}.`);
    return;
  }

  const result = await sendSupportMessage({ name, email, topic, message });
  if (!result.ok) {
    logger.error({ result }, 'Support message failed to send');
    sendError(res, 502, 'SEND_FAILED', `We couldn't send your message. Please email us directly at ${config.web.supportEmail}.`);
    return;
  }
  sendSuccess(res, { sent: true });
});

// ── GET /l/:kind/:token — smart deep link ──────────────────────────────────
// Tries to open the app via its custom scheme; if that fails (app not installed),
// falls back to the store / download page after a short delay. OG tags make the
// link preview nicely in iMessage etc.
const KIND_MAP: Record<string, { scheme: string; label: string }> = {
  p: { scheme: 'puzzle', label: 'Daily Puzzle' },
  i: { scheme: 'invite', label: 'Challenge' },
};

function fallbackUrl(): string {
  // Prefer a real store; before listings exist, use the download page.
  return (
    config.web.appStoreUrl ||
    config.web.playStoreUrl ||
    config.web.downloadFallbackUrl ||
    '/'
  );
}

webRouter.get('/l/:kind/:token', (req: Request, res: Response): void => {
  const kindKey = String(req.params.kind);
  const kind = KIND_MAP[kindKey];
  const token = String(req.params.token);

  // Validate token shape to keep the reflected value tightly constrained.
  if (!kind || !/^[A-Za-z0-9_-]{1,64}$/.test(token)) {
    res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>Not found</title><p>This link is invalid or has expired.</p>');
    return;
  }

  const appUrl = `${config.web.appScheme}://${kind.scheme}/${token}`;
  const store = fallbackUrl();
  const title = `Dungeon Combat — ${kind.label}`;
  const desc =
    kind.scheme === 'invite'
      ? 'A friend has challenged you to a tactical duel. Tap to accept in Dungeon Combat.'
      : 'Can you solve today\'s puzzle? Tap to play in Dungeon Combat.';

  // Per-response CSP allowing exactly one nonce'd inline script.
  const nonce = crypto.randomBytes(16).toString('base64');
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'`
  );
  res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(config.web.origin)}/assets/icon.png" />
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
webRouter.get('/robots.txt', (_req: Request, res: Response): void => {
  res.type('text/plain').sendFile(path.join(WEB_ROOT, 'robots.txt'));
});

webRouter.get('/sitemap.xml', (_req: Request, res: Response): void => {
  res.type('application/xml').sendFile(path.join(WEB_ROOT, 'sitemap.xml'));
});

// OG card template — owner screenshots at 1200×630 to produce og-image.png.
webRouter.get('/og-template', (_req: Request, res: Response): void => {
  res.type('html').sendFile(path.join(WEB_ROOT, 'og-template.html'));
});

webRouter.get('/.well-known/apple-app-site-association', (_req: Request, res: Response): void => {
  if (!config.web.iosAppId) { res.status(404).end(); return; }
  res.type('application/json').json({
    applinks: {
      apps: [],
      details: [{ appID: config.web.iosAppId, paths: ['/l/*'] }],
    },
  });
});

webRouter.get('/.well-known/assetlinks.json', (_req: Request, res: Response): void => {
  if (!config.web.androidSha256) { res.status(404).end(); return; }
  res.type('application/json').json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.web.androidPackage,
        sha256_cert_fingerprints: [config.web.androidSha256],
      },
    },
  ]);
});

/** Serve the branded 404 page — call this from app.ts AFTER all API routers. */
export function webNotFound(_req: Request, res: Response): void {
  res.status(404).type('html').sendFile(path.join(WEB_ROOT, '404.html'));
}
