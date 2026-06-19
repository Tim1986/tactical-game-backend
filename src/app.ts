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
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/response.js';

export function createApp(): express.Application {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  // CORS allowlist: only browser-based clients (web) are restricted by this; native iOS/Android apps are unaffected.
  // Add your production web domain here when you deploy a web build, e.g. 'https://yourapp.com'
  app.use(cors({ origin: ['http://localhost:8081'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '100kb' }));
  const authLimiter = rateLimit({ windowMs: config.rateLimit.auth.windowMs, max: config.rateLimit.auth.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
  const apiLimiter = rateLimit({ windowMs: config.rateLimit.api.windowMs, max: config.rateLimit.api.max, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' } } });
  app.get('/health', (_req: express.Request, res: express.Response) => { sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() }); });
  app.use('/auth', authLimiter, authRouter);
  app.use('/users', apiLimiter, userRouter);
  app.use('/units', apiLimiter, unitRouter);
  app.use('/teams', apiLimiter, teamRouter);
  app.use('/matches', apiLimiter, matchRouter);
  app.use('/matchmaking', apiLimiter, matchmakingRouter);
  app.use('/challenges', apiLimiter, challengeRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
