/**
 * placementSearch.ts — find each roster's best OPENING PLACEMENT by playing it,
 * not by scoring it with a heuristic.
 *
 *   npx tsx src/ai/placementSearch.ts [--cands 28] [--screen 12] [--confirm 60]
 *                                     [--climb 2] [--out placements.json]
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * placement.ts builds formations from a doctrine. Sweeping its weights (the
 * since-deleted placementSweep.ts) found no improvement — but that was
 * measuring the wrong thing: a placement change swings an INDIVIDUAL matchup by
 * up to 35 points (sd ~22) while averaging to near zero across a diverse field.
 * Small weight tweaks move placements one tile and vanish into that average.
 *
 * WHAT THIS TOOL FOUND, AND WHY IT WAS NOT ADOPTED (2026-08-09)
 * It beat the heuristic by +8.0 points average, up to +19. Re-tested against
 * opponents placed RANDOMLY, the same placements scored +0.0 — six rosters up,
 * six down. The gains were fitted to the exact tiles the fixed field happened
 * to be standing on, not to better formations, and the winning shapes were
 * tellingly corner-clustered. ALWAYS re-test a winner against a randomised
 * field before adopting it. (Known flaw: the heuristic seed can be unlucky in
 * the low-game screen round and miss the confirm cut, which is why two rosters
 * "lost" to their own baseline. Take max(heuristic, searched) if you use it.)
 *
 * So: search the placements themselves. For each roster, generate candidate
 * formations, play each against the whole field, and keep the one with the
 * best average — reporting its worst matchup too, because a formation that
 * crushes half the field and dies to the rest is a coin flip, not a plan.
 *
 * ── Method ─────────────────────────────────────────────────────────────────
 *  1. SCREEN   every candidate at low game count, keep the top few.
 *  2. CONFIRM  the survivors at high game count.
 *  3. CLIMB    the winner: move one unit to one free tile, re-confirm, repeat
 *              while it improves. (Catches the last tile or two the sampler
 *              missed.)
 *
 * Opponents always stand where the CURRENT heuristic puts them, so every
 * candidate is judged against one stable field. That means the result is
 * "best reply to today's field" — after adopting new placements the field has
 * moved, so a second pass would refine further. One pass captures most of it.
 *
 * The real game saves placement with the team, so neither side adapts per
 * opponent — optimising the field average is exactly the choice a player
 * faces, which is why the average (not the per-matchup best) is the target.
 */
import { runMatch } from './simHarness.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap, DEFAULT_UNITS } from './defaultData.js';
import { planPlacement, mirrorPlacement, DEFAULT_WEIGHTS } from './placement.js';
import { FABLE_TEAMS, fableCustomizations } from '../config/fableTeams.js';
import { BoardPosition } from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';
import fs from 'node:fs';

const argv = process.argv.slice(2);
const num = (k: string, d: number) => { const i = argv.indexOf('--' + k); return i >= 0 ? Number(argv[i + 1]) : d; };
const str = (k: string, d: string) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };

const N_CAND   = num('cands', 28);
const N_SCREEN = num('screen', 12);
const N_CONFIRM= num('confirm', 60);
const N_CLIMB  = num('climb', 2);
const N_CLIMB_EVALS = num('climbEvals', 24);
const N_CLIMB_GAMES = num('climbGames', 20);
const OUT      = str('out', 'placements.json');

const map = buildAbilityMap();
const normalized = new Map<string, AbilityDefinition>(map as never);

/** Legal P1 deploy tiles: x 0–2, minus the two removed corners. */
const ZONE: BoardPosition[] = [];
for (let x = 0; x <= 2; x++) for (let y = 0; y < 8; y++) {
  if (x === 0 && (y === 0 || y === 7)) continue;
  ZONE.push({ x, y });
}

/** Deterministic RNG so a run is reproducible. */
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
}

