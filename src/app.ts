import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/users.js';
import { unitRouter } from './routes/units.js';
import { teamRouter } from './routes/teams.js';
import { matchRouter } from './routes/matches.js';
import { matchmakingRouter } from './routes/matchmaking.js';
import { challengeRouter } from './routes/challenges.js';
import { achievementRouter } from './routes/achievements.js';
import { puzzleRouter } from './routes/puzzles.js';
import { leaderboardRouter } from './routes/leaderboard.js';
import { versionRouter } from './routes/version.js';
import { webRouter, WEB_ROOT, webNotFound } from './routes/web.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requireAppVersion } from './middleware/versionCheck.js';
import { sendSuccess } from './utils/response.js';

export function createApp(): express.Application {
  const app = express();
  app.set('trust proxy', 1);
  // CSP tuned for the marketing site: same-origin scripts, same-origin + Google Fonts
  // styles, self + data images. The /l/ smart-link route overrides this per response
  // with its own nonce'd policy.
  app.use(
    helmet({
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
    })
  );
  // CORS allowlist: only browser-based clients (web) are restricted by this; native iOS/Android apps are unaffected.
  const corsOrigins = ['http://localhost:8081', config.web.origin].filter(Boolean);
  app.use(cors({ origin: corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-App-Version'] }));
  app.use(express.json({ limit: '100kb' }));
  const authLimiter = rateLimit({ windowMs: config.rateLimit.auth.windowMs, max: config.rateLimit.auth.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
  const apiLimiter = rateLimit({ windowMs: config.rateLimit.api.windowMs, max: config.rateLimit.api.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
  app.get('/health', (_req: express.Request, res: express.Response) => { sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }); });

  // Public website: dynamic routes (smart links, support, config, association files)
  // first, then static assets from backend/web (serves index.html at '/').
  app.use('/', webRouter);
  app.use(express.static(WEB_ROOT, { extensions: ['html'], maxAge: '1h' }));

  app.use('/auth', authLimiter, authRouter);
  app.use('/users', apiLimiter, userRouter);
  app.use('/units', apiLimiter, unitRouter);
  app.use('/teams', apiLimiter, teamRouter);
  app.use('/matches', apiLimiter, requireAppVersion, matchRouter);
  app.use('/matchmaking', apiLimiter, requireAppVersion, matchmakingRouter);
  app.use('/challenges', apiLimiter, requireAppVersion, challengeRouter);
  app.use('/achievements', apiLimiter, achievementRouter);
  // No requireAppVersion: puzzle progress is a personal record, and an outdated
  // client must not silently lose a streak while waiting to update.
  app.use('/puzzles', apiLimiter, puzzleRouter);
  app.use('/leaderboard', apiLimiter, leaderboardRouter);
  app.use('/version', apiLimiter, versionRouter);
  // API paths get a JSON 404; everything else gets the branded web 404.
  const API_PREFIXES = ['/auth', '/users', '/units', '/teams', '/matches', '/matchmaking', '/challenges', '/achievements', '/leaderboard', '/version'];
  app.use((req, res, next) => {
    if (API_PREFIXES.some(p => req.path.startsWith(p))) return notFoundHandler(req, res);
    webNotFound(req, res);
  });
  app.use(errorHandler);
  return app;
}
