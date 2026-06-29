# Tactical Game — Backend

Authoritative Node.js/TypeScript backend for the async tactical strategy game.

## Tech Stack

| Concern | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript 5 |
| Framework | Express 4 |
| Database | PostgreSQL 15+ |
| Auth | JWT (access + refresh token) |
| Push Notifications | Expo Push / FCM / APNs |
| Deployment | Railway |
| Testing | Vitest |
| Logging | Pino |

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or use a free cloud Postgres)

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `DATABASE_URL` — your local Postgres connection string
- `JWT_ACCESS_SECRET` — generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `JWT_REFRESH_SECRET` — generate a second one (must be different)

### 3. Run migrations

```bash
npm run migrate
```

### 4. Seed the database

Populates units, abilities, and status effects.

```bash
npm run seed
```

### 5. Start the dev server

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

Health check: `GET http://localhost:3000/health`

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run all tests |
| `npm run migrate` | Apply pending DB migrations |
| `npm run seed` | Seed game data (units, abilities) |
| `npm run typecheck` | TypeScript check without emitting |
| `npm run lint` | ESLint check |

---

## Project Structure

```
src/
  config/        Environment variable loading and validation
  db/
    migrations/  Numbered SQL migration files
    migrate.ts   Migration runner
    pool.ts      Postgres connection pool
    seed.ts      Seed data for game content
  middleware/
    auth.ts      JWT authentication middleware
    errorHandler.ts  Global error and 404 handling
  routes/
    auth.ts      Register, login, refresh, logout
    users.ts     Profile management
    units.ts     Unit roster for players
    teams.ts     Team CRUD
  services/
    authService.ts   Auth business logic
    userService.ts   User profile logic
    unitService.ts   Unit definition queries
    teamService.ts   Team management logic
  types/
    index.ts     All shared TypeScript types
  utils/
    logger.ts    Pino logger
    response.ts  Consistent API response helpers
  app.ts         Express app setup
  index.ts       Server entry point
tests/           Unit tests (Vitest)
```

---

## API Reference

All responses follow this envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "code": "...", "message": "..." } }
```

### Auth

```
POST /auth/register         { username, email, password }
POST /auth/login            { usernameOrEmail, password }
POST /auth/refresh          { refreshToken }
POST /auth/logout           [auth required]
POST /auth/logout-all       [auth required]
POST /auth/push-token       [auth required] { token, platform }
```

### Users

All require `Authorization: Bearer <accessToken>`.

```
GET  /users/me
PUT  /users/me              { username? }
GET  /users/:id/profile
```

### Units

```
GET  /units                 Returns units unlocked for your account level
```

### Teams

```
GET    /teams
POST   /teams               { name, unitIds: [4 UUIDs] }
PUT    /teams/:id           { name?, unitIds? }
DELETE /teams/:id
```

---

## Adding Content

### Adding a new unit

1. Open `src/db/seed.ts`
2. Add a new entry to the `UNITS` array
3. Add any new abilities to `ABILITIES`
4. Run `npm run seed`

No code changes required — units and abilities are fully data-driven.

### Adding a database migration

1. Create `src/db/migrations/NNNN_description.sql` (next number in sequence)
2. Write SQL
3. Run `npm run migrate`

Migrations are tracked in the `schema_migrations` table and never re-applied.

---

## Deployment (Railway)

1. Push the repo to GitHub
2. Create a new Railway project, connect the repo
3. Railway detects `railway.toml` and builds automatically
4. Add a PostgreSQL plugin in Railway
5. Set all environment variables from `.env.example` in Railway's Variables panel
6. Run migrations: `npm run migrate` via Railway's CLI or shell
7. Run seed: `npm run seed`

---

## Security Notes

- The server is fully authoritative. Clients only send *actions*, never outcomes.
- All game state lives in the `matches.match_state` JSONB column.
- JWT access tokens expire in 15 minutes. Refresh tokens in 30 days.
- Incrementing `token_version` on a user immediately invalidates all their refresh tokens.
- Rate limiting is applied to all auth and API endpoints.
- All inputs are validated with Zod before reaching service code.

---

## Phase Roadmap

- **Phase 1** ✅ Foundation (this)
- **Phase 2** Match engine, turn processor, ability executor
- **Phase 3** Matchmaking, Elo, push notifications
- **Phase 4** Mobile client (React Native / Expo)
- **Phase 5** Polish, account progression, deployment
