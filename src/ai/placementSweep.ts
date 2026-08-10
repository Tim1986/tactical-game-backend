/**
 * placementSweep.ts — A/B test opening-placement weights, head to head.
 *
 *   npx tsx src/ai/placementSweep.ts [--games 240] [--stage 1|2|3|all]
 *
 * ── Why it is built this way ────────────────────────────────────────────────
 * Placement cannot be judged by running a config against the reference panel:
 * the panel's own placements would move too, and the comps differ, so the
 * signal drowns. Instead each candidate plays a MIRROR MATCH against the
 * baseline — identical slugs, identical loadouts, on both sides — with the
 * candidate weights placing P1 and DEFAULT_WEIGHTS placing P2. The only
 * difference between the two armies is where they stand, so a win rate above
 * 50% is placement value and nothing else.
 *
 * Games alternate the first player (`firstPlayerMode: alternate` semantics are
 * reproduced here by forcing p1/p2 on alternating games), which cancels
 * first-mover bias. Every one of Fable's 12 rosters is played, so a config has
 * to beat the baseline across melee walls, caster ladders and healer comps
 * rather than winning on one shape.
 *
 * Reported: overall win rate with a 95% confidence interval, plus the per-team
 * split so a config that only helps one archetype is visible rather than
 * hidden inside the average.
 */
import { runMatch, MatchResult } from './simHarness.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap, DEFAULT_UNITS } from './defaultData.js';
import {
  planPlacement, mirrorPlacement, DEFAULT_WEIGHTS, PlacementWeights,
} from './placement.js';
import { FABLE_TEAMS, fableCustomizations } from '../config/fableTeams.js';
import { AbilityDefinition } from '../types/index.js';

const argv = process.argv.slice(2);
const arg = (k: string, d: number) => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? Number(argv[i + 1]) : d;
};
const GAMES = arg('games', 240);          // per roster, per candidate
const STAGE = (() => {
  const i = argv.indexOf('--stage');
  return i >= 0 ? argv[i + 1] : 'all';
})();

const abilityMap = buildAbilityMap();
const normalized = new Map<string, AbilityDefinition>(abilityMap as never);

/** Deep-clone the defaults and apply an override patch. */
function W(patch: Partial<PlacementWeights> & { col?: Partial<PlacementWeights['col']> }): PlacementWeights {
  return {
    ...DEFAULT_WEIGHTS,
    ...patch,
    col: { ...DEFAULT_WEIGHTS.col, ...(patch.col ?? {}) },
    rowBias: { ...DEFAULT_WEIGHTS.rowBias, ...(patch.rowBias ?? {}) },
  };
}

interface Candidate { name: string; note: string; w: PlacementWeights }

// ── Stage 1: the row-bias hypothesis ────────────────────────────────────────
// Ranged currently get +1 per tile of distance from the centre row (an
// explicit edge-seeking bonus). Measured coverage says that is backwards: a
// range-6 unit threatens 9 enemy tiles from rows 2-5 but only 5 from row 0/7.
const stage1: Candidate[] = [
  { name: 'S1-ranged-centre', note: 'ranged rowBias +1 -> -1 (seek centre)', w: W({ rowBias: { ranged: -1 } as never }) },
  { name: 'S1-ranged-neutral', note: 'ranged rowBias +1 -> 0', w: W({ rowBias: { ranged: 0 } as never }) },
  { name: 'S1-ranged-strong-centre', note: 'ranged rowBias +1 -> -2', w: W({ rowBias: { ranged: -2 } as never }) },
];

// ── Stage 2: how much is AoE denial actually worth? ─────────────────────────
// Perfect denial is geometrically impossible for 4 units in a 3x8 zone, so the
// -100 wall may be buying little while dictating everything else.
const stage2: Candidate[] = [
  { name: 'S2-adj-40', note: 'adjacent 100 -> 40', w: W({ adjacent: 40 }) },
  { name: 'S2-adj-20', note: 'adjacent 100 -> 20', w: W({ adjacent: 20 }) },
  { name: 'S2-adj-40-cheb2-4', note: 'adjacent 40, cheb2 8 -> 4', w: W({ adjacent: 40, cheb2: 4 }) },
  { name: 'S2-cheb2-0', note: 'cheb2 8 -> 0 (adjacency only)', w: W({ cheb2: 0 }) },
];

