/**
 * Balance simulation harness.
 * Runs headless matches between bot-controlled teams and reports win rates.
 *
 * Usage:
 *   npx tsx scripts/sim.ts
 *   npx tsx scripts/sim.ts --games 500
 *   npx tsx scripts/sim.ts --team1 fighter,fighter,fighter,fighter --team2 cleric,wizard,sorcerer,warlock
 */

import { processTurn } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance, TurnAction } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

// ─── Inline data (mirrors seed.ts — no DB needed) ────────────────────────────

const ABILITY_MAP = new Map<string, AbilityDefinition>([
  ['sword',      { id: 'a1',  slug: 'sword',      name: 'Strike',         description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 10, damageType: 'physical' }] }],
  ['second_wind',{ id: 'a2',  slug: 'second_wind',name: 'First Aid',      description: '', targetingType: 'self',   range: 0, areaRadius: 0, cooldownTurns: 99, isUnblockable: false, effects: [{ type: 'heal',   formula: 'flat', value: 20 }] }],
  ['strike',     { id: 'a3',  slug: 'strike',     name: 'Strike',         description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 15, damageType: 'physical' }] }],
  ['whirlwind',  { id: 'a4',  slug: 'whirlwind',  name: 'Whirlwind',      description: '', targetingType: 'aoe',    range: 0, areaRadius: 1, cooldownTurns: 99, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 15, damageType: 'physical' }] }],
  ['mace',       { id: 'a5',  slug: 'mace',       name: 'Mace',           description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 8,  damageType: 'physical' }] }],
  ['heal',       { id: 'a6',  slug: 'heal',       name: 'Heal',           description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99, isUnblockable: false, canTargetAlly: true, effects: [{ type: 'heal', formula: 'flat', value: 30 }] }],
  ['twin',       { id: 'a7',  slug: 'twin',       name: 'Twin Strike',    description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'physical' }] }],
  ['assassinate',{ id: 'a8',  slug: 'assassinate',name: 'Kill Shot',      description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 9999, damageType: 'true', healthThreshold: 20 }] }],
  ['arrow',      { id: 'a9',  slug: 'arrow',      name: 'Arrow',          description: '', targetingType: 'single', range: 6, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 12, damageType: 'physical' }] }],
  ['piercing',   { id: 'a10', slug: 'piercing',   name: 'Piercing Shot',  description: '', targetingType: 'line',   range: 6, areaRadius: 0, cooldownTurns: 99, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 12, damageType: 'physical' }] }],
  ['bolt',       { id: 'a11', slug: 'bolt',       name: 'Arcane Bolt',    description: '', targetingType: 'single', range: 5, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 8,  damageType: 'magical' }] }],
  ['ffh',        { id: 'a12', slug: 'ffh',        name: 'Firestorm',       description:'', targetingType: 'aoe',    range: 3, areaRadius: 1, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 14, damageType: 'magical' }] }],
  ['eldritch',   { id: 'a13', slug: 'eldritch',   name: 'Demon Blast',    description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 0, isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 12, damageType: 'true' }] }],
  ['fear',       { id: 'a14', slug: 'fear',       name: 'Fear',           description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'push', direction: 'away_from_caster', distance: 3 }, { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 }] }],
  ['missile',    { id: 'a15', slug: 'missile',    name: 'Ice Blast',      description: '', targetingType: 'single', range: 5, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 8,  damageType: 'magical' }] }],
  ['freeze',     { id: 'a16', slug: 'freeze',     name: 'Freeze',         description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'apply_status', statusSlug: 'stunned', stacks: 1, durationTurns: 2 }] }],
]);

interface UnitTemplate { slug: string; name: string; maxHealth: number; armorClass: number; movementRange: number; abilities: string[]; }

