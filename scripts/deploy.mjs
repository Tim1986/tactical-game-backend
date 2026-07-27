// Robust backend deploy: push → stamp → railway up → VERIFY.
//
// Replaces the old `git push standalone master && npm run deploy` dance. The
// failure it prevents: `railway up` uploads and builds ASYNCHRONOUSLY, so the
// command can return (or the build can fail) while the OLD code keeps running —
// a silent "stale deploy". This script polls GET /version until the running
// server reports the exact commit we just built, and fails loudly if it never
// does. Verify a deploy by its `commit`, never by `requiredVersion` (a separate
// env var that changes independently of the code).
//
//   npm run deploy                 # normal
//   BACKEND_URL=https://... npm run deploy   # override target
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = (process.env.BACKEND_URL ?? 'https://tactical-game-backend-production.up.railway.app').replace(/\/$/, '');
const VERIFY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const POLL_EVERY_MS = 10 * 1000;

const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
const out = (cmd) => execSync(cmd, { cwd: root }).toString().trim();

const head = out('git rev-parse --short HEAD');
const branch = out('git rev-parse --abbrev-ref HEAD');

console.log(`\n▶ Deploying ${branch} @ ${head}  →  ${URL_BASE}\n`);

if (branch !== 'master') {
  console.warn(`⚠ On '${branch}', not 'master'. Railway deploys the local tree regardless; make sure this is intended.\n`);
}

// Untracked build artifacts (dist/) make the tree "dirty" normally — only warn
// about TRACKED, uncommitted changes, which get deployed but never reach GitHub.
const trackedDirty = out('git status --porcelain --untracked-files=no');
if (trackedDirty) {
  console.warn('⚠ Uncommitted TRACKED changes — these will deploy but are NOT pushed to GitHub:');
  console.warn(trackedDirty.split('\n').map((l) => `    ${l}`).join('\n'));
  console.warn('  Commit them first so GitHub matches production.\n');
}

// 1) Push to GitHub (source of truth).
console.log('▶ git push standalone master');
run('git push standalone master');

// 2) Stamp buildInfo.json with the current commit (what /version will report).
console.log('\n▶ npm run stamp');
run('npm run stamp');

// 3) Deploy (streams the Railway build).
console.log('\n▶ railway up');
run('railway up');

// 4) VERIFY the running server actually flipped to our commit.
console.log(`\n▶ Verifying — polling ${URL_BASE}/version for commit ${head} (up to 10 min)...`);
const deadline = Date.now() + VERIFY_TIMEOUT_MS;
let lastSeen = '(unreachable)';
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
  try {
    const res = await fetch(`${URL_BASE}/version`, { cache: 'no-store' });
    const body = await res.json();
    const commit = body?.data?.commit ?? null;
    lastSeen = commit ?? '(no commit field — server predates build stamping)';
    if (commit === head) {
      console.log(`\n✅ DEPLOY VERIFIED — production is running ${head} (built ${body.data.builtAt}).`);
      process.exit(0);
    }
    console.log(`  …still running ${lastSeen}, waiting for ${head}`);
  } catch (e) {
    console.log(`  …/version not reachable yet (${e.message})`);
  }
}

console.error(`\n❌ DEPLOY NOT VERIFIED after 10 min. /version reports '${lastSeen}', expected '${head}'.`);
console.error('   The code deploy did NOT take. Open the Railway dashboard, check the latest');
console.error('   build/deploy for errors, and re-run `npm run deploy`.');
process.exit(1);
