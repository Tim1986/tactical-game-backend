/**
 * placement.ts — Opening-placement planner ("Auto-Arrange").
 *
 * This is a PLAYER-FACING tool as well as the AI's deployment: the button on the
 * team page calls straight into it, and whatever it returns is what the owner of
 * the team sees and judges. So the bar is not "wins the most games" — it is
 * "produces a formation a player recognises as deliberate, and cannot easily
 * beat by hand". A formation that scores half a point higher but looks like the
 * units were dropped from a height is a worse answer.
 *
 * It must also handle ANY composition. Fable's rosters happen to be 2+2, but a
 * player can bring four of one class, three casters and a healer, or anything
 * else, and every one of those has to come out looking intentional.
 *
 * ── The doctrine ────────────────────────────────────────────────────────────
 * Ranks, not free-form scoring:
 *
 *   melee            -> the FRONT column (x=2), always
 *   ranged / healer  -> the support ranks behind it (x=0-1)
 *   no melee at all  -> the casters become the front rank and step up to x=1-2
 *
 * The optimiser then only chooses ROWS (and how deep each support unit sits).
 * Melee-in-front is therefore a structural guarantee, not something the scoring
 * can trade away for a couple of points — which is exactly how the previous
 * version put a fighter on the back row.
 *
 * ── Why the back rank is column 0 and not column 1 ──────────────────────────
 * This is the non-obvious one, and it is geometry rather than taste. Two units
 * in adjacent columns are Chebyshev-adjacent unless their rows differ by 2+, so
 * pinning the support rank to x=1 forces it away from the melee rows and into
 * the extreme rows 0/7. Enumerated: for 2 melee + 2 support, the number of
 * formations that are all >=2 apart AND avoid rows 0/7 is
 *
 *      support in column 1 ....... 0
 *      support in column 0-1 ... 142
 *
 * So the old planner's scattered, corner-hugging output was not a tuning bug —
 * its own anti-AoE rule left it nowhere else to stand. Letting the support rank
 * drop to x=0 is what makes a compact, spaced, sensible formation possible at
 * all. The cost is one tile of reach, which the brain closes on turn 1.
 *
 * ── Perfect AoE denial is impossible; aim for "not easy" ────────────────────
 * Two units are catchable by one ring-r1 blast at Chebyshev <= 2. Four units all
 * >=3 apart needs four rows pairwise 3 apart inside 8 rows (only 1/4/7 exist,
 * and 7 is an extreme). So SOME Chebyshev-2 pairs are unavoidable. The scoring
 * treats adjacency as effectively forbidden and Chebyshev-2 as a real but
 * payable cost, which is the honest version of the owner's requirement: don't
 * group up for AoE too easily, but stay close enough to support each other.
 *
 * ── Loadout awareness ───────────────────────────────────────────────────────
 * `customizations` is finally used rather than ignored:
 *   - a healer's support rank is checked against its ACTUAL reach (Heal 2,
 *     Ward/Purify 3), so it starts in range of someone instead of guessing;
 *   - a unit carrying a `line` special (Piercing Shot, Flame Jet) pays for an
 *     ally parked in its forward lane, because those hit allies. A unit without
 *     one is happy to shelter directly behind a tank.
 *
 * ── Game facts this file MUST stay in step with (audited 2026-08-09) ────────
 *  Reach:      melee basic range 1, warlock 4, wizard/sorcerer 5, ranger 6.
 *              Movement 3 (rogue 4).
 *  Geometry:   front lines start 3 columns apart (P1 x=2 vs P2 x=5), so melee
 *              from x=2 reach contact on turn 1.
 *  Support:    Heal range 2; Ward and Purify range 3.
 *  AoE shapes: Whirlwind / Ground Slam are `orthogonal` r1 (Manhattan == 1, so
 *              diagonals are safe) and self-centred, threatening the contact
 *              formation rather than the deployment. Ring of Fire/Frost and
 *              Leaping Slam are `ring` r1 — Chebyshev 1 around the centre — and
 *              those DO reach the deploy zone turn 1. Hence Chebyshev spacing.
 *  Friendly fire: line and AoE specials have excludeAllies=false.
 *  Coverage:   range is MANHATTAN, so row offset spends the same budget as
 *              column distance. A range-6 unit in column 1 threatens 9 enemy
 *              tiles from rows 2-5 but only 5 from row 0/7 — hence the pull
 *              toward centre rows for everyone, not just melee.
 *
 * ── What the search says about win rate (2026-08-09) ────────────────────────
 * `placementSearch.ts` optimised placements directly against the field and
 * found +8 points — which then measured +0.0 against opponents placed randomly.
 * Those gains were fitted to the exact tiles the opponents were standing on, not
 * to better formations. Placement swings an individual matchup hugely (sd ~22)
 * but no fixed formation is globally dominant, so there is real freedom here to
 * optimise for legibility. That is what this file does. Do not re-tune these
 * weights toward a win-rate number measured against a static field.
 */