const UNIT_TEMPLATES: Record<string, UnitTemplate> = {
  fighter:   { slug: 'fighter',   name: 'Fighter',   maxHealth: 42, armorClass: 17, movementRange: 3, abilities: ['sword',    'second_wind'] },
  barbarian: { slug: 'barbarian', name: 'Barbarian', maxHealth: 45, armorClass: 15, movementRange: 3, abilities: ['strike',   'whirlwind']   },
  ranger:    { slug: 'ranger',    name: 'Ranger',    maxHealth: 38, armorClass: 16, movementRange: 3, abilities: ['arrow',    'piercing']    },
  rogue:     { slug: 'rogue',     name: 'Rogue',     maxHealth: 35, armorClass: 15, movementRange: 4, abilities: ['twin',     'assassinate'] },
  cleric:    { slug: 'cleric',    name: 'Cleric',    maxHealth: 40, armorClass: 16, movementRange: 3, abilities: ['mace',     'heal']        },
  wizard:    { slug: 'wizard',    name: 'Wizard',    maxHealth: 30, armorClass: 14, movementRange: 3, abilities: ['missile',  'freeze']      },
  sorcerer:  { slug: 'sorcerer',  name: 'Sorcerer',  maxHealth: 30, armorClass: 14, movementRange: 3, abilities: ['bolt',     'ffh']         },
  warlock:   { slug: 'warlock',   name: 'Warlock',   maxHealth: 32, armorClass: 15, movementRange: 3, abilities: ['eldritch', 'fear']        },
};

// ─── Starting positions ───────────────────────────────────────────────────────

// 8×8 board (corners excluded) — mirrors matchService.ts starting positions
const P1_START_POSITIONS = [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
const P2_START_POSITIONS = [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }];

let instanceCounter = 0;
function makeInstance(template: UnitTemplate, owner: string, pos: { x: number; y: number }): UnitInstance {
  instanceCounter++;
  return {
    instanceId: `${template.slug}-${owner}-${instanceCounter}`,
    definitionSlug: template.slug,
    ownerPlayerId: owner,
    position: pos,
    currentHealth: template.maxHealth,
    maxHealth: template.maxHealth,
    armorClass: template.armorClass,
    movementRange: template.movementRange,
    abilities: template.abilities,
    passives: [],
    isAlive: true,
    hasMovedThisTurn: false,
    hasActedThisTurn: false,
    cooldowns: {},
    statusEffects: [],
  };
}

// ─── Bot AI ──────────────────────────────────────────────────────────────────

function chebyshev(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isOccupied(units: UnitInstance[], pos: { x: number; y: number }, excludeId: string): boolean {
  return units.some((u) => u.isAlive && u.instanceId !== excludeId && u.position.x === pos.x && u.position.y === pos.y);
}

function reachableSquares(unit: UnitInstance, state: MatchState): { x: number; y: number }[] {
  const squares: { x: number; y: number }[] = [unit.position];
  const range = unit.movementRange;
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.abs(dx) + Math.abs(dy) > range) continue;
      const pos = { x: unit.position.x + dx, y: unit.position.y + dy };
      if (pos.x < 0 || pos.x > 7 || pos.y < 0 || pos.y > 7) continue;
      if (isOccupied(state.units, pos, unit.instanceId)) continue;
      squares.push(pos);
    }
  }
  return squares;
}

function getSpecial(unit: UnitInstance): { slug: string; ab: AbilityDefinition } | null {
  for (const slug of unit.abilities) {
    const ab = ABILITY_MAP.get(slug);
    if (ab && ab.cooldownTurns > 0 && (unit.cooldowns[slug] ?? 0) === 0) return { slug, ab };
  }
  return null;
}

function getBasic(unit: UnitInstance): { slug: string; ab: AbilityDefinition } | null {
  for (const slug of unit.abilities) {
    const ab = ABILITY_MAP.get(slug);
    if (ab && ab.cooldownTurns === 0) return { slug, ab };
  }
  return null;
}

function isMeleeUnit(unit: UnitInstance): boolean {
  const b = getBasic(unit);
  return b ? b.ab.range <= 1 : false;
}

