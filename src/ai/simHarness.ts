/**
 * simHarness.ts — In-memory match simulator for DungeonCombat.
 *
 * Runs N full matches between two AIBrain instances using the real game engine
 * (processTurn). No database required — unit/ability data comes from defaultData.ts.
 *
 * Usage (CLI):
 *   npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock
 *   npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock --games 200
 */

import { v4 as uuidv4 } from 'uuid';
import { processTurn, TurnValidationError } from '../game/turnProcessor.js';
import { OptimalBrain, AIBrain } from './aiBrain.js';
import { buildAbilityMap, UNIT_DEFS } from './defaultData.js';
import { MatchState, UnitInstance, BoardPosition, InitiativeState, BOARD_WIDTH, BOARD_HEIGHT } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';

// ─── Placement ────────────────────────────────────────────────────────────────

const DEFAULT_P1_PLACEMENT: BoardPosition[] = [
  { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 2 }, { x: 2, y: 4 },
];

// Mirror across x=3.5 (center of 8-wide board)
const DEFAULT_P2_PLACEMENT: BoardPosition[] = DEFAULT_P1_PLACEMENT.map(p => ({ x: 7 - p.x, y: p.y }));

// ─── State builder ────────────────────────────────────────────────────────────

function buildUnitInstance(slug: string, ownerId: string, position: BoardPosition): UnitInstance {
  const def = UNIT_DEFS[slug];
  if (!def) throw new Error(`Unknown unit slug: ${slug}`);
  const cooldowns: Record<string, number> = {};
  for (const s of def.abilities) cooldowns[s] = 0;
  return {
    instanceId: uuidv4(),
    definitionSlug: def.slug,
    ownerPlayerId: ownerId,
    position,
    currentHealth: def.maxHealth,
    maxHealth: def.maxHealth,
    armorClass: def.armorClass,
    movementRange: def.movementRange,
    abilities: def.abilities,
    passives: def.passives,
    isAlive: true,
    hasMovedThisTurn: false,
    hasActedThisTurn: false,
    cooldowns,
    statusEffects: [],
  };
}

