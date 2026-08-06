/**
 * campaignTune.ts — auto-tune per-encounter `hpScaleOverride` to land every
 * cell in its target band.
 *
 * WHY THIS EXISTS. The AC rework (13–17 → 8–12) moved every campaign out of
 * band at once: 54 of 60 cells failed, nearly all TOO HARD. Lower AC means both
 * sides connect far more often, which favours whichever side has more bodies —
 * and campaign encounters outnumber the player. Hand-tuning 60 cells against a
 * noisy simulator is exactly the kind of job that should be searched, not
 * guessed.
 *
 * METHOD. `hpScaleOverride` is the sanctioned primary lever (CAMPAIGNS.md) and
 * is monotonic: more enemy HP → lower player win rate. So for each
 * (encounter, difficulty) binary-search the scale that puts the MEAN win rate
 * across the three representative parties at the band's midpoint, then report
 * whether the party floor also holds.
 *
 * Targeting the MIDPOINT rather than the nearest band edge is deliberate: the
 * sim is noisy and hit-breakpoint cliffs can move a cell 25 points in one HP
 * step (CAMPAIGNS.md), so a cell parked on an edge falls out of band on the
 * next re-run. The midpoint buys margin on both sides.
 *
 * The search uses a FIXED seed so it is reproducible; the final numbers must
 * still be verified with campaignSim at full games, which is a different
 * effective sample and will catch anything overfitted to the search seed.
 *
 * Run:
 *   npx tsx src/ai/campaignTune.ts <slug> [--games 60] [--iters 7] [--difficulty d]
 */
import { CAMPAIGNS } from '../campaigns/index.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { CAMPAIGN_HP_SCALE } from '../campaigns/runtime.js';
import { simEncounterCell, REPRESENTATIVE_PARTIES } from './campaignSim.js';

const TARGET_BANDS: Record<CampaignDifficulty, [number, number]> = {
  easy: [0.80, 0.95], medium: [0.65, 0.80], hard: [0.45, 0.65], nightmare: [0.25, 0.45],
};
const PARTY_FLOOR: Record<CampaignDifficulty, number> = {
  easy: 0.60, medium: 0.40, hard: 0.15, nightmare: 0.0,
};
const DIFFICULTIES: CampaignDifficulty[] = ['easy', 'medium', 'hard', 'nightmare'];

// Enemy HP can be scaled this far before the encounter stops resembling itself.
// A cell that needs to leave this range is telling you the ENCOUNTER is wrong
// (composition/count), not its HP — escalate rather than silently clamp.
const SCALE_MIN = 0.25;
const SCALE_MAX = 2.60;

function meanWinRate(
  slug: string, encId: string, diff: CampaignDifficulty, games: number,
): { mean: number; perParty: Record<string, number> } {
  const perParty: Record<string, number> = {};
  let total = 0;
  for (const [pname, pslugs] of Object.entries(REPRESENTATIVE_PARTIES)) {
    const r = simEncounterCell(slug, encId, diff, pname, pslugs, { games });
    perParty[pname] = r.winRate;
    total += r.winRate;
  }
  return { mean: total / Object.keys(REPRESENTATIVE_PARTIES).length, perParty };
}

function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  if (!slug || !CAMPAIGNS[slug]) {
    console.error(`Usage: npx tsx src/ai/campaignTune.ts <slug> [--games N] [--iters N] [--difficulty d]`);
    console.error(`Known campaigns: ${Object.keys(CAMPAIGNS).join(', ')}`);
    process.exit(1);
  }
  const getArg = (f: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };
  const games = parseInt(getArg('--games') ?? '60', 10);
  const iters = parseInt(getArg('--iters') ?? '7', 10);
  const diffs = getArg('--difficulty') ? [getArg('--difficulty') as CampaignDifficulty] : DIFFICULTIES;

  const campaign = CAMPAIGNS[slug];
  const pct = (n: number) => (n * 100).toFixed(0).padStart(3) + '%';
  console.log(`Tuning ${campaign.title} — ${games} games/party/step, ${iters} steps\n`);

  const result: Record<string, Record<string, number>> = {};

  for (const encId of Object.keys(campaign.encounters)) {
    const enc = campaign.encounters[encId];
    result[encId] = {};
    for (const diff of diffs) {
      const [lo, hi] = TARGET_BANDS[diff];
      const target = (lo + hi) / 2;
      const original = enc.hpScaleOverride?.[diff] ?? CAMPAIGN_HP_SCALE[diff];

      // Bisect on hpScale. Player win rate DECREASES as scale increases, so the
      // usual comparison is inverted.
      let loS = SCALE_MIN, hiS = SCALE_MAX, best = original, bestErr = Infinity;
      let bestMean = 0, bestParties: Record<string, number> = {};
      for (let i = 0; i < iters; i++) {
        const mid = (loS + hiS) / 2;
        if (!enc.hpScaleOverride) enc.hpScaleOverride = {};
        enc.hpScaleOverride[diff] = mid;
        const { mean, perParty } = meanWinRate(slug, encId, diff, games);
        const err = Math.abs(mean - target);
        if (err < bestErr) { bestErr = err; best = mid; bestMean = mean; bestParties = perParty; }
        if (mean > target) loS = mid; else hiS = mid;   // too easy -> more HP
      }

      const rounded = Math.round(best * 100) / 100;
      if (!enc.hpScaleOverride) enc.hpScaleOverride = {};
      enc.hpScaleOverride[diff] = rounded;
      const { mean, perParty } = meanWinRate(slug, encId, diff, games);
      result[encId][diff] = rounded;

      const floor = PARTY_FLOOR[diff];
      const below = Object.entries(perParty).filter(([, w]) => w < floor).map(([n]) => n);
      const inBand = mean >= lo && mean <= hi;
      const atRail = rounded <= SCALE_MIN + 0.01 || rounded >= SCALE_MAX - 0.01;
      console.log(
        `${encId.padEnd(4)} ${diff.padEnd(10)} ${original.toFixed(2)} -> ${rounded.toFixed(2)}  `
        + `mean ${pct(mean)} [${pct(lo)},${pct(hi)}]${inBand ? '  ' : ' ⚠'}  `
        + Object.entries(perParty).map(([n, w]) => `${n[0]}:${pct(w)}`).join(' ')
        + (below.length ? `  ⚠ below floor: ${below.join(',')}` : '')
        + (atRail ? '  ⚠ AT SCALE RAIL — encounter composition likely wrong, not its HP' : ''),
      );
      void bestMean; void bestParties;
    }
    console.log('');
  }

  console.log('\n─── paste-ready hpScaleOverride blocks ───');
  for (const [encId, byDiff] of Object.entries(result)) {
    const parts = DIFFICULTIES.filter((d) => byDiff[d] !== undefined)
      .map((d) => `${d}: ${byDiff[d].toFixed(2)}`).join(', ');
    console.log(`${encId}:  hpScaleOverride: { ${parts} },`);
  }
}

main();