// Returns the best position + target for a unit's special, or null if no efficient play exists from any reachable square.
function evalSpecial(
  unit: UnitInstance,
  state: MatchState,
  enemies: UnitInstance[],
  allies: UnitInstance[],
): { movePos: { x: number; y: number }; targetPos: { x: number; y: number } } | null {
  const sp = getSpecial(unit);
  if (!sp) return null;

  const slug = unit.definitionSlug;
  const squares = reachableSquares(unit, state);

  for (const from of squares) {
    let targetPos: { x: number; y: number } | null = null;

    if (slug === 'barbarian') {
      // Whirlwind: 15 dmg to all adjacent, blockable. Efficient if hits 2+ enemies without hitting allies.
      const adjEnemies = enemies.filter(e => chebyshev(from, e.position) <= 1);
      const adjAllies  = allies.filter(a => a.instanceId !== unit.instanceId && chebyshev(from, a.position) <= 1);
      if (adjAllies.length > 0) continue;
      if (adjEnemies.length >= 2) targetPos = from;

    } else if (slug === 'cleric') {
      // Heal: efficient if an ally is missing ≥ 25 HP within range 1.
      const target = allies
        .filter(a => a.instanceId !== unit.instanceId && chebyshev(from, a.position) <= sp.ab.range && (a.maxHealth - a.currentHealth) >= 25)
        .sort((a, b) => a.currentHealth - b.currentHealth)[0];
      if (target) targetPos = target.position;

    } else if (slug === 'fighter') {
      // First Aid: efficient if self is missing ≥ 18 HP.
      if ((unit.maxHealth - unit.currentHealth) >= 18) targetPos = from;

    } else if (slug === 'ranger') {
      // Piercing Shot: line, 10 dmg, blockable. Efficient if hits 2+ enemies without hitting allies.
      const DIRS = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
      let bestCount = 0;
      let bestEnd: { x: number; y: number } | null = null;
      for (const { dx, dy } of DIRS) {
        let hitEnemies = 0;
        let allyHit = false;
        for (let i = 1; i <= sp.ab.range; i++) {
          const pos = { x: from.x + dx * i, y: from.y + dy * i };
          const enemy = enemies.find(e => e.position.x === pos.x && e.position.y === pos.y);
          const ally  = allies.find(a => a.instanceId !== unit.instanceId && a.position.x === pos.x && a.position.y === pos.y);
          if (ally) { allyHit = true; break; }
          if (enemy) hitEnemies++;
        }
        if (allyHit) continue;
        if (hitEnemies >= 2 && hitEnemies > bestCount) {
          bestCount = hitEnemies;
          bestEnd = { x: from.x + dx * sp.ab.range, y: from.y + dy * sp.ab.range };
        }
      }
      if (bestEnd) targetPos = bestEnd;

    } else if (slug === 'rogue') {
      // Kill Shot: kills any adjacent enemy at ≤ 20 HP.
      const target = enemies.find(e => chebyshev(from, e.position) <= sp.ab.range && e.currentHealth <= 20);
      if (target) targetPos = target.position;

    } else if (slug === 'sorcerer') {
      // Firestorm: 3x3 AoE, range 3. Efficient if hits 3+ enemies without hitting allies.
      let bestCount = 0;
      let bestCenter: { x: number; y: number } | null = null;
      for (const enemy of enemies) {
        if (chebyshev(from, enemy.position) > sp.ab.range) continue;
        const center = enemy.position;
        const hitEnemies = enemies.filter(e => chebyshev(center, e.position) <= sp.ab.areaRadius).length;
        const hitAllies  = allies.filter(a => a.instanceId !== unit.instanceId && chebyshev(center, a.position) <= sp.ab.areaRadius).length;
        if (hitAllies === 0 && hitEnemies >= 2 && hitEnemies > bestCount) { bestCount = hitEnemies; bestCenter = center; }
      }
      if (bestCenter) targetPos = bestCenter;

    } else if (slug === 'warlock') {
      // Fear: push a melee enemy 3 tiles + root 1 turn. Efficient if a melee enemy is in range 4.
      const target = enemies.find(e => chebyshev(from, e.position) <= sp.ab.range && isMeleeUnit(e));
      if (target) targetPos = target.position;

    } else if (slug === 'wizard') {
      // Freeze: efficient if no other friendly unit has their special available, and there's a target in range.
      const otherAllyHasSpecial = allies.some(a => a.instanceId !== unit.instanceId && getSpecial(a) !== null);
      if (!otherAllyHasSpecial) {
        const target = enemies
          .filter(e => chebyshev(from, e.position) <= sp.ab.range)
          .sort((a, b) => a.currentHealth - b.currentHealth)[0];
        if (target) targetPos = target.position;
      }
    }

    if (targetPos) {
      // For ranged units, prefer squares farthest from enemies while still valid.
      // We'll keep the first valid square found and let the farthest-move logic handle positioning.
      return { movePos: from, targetPos };
    }
  }
  return null;
}

