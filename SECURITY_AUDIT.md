# Security Audit — Dungeon Combat (C11)

Manual security pass over both repos (`backend/`, `mobile/`), 2026-07-26, Opus.
Focus per GAMEPLAN C11: auth flows, the new account-deletion + invite endpoints
(IDOR / race / enumeration), rate-limit coverage, zod coverage, secrets handling,
dependency audit.

**Bottom line:** the codebase is in good security shape. One real
misconfiguration risk was found and fixed (dev-login exposable in prod). The
remaining dependency-audit items are deep transitive, build-time-only, and not
reachable at runtime — listed for the owner to schedule.

---

## 1. Fixed in this pass (committed)

### 1a. HIGH — passwordless `dev-login` could be live in production
`/auth/dev-login` (no password; upserts a shared `claude_test` account and returns
valid tokens) is gated by `config.isDevelopment`. But
`isDevelopment = optionalEnv('NODE_ENV', 'development') === 'development'` **defaults to
`development` when `NODE_ENV` is unset**, and the `Dockerfile` never set `NODE_ENV`. So a
Railway deploy without `NODE_ENV=production` in its dashboard would expose an
unauthenticated login endpoint (and run debug/pretty logging).

**Fix (committed):**
- `Dockerfile`: added `ENV NODE_ENV=production`. The image is production-only (local dev
  runs `npm run dev` via `tsx watch`, which is unaffected), so this closes the hole
  regardless of dashboard config.
- `src/index.ts`: added a startup tripwire that logs a loud `⚠️ DEV MODE` warning if
  `isDevelopment` is ever true at boot — so a future misconfig is visible in logs.

**Owner action:** confirm Railway doesn't *override* `NODE_ENV` to something else, and
redeploy so the fix takes effect. After deploy, `POST /auth/dev-login` should return 404.

### 1b. Dependency audit — safe fixes applied
Ran `npm audit fix` (non-breaking only). Resolved the shallow runtime advisories
(body-parser DoS, postcss). `package.json` ranges untouched; only `package-lock.json`
resolutions changed. Full suite (272 tests), `tsc`, and `npm run build` all green after.

---

## 2. Verified clean (no change needed)

**Auth (`authService`, `middleware/auth`):**
- Passwords + reset codes hashed with **bcrypt cost 12**.
- `requireAuth` verifies JWT signature and handles expiry; sets only `{id, username}`.
- Login returns generic **"Invalid credentials"** for both unknown user and bad password
  → no username enumeration.
- `forgot-password` **always returns 200** ("never reveals whether the email has an
  account") — no enumeration. Reset codes are hashed, 6-digit, attempt-limited, expiring.
- Password changes bump `token_version` → invalidates existing refresh tokens.
- Registration validation: username 3–20 `[a-zA-Z0-9_]`, email format, password 8–128.

**Invite endpoints (`challengeService`, `routes/challenges`)** — the new attack surface:
- **IDOR:** both `createInvite` and `claimInvite` verify team ownership
  (`WHERE id=$1 AND user_id=$2 AND is_active`). You cannot invite/claim with a team you
  don't own.
- **Race:** `claimInvite` selects `FOR UPDATE` inside a transaction — first claimer wins
  atomically; later claimers get a friendly "already claimed".
- **Self-claim** rejected (`challenger_id === claimerId`).
- **Expiry** enforced on both read and claim; expired/claimed render friendly states.
- **Enumeration:** tokens are 12 url-safe chars from `crypto.randomBytes(9)` (~72 bits) —
  infeasible to guess. `getInviteInfo` leaks only `challengerUsername/status/expiresAt`
  (no PII, no IDs). Whole router is auth-gated + creation rate-limited (20/day/user).

**Account deletion (`userService.deleteAccount`, `routes/users`):**
- Re-verifies password via `bcrypt.compare`; acts on `req.user.id` only (own account).
- Rate-limited like an auth route. Soft-deletes and scrambles username/email/password
  with a dead hash (frees identifiers, destroys credentials).

**Input validation:** every body-taking route uses a zod schema with `safeParse`
(auth, users, teams, challenges, invites, matches, matchmaking, push tokens). The
`routeSchemaConformance` test guards the turn schema against engine drift.

**Global (`app.ts`):** `helmet`, CORS **allowlist** (localhost + web origin only),
`express.json({ limit: '100kb' })`, `trust proxy 1` (correct rate-limit keying behind
Railway's proxy), auth limiter on `/auth`, api limiter on all API routers.

**SQL:** all queries are parameterized (`$1,$2,…`). Grep for template-literal SQL with
interpolation found **none** — no injection surface.

**Secrets:** JWT secrets are `requireEnv` (boot fails if missing) — no hardcoded
fallback. No secrets/API keys/tokens hardcoded in the mobile client (grep clean); the app
stores tokens via `expo-secure-store` (native) / `localStorage` (web).

---

## 3. Owner action items (needs a decision or an owner-only surface)

1. **Confirm `NODE_ENV=production` on Railway** and redeploy (see §1a). *Highest priority.*
2. **Deep transitive vulns needing `--force` (breaking) — all build-time / not
   runtime-reachable. Schedule post-launch; none block ship:**
   - **`tar` (critical)** ← `bcrypt` → `@mapbox/node-pre-gyp` (native build tooling). The
     app never parses user-supplied tar archives, so the path-traversal/DoS advisories
     aren't reachable in the request path. *Cleanest long-term fix: migrate `bcrypt` →
     `bcryptjs` (pure-JS, drops node-gyp/node-pre-gyp/tar entirely) — a small, well-tested
     swap. Do it post-launch with a full test run.*
   - **`brace-expansion` (high)** ← `glob`. Pathological-pattern DoS; glob patterns here
     are code-defined (static file serving), not user input.
   - **`uuid` <11.1.1 (moderate)** ← `node-cron`. Buffer bounds check on a code path the
     app doesn't use with attacker input. Needs a `node-cron` major bump.
3. **Minor efficiency (not a vuln):** `getInviteInfo` runs an *unbounded global*
   `UPDATE … SET status='expired'` on **every** GET. Move stale-invite expiry into the
   existing background job (`startBackgroundJobs`) and drop it from the read path.
4. **Note:** `GET /challenges/invite/:token` sits behind `requireAppVersion` (the whole
   challenge router). An invite recipient on an outdated app build could be version-blocked
   before seeing the invite. Not a security issue — a UX edge case to keep in mind.

---

## 4. Using `/security-review` going forward

There is **no "security plugin" to install** — Claude Code ships a built-in
**`/security-review`** slash command that reviews the *pending diff on your current
branch*. Recommended workflow: before merging any significant backend change
(new endpoint, auth/session logic, SQL, dependency bump), run `/security-review` on the
branch and address anything it flags. It complements this manual pass; it doesn't replace
periodic `npm audit` on the dependency tree.