const key = (p: BoardPosition[]) => p.map((q) => `${q.x},${q.y}`).join('|');
const isMelee = (slug: string) => {
  const abs = DEFAULT_UNITS[slug].abilities.map((a) => map.get(a)!).filter(Boolean);
  const basic = abs.find((a) => !a.isSpecial) ?? abs[0];
  return basic.range <= 1;
};

/**
 * Candidate formations. A mix of:
 *  - the current heuristic (so we can only improve on it),
 *  - role-structured draws (melee forward, ranged back) with randomised rows
 *    and spacing — the space a thoughtful player actually considers,
 *  - unconstrained draws, to escape the heuristic's assumptions entirely.
 */
function candidates(slugs: string[], custs: UnitCustomization[], rng: () => number): BoardPosition[][] {
  const out: BoardPosition[][] = [];
  const seen = new Set<string>();
  const push = (p: BoardPosition[]) => {
    if (p.length !== slugs.length) return;
    const k = key(p);
    if (seen.has(k) || new Set(p.map((q) => `${q.x},${q.y}`)).size !== p.length) return;
    seen.add(k); out.push(p);
  };

  push(planPlacement(slugs, normalized, custs, DEFAULT_WEIGHTS));

  const melee = slugs.map(isMelee);
  const pick = (allowed: BoardPosition[]) => allowed[Math.floor(rng() * allowed.length)];

  // Role-structured: melee drawn from the forward columns, others from the back.
  for (let t = 0; t < N_CAND * 3 && out.length < N_CAND * 0.7; t++) {
    const used = new Set<string>();
    const p: BoardPosition[] = [];
    let ok = true;
    for (let i = 0; i < slugs.length; i++) {
      const cols = melee[i] ? [1, 2] : [0, 1];
      const allowed = ZONE.filter((q) => cols.includes(q.x) && !used.has(`${q.x},${q.y}`));
      if (!allowed.length) { ok = false; break; }
      const tile = pick(allowed);
      used.add(`${tile.x},${tile.y}`); p.push(tile);
    }
    if (ok) push(p);
  }
  // Unconstrained: anything goes.
  for (let t = 0; t < N_CAND * 3 && out.length < N_CAND; t++) {
    const used = new Set<string>();
    const p: BoardPosition[] = [];
    for (let i = 0; i < slugs.length; i++) {
      const allowed = ZONE.filter((q) => !used.has(`${q.x},${q.y}`));
      const tile = pick(allowed);
      used.add(`${tile.x},${tile.y}`); p.push(tile);
    }
    push(p);
  }
  return out;
}

/** Opponent side of the field: everyone where the heuristic puts them. */
const FIELD = FABLE_TEAMS.map((t) => {
  const c = fableCustomizations(t);
  return { name: t.name, slugs: [...t.slugs], custs: c,
           placement: mirrorPlacement(planPlacement([...t.slugs], normalized, c, DEFAULT_WEIGHTS)) };
});

interface Score { avg: number; worst: number; worstVs: string; per: { name: string; wr: number }[] }

function evaluate(slugs: string[], custs: UnitCustomization[], placement: BoardPosition[], games: number): Score {
  let W = 0, L = 0;
  const per: { name: string; wr: number }[] = [];
  for (const foe of FIELD) {
    let w = 0, l = 0;
    for (let g = 0; g < games; g++) {
      const r = runMatch(slugs, foe.slugs, map, new OptimalBrain(), new OptimalBrain(), {
        p1Customizations: custs, p2Customizations: foe.custs,
        p1Placement: placement, p2Placement: foe.placement,
        forceFirstPlayerId: g % 2 === 0 ? 'p1' : 'p2',
      });
      if (r.winnerSide === 'p1') { w++; W++; } else if (r.winnerSide === 'p2') { l++; L++; }
    }
    per.push({ name: foe.name, wr: w + l ? (w / (w + l)) * 100 : 50 });
  }
  const worstEntry = per.reduce((a, b) => (b.wr < a.wr ? b : a), per[0]);
  return { avg: W + L ? (W / (W + L)) * 100 : 50, worst: worstEntry.wr, worstVs: worstEntry.name, per };
}