// Find optimal basic attack: target lowest-HP reachable enemy, move optimally.
function evalBasic(
  unit: UnitInstance,
  state: MatchState,
  enemies: UnitInstance[],
): { movePos: { x: number; y: number }; targetPos: { x: number; y: number } } | null {
  const basic = getBasic(unit);
  if (!basic) return null;

  const squares = reachableSquares(unit, state);
  const isRanged = basic.ab.range > 1;

  // Find all reachable targets (lowest HP first)
  const reachableTargets = enemies
    .filter(e => squares.some(sq => chebyshev(sq, e.position) <= basic.ab.range))
    .sort((a, b) => a.currentHealth - b.currentHealth);

  if (reachableTargets.length === 0) return null;

  const target = reachableTargets[0];
  const validSquares = squares.filter(sq => chebyshev(sq, target.position) <= basic.ab.range);

  let movePos: { x: number; y: number };
  if (isRanged) {
    // Stay as far from target as possible while still in range.
    movePos = validSquares.reduce((best, sq) =>
      chebyshev(sq, target.position) >= chebyshev(best, target.position) ? sq : best
    , validSquares[0]);
  } else {
    // Melee: any adjacent square works; pick closest to minimise distance walked.
    movePos = validSquares.reduce((best, sq) =>
      manhattan(sq, unit.position) <= manhattan(best, unit.position) ? sq : best
    , validSquares[0]);
  }

  return { movePos, targetPos: target.position };
}

function findMoveToward(state: MatchState, unit: UnitInstance, targetPos: { x: number; y: number }): { x: number; y: number } | null {
  const range = unit.movementRange;
  let best: { x: number; y: number } | null = null;
  let bestDist = manhattan(unit.position, targetPos);
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      if (Math.abs(dx) + Math.abs(dy) > range) continue;
      if (dx === 0 && dy === 0) continue;
      const pos = { x: unit.position.x + dx, y: unit.position.y + dy };
      if (pos.x < 0 || pos.x > 7 || pos.y < 0 || pos.y > 7) continue;
      if (isOccupied(state.units, pos, unit.instanceId)) continue;
      const d = manhattan(pos, targetPos);
      if (d < bestDist) { bestDist = d; best = pos; }
    }
  }
  return best;
}

function botActions(state: MatchState, playerId: string): TurnAction[] {
  const actions: TurnAction[] = [];
  const myUnits = state.units.filter(u => u.isAlive && u.ownerPlayerId === playerId);
  const enemies = () => state.units.filter(u => u.isAlive && u.ownerPlayerId !== playerId);
  const allies  = () => state.units.filter(u => u.isAlive && u.ownerPlayerId === playerId);

  // Priority: units with efficient specials first, then units that can basic attack, then rest.
  const withSpecial  = myUnits.filter(u => !u.statusEffects.some(se => se.slug === 'stunned') && evalSpecial(u, state, enemies(), allies()) !== null);
  const withBasic    = myUnits.filter(u => !u.statusEffects.some(se => se.slug === 'stunned') && !withSpecial.includes(u) && evalBasic(u, state, enemies()) !== null);
  const passive      = myUnits.filter(u => !withSpecial.includes(u) && !withBasic.includes(u));
  const orderedUnits = [...withSpecial, ...withBasic, ...passive];

  for (const unit of orderedUnits) {
    if (unit.statusEffects.some(se => se.slug === 'stunned')) continue;

    const curEnemies = enemies();
    const curAllies  = allies();

    // Try special first.
    const spPlay = evalSpecial(unit, state, curEnemies, curAllies);
    if (spPlay) {
      const sp = getSpecial(unit)!;
      if (spPlay.movePos.x !== unit.position.x || spPlay.movePos.y !== unit.position.y) {
        actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: spPlay.movePos });
        unit.position = spPlay.movePos;
        unit.hasMovedThisTurn = true;
      }
      actions.push({ type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: sp.slug, target: spPlay.targetPos });
      unit.hasActedThisTurn = true;
      continue;
    }

    // Basic attack on optimal target.
    const basicPlay = evalBasic(unit, state, curEnemies);
    if (basicPlay) {
      const basic = getBasic(unit)!;
      if (basicPlay.movePos.x !== unit.position.x || basicPlay.movePos.y !== unit.position.y) {
        actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: basicPlay.movePos });
        unit.position = basicPlay.movePos;
        unit.hasMovedThisTurn = true;
      }
      actions.push({ type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: basic.slug, target: basicPlay.targetPos });
      unit.hasActedThisTurn = true;
      continue;
    }

    // No attack reachable — move toward nearest enemy.
    if (!unit.hasMovedThisTurn && curEnemies.length > 0) {
      const nearest = curEnemies.reduce((a, b) => manhattan(unit.position, a.position) <= manhattan(unit.position, b.position) ? a : b);
      const best = findMoveToward(state, unit, nearest.position);
      if (best) {
        actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: best });
        unit.position = best;
        unit.hasMovedThisTurn = true;
      }
    }
  }

  actions.push({ type: 'END_TURN' });
  return actions;
}

