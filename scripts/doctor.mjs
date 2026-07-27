// Read-only production health check. Run ANYTIME to get a plain GREEN/RED answer
// to "is what's running actually my latest code?".
//
//   npm run doctor
//
// It compares three things and exits non-zero if they disagree:
//   • local HEAD        — the commit you have checked out
//   • GitHub master     — what's pushed
//   • DEPLOYED /version — what the live server reports it's running
// Plus the version gate (REQUIRED_APP_VERSION) so you can see if clients are
// locked out.
import { execSync } from 'node:child_process';

const URL_BASE = (process.env.BACKEND_URL ?? 'https://tactical-game-backend-production.up.railway.app').replace(/\/$/, '');
const out = (cmd) => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };

const head = out('git rev-parse --short HEAD');
const remote = (out('git ls-remote standalone master') || '').slice(0, 7);

let deployed = '(unreachable)';
let gate = '(unknown)';
try {
  const res = await fetch(`${URL_BASE}/version?cb=${Date.now()}`, { cache: 'no-store' });
  const body = await res.json();
  deployed = body?.data?.commit ?? '(NO COMMIT FIELD — stale, predates build stamping)';
  gate = body?.data?.requiredVersion ?? '(none)';
} catch (e) {
  deployed = `(unreachable: ${e.message})`;
}

const green = deployed === head && remote === head;
const bar = green ? '\x1b[32m' : '\x1b[31m';
const rst = '\x1b[0m';

console.log(`\n  ${URL_BASE}`);
console.log(`  ─────────────────────────────────────────────`);
console.log(`  local HEAD        ${head}`);
console.log(`  GitHub master     ${remote}${remote === head ? '  ✅' : '  ❌ not pushed'}`);
console.log(`  DEPLOYED /version ${deployed}${deployed === head ? '  ✅' : '  ❌ STALE'}`);
console.log(`  version gate      ${gate}`);
console.log(`  ─────────────────────────────────────────────`);
console.log(`  ${bar}${green ? '✅ GREEN — production is running your latest commit.' : '❌ RED — production is NOT running your latest code. Run: npm run ship'}${rst}\n`);

process.exit(green ? 0 : 1);