import { BoardPosition, BOARD_WIDTH, BOARD_HEIGHT } from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';
import { DEFAULT_UNITS } from './defaultData.js';

type Role = 'melee' | 'ranged' | 'healer';

/** What the planner needs to know about one unit, from its slug + loadout. */
interface Profile {
  role: Role;
  /** Longest reach of an ally-targeting heal/buff; 0 if it supports nobody. */
  supportRange: number;
  /** Carries a `line` ability, which hits allies standing in the lane. */
  hasLine: boolean;
}

function profile(
  slug: string,
  abilityMap: Map<string, AbilityDefinition>,
  cust?: UnitCustomization,
): Profile {
  const def = DEFAULT_UNITS[slug];
  if (!def) return { role: 'melee', supportRange: 0, hasLine: false };

  const slugs = [...def.abilities];
  if (cust?.specialSlug && !slugs.includes(cust.specialSlug)) slugs.push(cust.specialSlug);
  const abilities = slugs.map((s) => abilityMap.get(s)).filter(Boolean) as AbilityDefinition[];

  const supportAbilities = abilities.filter(
    (a) => a.targetingType !== 'self' && a.effects.some((e) => e.type === 'heal'),
  );
  const supportRange = supportAbilities.reduce((m, a) => Math.max(m, a.range), 0);
  const hasLine = abilities.some((a) => a.targetingType === 'line');

  if (supportAbilities.length > 0) return { role: 'healer', supportRange, hasLine };
  const basic = abilities.find((a) => !a.isSpecial) ?? abilities[0];
  return { role: (basic?.range ?? 1) <= 1 ? 'melee' : 'ranged', supportRange: 0, hasLine };
}

/** All legal P1-zone tiles (x 0–2, the two removed corners excluded). */
const ZONE: BoardPosition[] = [];
for (let x = 0; x <= 2; x++) {
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if ((x === 0 || x === BOARD_WIDTH - 1) && (y === 0 || y === BOARD_HEIGHT - 1)) continue;
    ZONE.push({ x, y });
  }
}

const CENTER_Y = (BOARD_HEIGHT - 1) / 2;

/**
 * Formation costs — LOWER IS BETTER (this is a cost, not a score; the previous
 * version maximised and the sign flip is easy to trip over).
 */
export interface PlacementWeights {
  /** Cost per column for a support unit, index = x. */
  supportCol: [number, number, number];
  /** Same, for a caster team with no melee to hide behind. */
  supportColNoMelee: [number, number, number];
  /** Pull toward the centre rows, per tile of distance. Applies to everyone. */
  centre: number;
  /** Cohesion: cost per row of the team's total vertical span. */
  span: number;
  /** Cost per row the formation's centre of mass sits off the board's middle. */
  balance: number;
  /** AoE denial: an ally within Chebyshev 1, and at exactly Chebyshev 2. */
  adjacent: number;
  cheb2: number;
  /** Cost for each unit a single enemy blast can catch beyond the second. */
  blast: number;
  /** Cost per tile a healer sits beyond its own support range from any ally. */
  outOfReach: number;
  /** Cost for an ally in the forward lane of a unit carrying a line ability. */
  lineOfFire: number;
}

