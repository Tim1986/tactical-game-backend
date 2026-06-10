import dotenv from 'dotenv';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer, got: ${raw}`);
  }
  return parsed;
}

export const config = {
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  port: optionalEnvInt('PORT', 3000),
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',

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
  },
} as const;
