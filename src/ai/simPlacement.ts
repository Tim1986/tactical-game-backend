/**
 * simPlacement.ts — the placement a competent player would actually pick.
 *
 * WHY THIS EXISTS. `buildEncounterState`'s default placement is slot-order:
 * party slot i takes tile i. That default is not neutral, it is INVERTED —
 * in every Unlit Beacon encounter tiles 0-1 are the BACK rank and 2-3 the
 * FRONT, while party order runs hero -> companions. So the default marches
 * the hero to the back and shoves whatever was picked fourth (often the
 * caster) into the enemy's face.
 *
 * Live play fixed this with player agency (the placement picker). The SIM had
 * no such fix and kept fighting from the inverted default, which made every
 * campaign number a floor rather than an estimate — and a floor set by a
 * mistake no player would make twice. e2 read "medium-to-hard" against the
 * default and "very easy" once the owner placed by hand (2026-08-31): a full
 * difficulty band of measurement error, entirely from opening squares.
 *
 * ⚠ THIS IS A SIM-ONLY HEURISTIC. It is deliberately NOT wired into
 * `buildEncounterState`'s default, because changing that would silently
 * re-place units for live play and take the choice away from the player. The
 * sims pass it explicitly; the app passes what the player picked.
 *
 * ⚠ IT MODELS A COMPETENT OPENING, NOT AN OPTIMAL ONE. Melee forward, ranged
 * back is the first thing any player does and the last thing the default did.
 * It is not a search — it does not consider terrain, hazards, objective tiles,
 * or which enemy is the threat. Sim numbers produced with it are still a
 * floor relative to a thoughtful human; they are simply no longer a floor set
 * by an obvious blunder.
 */
import type { BoardPosition } from '../types/matchState.js';
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from './defaultData.js';

/** Reach of a unit's basic attack: 1 for melee, 4-6 for the ranged classes.
 *  Read off the FIRST ability, which is the at-will attack for every class;
 *  specials are excluded on purpose (a Barbarian's Whirlwind is range 0 and a
 *  Cleric's Heal is range 2, neither of which says where the unit stands). */
export function basicReach(slug: string): number {
  const def = DEFAULT_UNITS[slug];
  const first = def?.abilities?.[0];
  const ability = Object.values(DEFAULT_ABILITIES).find((a) => a.slug === first);
  return ability?.range ?? 1;
}

function manhattan(a: BoardPosition, b: BoardPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * `placementOrder` putting melee on the tiles nearest the enemy and ranged on
 * the tiles furthest from it.
 *
 * Returns a permutation of the SAME tile indices the default would have used
 * (`0..n-1`), so the party's footprint on the board is unchanged and only the
 * assignment within it moves. That keeps a re-run comparable to the runs
 * before it in every respect except the one being fixed.
 */
export function frontlineOrder(
  partySlugs: string[],
  playerPlacement: readonly BoardPosition[],
  enemyPlacement: readonly BoardPosition[] = [],
): number[] {
  const n = partySlugs.length;
  const tiles = playerPlacement.slice(0, n);
  if (tiles.length < n) {
    throw new Error(`frontlineOrder: ${n} party slots but only ${tiles.length} placement tiles`);
  }

  // ⚠ NO ENEMIES, NO FRONT. An encounter with nothing to fight (e8 is a pure
  // objective room) has no direction to be forward in, and inventing one —
  // "advance along +x" was the first attempt — is not a heuristic, it is a
  // guess dressed as one. Measured: it cost e8 fifty points of win rate
  // against the plain default. When the information isn't there, change
  // nothing and leave the default alone.
  if (enemyPlacement.length === 0) return tiles.map((_, i) => i);

  // "Forward" = close to the enemy.
  const frontness = (t: BoardPosition): number =>
    -Math.min(...enemyPlacement.map((e) => manhattan(t, e)));

  // Most-forward tile first. Ties broken deterministically so the whole
  // function is a pure permutation of its input — a sim that re-seeds must
  // reproduce the same board.
  const byFront = tiles
    .map((t, i) => ({ i, t }))
    .sort((a, b) => frontness(b.t) - frontness(a.t) || a.t.x - b.t.x || a.t.y - b.t.y || a.i - b.i);

  // Shortest reach first — melee wants the front, artillery wants the back.
  const bySlot = partySlugs
    .map((slug, i) => ({ i, reach: basicReach(slug) }))
    .sort((a, b) => a.reach - b.reach || a.i - b.i);

  const order = new Array<number>(n);
  bySlot.forEach((slot, k) => { order[slot.i] = byFront[k].i; });
  return order;
}
