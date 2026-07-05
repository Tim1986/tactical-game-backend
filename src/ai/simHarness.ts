/**
 * simHarness.ts — In-memory match simulator for DungeonCombat. (v2)
 *
 * Runs N full matches between two AIBrain instances using the real game engine
 * (processTurn). No database required — unit/ability data comes from defaultData.ts.
 *
 * Usage (CLI):
 *   npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock
 *   npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock --games 200
 *   ... --verbose          log every validation error with the offending action payload
 *
 * v3 changes:
 *   - ROUND 1 PRE-FLIGHT (per V3 feedback, Bug A): when every uncommitted
 *     unit for the active player is frozen or dead, the harness commits one
 *     directly to initiative.order WITHOUT calling the engine — the engine
 *     rejects every per-unit action for such units, so this path must not
 *     count as a validation error.
 *   - Balance analytics: Wilson 95% CI on win rate, per-slug special-usage
 *     and death-turn stats, first-blood turn, first-mover win rate.
 *
 * v2 changes:
 *   - Validation errors are COUNTED and SAMPLED, not silently swallowed —
 *     they indicate brain/engine disagreements and hide regressions if unseen.
 *   - Consecutive-error abort: a match stuck in an error loop ends as a
 *     flagged draw after 20 back-to-back validation errors instead of
 *     burning the whole turn budget.
 *   - First player alternates deterministically across games (even game
 *     index → P1 first), halving first-mover variance vs a coin flip.
 *   - Per-slug survival rates in SimResult (which units live through games).
 *   - Draw diagnostics: lone-survivor draws counted separately — the
 *     kiting-endgame signature to watch.
 *   - Turn-limit draw block uses p1Id/p2Id params (was hardcoded 'p1'/'p2',
 *     breaking stats for custom player ids).
 *   - Round 1→2 interleave sized by team length instead of hardcoded 4.
 */

