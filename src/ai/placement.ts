/**
 * placement.ts — Opening-placement planner for the AI brain.
 *
 * Placement is a real strategic layer, so the sim harness (and eventually
 * Fable's PvE team setup) should not place randomly. The heuristic here is
 * deliberately "moderately intelligent":
 *
 *  - Melee units go forward (x=2) near the vertical center; ranged units sit
 *    in the middle column; healers/support hide in the back column.
 *  - A defensive comp (no melee) naturally ends up hugging the backline.
 *  - AoE denial: allies never start adjacent (Chebyshev 1 — a radius-1 blast
 *    centered on either would clip both), and being within Chebyshev 2 is
 *    mildly penalized (one blast placed between them can still hit both).
 *
 * The plan is deterministic for a given comp — game-to-game variance comes
 * from the fortune meter's random phase, not from placement dice.
 *
 * ── Game facts this file MUST stay in step with (audited 2026-08-09) ────────
 * Re-check these against gameData whenever abilities are rebalanced; the
 * weights below are only as good as these numbers.
 *
 *  Reach:      melee basic range 1 (fighter/barbarian/rogue), warlock 4,
 *              wizard/sorcerer 5, ranger 6. Movement 3 (rogue 4).
 *  Geometry:   the front lines start 3 columns apart (P1 x=2 vs P2 x=5), so
 *              melee from x=2 reach contact on turn 1 and long-ranged units
 *              can already shoot from x=1 at deployment.
 *  Support:    Heal range 2; Ward and Purify range 3. (A previous comment here
 *              claimed heal was "touch-range (1)" — WRONG, and it justified
 *              pinning healers one column behind the front. Corrected.)
 *  AoE shapes: no ability uses plain chebyshev. Whirlwind / Ground Slam are
 *              `orthogonal` r1 — Manhattan == 1 only, so DIAGONAL neighbours
 *              are safe from them — and they are self-centred, meaning they
 *              threaten the contact formation, not the deployment. The placed
 *              ones (Ring of Fire r5, Ring of Frost r4, Leaping Slam r2) are
 *              `ring` r1 — Chebyshev 1 around the centre, centre spared — and
 *              those DO reach the deploy zone on turn 1, which is what the
 *              Chebyshev-based spacing penalty below is actually defending
 *              against.
 *  Friendly fire: Piercing Shot, Flame Jet (line) and every AoE above have
 *              excludeAllies=false — they hit your own units. A ranged unit
 *              with a line special wants a clear lane toward the enemy.
 *  Coverage:   range is MANHATTAN, so row offset is spent from the same budget
 *              as column distance. Measured: a range-6 unit in column 1
 *              threatens 9 enemy-zone tiles from rows 2-5 but only 5 from row
 *              0 or 7 — a 44% loss for sitting on an edge row.
 *
 * ── SWEEP RESULT 2026-08-09: these weights are already near-optimal ─────────
 * `placementSweep.ts` A/B-tested 11 weight variants against these defaults.
 * DO NOT re-tune from theory alone — the theory loses. What was measured:
 *
 *   vs varied opponents (12x12 round robin, n≈15.6k decided games each)
 *     baseline (control, both sides same weights) ...... 50.41%
 *     adjacent 100 -> 20 ............................... 50.40%   no effect
 *     ranged rowBias +1 -> 0, adj 20, cohesion 4 ....... 50.0%    no effect
 *   effect-size bound (deliberately bad placements)
 *     all four clumped in the BACK column .............. 46.8%    -3.6
 *     all four clumped on the FRONT line ............... 42.4%    -8.0
 *
 * So placement is worth up to ~8 points, and this heuristic already sits at
 * the top of that range: every sensible variant tested is statistically
 * indistinguishable from it. Two traps for whoever revisits this:
 *
 *  1. MIRROR MATCHES LIE. Testing a variant against itself (same comp both
 *     sides) rated these same variants at 53-57% — a 5-10x exaggeration —
 *     because identical armies make the game a knife-edge that any consistent
 *     nudge decides. One team swung to 93% off a ONE-TILE cleric move. Always
 *     confirm against varied opponents.
 *  2. The coverage/orphaning/AoE-spacing arguments above are analytically
 *     correct and still produced NO win-rate gain: the brain repositions on
 *     turn 1-2, so deployment nuance washes out. Only gross errors (clumping,
 *     melee stranded in the back column) actually cost games.
 */

import { BoardPosition, BOARD_WIDTH, BOARD_HEIGHT } from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';
import { DEFAULT_UNITS } from './defaultData.js';

type Role = 'melee' | 'ranged' | 'healer';

