/**
 * puzzleSolver.ts — Authoring/verification tool for daily puzzles.
 *
 * Exhaustively searches the player's legal turn sequences (with OptimalBrain
 * playing every enemy reply) and reports whether a puzzle meets the
 * "tricky but fair" acceptance bar from PUZZLES_AND_INVITES.md:
 *
 *   1. Solvable: at least one line achieves the goal in maxPlayerTurns.
 *   2. Winning first moves ≤ 2 (ideally 1 — "only move" puzzles feel best).
 *   3. The greedy line (OptimalBrain playing the player side) does NOT win.
 *   4. Random lines win < 5% (the enemy can't simply be out-statted).
 *
 * Everything is deterministic (pinned fortune meters), so this is a plain
 * game-tree walk — no sampling needed except for the random-line check.
 *
 * Legality: candidates are enumerated generously and validated by running
 * them through the real processTurn (which throws TurnValidationError on
 * illegal input). The engine is the single legality oracle — this file
 * contains no movement/targeting rules of its own.
 *
 * CLI:  npx tsx src/ai/puzzleSolver.ts            (solves all registered puzzles)
 *       npx tsx src/ai/puzzleSolver.ts puzzle-001 (one puzzle)
 */

import type { MatchState, TurnAction, BoardPosition, UnitInstance } from '../types/matchState.js';
import { processTurn } from '../game/turnProcessor.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap } from './defaultData.js';
import { reachableFrom, isInBounds, isCorner } from './geometry.js';
import type { PuzzleDefinition } from '../puzzles/types.js';
import {
  buildPuzzleState, checkPuzzleGoal, PUZZLE_PLAYER_ID, PUZZLE_ENEMY_ID,
} from '../puzzles/buildPuzzleState.js';
import { PUZZLES } from '../puzzles/index.js';

const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();

const cdist = (a: BoardPosition, b: BoardPosition) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// ---------------------------------------------------------------------------
// Candidate enumeration (generous — engine validates)
// ---------------------------------------------------------------------------

/** All boards tiles within Chebyshev range of a position (corners excluded). */
function tilesWithin(pos: BoardPosition, range: number): BoardPosition[] {
  const out: BoardPosition[] = [];
  for (let x = pos.x - range; x <= pos.x + range; x++) {
    for (let y = pos.y - range; y <= pos.y + range; y++) {
      const p = { x, y };
      if (isInBounds(p) && !isCorner(x, y)) out.push(p);
    }
  }
  return out;
}

/** Enumerate ability actions for `unit` casting from `fromPos`. */
function abilityActionsFrom(
  state: MatchState,
  unit: UnitInstance,
  fromPos: BoardPosition,
): TurnAction[] {
  const out: TurnAction[] = [];
  for (const slug of unit.abilities) {
    if ((unit.cooldowns[slug] ?? 0) > 0) continue;
    const def = abilityMap.get(slug);
    if (!def) continue;

    let targets: BoardPosition[];
    if (def.targetingType === 'self' || (def.targetingType === 'aoe' && def.range === 0)) {
      targets = [fromPos];
    } else if (def.targetingType === 'single') {
      // Only tiles holding a living unit can be single-targets.
      targets = state.units
        .filter((u) => u.isAlive && cdist(fromPos, u.position) <= def.range)
        .map((u) => u.position);
    } else {
      // aoe with range > 0, line: any tile in range (engine rejects bad rays).
      targets = tilesWithin(fromPos, def.range);
    }

    const hasChoosablePush = def.effects.some((e) => e.type === 'push') && def.targetingType === 'single';
    for (const target of targets) {
      const base = { type: 'USE_ABILITY' as const, unitInstanceId: unit.instanceId, abilitySlug: slug, target };
      out.push(base);
      if (hasChoosablePush) {
        // Branch on the landing tile too (Fear-style two-tap abilities).
        const pushDist = def.effects.find((e) => e.type === 'push')?.distance ?? 0;
        for (const dest of tilesWithin(target, pushDist)) {
          if (dest.x === target.x && dest.y === target.y) continue;
          out.push({ ...base, pushDestination: dest });
        }
      }
    }
  }
  return out;
}

/** Enumerate all candidate turns (action lists) for the active player unit. */
export function enumeratePlayerTurns(state: MatchState): TurnAction[][] {
  const unit = state.units.find((u) => u.instanceId === state.initiative.activeUnitId);
  if (!unit || !unit.isAlive) return [[{ type: 'END_TURN' }]];
  const END: TurnAction = { type: 'END_TURN' };
  const plans: TurnAction[][] = [[END]];

  const moveTiles = reachableFrom(unit.position, unit, state.units, unit.movementRange);

  // Move only / charge only.
  for (const d of moveTiles) {
    plans.push([{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: d }, END]);
    plans.push([{ type: 'CHARGE', unitInstanceId: unit.instanceId, destination: d }, END]);
  }
  // Act from here (optionally retreat after).
  for (const act of abilityActionsFrom(state, unit, unit.position)) {
    plans.push([act, END]);
    for (const d of moveTiles) {
      plans.push([act, { type: 'MOVE', unitInstanceId: unit.instanceId, destination: d }, END]);
    }
  }
  // Move then act.
  for (const d of moveTiles) {
    for (const act of abilityActionsFrom(state, unit, d)) {
      plans.push([{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: d }, act, END]);
    }
  }
  return plans;
}