import { v4 as uuidv4 } from 'uuid';
import { processTurn, TurnValidationError } from '../game/turnProcessor.js';
import { OptimalBrain, AIBrain, normalizeAbilityMap } from './aiBrain.js';
import { buildAbilityMap, UNIT_DEFS } from './defaultData.js';
import {
  MatchState,
  UnitInstance,
  BoardPosition,
  InitiativeState,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';

// ─── Placement ────────────────────────────────────────────────────────────────

const DEFAULT_P1_PLACEMENT: BoardPosition[] = [
  { x: 1, y: 1 },
  { x: 1, y: 3 },
  { x: 2, y: 2 },
  { x: 2, y: 4 },
];

// Mirror across x=3.5 (center of 8-wide board)
const DEFAULT_P2_PLACEMENT: BoardPosition[] = DEFAULT_P1_PLACEMENT.map((p) => ({
  x: 7 - p.x,
  y: p.y,
}));

/** A match aborts as a flagged draw after this many back-to-back errors. */
const MAX_CONSECUTIVE_ERRORS = 20;
const MAX_TURNS = 150;

// ─── State builder ────────────────────────────────────────────────────────────

function buildUnitInstance(
  slug: string,
  ownerId: string,
  position: BoardPosition,
): UnitInstance {
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
    fortuneMeter: 0,
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
  const firstPlayer =
    forceFirstPlayerId ?? (Math.random() < 0.5 ? p1Id : p2Id);
  const initiative: InitiativeState = {
    order: [],
    slot: 0,
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
  /** Slugs of surviving units per side (for per-slug survival stats). */
  survivingSlugs: { p1: string[]; p2: string[] };
  /** Validation errors recovered during this match (should be ~0). */
  validationErrors: number;
  /** Match ended by the consecutive-error circuit breaker. */
  abortedByErrorLoop: boolean;
  /** Draw where one side was down to a single surviving unit (kiting signature). */
  loneSurvivorDraw: boolean;
  /** Which player took the first Round 1 turn. */
  firstPlayerId: string;
  /** Turn number of the first kill (null if nobody died). */
  firstBloodTurn: number | null;
  /** Every death: which unit slug died on which turn. */
  deaths: { slug: string; turn: number }[];
  /** Slugs of units whose once-per-game special was spent (see caveat in code). */
  specialsSpent: string[];
}

export interface SimResult {
  p1Slugs: string[];
  p2Slugs: string[];
  games: number;
  p1Wins: number;
  p2Wins: number;
  draws: number;
  loneSurvivorDraws: number;
  p1WinRate: number;
  avgTurns: number;
  avgSurvivors: { p1: number; p2: number };
  /** slug → fraction of its appearances that survived to game end. */
  unitSurvivalRates: Record<string, number>;
  /** Total validation errors recovered across all games (watch this — should be 0). */
  totalValidationErrors: number;
  /** Games aborted by the error circuit breaker. */
  abortedGames: number;
  /** First few distinct validation error messages, for diagnosis. */
  sampleErrors: string[];
  /** Wilson 95% confidence interval on p1WinRate — trust deltas, not points. */
  p1WinRateCI: [number, number];
  /** Fraction of games won by whichever side took the first turn. */
  firstMoverWinRate: number;
  /** slug → fraction of appearances that spent their special before game end. */
  specialUsageRates: Record<string, number>;
  /** slug → average turn of death, among appearances that died. */
  avgDeathTurn: Record<string, number>;
  /** Average turn of the first kill (games with at least one kill). */
  avgFirstBloodTurn: number | null;
}


/**
 * After a unit is force-committed into initiative.order during Round 1
 * (harness pre-flight or error recovery), either hand the turn to the other
 * player or — if all alive units on both sides are now committed — perform
 * the Round 1 → Round 2 transition (interleave, advance to first alive unit,
 * reset turn flags). Mutates the passed state.
 */
function advanceAfterRound1Commit(
  state: MatchState,
  p1Id: string,
  p2Id: string,
  activeId: string,
): void {
  const allCommitted = new Set(state.initiative.order);
  const isDone = (pid: string) =>
    state.units.every(
      (u) =>
        u.ownerPlayerId !== pid || !u.isAlive || allCommitted.has(u.instanceId),
    );

  if (isDone(p1Id) && isDone(p2Id)) {
    const firstPlayer = state.initiative.round1FirstPlayerId;
    const secondPlayer = firstPlayer === p1Id ? p2Id : p1Id;
    const byOwner = (pid: string) =>
      state.initiative.order.filter(
        (id) =>
          state.units.find((u) => u.instanceId === id)?.ownerPlayerId === pid,
      );
    const firstIds = byOwner(firstPlayer);
    const secondIds = byOwner(secondPlayer);
    const order: string[] = [];
    const maxLen = Math.max(firstIds.length, secondIds.length);
    for (let i = 0; i < maxLen; i++) {
      if (firstIds[i]) order.push(firstIds[i]);
      if (secondIds[i]) order.push(secondIds[i]);
    }
    state.initiative.order = order;
    state.initiative.isRound1 = false;
    let firstSlot = 0;
    for (let i = 0; i < order.length; i++) {
      const u = state.units.find((x) => x.instanceId === order[i]);
      if (u && u.isAlive) {
        firstSlot = i;
        break;
      }
    }
    state.initiative.slot = firstSlot;
    state.initiative.activeUnitId = order[firstSlot] ?? null;
    const firstUnit = state.units.find(
      (u) => u.instanceId === order[firstSlot],
    );
    state.activePlayerId = firstUnit?.ownerPlayerId ?? activeId;
    for (const u of state.units) {
      u.hasMovedThisTurn = false;
      u.hasActedThisTurn = false;
    }
  } else {
    state.activePlayerId = activeId === p1Id ? p2Id : p1Id;
  }
}

// ─── Single match ─────────────────────────────────────────────────────────────

export interface MatchOptions {
  p1Id?: string;
  p2Id?: string;
  forceFirstPlayerId?: string;
  /** Called on every recovered validation error (for logging/diagnosis). */
  onValidationError?: (err: TurnValidationError, actions: unknown[], state: MatchState) => void;
}

export function runMatch(
  p1Slugs: string[],
  p2Slugs: string[],
  abilityMap: Map<string, AbilityDefinition>,
  brain1: AIBrain,
  brain2: AIBrain,
  options: MatchOptions = {},
): MatchResult {
  const p1Id = options.p1Id ?? 'p1';
  const p2Id = options.p2Id ?? 'p2';
  abilityMap = normalizeAbilityMap(abilityMap);
  let state = buildMatchState(
    p1Id,
    p2Id,
    p1Slugs,
    p2Slugs,
    DEFAULT_P1_PLACEMENT,
    DEFAULT_P2_PLACEMENT,
    options.forceFirstPlayerId,
  );
  const firstPlayerId = state.initiative.round1FirstPlayerId;
  let turns = 0;
  let validationErrors = 0;
  let consecutiveErrors = 0;
  let abortedByErrorLoop = false;
  const deaths: { slug: string; turn: number }[] = [];
  const recordedDead = new Set<string>();
  const recordDeaths = () => {
    for (const u of state.units) {
      if (!u.isAlive && !recordedDead.has(u.instanceId)) {
        recordedDead.add(u.instanceId);
        deaths.push({ slug: u.definitionSlug, turn: turns });
      }
    }
  };

  const finish = (winnerId: string | null): MatchResult => {
    const survivors = state.units.filter((u) => u.isAlive);
    const p1Surv = survivors.filter((u) => u.ownerPlayerId === p1Id);
    const p2Surv = survivors.filter((u) => u.ownerPlayerId === p2Id);
    const isDraw = winnerId === null;
    // Special-usage detection: the special's cooldown starts at 99 when spent
    // and ticks down once per END_TURN, so cooldown > 0 at game end means it
    // was used. CAVEAT: in a 99+ turn game a special spent on turn 1 could
    // tick back to 0 — rare (most games end well before), accept the noise.
    const specialsSpent: string[] = [];
    for (const u of state.units) {
      for (const slug of u.abilities) {
        if (!abilityMap.get(slug)?.isSpecial) continue;
        if ((u.cooldowns[slug] ?? 0) > 0) {
          specialsSpent.push(u.definitionSlug);
          break;
        }
      }
    }
    return {
      winnerId,
      winnerSide: winnerId === p1Id ? 'p1' : winnerId === p2Id ? 'p2' : 'draw',
      turns,
      survivingUnits: { p1: p1Surv.length, p2: p2Surv.length },
      totalHpRemaining: {
        p1: p1Surv.reduce((s, u) => s + u.currentHealth, 0),
        p2: p2Surv.reduce((s, u) => s + u.currentHealth, 0),
      },
      survivingSlugs: {
        p1: p1Surv.map((u) => u.definitionSlug),
        p2: p2Surv.map((u) => u.definitionSlug),
      },
      validationErrors,
      abortedByErrorLoop,
      loneSurvivorDraw:
        isDraw && (p1Surv.length === 1 || p2Surv.length === 1),
      firstPlayerId,
      firstBloodTurn: deaths.length > 0 ? deaths[0].turn : null,
      deaths,
      specialsSpent,
    };
  };

  while (turns < MAX_TURNS) {
    const activeId = state.activePlayerId;

    // ── ROUND 1 PRE-FLIGHT (V3 feedback, Bug A) ──
    // If every uncommitted unit for the active player is frozen or dead, no
    // engine action can commit one (MOVE/USE_ABILITY are rejected; bare
    // END_TURN throws "Must commit a unit"). Commit one directly — frozen
    // preferred over dead — and advance without touching the engine so
    // validationErrors stays a clean signal for real brain/engine bugs.
    if (state.initiative.isRound1) {
      const committed = new Set(state.initiative.order);
      const uncommitted = state.units.filter(
        (u) => u.ownerPlayerId === activeId && !committed.has(u.instanceId),
      );
      const remaining = (u: UnitInstance, slug: string) =>
        u.statusEffects.reduce(
          (m, e) => (e.slug === slug && e.turnsRemaining > m ? e.turnsRemaining : m),
          0,
        );
      const canLegallyCommit = (u: UnitInstance): boolean => {
        if (!u.isAlive) return false;
        // Engine ticks the acting unit's statuses BEFORE validating, so a
        // status at 1 remaining expires and cannot block the commit.
        if (remaining(u, 'frozen') >= 2) return false;
        if (remaining(u, 'rooted') >= 2) {
          // Rooted (still active after the tick): cannot move — can only
          // commit via an ability, which needs a target in range.
          const maxRange = u.abilities.reduce((m, s) => {
            const d = abilityMap.get(s);
            const ready = (u.cooldowns[s] ?? 0) <= 0;
            return d && ready && d.range > m ? d.range : m;
          }, 0);
          const hasTarget = state.units.some(
            (t) =>
              t.isAlive &&
              t.instanceId !== u.instanceId &&
              Math.abs(t.position.x - u.position.x) +
                Math.abs(t.position.y - u.position.y) <=
                maxRange,
          );
          if (!hasTarget) return false;
        }
        return true;
      };
      const usable = uncommitted.filter(canLegallyCommit);
      if (uncommitted.length > 0 && usable.length === 0) {
        const stateCopy: MatchState = JSON.parse(JSON.stringify(state));
        const frozen = uncommitted.filter((u) => u.isAlive);
        const pick = frozen.length > 0 ? frozen[0] : uncommitted[0];
        stateCopy.initiative.order.push(pick.instanceId);
        advanceAfterRound1Commit(stateCopy, p1Id, p2Id, activeId);
        state = stateCopy;
        turns++;
        continue;
      }
    }

    const brain = activeId === p1Id ? brain1 : brain2;
    const actions = brain.selectActions(state, activeId, abilityMap);
    let result: ReturnType<typeof processTurn>;
    try {
      result = processTurn(state, actions, activeId, p1Id, p2Id, abilityMap);
      consecutiveErrors = 0;
    } catch (err) {
      if (!(err instanceof TurnValidationError)) throw err;

      validationErrors++;
      consecutiveErrors++;
      options.onValidationError?.(err, actions, state);
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        // Circuit breaker: the match is stuck in a brain/engine disagreement
        // loop. Abort as a flagged draw instead of spinning to the turn cap.
        abortedByErrorLoop = true;
        return finish(null);
      }

      if (state.initiative.isRound1) {
        // ── Round 1 recovery: force-commit the stuck unit and advance.
        const stateCopy: MatchState = JSON.parse(JSON.stringify(state));
        const committed = new Set(stateCopy.initiative.order);
        // Prefer committing a FROZEN unit over any other stuck unit —
        // matches the brain's own forced-commit ordering (frozen > dead).
        const stuckCandidates = stateCopy.units.filter(
          (u) =>
            u.ownerPlayerId === activeId &&
            u.isAlive &&
            !committed.has(u.instanceId),
        );
        const stuckUnit =
          stuckCandidates.find((u) =>
            u.statusEffects.some((e) => e.slug === 'frozen'),
          ) ?? stuckCandidates[0];
        if (stuckUnit) stateCopy.initiative.order.push(stuckUnit.instanceId);
        advanceAfterRound1Commit(stateCopy, p1Id, p2Id, activeId);
        state = stateCopy;
        turns++;
        continue;
      }

      // ── Non-Round-1 recovery: AI submitted a bad action. Skip the turn and
      //    advance initiative to the next alive unit to avoid infinite loops.
      const stateCopy: MatchState = JSON.parse(JSON.stringify(state));
      const { order, slot } = stateCopy.initiative;
      if (order.length > 0) {
        let next = (slot + 1) % order.length;
        for (let i = 0; i < order.length; i++) {
          const idx = (slot + 1 + i) % order.length;
          const u = stateCopy.units.find(
            (x) => x.instanceId === order[idx],
          );
          if (u && u.isAlive) {
            next = idx;
            break;
          }
        }
        stateCopy.initiative.slot = next;
        stateCopy.initiative.activeUnitId = order[next] ?? null;
        const nextUnit = stateCopy.units.find(
          (u) => u.instanceId === order[next],
        );
        stateCopy.activePlayerId =
          nextUnit?.ownerPlayerId ?? (activeId === p1Id ? p2Id : p1Id);
      } else {
        stateCopy.activePlayerId = activeId === p1Id ? p2Id : p1Id;
      }
      state = stateCopy;
      turns++;
      continue;
    }
    turns++;
    state = result.updatedState;
    recordDeaths();
    if (result.matchOver) {
      return finish(result.winnerId);
    }
  }

  // Turn limit hit — draw
  return finish(null);
}

/** Wilson score 95% confidence interval for a binomial proportion. */
function wilsonCI(successes: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half =
    (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, center - half), Math.min(1, center + half)];
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
    /** Log every recovered validation error with its action payload. */
    verbose?: boolean;
    /**
     * 'alternate' (default): P1 goes first in even-indexed games — removes
     * first-mover bias deterministically. 'random': engine coin flip.
     */
    firstPlayerMode?: 'alternate' | 'random';
  } = {},
): SimResult {
  const games = options.games ?? 100;
  const brain1 = options.brain1 ?? new OptimalBrain();
  const brain2 = options.brain2 ?? new OptimalBrain();
  const abilityMap = options.abilityMap ?? buildAbilityMap();
  const firstPlayerMode = options.firstPlayerMode ?? 'alternate';

  let p1Wins = 0;
  let p2Wins = 0;
  let draws = 0;
  let loneSurvivorDraws = 0;
  let totalTurns = 0;
  let totalSurvP1 = 0;
  let totalSurvP2 = 0;
  let totalValidationErrors = 0;
  let abortedGames = 0;
  const sampleErrors: string[] = [];
  const seenErrors = new Set<string>();

  let firstMoverWins = 0;
  let decidedGames = 0;
  const firstBloodTurns: number[] = [];
  // slug → { appearances, survivals, specialsSpent, deathTurnSum, deathCount }
  const perSlug: Record<
    string,
    { app: number; surv: number; spec: number; deathSum: number; deathN: number }
  > = {};
  const slugEntry = (s: string) => {
    perSlug[s] = perSlug[s] ?? { app: 0, surv: 0, spec: 0, deathSum: 0, deathN: 0 };
    return perSlug[s];
  };
  // slug → [appearances, survivals]
  const slugStats: Record<string, [number, number]> = {};
  const countAppearances = (slugs: string[]) => {
    for (const s of slugs) {
      slugStats[s] = slugStats[s] ?? [0, 0];
      slugStats[s][0]++;
    }
  };
  const countSurvivals = (slugs: string[]) => {
    for (const s of slugs) {
      slugStats[s] = slugStats[s] ?? [0, 0];
      slugStats[s][1]++;
    }
  };

  for (let i = 0; i < games; i++) {
    const forceFirstPlayerId =
      firstPlayerMode === 'alternate' ? (i % 2 === 0 ? 'p1' : 'p2') : undefined;
    const r = runMatch(p1Slugs, p2Slugs, abilityMap, brain1, brain2, {
      forceFirstPlayerId,
      onValidationError: (err, actions) => {
        if (!seenErrors.has(err.message) && sampleErrors.length < 5) {
          seenErrors.add(err.message);
          sampleErrors.push(err.message);
        }
        if (options.verbose) {
          console.warn(
            `[game ${i}] recovered TurnValidationError: ${err.message}\n  actions: ${JSON.stringify(actions)}`,
          );
        }
      },
    });
    if (r.winnerSide === 'p1') p1Wins++;
    else if (r.winnerSide === 'p2') p2Wins++;
    else draws++;
    if (r.loneSurvivorDraw) loneSurvivorDraws++;
    if (r.abortedByErrorLoop) abortedGames++;
    totalValidationErrors += r.validationErrors;
    totalTurns += r.turns;
    totalSurvP1 += r.survivingUnits.p1;
    totalSurvP2 += r.survivingUnits.p2;
    countAppearances(p1Slugs);
    countAppearances(p2Slugs);
    countSurvivals(r.survivingSlugs.p1);
    countSurvivals(r.survivingSlugs.p2);
    if (r.winnerId !== null) {
      decidedGames++;
      if (r.winnerId === r.firstPlayerId) firstMoverWins++;
    }
    if (r.firstBloodTurn !== null) firstBloodTurns.push(r.firstBloodTurn);
    for (const s of [...p1Slugs, ...p2Slugs]) slugEntry(s).app++;
    for (const s of r.specialsSpent) slugEntry(s).spec++;
    for (const d of r.deaths) {
      const e = slugEntry(d.slug);
      e.deathSum += d.turn;
      e.deathN++;
    }
  }

  const unitSurvivalRates: Record<string, number> = {};
  for (const [slug, [appearances, survivals]] of Object.entries(slugStats)) {
    unitSurvivalRates[slug] = appearances > 0 ? survivals / appearances : 0;
  }

  const specialUsageRates: Record<string, number> = {};
  const avgDeathTurn: Record<string, number> = {};
  for (const [slug, e] of Object.entries(perSlug)) {
    specialUsageRates[slug] = e.app > 0 ? e.spec / e.app : 0;
    if (e.deathN > 0) avgDeathTurn[slug] = e.deathSum / e.deathN;
  }

  return {
    p1Slugs,
    p2Slugs,
    games,
    p1Wins,
    p2Wins,
    draws,
    loneSurvivorDraws,
    p1WinRate: p1Wins / games,
    avgTurns: totalTurns / games,
    avgSurvivors: { p1: totalSurvP1 / games, p2: totalSurvP2 / games },
    unitSurvivalRates,
    totalValidationErrors,
    abortedGames,
    sampleErrors,
    p1WinRateCI: wilsonCI(p1Wins, games),
    firstMoverWinRate: decidedGames > 0 ? firstMoverWins / decidedGames : 0,
    specialUsageRates,
    avgDeathTurn,
    avgFirstBloodTurn:
      firstBloodTurns.length > 0
        ? firstBloodTurns.reduce((a, b) => a + b, 0) / firstBloodTurns.length
        : null,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

function printResult(r: SimResult) {
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  console.log(`\nSim: ${r.p1Slugs.join(',')} vs ${r.p2Slugs.join(',')}`);
  console.log(`Games: ${r.games}`);
  console.log(
    `P1 wins: ${r.p1Wins} (${pct(r.p1WinRate)})   P2 wins: ${r.p2Wins} (${pct(r.p2Wins / r.games)})   Draws: ${r.draws} (${r.loneSurvivorDraws} lone-survivor)`,
  );
  console.log(`Avg turns: ${r.avgTurns.toFixed(1)}`);
  console.log(
    `Avg survivors — P1: ${r.avgSurvivors.p1.toFixed(2)}  P2: ${r.avgSurvivors.p2.toFixed(2)}`,
  );
  console.log(
    `P1 win rate 95% CI: [${pct(r.p1WinRateCI[0])}, ${pct(r.p1WinRateCI[1])}] — only trust deltas that clear this interval`,
  );
  console.log(
    `First-mover win rate: ${pct(r.firstMoverWinRate)} of decided games` +
      (r.firstMoverWinRate > 0.55 || r.firstMoverWinRate < 0.45
        ? '  ⚠ possible turn-order imbalance'
        : ''),
  );
  if (r.avgFirstBloodTurn !== null) {
    console.log(`Avg first-blood turn: ${r.avgFirstBloodTurn.toFixed(1)}`);
  }
  const survival = Object.entries(r.unitSurvivalRates)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, rate]) => `${slug} ${pct(rate)}`)
    .join('  ');
  console.log(`Survival by unit: ${survival}`);
  const specials = Object.entries(r.specialUsageRates)
    .sort((a, b) => b[1] - a[1])
    .map(([slug, rate]) => `${slug} ${pct(rate)}`)
    .join('  ');
  console.log(`Special spent by unit: ${specials}`);
  const deathTurns = Object.entries(r.avgDeathTurn)
    .sort((a, b) => a[1] - b[1])
    .map(([slug, t]) => `${slug} t${t.toFixed(0)}`)
    .join('  ');
  if (deathTurns) console.log(`Avg death turn (earliest first): ${deathTurns}`);
  if (r.totalValidationErrors > 0) {
    console.warn(
      `⚠ Recovered validation errors: ${r.totalValidationErrors} across ${r.games} games` +
        (r.abortedGames > 0 ? ` (${r.abortedGames} games aborted by error loop)` : ''),
    );
    for (const msg of r.sampleErrors) console.warn(`   e.g. ${msg}`);
    console.warn('   These indicate brain/engine disagreements — investigate before trusting win rates.');
  }
}