function classify(slug: string, abilityMap: Map<string, AbilityDefinition>): Role {
  const def = DEFAULT_UNITS[slug];
  if (!def) return 'melee';
  const abilities = def.abilities.map((s) => abilityMap.get(s)).filter(Boolean) as AbilityDefinition[];
  // Healer: any ability that heals someone other than the caster.
  if (abilities.some((a) => a.targetingType !== 'self' && a.effects.some((e) => e.type === 'heal'))) {
    return 'healer';
  }
  const basic = abilities.find((a) => !a.isSpecial) ?? abilities[0];
  return (basic?.range ?? 1) <= 1 ? 'melee' : 'ranged';
}

/** All legal P1-zone tiles (x 0–2, four extreme corners excluded). */
const ZONE: BoardPosition[] = [];
for (let x = 0; x <= 2; x++) {
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if ((x === 0 || x === BOARD_WIDTH - 1) && (y === 0 || y === BOARD_HEIGHT - 1)) continue;
    ZONE.push({ x, y });
  }
}

/**
 * Tunable placement weights. Defaults are the historical values so behaviour is
 * unchanged until a sweep proves an alternative better; `placementSweep.ts`
 * varies these head-to-head and reports win rates.
 */
export interface PlacementWeights {
  /** Column preference per role, score for x = 0, 1, 2. */
  col: Record<Role, [number, number, number]>;
  /** Row preference: score multiplier on distance from centre row. NEGATIVE
   *  pulls toward the centre, POSITIVE pushes to the edges. */
  rowBias: Record<Role, number>;
  /** Healer pull toward the nearest already-placed ally (per tile of distance). */
  healerCohesion: number;
  /** AoE-denial penalty for an ally within Chebyshev 1 / exactly 2. */
  adjacent: number;
  cheb2: number;
  /** Penalty for an ally sitting on one of the 8 rays out of this tile —
   *  line specials (Piercing Shot, Flame Jet) hit allies in the lane. Only
   *  applied to ranged units. 0 disables. */
  lineOfFire: number;
}

export const DEFAULT_WEIGHTS: PlacementWeights = {
  col: {
    melee:  [0, 15, 30],
    ranged: [15, 20, -10],
    // Support reach is 2–3 (Heal 2, Ward/Purify 3), NOT 1 as an earlier comment
    // claimed — a healer does not have to hug the front line to be useful.
    healer: [10, 25, -5],
  },
  rowBias: { melee: -2, healer: -1.5, ranged: 1 },
  healerCohesion: 2,
  adjacent: 100,
  cheb2: 8,
  lineOfFire: 0,
};

const CENTER_Y = (BOARD_HEIGHT - 1) / 2;

function tileScore(role: Role, tile: BoardPosition, placed: BoardPosition[], w: PlacementWeights): number {
  let s = w.col[role][tile.x];
  const edgeDist = Math.abs(tile.y - CENTER_Y);
  s += edgeDist * w.rowBias[role];
  if (role === 'healer' && placed.length > 0) {
    const nearest = Math.min(
      ...placed.map((p) => Math.abs(p.x - tile.x) + Math.abs(p.y - tile.y)),
    );
    s -= nearest * w.healerCohesion;
  }
  // AoE denial. Chebyshev is the right metric here: the placed AoEs that can
  // reach the deploy zone on turn 1 (Ring of Fire/Frost) are `ring` shaped, so
  // a blast centred between two allies catches both at Chebyshev <= 2.
  for (const p of placed) {
    const cheb = Math.max(Math.abs(p.x - tile.x), Math.abs(p.y - tile.y));
    if (cheb <= 1) s -= w.adjacent;
    else if (cheb === 2) s -= w.cheb2;
  }
  // Friendly fire: line specials hit allies in the lane, so a ranged unit
  // pays for having an ally on one of its 8 rays toward the enemy.
  if (w.lineOfFire > 0 && role === 'ranged') {
    for (const p of placed) {
      const dx = p.x - tile.x, dy = p.y - tile.y;
      if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) s -= w.lineOfFire;
    }
  }
  return s;
}

/**
 * Plan starting tiles for a team, in the P1 frame (x 0–2, parallel to
 * `slugs`). Mirror with x → BOARD_WIDTH-1-x for the P2 side.
 * `customizations` currently doesn't change roles (specials don't alter the
 * basic attack) but is accepted so loadout-aware placement can evolve.
 */