// ---------------------------------------------------------------------------
// Tree walk
// ---------------------------------------------------------------------------

interface StepResult { state: MatchState; outcome: 'won' | 'lost' | 'ongoing' }

/** Apply one player turn then all enemy replies. null = illegal turn. */
function applyPlayerTurn(
  def: PuzzleDefinition,
  ids: Record<string, string>,
  state: MatchState,
  actions: TurnAction[],
): StepResult | null {
  let result;
  try {
    result = processTurn(state, actions, PUZZLE_PLAYER_ID, PUZZLE_PLAYER_ID, PUZZLE_ENEMY_ID, abilityMap);
  } catch {
    return null; // illegal candidate — engine rejected it
  }
  let cur = result.updatedState;
  // Goal met during the player's own turn = immediate win.
  if (checkPuzzleGoal(def, cur, ids) === 'won') return { state: cur, outcome: 'won' };
  if (result.matchOver) {
    return { state: cur, outcome: result.winnerId === PUZZLE_PLAYER_ID ? 'won' : 'lost' };
  }
  // Enemy replies until it's the player's turn again.
  while (cur.activePlayerId === PUZZLE_ENEMY_ID) {
    const enemyActions = brain.selectActions(cur, PUZZLE_ENEMY_ID, abilityMap);
    const r = processTurn(cur, enemyActions, PUZZLE_ENEMY_ID, PUZZLE_PLAYER_ID, PUZZLE_ENEMY_ID, abilityMap);
    cur = r.updatedState;
    if (checkPuzzleGoal(def, cur, ids) === 'won') return { state: cur, outcome: 'won' }; // e.g. burning tick kills the target
    if (r.matchOver) return { state: cur, outcome: r.winnerId === PUZZLE_PLAYER_ID ? 'won' : 'lost' };
  }
  if (checkPuzzleGoal(def, cur, ids) === 'lost') return { state: cur, outcome: 'lost' };
  return { state: cur, outcome: 'ongoing' };
}

