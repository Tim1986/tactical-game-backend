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
  ['whirlwind',  { id: 'a4',  slug: 'whirlwind',  name: 'Whirlwind',      description: '', targetingType: 'aoe',    range: 0, areaRadius: 1, cooldownTurns: 99, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'physical' }] }],
  ['mace',       { id: 'a5',  slug: 'mace',       name: 'Mace',           description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 7,  damageType: 'physical' }] }],
  ['heal',       { id: 'a6',  slug: 'heal',       name: 'Heal',           description: '', targetingType: 'single', range: 2, areaRadius: 0, cooldownTurns: 99, isUnblockable: false, canTargetAlly: true, effects: [{ type: 'heal', formula: 'flat', value: 30 }] }],
  ['twin',       { id: 'a7',  slug: 'twin',       name: 'Twin Strike',    description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 24, damageType: 'physical' }] }],
  ['assassinate',{ id: 'a8',  slug: 'assassinate',name: 'Kill Shot',      description: '', targetingType: 'single', range: 1, areaRadius: 0, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 9999, damageType: 'true', healthThreshold: 20 }] }],
  ['arrow',      { id: 'a9',  slug: 'arrow',      name: 'Arrow',          description: '', targetingType: 'single', range: 6, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 10, damageType: 'physical' }] }],
  ['piercing',   { id: 'a10', slug: 'piercing',   name: 'Piercing Shot',  description: '', targetingType: 'line',   range: 6, areaRadius: 0, cooldownTurns: 99, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 15, damageType: 'true' }] }],
  ['bolt',       { id: 'a11', slug: 'bolt',       name: 'Arcane Bolt',    description: '', targetingType: 'single', range: 5, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 10, damageType: 'magical' }] }],
  ['ffh',        { id: 'a12', slug: 'ffh',        name: 'Fire from Heaven',description:'', targetingType: 'aoe',    range: 3, areaRadius: 1, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 20, damageType: 'magical' }] }],
  ['eldritch',   { id: 'a13', slug: 'eldritch',   name: 'Demon Blast',    description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 0, isUnblockable: true,  effects: [{ type: 'damage', formula: 'flat', value: 9,  damageType: 'true' }] }],
  ['fear',       { id: 'a14', slug: 'fear',       name: 'Fear',           description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'push', direction: 'away_from_caster', distance: 3 }, { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 1 }] }],
  ['missile',    { id: 'a15', slug: 'missile',    name: 'Ice Blast',      description: '', targetingType: 'single', range: 5, areaRadius: 0, cooldownTurns: 0, isUnblockable: false, effects: [{ type: 'damage', formula: 'flat', value: 8,  damageType: 'magical' }] }],
  ['freeze',     { id: 'a16', slug: 'freeze',     name: 'Freeze',         description: '', targetingType: 'single', range: 4, areaRadius: 0, cooldownTurns: 99, isUnblockable: true,  effects: [{ type: 'apply_status', statusSlug: 'stunned', stacks: 1, durationTurns: 2 }] }],
]);

interface UnitTemplate { slug: string; name: string; maxHealth: number; armorClass: number; movementRange: number; abilities: string[]; }

const UNIT_TEMPLATES: Record<string, UnitTemplate> = {
  fighter:   { slug: 'fighter',   name: 'Fighter',   maxHealth: 42, armorClass: 16, movementRange: 3, abilities: ['sword',    'second_wind'] },
  barbarian: { slug: 'barbarian', name: 'Barbarian', maxHealth: 50, armorClass: 15, movementRange: 4, abilities: ['strike',   'whirlwind']   },
  ranger:    { slug: 'ranger',    name: 'Ranger',    maxHealth: 38, armorClass: 16, movementRange: 3, abilities: ['arrow',    'piercing']    },
  rogue:     { slug: 'rogue',     name: 'Rogue',     maxHealth: 35, armorClass: 15, movementRange: 4, abilities: ['twin',     'assassinate'] },
  cleric:    { slug: 'cleric',    name: 'Cleric',    maxHealth: 40, armorClass: 18, movementRange: 3, abilities: ['mace',     'heal']        },
  wizard:    { slug: 'wizard',    name: 'Wizard',    maxHealth: 30, armorClass: 14, movementRange: 3, abilities: ['missile',  'freeze']      },
  sorcerer:  { slug: 'sorcerer',  name: 'Sorcerer',  maxHealth: 30, armorClass: 14, movementRange: 3, abilities: ['bolt',     'ffh']         },
  warlock:   { slug: 'warlock',   name: 'Warlock',   maxHealth: 32, armorClass: 15, movementRange: 3, abilities: ['eldritch', 'fear']        },
};

// ─── Starting positions ───────────────────────────────────────────────────────

// 10×8 board — mirrors matchService.ts starting positions
const P1_START_POSITIONS = [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }];
const P2_START_POSITIONS = [{ x: 8, y: 0 }, { x: 8, y: 2 }, { x: 8, y: 4 }, { x: 8, y: 6 }];

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

/**
 * Greedy bot: tries to move toward the nearest enemy, then uses the most
 * damaging ability it can. Falls back to random legal moves.
 */