// ── Stage 3: combinations + the unmodelled factors ──────────────────────────
// Filled in from the stage 1/2 winners at runtime, plus line-of-fire (line
// specials hit allies) and a healer that trusts its real 2-3 support range.
function stage3(best: PlacementWeights): Candidate[] {
  return [
    { name: 'S3-best', note: 'stage1+2 winners combined', w: best },
    { name: 'S3-best+lof', note: '+ line-of-fire penalty 6', w: { ...best, lineOfFire: 6 } },
    { name: 'S3-best+cohesion', note: '+ healer cohesion 2 -> 4', w: { ...best, healerCohesion: 4 } },
    { name: 'S3-best+ranged-fwd', note: '+ ranged col [10,25,-10] (favour col1 harder)', w: { ...best, col: { ...best.col, ranged: [10, 25, -10] } } },
  ];
}

/** One candidate vs the baseline across all 12 rosters. */
function evaluate(c: Candidate): { wins: number; losses: number; draws: number; per: string[] } {
  let wins = 0, losses = 0, draws = 0;
  const per: string[] = [];
  for (const t of FABLE_TEAMS) {
    const slugs = [...t.slugs];
    const custs = fableCustomizations(t);
    // P1 = candidate weights, P2 = baseline. Same comp, same loadouts.
    const p1Placement = planPlacement(slugs, normalized, custs, c.w);
    const p2Placement = mirrorPlacement(planPlacement(slugs, normalized, custs, DEFAULT_WEIGHTS));
    let tw = 0, tl = 0, td = 0;
    for (let g = 0; g < GAMES; g++) {
      const r: MatchResult = runMatch(slugs, slugs, abilityMap, new OptimalBrain(), new OptimalBrain(), {
        p1Customizations: custs,
        p2Customizations: custs,
        p1Placement,
        p2Placement,
        // Alternate who moves first so first-mover bias cancels.
        forceFirstPlayerId: g % 2 === 0 ? 'p1' : 'p2',
      } as never);
      if (r.winnerSide === 'p1') { tw++; wins++; }
      else if (r.winnerSide === 'p2') { tl++; losses++; }
      else { td++; draws++; }
    }
    const dec = tw + tl;
    per.push(`${t.name.padEnd(18)} ${dec ? ((tw / dec) * 100).toFixed(1).padStart(5) : ' n/a '}%  (${tw}W ${tl}L ${td}D)`);
  }
  return { wins, losses, draws, per };
}

function report(c: Candidate, r: ReturnType<typeof evaluate>) {
  const dec = r.wins + r.losses;
  const p = dec ? r.wins / dec : 0.5;
  // 95% CI on the win rate among decided games.
  const se = dec ? Math.sqrt((p * (1 - p)) / dec) : 0;
  const lo = ((p - 1.96 * se) * 100), hi = ((p + 1.96 * se) * 100);
  const verdict = lo > 50 ? 'BETTER' : hi < 50 ? 'WORSE' : 'no signal';
  console.log(`\n${c.name}  — ${c.note}`);
  console.log(`  ${(p * 100).toFixed(1)}% vs baseline  [95% CI ${lo.toFixed(1)}–${hi.toFixed(1)}]  ${r.draws} draws  → ${verdict}`);
  for (const line of r.per) console.log(`     ${line}`);
  return { p, lo, hi };
}

function runStage(label: string, cands: Candidate[]) {
  console.log(`\n${'='.repeat(72)}\n${label}  (${GAMES} games x ${FABLE_TEAMS.length} rosters per candidate)\n${'='.repeat(72)}`);
  const scored = cands.map((c) => {
    const r = evaluate(c);
    const s = report(c, r);
    return { c, ...s };
  });
  scored.sort((a, b) => b.p - a.p);
  console.log(`\n  → best in stage: ${scored[0].c.name} (${(scored[0].p * 100).toFixed(1)}%)`);
  return scored;
}

console.log(`Placement A/B — candidate (P1) vs DEFAULT_WEIGHTS (P2), mirror matches.`);
console.log(`Units: ${Object.keys(DEFAULT_UNITS).length} classes, ${FABLE_TEAMS.length} rosters, ${GAMES} games each.`);

let best = DEFAULT_WEIGHTS;
if (STAGE === '1' || STAGE === 'all') {
  const s = runStage('STAGE 1 — ranged row bias', stage1);
  if (s[0].lo > 50) best = s[0].c.w;
}
if (STAGE === '2' || STAGE === 'all') {
  const s = runStage('STAGE 2 — AoE denial strength', stage2);
  if (s[0].lo > 50) {
    best = { ...best, adjacent: s[0].c.w.adjacent, cheb2: s[0].c.w.cheb2 };
  }
}
if (STAGE === '3' || STAGE === 'all') {
  runStage('STAGE 3 — combinations + unmodelled factors', stage3(best));
}

console.log(`\nBaseline for reference is 50% by construction (identical armies, mirrored).`);
console.log(`Only adopt a config whose CI lower bound clears 50.`);