function diagram(p: BoardPosition[]): string[] {
  const g = Array.from({ length: 8 }, () => ['.', '.', '.']);
  p.forEach((q, i) => { g[q.y][q.x] = String(i + 1); });
  return g.map((row, y) => `   row${y}  ${row.join(' ')} |`);
}

const results: Record<string, unknown> = {};
console.log(`Placement search — ${N_CAND} candidates screened @${N_SCREEN}g, top 4 confirmed @${N_CONFIRM}g, ${N_CLIMB} climb passes.`);
console.log(`Field: all ${FABLE_TEAMS.length} rosters at heuristic placement.\n`);

FABLE_TEAMS.forEach((t, ti) => {
  const slugs = [...t.slugs];
  const custs = fableCustomizations(t);
  const rng = makeRng(1000 + ti * 7919);
  const cands = candidates(slugs, custs, rng);

  const screened = cands.map((p) => ({ p, s: evaluate(slugs, custs, p, N_SCREEN) }))
    .sort((a, b) => b.s.avg - a.s.avg);
  const finalists = screened.slice(0, 4);
  let best = finalists.map((f) => ({ p: f.p, s: evaluate(slugs, custs, f.p, N_CONFIRM) }))
    .sort((a, b) => b.s.avg - a.s.avg)[0];

  // Hill-climb: relocate one unit at a time, keep strict improvements. Uses a
  // CHEAP evaluation under a fixed budget (a full-strength scan of every
  // relocation would be ~72 evals x 12 opponents per pass — hours per roster),
  // then re-confirms the winner properly at the end.
  let climbBudget = N_CLIMB_EVALS;
  for (let pass = 0; pass < N_CLIMB && climbBudget > 0; pass++) {
    let improved = false;
    const order = ZONE.slice().sort(() => rng() - 0.5);
    for (let i = 0; i < slugs.length && !improved && climbBudget > 0; i++) {
      for (const tile of order) {
        if (climbBudget <= 0) break;
        if (best.p.some((q) => q.x === tile.x && q.y === tile.y)) continue;
        const trial = best.p.map((q, j) => (j === i ? tile : q));
        climbBudget--;
        const s = evaluate(slugs, custs, trial, N_CLIMB_GAMES);
        if (s.avg > best.s.avg + 1.5) { best = { p: trial, s }; improved = true; break; }
      }
    }
    if (!improved) break;
  }
  // Re-confirm the climbed winner at full strength (climb used cheap games).
  best = { p: best.p, s: evaluate(slugs, custs, best.p, N_CONFIRM) };

  const heur = evaluate(slugs, custs, planPlacement(slugs, normalized, custs, DEFAULT_WEIGHTS), N_CONFIRM);
  console.log(`${'='.repeat(64)}\n${t.name}  [${slugs.join(', ')}]`);
  console.log(`  heuristic : avg ${heur.avg.toFixed(1)}%  worst ${heur.worst.toFixed(0)}% (vs ${heur.worstVs})`);
  console.log(`  SEARCHED  : avg ${best.s.avg.toFixed(1)}%  worst ${best.s.worst.toFixed(0)}% (vs ${best.s.worstVs})   ${best.s.avg > heur.avg ? `+${(best.s.avg - heur.avg).toFixed(1)}` : 'no gain'}`);
  console.log(`  tiles: ${best.p.map((q, i) => `${i + 1}:(${q.x},${q.y})`).join(' ')}`);
  slugs.forEach((s, i) => console.log(`     ${i + 1}. ${s}`));
  diagram(best.p).forEach((l) => console.log(l));

  results[t.name] = {
    slugs, heuristic: { placement: planPlacement(slugs, normalized, custs, DEFAULT_WEIGHTS), ...heur },
    searched: { placement: best.p, ...best.s },
  };
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
});

console.log(`\nWritten to ${OUT}`);