export const DEFAULT_WEIGHTS: PlacementWeights = {
  supportCol: [0, 4, 40],
  supportColNoMelee: [16, 0, 12],
  centre: 5,
  span: 3,
  // `centre` sums each unit's own distance from the middle, which is symmetric:
  // a formation hugging the top ties exactly with its mirror hugging the
  // bottom, and the tie-break then picked whichever the tile order hit first —
  // so teams sat lopsided against an edge. This scores the formation as a whole.
  balance: 8,
  // Effectively forbidden: one blast centred on either unit catches both.
  adjacent: 1000,
  // Real, but frequently unavoidable — so a nudge, not a wall. It has to stay
  // well below `centre` and `span` or it buys spacing at any price: at 30 the
  // planner flung units to rows 0 and 7, and for four melee it preferred the
  // lopsided rows 0/3/5/7 (2 such pairs) over an even 0/2/4/6 (3 pairs).
  cheb2: 6,
  // Two units catchable by one blast is unavoidable (see the geometry note
  // above), so this only bites at three or more — and bites hard, because that
  // is the difference between trading a hit and losing the game on turn one.
  blast: 60,
  outOfReach: 20,
  lineOfFire: 25,
};

/** Cost of a complete arrangement. Order-independent. */
function formationCost(
  tiles: BoardPosition[],
  profiles: Profile[],
  hasMelee: boolean,
  w: PlacementWeights,
): number {
  let cost = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const p = profiles[i];
    if (p.role !== 'melee') {
      cost += (hasMelee ? w.supportCol : w.supportColNoMelee)[t.x];
    }
    cost += Math.abs(t.y - CENTER_Y) * w.centre;
    minY = Math.min(minY, t.y);
    maxY = Math.max(maxY, t.y);

    // A healer that starts outside its own reach of everybody wastes turn 1
    // walking instead of healing.
    if (p.supportRange > 0 && tiles.length > 1) {
      let nearest = Infinity;
      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        nearest = Math.min(nearest, Math.abs(tiles[j].x - t.x) + Math.abs(tiles[j].y - t.y));
      }
      if (nearest > p.supportRange) cost += (nearest - p.supportRange) * w.outOfReach;
    }

    // Line abilities travel toward the enemy (+x) and hit allies en route.
    if (p.hasLine) {
      for (let j = 0; j < tiles.length; j++) {
        if (i === j) continue;
        if (tiles[j].y === t.y && tiles[j].x > t.x) cost += w.lineOfFire;
      }
    }
  }

  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      const cheb = Math.max(Math.abs(tiles[j].x - tiles[i].x), Math.abs(tiles[j].y - tiles[i].y));
      if (cheb <= 1) cost += w.adjacent;
      else if (cheb === 2) cost += w.cheb2;
    }
  }

  // What one enemy blast can actually do to this formation. Counting
  // Chebyshev-2 PAIRS is only a proxy and it fails on tight clusters: a
  // parallelogram of four units has five such pairs yet a single ring centred
  // in the middle of it catches THREE of them. Measure the real thing —
  // the worst ring-r1 blast anywhere on the board.
  let worst = 0;
  for (let cx = 0; cx < BOARD_WIDTH; cx++) {
    for (let cy = 0; cy < BOARD_HEIGHT; cy++) {
      let n = 0;
      for (const t of tiles) {
        if (Math.max(Math.abs(t.x - cx), Math.abs(t.y - cy)) === 1) n++;
      }
      if (n > worst) worst = n;
    }
  }
  if (worst > 2) cost += w.blast * (worst - 2) ** 2;

  if (tiles.length > 1) {
    cost += (maxY - minY) * w.span;
    const meanY = tiles.reduce((a, t) => a + t.y, 0) / tiles.length;
    cost += Math.abs(meanY - CENTER_Y) * w.balance;
  }
  return cost;
}