// ─── Match runner ─────────────────────────────────────────────────────────────

const MAX_TURNS = 80; // safety cap to prevent infinite loops

function runMatch(team1Slugs: string[], team2Slugs: string[]): { winner: 1 | 2 | 'draw'; turns: number } {
  const P1 = 'player-one';
  const P2 = 'player-two';

  const units: UnitInstance[] = [
    ...team1Slugs.map((s, i) => makeInstance(UNIT_TEMPLATES[s], P1, P1_START_POSITIONS[i])),
    ...team2Slugs.map((s, i) => makeInstance(UNIT_TEMPLATES[s], P2, P2_START_POSITIONS[i])),
  ];

  let state: MatchState = {
    board: { width: 8, height: 8 },
    units,
    turnNumber: 1,
    activePlayerId: P1,
    phase: 'action',
  };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const activeId = state.activePlayerId;
    const actions = botActions(state, activeId);

    try {
      const result = processTurn(state, actions, activeId, P1, P2, ABILITY_MAP);
      state = result.updatedState;
      if (result.matchOver) {
        const winner = result.winnerId === P1 ? 1 : result.winnerId === P2 ? 2 : 'draw';
        return { winner, turns: turn + 1 };
      }
    } catch {
      // Bot produced an illegal action — skip to END_TURN
      try {
        const result = processTurn(state, [{ type: 'END_TURN' }], activeId, P1, P2, ABILITY_MAP);
        state = result.updatedState;
      } catch { break; }
    }
  }

  // Hit turn cap — declare draw or winner by remaining HP
  const p1Hp = state.units.filter((u) => u.ownerPlayerId === P1 && u.isAlive).reduce((s, u) => s + u.currentHealth, 0);
  const p2Hp = state.units.filter((u) => u.ownerPlayerId === P2 && u.isAlive).reduce((s, u) => s + u.currentHealth, 0);
  return { winner: p1Hp > p2Hp ? 1 : p2Hp > p1Hp ? 2 : 'draw', turns: MAX_TURNS };
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function teamLabel(slugs: string[]): string {
  const counts: Record<string, number> = {};
  for (const s of slugs) counts[s] = (counts[s] ?? 0) + 1;
  return Object.entries(counts).map(([s, n]) => n > 1 ? `${n}×${s}` : s).join(', ');
}

