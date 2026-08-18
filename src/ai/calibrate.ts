/**
 * calibrate.ts — [E2 balancing] The calibration WALK, build-sampled.
 *
 * Answers one question fast: "what hpScale puts this cell in band?" It probes
 * several scales for one encounter/difficulty and prints the build-sampled mean
 * for each, so a rung can be picked from a curve instead of guessed and
 * re-measured through a 52-minute battery.
 *
 * Uses the SAME statistic the acceptance battery uses (mean over sampled builds)
 * so a rung found here transfers. It just uses fewer builds/games — enough to
 * locate the rung, not to certify it. Always confirm with buildBattery.
 *
 *   npx tsx src/ai/calibrate.ts sealeddeep e1 hard 1.2,1.6,2.0
 *   npx tsx src/ai/calibrate.ts sealeddeep e1 all 1.2,1.6,2.0 --builds 40
 *
 * ⚠ Read the OBJECTIVE-TYPE TUNING TABLE in CAMPAIGN_BALANCING.md first. Some
 * objective shapes are hpScale-INERT (survive, escort) — a flat curve here is
 * that, not a bug, and it means the lever is structural (rounds, distance,
 * enemy count, placement), not HP.
 */
import { simEncounterCell } from './campaignSim.js';
import { sampleBuild } from './buildBattery.js';
import { makeRng } from './simHarness.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { createHash } from 'node:crypto';

const BANDS: Record<CampaignDifficulty, [number, number]> = {
  easy: [0.80, 0.95], medium: [0.65, 0.80], hard: [0.45, 0.65], nightmare: [0.15, 0.45],
};
const WALL_FLOOR: Record<CampaignDifficulty, number> = {
  easy: 0.40, medium: 0.25, hard: 0.10, nightmare: 0.05,
};
/** Must mirror buildBattery's MAX_WALL_SHARE, or a rung that looks acceptable
 *  here fails certification (and vice versa). Scaled by difficulty per the
 *  owner call — see the long note in buildBattery.ts for why. */
const MAX_WALL_SHARE: Record<CampaignDifficulty, number> = {
  easy: 0.10, medium: 0.15, hard: 0.25, nightmare: 0.50,
};

const [slug, encounter, diffArg, scalesArg, ...rest] = process.argv.slice(2);
const getArg = (f: string, d: string) => { const i = rest.indexOf(f); return i !== -1 ? rest[i + 1] : d; };
if (!slug || !CAMPAIGNS[slug] || !encounter || !diffArg || !scalesArg) {
  console.error('Usage: npx tsx src/ai/calibrate.ts <campaign> <encounter> <difficulty|all> <s1,s2,...> [--builds N] [--games N]');
  process.exit(1);
}
const campaign = CAMPAIGNS[slug];
if (!campaign.encounters[encounter]) { console.error(`Unknown encounter ${encounter}`); process.exit(1); }
const builds = parseInt(getArg('--builds', '40'), 10);
const games = parseInt(getArg('--games', '30'), 10);
const scales = scalesArg.split(',').map(Number);
const diffs: CampaignDifficulty[] = diffArg === 'all'
  ? ['easy', 'medium', 'hard', 'nightmare'] : [diffArg as CampaignDifficulty];
const level = campaign.encounters[encounter].level;
const current = campaign.encounters[encounter].hpScaleOverride ?? {};

console.log(`${slug} ${encounter} (L${level}) — ${builds} builds x ${games} games per rung`);
console.log(`current: ${diffs.map((d) => `${d} ${current[d] ?? 'default'}`).join('  ')}\n`);

for (const difficulty of diffs) {
  const [lo, hi] = BANDS[difficulty];
  const floor = WALL_FLOOR[difficulty];
  console.log(`${difficulty}  target band [${(lo * 100).toFixed(0)},${(hi * 100).toFixed(0)}]  wall floor ${(floor * 100).toFixed(0)}%`);
  for (const scale of scales) {
    const wrs: number[] = [];
    for (let i = 0; i < builds; i++) {
      const seed = parseInt(createHash('sha1').update(`${slug}|${encounter}|${difficulty}|${i}`).digest('hex').slice(0, 8), 16);
      const b = sampleBuild(makeRng(seed), campaign, level);
      wrs.push(simEncounterCell(slug, encounter, difficulty, b.label, b.slugs, {
        games, level, seed, choicesOverride: b.choices, boonKeys: b.boonKeys, hpScale: scale,
      }).winRate);
    }
    const mean = wrs.reduce((s, x) => s + x, 0) / wrs.length;
    const sorted = [...wrs].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const walls = wrs.filter((w) => w < floor).length / wrs.length;
    const inBand = mean >= lo && mean <= hi;
    const wallCap = MAX_WALL_SHARE[difficulty];
    const flags = [inBand ? '' : (mean > hi ? 'HIGH' : 'LOW'), walls > wallCap ? `WALLS ${(walls * 100).toFixed(0)}%` : '']
      .filter(Boolean).join(' ');
    console.log(`  scale ${scale.toFixed(2)}  mean ${(mean * 100).toFixed(0).padStart(3)}%  median ${(med * 100).toFixed(0).padStart(3)}%  walls ${(walls * 100).toFixed(0).padStart(3)}%  ${inBand && walls <= wallCap ? '✓ IN BAND' : flags}`);
  }
  console.log();
}