function botActions(state: MatchState, playerId: string): TurnAction[] {
  const actions: TurnAction[] = [];
  const myUnits = state.units.filter((u) => u.isAlive && u.ownerPlayerId === playerId);
  const enemies = state.units.filter((u) => u.isAlive && u.ownerPlayerId !== playerId);
  const allies  = state.units.filter((u) => u.isAlive && u.ownerPlayerId === playerId);

  for (const unit of myUnits) {
    if (unit.statusEffects.some((se) => se.slug === 'stunned')) continue;

    // ── Move toward nearest enemy ──
    if (!unit.hasMovedThisTurn && enemies.length > 0) {
      const target = enemies.reduce((a, b) => manhattan(unit.position, a.position) < manhattan(unit.position, b.position) ? a : b);
      const best = findMoveToward(state, unit, target.position);
      if (best) {
        actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: best });
        unit.position = best;
        unit.hasMovedThisTurn = true;
      }
    }

    // ── Use ability ──
    if (!unit.hasActedThisTurn) {
      const action = chooseBotAbility(unit, state, enemies, allies);
      if (action) {
        actions.push(action);
        unit.hasActedThisTurn = true;
      }
    }
  }

  actions.push({ type: 'END_TURN' });
  return actions;
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
      if (pos.x < 0 || pos.x > 9 || pos.y < 0 || pos.y > 7) continue;
      if (isOccupied(state.units, pos, unit.instanceId)) continue;
      const d = manhattan(pos, targetPos);
      if (d < bestDist) { bestDist = d; best = pos; }
    }
  }
  return best;
}

function chooseBotAbility(unit: UnitInstance, state: MatchState, enemies: UnitInstance[], allies: UnitInstance[]): TurnAction | null {
  // Prioritize: kill shot if available, then special (higher damage), then basic
  const orderedAbilities = [...unit.abilities].sort((a, b) => {
    const pa = a === 'assassinate' ? 2 : ABILITY_MAP.get(a)?.cooldownTurns ?? 0 > 0 ? 1 : 0;
    const pb = b === 'assassinate' ? 2 : ABILITY_MAP.get(b)?.cooldownTurns ?? 0 > 0 ? 1 : 0;
    return pb - pa;
  });

  for (const slug of orderedAbilities) {
    const ability = ABILITY_MAP.get(slug);
    if (!ability) continue;
    const cd = unit.cooldowns[slug] ?? 0;
    if (cd > 0) continue;

    if (ability.targetingType === 'self') {
      // Use heal only if below 50% HP
      if (unit.currentHealth < unit.maxHealth * 0.5) {
        return { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: unit.position };
      }
      continue;
    }

    if (ability.canTargetAlly) {
      // Find most wounded ally in range
      const woundedAlly = allies
        .filter((a) => a.instanceId !== unit.instanceId && chebyshev(unit.position, a.position) <= ability.range && a.currentHealth < a.maxHealth)
        .sort((a, b) => a.currentHealth - b.currentHealth)[0];
      if (woundedAlly) {
        return { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: woundedAlly.position };
      }
      continue;
    }

    // Kill Shot: only if an enemy is at ≤20 HP and in range
    if (slug === 'assassinate') {
      const killTarget = enemies.find((e) => e.currentHealth <= 20 && chebyshev(unit.position, e.position) <= ability.range);
      if (killTarget) {
        return { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: killTarget.position };
      }
      continue;
    }

    // AOE: pick target position with most enemies in radius
    if (ability.targetingType === 'aoe') {
      const aoeTarget = findAoeTarget(unit.position, ability.range, ability.areaRadius, enemies);
      if (aoeTarget) {
        return { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: aoeTarget };
      }
      continue;
    }

    // Line: pick direction with most enemies
    if (ability.targetingType === 'line') {
      const lineTarget = findLineTarget(unit.position, ability.range, enemies);
      if (lineTarget) {
        return { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: lineTarget };
      }
      continue;
    }

    // Single: nearest enemy in range
    const inRange = enemies.filter((e) => chebyshev(unit.position, e.position) <= ability.range);
    if (inRange.length > 0) {
      const picked = inRange.reduce((a, b) => a.currentHealth < b.currentHealth ? a : b); // focus lowest HP
      return { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: picked.position };
    }
  }
  return null;
}

function findAoeTarget(casterPos: { x: number; y: number }, range: number, radius: number, enemies: UnitInstance[]): { x: number; y: number } | null {
  // caster-centered AOE: just need enemies within radius of caster
  if (range === 0) {
    const hit = enemies.filter((e) => chebyshev(casterPos, e.position) <= radius);
    return hit.length > 0 ? casterPos : null;
  }
  // Targeted AOE
  let best: { x: number; y: number } | null = null;
  let bestCount = 0;
  for (const candidate of enemies) {
    if (chebyshev(casterPos, candidate.position) > range) continue;
    const count = enemies.filter((e) => chebyshev(candidate.position, e.position) <= radius).length;
    if (count > bestCount) { bestCount = count; best = candidate.position; }
  }
  return best;
}

function findLineTarget(casterPos: { x: number; y: number }, range: number, enemies: UnitInstance[]): { x: number; y: number } | null {
  const directions = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
  let best: { x: number; y: number } | null = null;
  let bestCount = 0;
  for (const { dx, dy } of directions) {
    let count = 0;
    for (let i = 1; i <= range; i++) {
      const pos = { x: casterPos.x + dx * i, y: casterPos.y + dy * i };
      if (enemies.some((e) => e.position.x === pos.x && e.position.y === pos.y)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = { x: casterPos.x + dx * range, y: casterPos.y + dy * range };
    }
  }
  return bestCount > 0 ? best : null;
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
    board: { width: 10, height: 8 },
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