/**
 * Which tiles each unit may occupy. This is where the doctrine is enforced:
 * restricting melee to the front column both guarantees the shape and shrinks
 * the search by two orders of magnitude (2 melee + 2 support is ~10k
 * arrangements instead of 175k), so the exhaustive pass stays cheap.
 */
function domains(profiles: Profile[], hasMelee: boolean): BoardPosition[][] {
  const front = ZONE.filter((t) => t.x === 2);
  const support = ZONE.filter((t) => (hasMelee ? t.x <= 1 : t.x >= 1));
  return profiles.map((p) => (p.role === 'melee' ? front : support));
}

const planCache = new Map<string, BoardPosition[]>();

/**
 * Plan starting tiles for a team, in the P1 frame (x 0–2, parallel to `slugs`).
 * Mirror with x -> BOARD_WIDTH-1-x for the P2 side.
 *
 * Exhaustive over the doctrine-restricted domains, so the result is the true
 * optimum of `formationCost` rather than a greedy approximation — the greedy
 * version stranded a 4th melee in the back column because it could not see that
 * an earlier choice had used up the front row's spacing. Deterministic (the
 * sims and the UI both depend on that), and memoised by comp because the
 * balance grid calls this tens of thousands of times over a handful of comps.
 */
export function planPlacement(
  slugs: string[],
  abilityMap: Map<string, AbilityDefinition>,
  customizations?: (UnitCustomization | undefined)[],
  weights: PlacementWeights = DEFAULT_WEIGHTS,
): BoardPosition[] {
  const custKey = (customizations ?? []).map((c) => c?.specialSlug ?? '-').join(',');
  const cacheKey = `${slugs.join(',')}|${custKey}|${weights === DEFAULT_WEIGHTS ? 'D' : JSON.stringify(weights)}`;
  const cached = planCache.get(cacheKey);
  if (cached) return cached.map((p) => ({ ...p }));

  const profiles = slugs.map((s, i) => profile(s, abilityMap, customizations?.[i]));
  const hasMelee = profiles.some((p) => p.role === 'melee');
  const doms = domains(profiles, hasMelee);

  // Place the most constrained units first so the search prunes early.
  const order = profiles
    .map((_, i) => i)
    .sort((a, b) => doms[a].length - doms[b].length || a - b);

  let best: BoardPosition[] | null = null;
  let bestCost = Infinity;
  const chosen: BoardPosition[] = new Array(slugs.length);
  const used = new Set<string>();

  const recurse = (depth: number): void => {
    if (depth === order.length) {
      const c = formationCost(chosen, profiles, hasMelee, weights);
      if (c < bestCost) { bestCost = c; best = chosen.map((p) => ({ ...p })); }
      return;
    }
    const i = order[depth];
    for (const tile of doms[i]) {
      const k = `${tile.x},${tile.y}`;
      if (used.has(k)) continue;
      used.add(k);
      chosen[i] = tile;
      recurse(depth + 1);
      used.delete(k);
    }
  };
  recurse(0);

  // Only reachable if a comp somehow can't fit its domain (more melee than
  // front tiles). Fall back to any legal distinct tiles rather than throwing at
  // a player who just tapped Auto-Arrange.
  if (!best) best = slugs.map((_, i) => ZONE[i % ZONE.length]);

  planCache.set(cacheKey, best);
  return best.map((p) => ({ ...p }));
}

export function mirrorPlacement(placement: BoardPosition[]): BoardPosition[] {
  return placement.map((p) => ({ x: BOARD_WIDTH - 1 - p.x, y: p.y }));
}