function buildMatchState(
  p1Id: string,
  p2Id: string,
  p1Slugs: string[],
  p2Slugs: string[],
  p1Placement = DEFAULT_P1_PLACEMENT,
  p2Placement = DEFAULT_P2_PLACEMENT,
  forceFirstPlayerId?: string,
): MatchState {
  const units: UnitInstance[] = [
    ...p1Slugs.map((slug, i) => buildUnitInstance(slug, p1Id, p1Placement[i])),
    ...p2Slugs.map((slug, i) => buildUnitInstance(slug, p2Id, p2Placement[i])),
  ];
  const firstPlayer = forceFirstPlayerId ?? (Math.random() < 0.5 ? p1Id : p2Id);
  const initiative: InitiativeState = {
    order: [], slot: 0,
    round1FirstPlayerId: firstPlayer,
    activeUnitId: null,
    isRound1: true,
  };
  return {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    units,
    turnNumber: 1,
    roundNumber: 1,
    activePlayerId: firstPlayer,
    phase: 'action',
    initiative,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchResult {
  winnerId: string | null;
  winnerSide: 'p1' | 'p2' | 'draw';
  turns: number;
  survivingUnits: { p1: number; p2: number };
  totalHpRemaining: { p1: number; p2: number };
}

export interface SimResult {
  p1Slugs: string[];
  p2Slugs: string[];
  games: number;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  p1WinRate: number;
  avgTurns: number;
  avgSurvivors: { p1: number; p2: number };
}

// ─── Single match ─────────────────────────────────────────────────────────────

export function runMatch(
  p1Slugs: string[],
  p2Slugs: string[],
  abilityMap: Map<string, AbilityDefinition>,
  brain1: AIBrain,
  brain2: AIBrain,
  p1Id = 'p1',
  p2Id = 'p2',
): MatchResult {
  const MAX_TURNS = 150;
  let state = buildMatchState(p1Id, p2Id, p1Slugs, p2Slugs);
  let turns = 0;

  while (turns < MAX_TURNS) {
    const activeId = state.activePlayerId;
    const brain = activeId === p1Id ? brain1 : brain2;
    const actions = brain.selectActions(state, activeId, abilityMap);
    let result: ReturnType<typeof processTurn>;
    try {
      result = processTurn(state, actions, activeId, p1Id, p2Id, abilityMap);
    } catch (err) {
      if (err instanceof TurnValidationError && state.initiative.isRound1) {
        const stateCopy: MatchState = JSON.parse(JSON.stringify(state));
        const committed = new Set(stateCopy.initiative.order);
        // Force-commit the stuck unit if one exists
        const stuckUnit = stateCopy.units.find(u => u.ownerPlayerId === activeId && u.isAlive && !committed.has(u.instanceId));
        if (stuckUnit) stateCopy.initiative.order.push(stuckUnit.instanceId);

        // Check if all alive units from both sides are now committed
        const allCommitted = new Set(stateCopy.initiative.order);
        const p1Done = stateCopy.units.every(u => u.ownerPlayerId !== p1Id || !u.isAlive || allCommitted.has(u.instanceId));
        const p2Done = stateCopy.units.every(u => u.ownerPlayerId !== p2Id || !u.isAlive || allCommitted.has(u.instanceId));

        if (p1Done && p2Done) {
          // All units committed — manually perform the Round 1 → Round 2 transition
          const firstPlayer = stateCopy.initiative.round1FirstPlayerId;
          const secondPlayer = firstPlayer === p1Id ? p2Id : p1Id;
          const byOwner = (pid: string) => stateCopy.initiative.order.filter(id => stateCopy.units.find(u => u.instanceId === id)?.ownerPlayerId === pid);
          const p1Ids = byOwner(firstPlayer);
          const p2Ids = byOwner(secondPlayer);
          const order: string[] = [];
          for (let i = 0; i < 4; i++) {
            if (p1Ids[i]) order.push(p1Ids[i]);
            if (p2Ids[i]) order.push(p2Ids[i]);
          }
          stateCopy.initiative.order = order;
          stateCopy.initiative.isRound1 = false;
          // Advance to first alive unit
          let firstSlot = 0;
          for (let i = 0; i < order.length; i++) {
            const u = stateCopy.units.find(u => u.instanceId === order[i]);
            if (u && u.isAlive) { firstSlot = i; break; }
          }
          stateCopy.initiative.slot = firstSlot;
          stateCopy.initiative.activeUnitId = order[firstSlot] ?? null;
          const firstUnit = stateCopy.units.find(u => u.instanceId === order[firstSlot]);
          stateCopy.activePlayerId = firstUnit?.ownerPlayerId ?? activeId;
          // Reset turn flags at round boundary
          for (const u of stateCopy.units) { u.hasMovedThisTurn = false; u.hasActedThisTurn = false; }
        } else {
          stateCopy.activePlayerId = activeId === p1Id ? p2Id : p1Id;
        }

        state = stateCopy;
        turns++;
        continue;
      }
      throw err;
    }
    turns++;
    state = result.updatedState;
    if (result.matchOver) {
      const winnerId = result.winnerId;
      const survivors = state.units.filter(u => u.isAlive);
      return {
        winnerId,
        winnerSide: winnerId === p1Id ? 'p1' : winnerId === p2Id ? 'p2' : 'draw',
        turns,
        survivingUnits: {
          p1: survivors.filter(u => u.ownerPlayerId === p1Id).length,
          p2: survivors.filter(u => u.ownerPlayerId === p2Id).length,
        },
        totalHpRemaining: {
          p1: survivors.filter(u => u.ownerPlayerId === p1Id).reduce((s, u) => s + u.currentHealth, 0),
          p2: survivors.filter(u => u.ownerPlayerId === p2Id).reduce((s, u) => s + u.currentHealth, 0),
        },
      };
    }
  }

  // Turn limit hit — count as draw
  const survivors = state.units.filter(u => u.isAlive);
  return {
    winnerId: null,
    winnerSide: 'draw',
    turns,
    survivingUnits: {
      p1: survivors.filter(u => u.ownerPlayerId === 'p1').length,
      p2: survivors.filter(u => u.ownerPlayerId === 'p2').length,
    },
    totalHpRemaining: {
      p1: survivors.filter(u => u.ownerPlayerId === 'p1').reduce((s, u) => s + u.currentHealth, 0),
      p2: survivors.filter(u => u.ownerPlayerId === 'p2').reduce((s, u) => s + u.currentHealth, 0),
    },
  };
}

// ─── Simulation run ───────────────────────────────────────────────────────────

export function runSim(
  p1Slugs: string[],
  p2Slugs: string[],
  options: {
    games?: number;
    brain1?: AIBrain;
    brain2?: AIBrain;
    abilityMap?: Map<string, AbilityDefinition>;
  } = {},
): SimResult {
  const games = options.games ?? 100;
  const brain1 = options.brain1 ?? new OptimalBrain();
  const brain2 = options.brain2 ?? new OptimalBrain();
  const abilityMap = options.abilityMap ?? buildAbilityMap();

  let p1Wins = 0, p2Wins = 0, draws = 0;
  let totalTurns = 0;
  let totalSurvP1 = 0, totalSurvP2 = 0;

  for (let i = 0; i < games; i++) {
    const r = runMatch(p1Slugs, p2Slugs, abilityMap, brain1, brain2);
    if (r.winnerSide === 'p1') p1Wins++;
    else if (r.winnerSide === 'p2') p2Wins++;
    else draws++;
    totalTurns += r.turns;
    totalSurvP1 += r.survivingUnits.p1;
    totalSurvP2 += r.survivingUnits.p2;
  }

  return {
    p1Slugs,
    p2Slugs,
    games,
    p1Wins,
    p2Wins,
    draws,
    p1WinRate: p1Wins / games,
    avgTurns: totalTurns / games,
    avgSurvivors: { p1: totalSurvP1 / games, p2: totalSurvP2 / games },
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printResult(r: SimResult) {
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  console.log(`\nSim: ${r.p1Slugs.join(',')} vs ${r.p2Slugs.join(',')}`);
  console.log(`Games: ${r.games}`);
  console.log(`P1 wins: ${r.p1Wins} (${pct(r.p1WinRate)})   P2 wins: ${r.p2Wins} (${pct(r.p2Wins / r.games)})   Draws: ${r.draws}`);
  console.log(`Avg turns: ${r.avgTurns.toFixed(1)}`);
  console.log(`Avg survivors — P1: ${r.avgSurvivors.p1.toFixed(2)}  P2: ${r.avgSurvivors.p2.toFixed(2)}`);
}

const isMain = process.argv[1]?.endsWith('simHarness.ts') || process.argv[1]?.endsWith('simHarness.js');
if (isMain) {
  const args = process.argv.slice(2);
  const vsIdx = args.indexOf('vs');
  if (vsIdx === -1 || vsIdx === 0 || vsIdx === args.length - 1) {
    console.error('Usage: npx tsx src/ai/simHarness.ts <p1slugs> vs <p2slugs> [--games N]');
    console.error('Example: npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock');
    process.exit(1);
  }
  const p1Slugs = args[vsIdx - 1].split(',');
  const p2Slugs = args[vsIdx + 1].split(',');
  const gamesArg = args.indexOf('--games');
  const games = gamesArg !== -1 ? parseInt(args[gamesArg + 1], 10) : 100;

  if (p1Slugs.length !== 4 || p2Slugs.length !== 4) {
    console.error('Each team must have exactly 4 units.');
    process.exit(1);
  }

  const unknown = [...p1Slugs, ...p2Slugs].find(s => !UNIT_DEFS[s]);
  if (unknown) {
    console.error(`Unknown unit slug: "${unknown}". Valid: ${Object.keys(UNIT_DEFS).join(', ')}`);
    process.exit(1);
  }

  console.log(`Running ${games} games...`);
  const result = runSim(p1Slugs, p2Slugs, { games });
  printResult(result);
}
