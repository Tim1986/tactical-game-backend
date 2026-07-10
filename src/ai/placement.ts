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

const COL_PREF: Record<Role, [number, number, number]> = {
  // score for x = 0, 1, 2
  melee:  [0, 15, 30],
  ranged: [15, 20, -10],
  healer: [25, 10, -15],
};

const CENTER_Y = (BOARD_HEIGHT - 1) / 2;

function tileScore(role: Role, tile: BoardPosition, placed: BoardPosition[]): number {
  let s = COL_PREF[role][tile.x];
  // Melee want the center of the line (fastest to engage anywhere);
  // ranged/healers drift slightly toward the edges (harder to collapse on).
  const edgeDist = Math.abs(tile.y - CENTER_Y);
  s += role === 'melee' ? -edgeDist * 2 : edgeDist * 1;
  // AoE denial: never adjacent to an already-placed ally; Chebyshev 2 is
  // mildly discouraged too.
  for (const p of placed) {
    const cheb = Math.max(Math.abs(p.x - tile.x), Math.abs(p.y - tile.y));
    if (cheb <= 1) s -= 100;
    else if (cheb === 2) s -= 8;
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
): BoardPosition[] {
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
      const s = tileScore(role, tile, placed);
      if (s > bestScore) { bestScore = s; best = tile; }
    }
    if (!best) throw new Error('planPlacement: zone exhausted');
    placed.push(best);
    result[i] = best;
  }
  return result;
}

export function mirrorPlacement(placement: BoardPosition[]): BoardPosition[] {
  return placement.map((p) => ({ x: BOARD_WIDTH - 1 - p.x, y: p.y }));
}