/** Does ANY line win from this state with `turnsLeft` player turns? */
function subtreeWins(
  def: PuzzleDefinition,
  ids: Record<string, string>,
  state: MatchState,
  turnsLeft: number,
): boolean {
  if (turnsLeft <= 0) return false;
  for (const plan of enumeratePlayerTurns(state)) {
    const step = applyPlayerTurn(def, ids, state, plan);
    if (!step) continue;
    if (step.outcome === 'won') return true;
    if (step.outcome === 'lost') continue;
    if (subtreeWins(def, ids, step.state, turnsLeft - 1)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface SolverReport {
  puzzleId: string;
  solvable: boolean;
  legalFirstMoves: number;
  /** Raw count — every retreat-tile variant counts separately. */
  winningFirstMoves: number;
  /** Distinct first IDEAS: deduped by core action (ability+target, or move
   *  destination for pure-move plans). The acceptance bar uses this — ten
   *  retreat tiles after the same killing blow are one idea, not ten. */
  winningFirstIdeas: number;
  /** Human-readable description of each winning first idea. */
  winningFirstMoveDescriptions: string[];
  greedyWins: boolean;
  randomWinRate: number;   // 0..1 over `randomTrials` playouts
  randomTrials: number;
  passes: boolean;
  failures: string[];
}

function describePlan(plan: TurnAction[]): string {
  return plan
    .filter((a) => a.type !== 'END_TURN')
    .map((a) => {
      if (a.type === 'MOVE') return `move→(${a.destination.x},${a.destination.y})`;
      if (a.type === 'CHARGE') return `charge→(${a.destination.x},${a.destination.y})`;
      const push = a.pushDestination ? ` push→(${a.pushDestination.x},${a.pushDestination.y})` : '';
      return `${a.abilitySlug}@(${a.target.x},${a.target.y})${push}`;
    })
    .join(' + ') || 'pass';
}

/** Core-idea key: the ability action if any (positioning around the same
 *  blow is one idea), else the move/charge destination, else 'pass'. */
function planIdeaKey(plan: TurnAction[]): string {
  const act = plan.find((a) => a.type === 'USE_ABILITY');
  if (act && act.type === 'USE_ABILITY') {
    const push = act.pushDestination ? `>${act.pushDestination.x},${act.pushDestination.y}` : '';
    return `${act.abilitySlug}@${act.target.x},${act.target.y}${push}`;
  }
  const mv = plan.find((a) => a.type === 'MOVE' || a.type === 'CHARGE');
  if (mv && (mv.type === 'MOVE' || mv.type === 'CHARGE')) {
    return `${mv.type.toLowerCase()}→${mv.destination.x},${mv.destination.y}`;
  }
  return 'pass';
}

export function solvePuzzle(def: PuzzleDefinition, randomTrials = 200): SolverReport {
  const { state: initial, instanceIdBySpecId: ids } = buildPuzzleState(def);

  // 1+2. Exhaustive: which first moves lead to a win?
  const firstPlans = enumeratePlayerTurns(initial);
  let legalFirstMoves = 0;
  let winningFirstMoves = 0;
  const winningIdeas = new Map<string, string>(); // idea key → example description
  for (const plan of firstPlans) {
    const step = applyPlayerTurn(def, ids, initial, plan);
    if (!step) continue;
    legalFirstMoves++;
    const wins = step.outcome === 'won'
      || (step.outcome === 'ongoing' && subtreeWins(def, ids, step.state, def.maxPlayerTurns - 1));
    if (wins) {
      winningFirstMoves++;
      const key = planIdeaKey(plan);
      if (!winningIdeas.has(key)) winningIdeas.set(key, describePlan(plan));
    }
  }
  const winningFirstIdeas = winningIdeas.size;
  const winningFirstMoveDescriptions = [...winningIdeas.values()];
  const solvable = winningFirstMoves > 0;

  // 3. Greedy line: OptimalBrain plays the player side.
  let greedyWins = false;
  {
    let cur = initial;
    for (let t = 0; t < def.maxPlayerTurns; t++) {
      const actions = brain.selectActions(cur, PUZZLE_PLAYER_ID, abilityMap);
      const step = applyPlayerTurn(def, ids, cur, actions);
      if (!step) break;
      if (step.outcome === 'won') { greedyWins = true; break; }
      if (step.outcome === 'lost') break;
      cur = step.state;
    }
  }

  // 4. Random lines (uniform over legal candidates each turn).
  let randomWins = 0;
  for (let trial = 0; trial < randomTrials; trial++) {
    let cur = initial;
    for (let t = 0; t < def.maxPlayerTurns; t++) {
      const plans = enumeratePlayerTurns(cur);
      // Retry until a legal plan is drawn (bounded).
      let step: StepResult | null = null;
      for (let attempts = 0; attempts < 50 && !step; attempts++) {
        step = applyPlayerTurn(def, ids, cur, plans[Math.floor(Math.random() * plans.length)]);
      }
      if (!step) break;
      if (step.outcome === 'won') { randomWins++; break; }
      if (step.outcome === 'lost') break;
      cur = step.state;
    }
  }
  const randomWinRate = randomWins / randomTrials;

  const failures: string[] = [];
  if (!solvable) failures.push('NOT SOLVABLE — no winning line exists');
  if (winningFirstIdeas > 2) failures.push(`too easy: ${winningFirstIdeas} distinct winning first ideas (bar: ≤ 2)`);
  if (greedyWins) failures.push('too obvious: the greedy/brain line wins');
  if (randomWinRate >= 0.05) failures.push(`degenerate: random lines win ${(randomWinRate * 100).toFixed(1)}% (bar: < 5%)`);

  return {
    puzzleId: def.id,
    solvable, legalFirstMoves, winningFirstMoves, winningFirstIdeas, winningFirstMoveDescriptions,
    greedyWins, randomWinRate, randomTrials,
    passes: failures.length === 0,
    failures,
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const isMain = process.argv[1]?.endsWith('puzzleSolver.ts') || process.argv[1]?.endsWith('puzzleSolver.js');
if (isMain) {
  const only = process.argv[2];
  const defs = Object.values(PUZZLES).filter((p) => !only || p.id === only);
  if (defs.length === 0) {
    console.error(`No puzzle matching '${only}'. Registered: ${Object.keys(PUZZLES).join(', ')}`);
    process.exit(1);
  }
  for (const def of defs) {
    const t0 = Date.now();
    const r = solvePuzzle(def);
    console.log(`\n═══ ${def.id} — "${def.title}" (${((Date.now() - t0) / 1000).toFixed(1)}s) ═══`);
    console.log(`  solvable:            ${r.solvable ? '✓' : '✗'}`);
    console.log(`  legal first moves:   ${r.legalFirstMoves}`);
    console.log(`  winning first moves: ${r.winningFirstMoves} raw → ${r.winningFirstIdeas} distinct ideas`);
    for (const d of r.winningFirstMoveDescriptions.slice(0, 5)) console.log(`      · ${d}`);
    console.log(`  greedy line wins:    ${r.greedyWins ? '✗ (too obvious)' : 'no ✓'}`);
    console.log(`  random win rate:     ${(r.randomWinRate * 100).toFixed(1)}% over ${r.randomTrials} trials`);
    console.log(`  VERDICT: ${r.passes ? 'PASS ✓' : 'FAIL — ' + r.failures.join('; ')}`);
  }
}