export function planPlacement(
  slugs: string[],
  abilityMap: Map<string, AbilityDefinition>,
  _customizations?: (UnitCustomization | undefined)[],
  weights: PlacementWeights = DEFAULT_WEIGHTS,
): BoardPosition[] {
  const cacheKey = slugs.join(',') + '|' + (weights === DEFAULT_WEIGHTS ? 'D' : JSON.stringify(weights));
  const cached = planCache.get(cacheKey);
  if (cached) return cached.map((p) => ({ ...p }));

  const roles = slugs.map((s) => classify(s, abilityMap));
  // Place melee first (they claim the contested forward tiles), then ranged,
  // then healers; heavier melee first as a stable tie-break.
  const order = slugs
    .map((slug, i) => ({ i, role: roles[i], hp: DEFAULT_UNITS[slug]?.maxHealth ?? 0 }))
    .sort((a, b) => {
      const rank: Record<Role, number> = { melee: 0, ranged: 1, healer: 2 };
      return rank[a.role] - rank[b.role] || b.hp - a.hp || a.i - b.i;
    });

  const placed: BoardPosition[] = [];
  const result: BoardPosition[] = Array(slugs.length);
  for (const { i, role } of order) {
    let best: BoardPosition | null = null;
    let bestScore = -Infinity;
    for (const tile of ZONE) {
      if (placed.some((p) => p.x === tile.x && p.y === tile.y)) continue;
      const s = tileScore(role, tile, placed, weights);
      if (s > bestScore) { bestScore = s; best = tile; }
    }
    if (!best) throw new Error('planPlacement: zone exhausted');
    placed.push(best);
    result[i] = best;
  }

  const optimized = optimize(result, roles, weights);
  planCache.set(cacheKey, optimized);
  return optimized.map((p) => ({ ...p }));
}

/**
 * Solo (non-pairwise) desirability of one tile for one role.
 * Mirrors tileScore's first two terms; the pairwise terms live in totalScore.
 */
function soloScore(role: Role, tile: BoardPosition, w: PlacementWeights): number {
  const edgeDist = Math.abs(tile.y - CENTER_Y);
  return w.col[role][tile.x] + edgeDist * w.rowBias[role];
}

/** Order-independent score of a whole arrangement — what `repair` maximizes. */
function totalScore(tiles: BoardPosition[], roles: Role[], w: PlacementWeights): number {
  let s = 0;
  for (let i = 0; i < tiles.length; i++) {
    s += soloScore(roles[i], tiles[i], w);
    // Healers want to start near a patient (heal is touch-range).
    if (roles[i] === 'healer' && tiles.length > 1) {
      let nearest = Infinity;
      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        nearest = Math.min(nearest, Math.abs(tiles[j].x - tiles[i].x) + Math.abs(tiles[j].y - tiles[i].y));
      }
      if (nearest !== Infinity) s -= nearest * w.healerCohesion;
    }
    // AoE denial, counted once per pair.
    for (let j = i + 1; j < tiles.length; j++) {
      const cheb = Math.max(Math.abs(tiles[j].x - tiles[i].x), Math.abs(tiles[j].y - tiles[i].y));
      if (cheb <= 1) s -= w.adjacent;
      else if (cheb === 2) s -= w.cheb2;
    }
    if (w.lineOfFire > 0 && roles[i] === 'ranged') {
      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        const dx = tiles[j].x - tiles[i].x, dy = tiles[j].y - tiles[i].y;
        if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) s -= w.lineOfFire;
      }
    }
  }
  return s;
}

/**
 * Improve on the greedy result by SEARCHING, not nudging.
 *
 * The greedy pass is myopic — it commits to the best tile for the unit in front
 * of it and cannot see that the choice strands a later one. With four melee it
 * takes the front column at y=3, then 6, then 0, after which every remaining
 * front tile is adjacent to something, so the fourth melee is exiled to the
 * BACK column (owner-reported: "it put one of my fighters on my back row").
 * y = 0/2/4/6 seats all four up front with no adjacency at all.
 *
 * Hill-climbing cannot fix that: escaping needs TWO units to move at once, so
 * the greedy answer is a local optimum. For a standard 4-unit team the whole
 * space is only P(22,4) = 175,560 arrangements, so search it exhaustively and
 * take the true optimum. Larger teams (none today) keep the greedy answer
 * rather than risk a blow-up.
 *
 * Results are memoized by comp: roles depend only on slugs, so the balance grid
 * — tens of thousands of runSim calls over 28 distinct pairs — pays for this
 * once per comp rather than once per call.
 */
const planCache = new Map<string, BoardPosition[]>();

function optimize(greedy: BoardPosition[], roles: Role[], w: PlacementWeights): BoardPosition[] {
  if (roles.length > 4) return greedy;

  let best = [...greedy];
  let bestScore = totalScore(greedy, roles, w);
  const chosen: BoardPosition[] = new Array(roles.length);
  const used = new Array(ZONE.length).fill(false);

  const recurse = (depth: number): void => {
    if (depth === roles.length) {
      const s = totalScore(chosen, roles, w);
      // Strictly-better only, over a fixed iteration order — deterministic,
      // which the sims depend on.
      if (s > bestScore) { bestScore = s; best = [...chosen]; }
      return;
    }
    for (let t = 0; t < ZONE.length; t++) {
      if (used[t]) continue;
      used[t] = true;
      chosen[depth] = ZONE[t];
      recurse(depth + 1);
      used[t] = false;
    }
  };
  recurse(0);
  return best;
}

export function mirrorPlacement(placement: BoardPosition[]): BoardPosition[] {
  return placement.map((p) => ({ x: BOARD_WIDTH - 1 - p.x, y: p.y }));
}
