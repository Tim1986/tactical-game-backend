// Writes buildInfo.json at the backend root capturing the git commit and
// build time of the code being deployed. Run this right before `railway up`
// (see the `deploy` npm script) so the deployed server can report exactly
// which commit it is running via GET /version.
//
// railway up uploads this file (it is excluded from git via .gitignore but
// NOT from .railwayignore, so it ships to Railway while keeping git clean).
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
  dirty: (git('status --porcelain') ?? '') !== '',
  builtAt: new Date().toISOString(),
};

writeFileSync(join(root, 'buildInfo.json'), JSON.stringify(info, null, 2) + '\n');
console.log('Stamped buildInfo.json:', info);