function runMatchup(team1: string[], team2: string[], games: number): void {
  let p1Wins = 0, p2Wins = 0, draws = 0, totalTurns = 0;
  for (let i = 0; i < games; i++) {
    const { winner, turns } = runMatch(team1, team2);
    if (winner === 1) p1Wins++;
    else if (winner === 2) p2Wins++;
    else draws++;
    totalTurns += turns;
  }
  const t1 = teamLabel(team1).padEnd(38);
  const t2 = teamLabel(team2).padEnd(38);
  const w1 = `${((p1Wins / games) * 100).toFixed(1)}%`.padStart(6);
  const w2 = `${((p2Wins / games) * 100).toFixed(1)}%`.padStart(6);
  const avgT = (totalTurns / games).toFixed(1).padStart(5);
  console.log(`  ${t1} vs ${t2}  │  ${w1} / ${w2}  │ avg ${avgT} turns`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const gamesArg = args.indexOf('--games');
const GAMES = gamesArg !== -1 ? parseInt(args[gamesArg + 1], 10) : 200;

const customTeam1Arg = args.indexOf('--team1');
const customTeam2Arg = args.indexOf('--team2');

if (customTeam1Arg !== -1 && customTeam2Arg !== -1) {
  const t1 = args[customTeam1Arg + 1].split(',');
  const t2 = args[customTeam2Arg + 1].split(',');
  console.log(`\nCustom matchup (${GAMES} games each):`);
  console.log('─'.repeat(100));
  runMatchup(t1, t2, GAMES);
  runMatchup(t2, t1, GAMES); // also run reversed so we see first-mover advantage
} else {
  // Full matchup matrix
  const COMPS: [string, string[]][] = [
    // ── Slug fests ──────────────────────────────────────────────────────────
    ['4× Fighter',                  ['fighter',   'fighter',   'fighter',   'fighter']],
    ['4× Barbarian',                ['barbarian', 'barbarian', 'barbarian', 'barbarian']],
    ['4× Rogue',                    ['rogue',     'rogue',     'rogue',     'rogue']],
    ['4× Warlock',                  ['warlock',   'warlock',   'warlock',   'warlock']],
    ['Frontline (F/F/B/B)',         ['fighter',   'fighter',   'barbarian', 'barbarian']],
    ['Burst (Wl/Wl/So/Rog)',        ['warlock',   'warlock',   'sorcerer',  'rogue']],

    // ── Defensive / backline ────────────────────────────────────────────────
    ['Poke+Punish (Rng/Rng/So/Cl)', ['ranger',   'ranger',    'sorcerer',  'cleric']],
    ['Anchor (F/Cl/Wl/Rng)',        ['fighter',  'cleric',    'warlock',   'ranger']],
    ['Freeze+Finish (Wz/Wz/Rog/Rng)',['wizard',  'wizard',    'rogue',     'ranger']],
    ['Full Turtle (F/F/Cl/Cl)',     ['fighter',  'fighter',   'cleric',    'cleric']],
    ['Backline AOE (So/So/Wz/Rng)', ['sorcerer', 'sorcerer',  'wizard',    'ranger']],
    ['Control+Range (Wz/So/Rng/Wl)',['wizard',   'sorcerer',  'ranger',    'warlock']],

    // ── Mixed ───────────────────────────────────────────────────────────────
    ['Default (F/B/Rng/Rog)',       ['fighter',  'barbarian', 'ranger',    'rogue']],
    ['Sustain (F/Cl/Cl/Wz)',        ['fighter',  'cleric',    'cleric',    'wizard']],
    ['All-rounder (F/Rog/Wl/Cl)',   ['fighter',  'rogue',     'warlock',   'cleric']],
  ];

  console.log(`\nBalance Simulation — ${GAMES} games per matchup`);
  console.log('─'.repeat(100));
  console.log(`  ${'Team 1'.padEnd(38)}   ${'Team 2'.padEnd(38)}  │  Win%1 / Win%2  │ Avg turns`);
  console.log('─'.repeat(100));

  for (let i = 0; i < COMPS.length; i++) {
    for (let j = i + 1; j < COMPS.length; j++) {
      runMatchup(COMPS[i][1], COMPS[j][1], GAMES);
    }
  }

  // Single-unit comp summary: how does each class do as 4×?
  console.log('\n── Single-class sweep (4× each class vs 4× Fighter baseline) ──');
  console.log('─'.repeat(100));
  const allClasses = Object.keys(UNIT_TEMPLATES);
  for (const cls of allClasses) {
    if (cls === 'fighter') continue;
    runMatchup(['fighter','fighter','fighter','fighter'], [cls,cls,cls,cls], GAMES);
  }
}
