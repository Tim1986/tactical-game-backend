# Website — Dungeon Combat (dungeoncombat.org)

The public site lives in `backend/web/` and is served by the Express backend on the same
origin as the API and smart links. Built 2026-07-24. This doc tracks what's done and the
remaining steps.

## What exists

**Static site** (`backend/web/`): `index.html` (landing), `support.html` (contact form),
`privacy.html`, `terms.html`, `styles.css`, `site.js`, `assets/` (icon, favicon).
Parchment/gold branding mirrors `mobile/src/components/theme.ts` (Cinzel/Spectral).

**Backend** (`backend/src/`):
- `routes/web.ts` — `GET /site-config.js` (env → `window.SITE_CONFIG`), `POST /api/support`
  (rate-limited + honeypot → Resend), `GET /l/:kind/:token` smart link (`p`=puzzle,
  `i`=invite), `.well-known/apple-app-site-association` + `assetlinks.json` (404 until env set).
- `services/email.ts` — Resend via REST/fetch, disabled gracefully with no API key.
- `config/index.ts` `web` + `email` blocks; `.env.example` documents every key.
- `app.ts` — helmet CSP for Google Fonts, web router + static mounted before API routers,
  `WEB_ORIGIN` in CORS.

Domain confirmed: **dungeoncombat.org** (baked into config defaults / `.env.example`).

---

## Next steps

### 1. Infrastructure / deploy
- [ ] Decide hosting: run the backend (which now serves the site) behind
      `https://dungeoncombat.org`. Confirm the host terminates TLS (Let's Encrypt / platform cert).
- [ ] DNS: point `dungeoncombat.org` (and `www` → apex redirect) at the backend host.
- [ ] Set production env: `WEB_ORIGIN=https://dungeoncombat.org`, `NODE_ENV=production`.
- [ ] Verify `/health`, `/`, `/styles.css`, `/assets/icon.png`, `/site-config.js` all serve
      over https.
- [ ] Decide whether the API should move to `api.dungeoncombat.org` (cleaner) or stay on the
      same origin under path prefixes (current setup). If split, update mobile API base URL
      and CORS.

### 2. Email (Resend)
- [ ] Create Resend account; add and verify the `dungeoncombat.org` domain (SPF/DKIM DNS records).
- [ ] Set `RESEND_API_KEY`, `MAIL_FROM=Dungeon Combat <no-reply@dungeoncombat.org>`,
      `SUPPORT_EMAIL=support@dungeoncombat.org`, `SUPPORT_INBOX=…`.
- [ ] Set up the `support@dungeoncombat.org` inbox (mailbox or forwarding).
- [ ] Test: submit the support form in prod → confirm mail arrives with reply-to = sender.
- [ ] Consider an autoresponder ("we got your message") — optional.

### 3. Store presence
- [ ] When the App Store / Play listings are live, set `APP_STORE_URL` / `PLAY_STORE_URL`
      (badges flip from "Coming soon" to live; smart links prefer the store).
- [ ] Until then, set `DOWNLOAD_FALLBACK_URL` to a TestFlight / APK / waitlist page so smart
      links and badges have somewhere to go.
- [ ] Link the store listings' Support URL → `https://dungeoncombat.org/support.html` and
      Privacy URL → `https://dungeoncombat.org/privacy.html` (both stores require these).

### 4. Universal Links / App Links (upgrade — skip the redirect page)
- [ ] iOS: set `IOS_APP_ID` = `<TEAMID>.com.dungeoncombat.app`; add `associatedDomains`
      (`applinks:dungeoncombat.org`) to `mobile/app.json`; rebuild.
- [ ] Android: set `ANDROID_SHA256_FINGERPRINT` (Play Console release signing cert); add
      `intentFilters` for `dungeoncombat.org` to `app.json`; rebuild.
- [ ] Verify `.well-known/apple-app-site-association` (no extension, `application/json`, no
      redirect) and `assetlinks.json` resolve over https.
- [ ] Test a `/l/i/<token>` link on a real installed device → opens app directly, no bounce page.

### 5. Invite claim flow — Part C (still unbuilt; see PUZZLES_AND_INVITES.md)
The smart-link *page* (Part A) is done; the backend token flow is not.
- [ ] `challenge_invites` table + migration (token, challenger, team, status, expiry, claimed_by).
- [ ] `POST /challenges/invite` (create open token, returns `/l/i/<token>` URL), rate-limited 20/day.
- [ ] `GET /challenges/invite/:token`, `POST /challenges/invite/:token/claim` (atomic, first-claimer,
      reject self-claim, reuse `acceptChallenge` match-creation path).
- [ ] Mobile `app/invite/[token].tsx` screen + "Have an invite code?" home entry (deferred deep link).
- [ ] Fold invite acceptance into `GET /challenges` `sent` list so challenger polling surfaces it.
- [ ] Tests: claim races, expiry/claimed/self-claim paths.

### 6. Polish / nice-to-haves
- [ ] Branded 404 page (currently unmatched paths hit the JSON `notFoundHandler`).
- [ ] Real screenshots on the landing page instead of just the icon (use the store screenshots
      from STORE_METADATA.md once captured).
- [ ] OG/Twitter preview image (a proper 1200×630 card, not just the square icon).
- [ ] `robots.txt` + `sitemap.xml`.
- [ ] Analytics (privacy-friendly, e.g. Plausible) — optional, update privacy.html if added.
- [ ] Legal review pass of privacy.html / terms.html before store submission.
- [ ] Accessibility spot-check (contrast, focus states, alt text).

---

## Config quick-reference
All keys documented in `backend/.env.example`. The site works with none set (localhost,
"Coming soon" badges, contact form disabled with a friendly fallback), so nothing here
blocks local dev.
