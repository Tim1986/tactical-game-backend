// Writes buildInfo.json at the backend root capturing the git commit and
// build time of the code being deployed. Run this right before `railway up`
// (see the `deploy` npm script) so the deployed server can report exactly
// which commit it is running via GET /version.
//
// buildInfo.json is tracked in git so it is always present in the build
// context. `railway up` archives the working tree (including this file's
// freshly-stamped, possibly-uncommitted contents) and the Dockerfile COPYs it
// into the image, where config/index.ts reads it at startup. Ignored files are
// stripped from the upload, which is why this must NOT be gitignored.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const info = {
  commit: git('rev-parse --short HEAD') ?? 'unknown',
  commitFull: git('rev-parse HEAD') ?? 'unknown',
  branch: git('rev-parse --abbrev-ref HEAD') ?? 'unknown',
  // 'dirty' should mean 'code differs from the stamped commit'. The stamp
  // itself modifies tracked buildInfo.json moments before this check ran, so
  // every deploy reported dirty:true and the flag was meaningless (G1 flag 2,
  // 2026-08-30). Exclude the stamp file and untracked noise; ship.mjs already
  // refuses to deploy any OTHER tracked dirt, so this now stays false unless
  // someone bypasses ship.mjs with genuinely modified code.
  dirty: (git("status --porcelain --untracked-files=no -- . ':(exclude)buildInfo.json'") ?? '') !== '',
  builtAt: new Date().toISOString(),
};

writeFileSync(join(root, 'buildInfo.json'), JSON.stringify(info, null, 2) + '\n');
console.log('Stamped buildInfo.json:', info);
