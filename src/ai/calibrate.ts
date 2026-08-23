/**
 * calibrate.ts — [E2 balancing] The calibration WALK, build-sampled.
 *
 * Answers one question fast: "what hpScale puts this cell in band?" It probes
 * several scales for one encounter/difficulty and prints the build-sampled mean
 * for each, so a rung can be picked from a curve instead of guessed and
 * re-measured through a 52-minute battery.
 *
 * Uses the SAME criterion the acceptance battery uses — the owner's percentile
 * rule from DIFFICULTY_TARGETS.md (solve SHARE floor + median CEILING + wall
 * cap), imported from buildBattery rather than restated, so a rung found here
 * transfers. It just uses fewer builds/games — enough to locate the rung, not
 * to certify it. Always confirm with buildBattery.
 *
 * ⚠ Until 2026-08-23 this walked against the RETIRED mean-in-band rule, which
 * was superseded on 2026-08-21 (REBALANCE_2026-08.md). A rung chosen by the old
 * stick can be flatly wrong under the new one: mean-in-band asks where the
 * average build lands, the ratified rule asks how many GOOD builds clear a bar
 * and whether the median walks it. Those disagree most exactly where tuning
 * matters — on bimodal cells.
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
import {
  sampleBuild, isEarlyEncounter,
  ACCEPTANCE, ACCEPTANCE_EARLY, WALL_FLOOR, MAX_WALL_SHARE,
} from './buildBattery.js';
import { makeRng } from './simHarness.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { createHash } from 'node:crypto';


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

const early = isEarlyEncounter(level);
if (early) console.log('EARLY encounter (L<=2) — relaxed targets apply.\n');

for (const difficulty of diffs) {
  const { target, share, ceiling } = (early ? ACCEPTANCE_EARLY : ACCEPTANCE)[difficulty];
  const floor = WALL_FLOOR[difficulty];
  const wallCap = MAX_WALL_SHARE[difficulty];
  console.log(`${difficulty}  need >=${(share * 100).toFixed(0)}% of teams winning >=${(target * 100).toFixed(0)}%`
    + `  ·  median <=${(ceiling * 100).toFixed(0)}%  ·  walls <${(wallCap * 100).toFixed(0)}% below ${(floor * 100).toFixed(0)}%`);
  for (const scale of scales) {
    const wrs: number[] = [];
    for (let i = 0; i < builds; i++) {
      const seed = parseInt(createHash('sha1').update(`${slug}|${encounter}|${difficulty}|${i}`).digest('hex').slice(0, 8), 16);
      const b = sampleBuild(makeRng(seed), campaign, level, encounter);
      wrs.push(simEncounterCell(slug, encounter, difficulty, b.label, b.slugs, {
        games, level, seed, choicesOverride: b.choices, boonKeys: b.boonKeys, hpScale: scale,
      }).winRate);
    }
    const mean = wrs.reduce((s, x) => s + x, 0) / wrs.length;
    const sorted = [...wrs].sort((a, b) => a - b);
    const med = sorted[Math.floor(sorted.length / 2)];
    const walls = wrs.filter((w) => w < floor).length / wrs.length;
    const solveShare = wrs.filter((w) => w >= target).length / wrs.length;
    // The ratified rule, verbatim: enough good teams clear the bar, the typical
    // team does not walk it, and nobody is truly bricked.
    const floorOk = solveShare >= share;
    const ceilOk = med <= ceiling;
    const wallOk = walls <= wallCap;
    const flags = [
      floorOk ? '' : 'TOO HARD',
      ceilOk ? '' : 'TOO EASY',
      wallOk ? '' : `WALLS ${(walls * 100).toFixed(0)}%`,
    ].filter(Boolean).join(' ');
    console.log(`  scale ${scale.toFixed(2)}  solve ${(solveShare * 100).toFixed(0).padStart(3)}%/${(share * 100).toFixed(0)}%`
      + `  median ${(med * 100).toFixed(0).padStart(3)}%/${(ceiling * 100).toFixed(0)}%`
      + `  walls ${(walls * 100).toFixed(0).padStart(3)}%  (mean ${(mean * 100).toFixed(0).padStart(3)}%)`
      + `  ${floorOk && ceilOk && wallOk ? '✓ PASS' : flags}`);
  }
  console.log();
}