const isMain =
  process.argv[1]?.endsWith('simHarness.ts') ||
  process.argv[1]?.endsWith('simHarness.js');
if (isMain) {
  const args = process.argv.slice(2);
  const vsIdx = args.indexOf('vs');
  if (vsIdx === -1 || vsIdx === 0 || vsIdx === args.length - 1) {
    console.error(
      'Usage: npx tsx src/ai/simHarness.ts <p1slugs> vs <p2slugs> [--games N] [--verbose]',
    );
    console.error(
      'Example: npx tsx src/ai/simHarness.ts fighter,barbarian,ranger,rogue vs wizard,cleric,sorcerer,warlock',
    );
    process.exit(1);
  }
  const p1Slugs = args[vsIdx - 1].split(',');
  const p2Slugs = args[vsIdx + 1].split(',');
  const gamesArg = args.indexOf('--games');
  const games = gamesArg !== -1 ? parseInt(args[gamesArg + 1], 10) : 100;
  const verbose = args.includes('--verbose');

  if (p1Slugs.length !== 4 || p2Slugs.length !== 4) {
    console.error('Each team must have exactly 4 units.');
    process.exit(1);
  }

  const unknown = [...p1Slugs, ...p2Slugs].find((s) => !UNIT_DEFS[s]);
  if (unknown) {
    console.error(
      `Unknown unit slug: "${unknown}". Valid: ${Object.keys(UNIT_DEFS).join(', ')}`,
    );
    console.error('Note: these are UNIT slugs (barbarian, cleric, ...), not ability slugs.');
    process.exit(1);
  }

  console.log(`Running ${games} games...`);
  const result = runSim(p1Slugs, p2Slugs, { games, verbose });
  printResult(result);
}
