/**
 * spreadSweep.ts — find the enemy start distance that balances a campaign
 * encounter across party archetypes.
 *
 * WHY. `hpScaleOverride` moves every party together, so it can raise or lower a
 * cell's MEAN but can never close a SPREAD. After the AC migration and HP
 * retune, the cells still failing were all spread failures, and they correlate
 * almost perfectly with how far the enemies start from the player:
 *
 *     moonberry e1   gap 0.8 tiles  -> ranged bricked (10%)
 *     goblinopolis e1 gap 1.8       -> ranged bricked (28%)
 *     lantern e4     gap 3.0        -> ranged bricked (11%)
 *     lantern e5     gap 5.5        -> MELEE bricked (10%)
 *
 * Enemies that start on top of you deny a ranged party the standoff its whole
 * plan depends on; enemies that start far away let a ranged party farm the
 * approach while a melee party crosses open ground under fire. lantern e3 was
 * fixed this way already (spread 43 -> 5 by starting the runners closer).
 *
 * This sweeps a distance offset — each enemy stepped toward or away from the
 * player centroid — and reports MEAN, SPREAD and floor violations per offset so
 * the choice is measured. It does NOT write anything; apply the winner by hand
 * so the flavour of the encounter stays a human decision.
 *
 * Run: npx tsx src/ai/spreadSweep.ts <campaign> <encounter> [--games 80] [--diffs medium,hard]
 */
import { CAMPAIGNS } from '../campaigns/index.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { simEncounterCell, REPRESENTATIVE_PARTIES } from './campaignSim.js';
import { BoardPosition } from '../types/matchState.js';

const FLOOR: Record<CampaignDifficulty, number> = {
  easy: 0.60, medium: 0.40, hard: 0.15, nightmare: 0.0,
};
const BANDS: Record<CampaignDifficulty, [number, number]> = {
  easy: [0.80, 0.95], medium: [0.65, 0.80], hard: [0.45, 0.65], nightmare: [0.25, 0.45],
};

const BS = 8;
const isCorner = (p: BoardPosition) =>
  (p.x === 0 || p.x === BS - 1) && (p.y === 0 || p.y === BS - 1);
const inBounds = (p: BoardPosition) => p.x >= 0 && p.x < BS && p.y >= 0 && p.y < BS;

/** Step `pos` `steps` tiles toward (negative: away from) `target`, keeping it legal. */
function shiftToward(pos: BoardPosition, target: BoardPosition, steps: number, taken: Set<string>): BoardPosition {
  const dx = Math.sign(target.x - pos.x);
  const dy = Math.sign(target.y - pos.y);
  let best = { ...pos };
  for (let i = 1; i <= Math.abs(steps); i++) {
    const s = steps > 0 ? i : -i;
    const cand = { x: pos.x + dx * s, y: pos.y + dy * Math.round(s / 2) };
    if (!inBounds(cand) || isCorner(cand)) break;
    if (taken.has(`${cand.x},${cand.y}`)) continue;
    best = cand;
  }
  return best;
}

function main() {
  const args = process.argv.slice(2);
  const [campSlug, encId] = args;
  const getArg = (f: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };
  const games = parseInt(getArg('--games') ?? '80', 10);
  const diffs = (getArg('--diffs') ?? 'medium,hard').split(',') as CampaignDifficulty[];
  const campaign = CAMPAIGNS[campSlug];
  if (!campaign?.encounters[encId]) {
    console.error(`Usage: npx tsx src/ai/spreadSweep.ts <campaign> <encounter> [--games N] [--diffs a,b]`);
    process.exit(1);
  }
  const enc = campaign.encounters[encId];
  const orig = enc.enemyPlacement.map((p) => ({ ...p }));
  const centroid = {
    x: Math.round(enc.playerPlacement.reduce((s, p) => s + p.x, 0) / enc.playerPlacement.length),
    y: Math.round(enc.playerPlacement.reduce((s, p) => s + p.y, 0) / enc.playerPlacement.length),
  };
  const pct = (n: number) => (n * 100).toFixed(0).padStart(3) + '%';

  console.log(`${campSlug} ${encId} — enemy start-distance sweep, ${games} games/party`);
  console.log(`player centroid (${centroid.x},${centroid.y}); + = enemies start CLOSER\n`);
  console.log(`${'offset'.padEnd(7)} ${'diff'.padEnd(8)} ${'mean'.padEnd(6)} ${'melee'.padEnd(6)} ${'ranged'.padEnd(7)} ${'bal'.padEnd(6)} ${'spread'.padEnd(7)} flags`);

  for (const off of [-2, -1, 0, 1, 2, 3]) {
    const taken = new Set(enc.playerPlacement.map((p) => `${p.x},${p.y}`));
    const moved: BoardPosition[] = [];
    for (const p of orig) {
      const np = off === 0 ? { ...p } : shiftToward(p, centroid, off, taken);
      taken.add(`${np.x},${np.y}`);
      moved.push(np);
    }
    enc.enemyPlacement = moved as typeof enc.enemyPlacement;
    const gap = moved.reduce((s, p) => s + Math.abs(p.x - centroid.x) + Math.abs(p.y - centroid.y), 0) / moved.length;

    for (const diff of diffs) {
      const w: Record<string, number> = {};
      for (const [pn, ps] of Object.entries(REPRESENTATIVE_PARTIES)) {
        w[pn] = simEncounterCell(campSlug, encId, diff, pn, ps, { games }).winRate;
      }
      const vals = Object.values(w);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const spread = Math.max(...vals) - Math.min(...vals);
      const below = Object.entries(w).filter(([, v]) => v < FLOOR[diff]).map(([n]) => n[0]);
      const [lo, hi] = BANDS[diff];
      const flags = (below.length ? `floor:${below.join('')}` : '')
        + (mean < lo || mean > hi ? ' oob' : '');
      console.log(
        `${(off > 0 ? '+' + off : String(off)).padEnd(7)} ${diff.padEnd(8)} ${pct(mean)}  ${pct(w.melee)}  ${pct(w.ranged)}   ${pct(w.balanced)}  ${(spread * 100).toFixed(0).padStart(3)}pts   ${flags}`,
      );
    }
    console.log(`        (mean manhattan gap ${gap.toFixed(1)}; placement ${moved.map((p) => `${p.x},${p.y}`).join(' ')})\n`);
  }

  enc.enemyPlacement = orig as typeof enc.enemyPlacement;
}

main();
