// THE ONE COMMAND to put backend code into production. It is the ONLY path you
// should ever use — do not deploy from the Railway dashboard and do not change
// Railway variables (like REQUIRED_APP_VERSION) by hand, because a dashboard
// variable change makes Railway REDEPLOY A CACHED OLD IMAGE without rebuilding
// — that is the "stale code" bug that has bitten us repeatedly.
//
//   npm run ship                    # deploy current commit
//   npm run ship -- --gate 1.0.47   # deploy AND set the client version gate atomically
//
// Guarantees, or it exits non-zero and yells:
//   1) Forces a CLEAN rebuild (CACHE_BUST = commit SHA, unique every deploy).
//   2) Sets every Railway var with --skip-deploys so only OUR build deploys.
//   3) VERIFIES the live server reports our exact commit.
//   4) SETTLE re-check: waits, then verifies it STAYED our commit (catches
//      Railway/GitHub auto-reverting to a stale image).
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = (process.env.BACKEND_URL ?? 'https://tactical-game-backend-production.up.railway.app').replace(/\/$/, '');
const VERIFY_TIMEOUT_MS = 10 * 60 * 1000;   // patience for a build that is PROGRESSING
const STUCK_TIMEOUT_MS  = 30 * 60 * 1000;   // hard stop even while Railway says BUILDING
const POLL_EVERY_MS = 10 * 1000;
const SETTLE_MS = 45 * 1000;          // wait after "verified" to catch a silent revert
const SETTLE_CHECKS = 3;

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { cwd: root }).toString().trim();
const die = (msg) => { console.error(`\n\x1b[31m${msg}\x1b[0m\n`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Parse --gate <version>
const argv = process.argv.slice(2);
let gate = null;
const gi = argv.indexOf('--gate');
if (gi !== -1) {
  gate = argv[gi + 1];
  if (!gate || !/^\d+\.\d+\.\d+$/.test(gate)) die(`--gate needs an x.y.z version, got: ${gate ?? '(nothing)'}`);
}

const head = out('git rev-parse --short HEAD');
const branch = out('git rev-parse --abbrev-ref HEAD');
console.log(`\n▶ Shipping ${branch} @ ${head} → ${URL_BASE}${gate ? `  (gate → ${gate})` : ''}\n`);

if (branch !== 'master') console.warn(`⚠ On '${branch}', not 'master'. Deploying it anyway.\n`);

// Refuse to ship tracked, uncommitted changes — they'd deploy but never reach
// GitHub, guaranteeing a future "why is prod different from my code" mystery.
const dirty = out('git status --porcelain --untracked-files=no').split('\n').filter((l) => l && !/ buildInfo\.json$/.test(l));
if (dirty.length) die(`✋ Uncommitted TRACKED changes — commit or stash first so GitHub matches production:\n${dirty.map((l) => `    ${l}`).join('\n')}`);

/** Railway's own view of the newest deployment: BUILDING / DEPLOYING / SUCCESS /
 *  FAILED / CRASHED. Best-effort — an old CLI, a login expiry or a changed output
 *  format must never turn a healthy deploy into a hard failure, so anything
 *  unparseable comes back as null and the caller falls back to plain polling. */
const deploymentStatus = () => {
  try {
    const line = execSync('railway deployment list', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().split('\n').map((l) => l.trim()).filter(Boolean)
      .find((l) => /\|\s*(BUILDING|DEPLOYING|SUCCESS|FAILED|CRASHED|REMOVED|INITIALIZING|QUEUED)\s*\|/.test(l));
    return line?.match(/\|\s*([A-Z]+)\s*\|/)?.[1] ?? null;
  } catch { return null; }
};

const fetchVersion = async () => {
  const res = await fetch(`${URL_BASE}/version?cb=${Date.now()}`, { cache: 'no-store' });
  return (await res.json())?.data ?? {};
};

// 1) Push to GitHub (source of truth).
//
// ⚠ DRIFT GUARD (added 2026-08-30). This pushes `master`, but GitHub's DEFAULT
// branch is what Dependabot, the security tab and the web UI actually read. For
// months the default was `main` while every deploy pushed `master`, so `main`
// fell 307 commits behind and Dependabot scanned a lockfile old enough to still
// contain `tar` — 20 of 26 open alerts were phantoms of that stale tree (SEC3).
// The default is now `master`; this check fails loudly if the two ever diverge
// again rather than letting the security surface quietly rot.
const DEPLOY_BRANCH = 'master';
try {
  const def = out(`gh api repos/Tim1986/tactical-game-backend -q .default_branch`).trim();
  if (def && def !== DEPLOY_BRANCH) {
    console.error(
      `\n✖ GitHub's default branch is '${def}' but this script pushes '${DEPLOY_BRANCH}'.\n` +
      `  Dependabot and the security tab read the DEFAULT branch, so they would be\n` +
      `  scanning stale code. Fix with:\n` +
      `    gh api -X PATCH repos/Tim1986/tactical-game-backend -f default_branch=${DEPLOY_BRANCH}\n`);
    process.exit(1);
  }
} catch {
  console.warn('⚠ Could not check GitHub default branch (gh unavailable?) — continuing.\n');
}

console.log(`▶ git push standalone ${DEPLOY_BRANCH}`);
run(`git push standalone ${DEPLOY_BRANCH}`);

// 2) Stamp buildInfo.json so /version can report this commit.
console.log('\n▶ npm run stamp');
run('npm run stamp');

// 3) Set Railway vars WITHOUT triggering a deploy. CACHE_BUST=SHA forces a
//    clean rebuild; the optional gate is set here too so it can never be a
//    separate, stale-image-resurrecting dashboard change.
console.log(`\n▶ Setting CACHE_BUST=${head}${gate ? ` and REQUIRED_APP_VERSION=${gate}` : ''} (--skip-deploys)`);
run(`railway variables --set "CACHE_BUST=${head}" --skip-deploys`);
if (gate) run(`railway variables --set "REQUIRED_APP_VERSION=${gate}" --skip-deploys`);

// 4) Deploy — the single authoritative build.
console.log('\n▶ railway up');
run('railway up');

// 5) VERIFY the running server flipped to our commit.
//
// ⚠ "TIMED OUT" AND "FAILED" ARE DIFFERENT ANSWERS, AND SO IS "STILL BUILDING".
// This used to be one flat 10-minute wait that ended in "The build did not land
// … re-run `npm run ship`". On 2026-08-28 a perfectly healthy build took ~35
// minutes; the script declared failure at 10, the owner re-ran it, and the
// re-run would have started a SECOND build racing the first. The old image
// serving `/version` during a build is CORRECT behaviour, not a stale-cache
// bug — so the deployment's own status has to be part of the verdict.
console.log(`\n▶ Verifying /version reports ${head}...`);
const start = Date.now();
let seen = '(unreachable)';
let verified = false;
let lastStatus = null;
let building = false;
while (Date.now() - start < STUCK_TIMEOUT_MS) {
  await sleep(POLL_EVERY_MS);
  try {
    const d = await fetchVersion();
    seen = d.commit ?? '(no commit field — server predates build stamping)';
    if (d.commit === head) { console.log(`\n✅ Live at ${head} (built ${d.builtAt}).`); verified = true; break; }
  } catch (e) { seen = `(unreachable: ${e.message})`; }

  const status = deploymentStatus();
  if (status !== lastStatus && status) console.log(`  …Railway: ${status}`);
  lastStatus = status;
  building = status === 'BUILDING' || status === 'DEPLOYING' || status === 'INITIALIZING' || status === 'QUEUED';

  if (status === 'FAILED' || status === 'CRASHED') {
    die(`❌ BUILD ${status}. Railway rejected this deploy, so production is UNCHANGED and still\n` +
        `   serving '${seen}' — nothing is broken, but nothing shipped either.\n` +
        `   Read the build log:  railway logs --build\n` +
        `   Fix the error, commit, and re-run \`npm run ship\`.`);
  }
  if (!building && Date.now() - start > VERIFY_TIMEOUT_MS) break;   // settled on the WRONG commit
  console.log(`  …still ${seen}, waiting for ${head}${building ? ` (${status.toLowerCase()})` : ''}`);
}
if (!verified) {
  if (building) {
    die(`⏳ STILL BUILDING after ${Math.round((Date.now() - start) / 60000)} min — this deploy has NOT failed.\n` +
        `   Production is still serving '${seen}', which is correct while a build runs.\n` +
        `   ⚠ Do NOT re-run \`npm run ship\` — that starts a SECOND build racing this one.\n` +
        `   Watch it instead:   railway deployment list      (wait for SUCCESS)\n` +
        `   Then confirm:       curl -s ${URL_BASE}/version\n` +
        `   If it reports ${head}, you are shipped and can carry on with the app builds.`);
  }
  die(`❌ NOT VERIFIED. Railway reports the deployment as ${lastStatus ?? 'an unknown state'} but /version\n` +
      `   still says '${seen}', expected '${head}'. A finished deploy serving the WRONG commit is the\n` +
      `   stale-image bug: check that GitHub auto-deploy is disconnected (see the settle-check note\n` +
      `   below), then re-run \`npm run ship\`.`);
}

// 6) SETTLE re-check — Railway/GitHub can auto-redeploy a CACHED old image
//    seconds after a good deploy (e.g. an env change or a webhook). Watch that
//    it STAYS on our commit before declaring victory.
console.log(`\n▶ Settle check — confirming it stays on ${head} for ~${(SETTLE_MS * SETTLE_CHECKS) / 1000}s...`);
for (let i = 1; i <= SETTLE_CHECKS; i++) {
  await sleep(SETTLE_MS);
  let d = {};
  try { d = await fetchVersion(); } catch (e) { console.log(`  (${i}/${SETTLE_CHECKS}) unreachable: ${e.message}`); continue; }
  if (d.commit !== head) {
    die(`❌ REVERTED. Live dropped back to '${d.commit ?? '(no commit field)'}' ${SETTLE_MS * i / 1000}s after deploy.\n` +
        `   Something is redeploying a STALE cached image out of band. Almost certainly the\n` +
        `   Railway service still has GitHub auto-deploy connected, OR a dashboard variable was\n` +
        `   changed. FIX ONCE: Railway → service → Settings → disconnect the GitHub repo (source\n` +
        `   trigger), so \`railway up\` via this script is the ONLY thing that can deploy. Then re-run.`);
  }
  console.log(`  (${i}/${SETTLE_CHECKS}) still ${head} ✅`);
}

console.log(`\n\x1b[32m✅ SHIPPED — production is running ${head} and holding.${gate ? ` Gate = ${gate}.` : ''}\x1b[0m\n`);
