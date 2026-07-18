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
import { OptimalBrain, AIBrain, normalizeAbilityMap, willDieToOwnTick } from './aiBrain.js';
import { buildAbilityMap, UNIT_DEFS } from './defaultData.js';
import { planPlacement } from './placement.js';
import {
  MatchState,
  UnitInstance,
  BoardPosition,
  InitiativeState,
  BOARD_WIDTH,
  BOARD_HEIGHT,
} from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';

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

/**
 * Builds a unit instance, optionally applying a chosen special/passive
 * loadout — mirrors matchService.ts's buildUnitInstance exactly (same
 * basic/special resolution via specialOptions, same passive stat/flag
 * application) so sims reflect the real engine's customization behavior.
 * Omitting `customization` (or passing none) falls back to each unit's
 * default loadout — the first specialOption and no passive — matching prior
 * sim behavior before customization existed.
 */
function buildUnitInstance(
  slug: string,
  ownerId: string,
  position: BoardPosition,
  customization?: UnitCustomization,
  initialFortune = 0,
): UnitInstance {
  const def = UNIT_DEFS[slug];
  if (!def) throw new Error(`Unknown unit slug: ${slug}`);

  const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
  const specialSlug = customization?.specialSlug ?? def.specialOptions[0] ?? def.abilities[1];
  const abilities = basicSlug && specialSlug ? [basicSlug, specialSlug] : def.abilities;

  const passive = customization?.passiveSlug
    ? def.passiveOptions.find((p) => p.slug === customization.passiveSlug)
    : undefined;
  const maxHealth = def.maxHealth + (passive?.stat === 'maxHealth' ? (passive.value ?? 0) : 0);
  const armorClass = def.armorClass + (passive?.stat === 'armorClass' ? (passive.value ?? 0) : 0);
  const movementRange = def.movementRange + (passive?.stat === 'movementRange' ? (passive.value ?? 0) : 0);
  const passives = passive?.passiveFlag ? [...def.passives, passive.passiveFlag] : def.passives;

  const cooldowns: Record<string, number> = {};
  for (const s of abilities) cooldowns[s] = 0;
  // Warded passive: start the match shielded (see matchService counterpart).
  const instanceId = uuidv4();
  const initialStatuses = passives.includes('warded')
    ? [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: instanceId }]
    : [];
  return {
    instanceId,
    definitionSlug: def.slug,
    ownerPlayerId: ownerId,
    position,
    currentHealth: maxHealth,
    maxHealth,
    armorClass,
    movementRange,
    abilities,
    passives,
    isAlive: true,
    hasMovedThisTurn: false,
    hasActedThisTurn: false,
    cooldowns,
    statusEffects: initialStatuses,
    fortuneMeter: initialFortune,
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
  p1Customizations?: (UnitCustomization | undefined)[],
  p2Customizations?: (UnitCustomization | undefined)[],
  rng?: () => number,
): MatchState {
  // Fortune meters seed at a random phase. NOTE: the live engine now starts
  // meters at 0 ("current dodge starts at base dodge"), making real matches
  // deterministic — sims keep the random phase as a stand-in for the variance
  // human play introduces. A seeded rng keeps runs reproducible; rng omitted
  // = phase 0 (fully deterministic).
  const units: UnitInstance[] = [
    ...p1Slugs.map((slug, i) => buildUnitInstance(slug, p1Id, p1Placement[i], p1Customizations?.[i], rng ? rng() : 0)),
    ...p2Slugs.map((slug, i) => buildUnitInstance(slug, p2Id, p2Placement[i], p2Customizations?.[i], rng ? rng() : 0)),
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
  /** Per-slot special/passive loadout for each team (parallel to p1Slugs/p2Slugs). Omit for default loadouts. */
  p1Customizations?: (UnitCustomization | undefined)[];
  p2Customizations?: (UnitCustomization | undefined)[];
  /** Starting tiles (parallel to slugs). Omit for the fixed default pattern. */
  p1Placement?: BoardPosition[];
  p2Placement?: BoardPosition[];
  /** RNG for fortune-meter phase seeding. Omit for phase 0 (deterministic). */
  rng?: () => number;
  /** Called on every recovered validation error (for logging/diagnosis). */
  onValidationError?: (err: TurnValidationError, actions: unknown[], state: MatchState) => void;
  /**
   * Fully custom initial state (campaign encounters: custom instances, uneven
   * teams, absolute placements). When present, slugs/placements/customizations
   * are ignored for state building (slugs still label stats) and the legal-comp
   * check is skipped — campaign encounters aren't player-buildable teams.
   * Must set round1FirstPlayerId to forceFirstPlayerId when provided.
   */
  stateFactory?: (forceFirstPlayerId?: string) => MatchState;
}

// ─── Placement sampling ───────────────────────────────────────────────────────
// The engine is fully deterministic since the fortune meter replaced the d20:
// with fixed placements, a matchup has exactly TWO distinct games (P1-first /
// P2-first) and every additional "game" is a replay — win rates quantize to
// {0, 50, 100}%. Randomized placements restore a meaningful sample space (it
// is also the variance real games have: players choose their placements).

/** Deterministic LCG so sim runs are reproducible for a given seed. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** All legal P1-zone starting tiles: x 0–2, corners (0,0)/(0,7) excluded. */
const P1_ZONE: BoardPosition[] = [];
for (let x = 0; x <= 2; x++) {
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if ((x === 0 || x === BOARD_WIDTH - 1) && (y === 0 || y === BOARD_HEIGHT - 1)) continue;
    P1_ZONE.push({ x, y });
  }
}

/** Draw `count` distinct P1-zone tiles. Mirror with x → WIDTH-1-x for P2. */
export function randomPlacement(rng: () => number, count = 4): BoardPosition[] {
  const pool = [...P1_ZONE];
  const out: BoardPosition[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function mirrorPlacement(placement: BoardPosition[]): BoardPosition[] {
  return placement.map((p) => ({ x: BOARD_WIDTH - 1 - p.x, y: p.y }));
}

/** Mirrors teamService's MAX_DUPLICATES_PER_CLASS — sims must only measure
 *  comps a real player can field (4-stack mirrors produced degenerate
 *  balance data: heal-war stalls, meaningless utility valuations). */
const MAX_PER_CLASS = 2;

export function assertLegalComp(slugs: string[], label: string): void {
  const counts: Record<string, number> = {};
  for (const s of slugs) {
    counts[s] = (counts[s] ?? 0) + 1;
    if (counts[s] > MAX_PER_CLASS) {
      throw new Error(
        `${label} is not a legal team (${counts[s]}x ${s} — max ${MAX_PER_CLASS} per class): ${slugs.join(',')}`,
      );
    }
  }
}

export function runMatch(
  p1Slugs: string[],
  p2Slugs: string[],
  abilityMap: Map<string, AbilityDefinition>,
  brain1: AIBrain,
  brain2: AIBrain,
  options: MatchOptions = {},
): MatchResult {
  if (!options.stateFactory) {
    assertLegalComp(p1Slugs, 'p1');
    assertLegalComp(p2Slugs, 'p2');
  }
  const p1Id = options.p1Id ?? 'p1';
  const p2Id = options.p2Id ?? 'p2';
  abilityMap = normalizeAbilityMap(abilityMap);
  let state = options.stateFactory
    ? options.stateFactory(options.forceFirstPlayerId)
    : buildMatchState(
      p1Id,
      p2Id,
      p1Slugs,
      p2Slugs,
      options.p1Placement ?? DEFAULT_P1_PLACEMENT,
      options.p2Placement ?? DEFAULT_P2_PLACEMENT,
      options.forceFirstPlayerId,
      options.p1Customizations,
      options.p2Customizations,
      options.rng,
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
        // Doomed to its own burning tick: the engine ticks the committing
        // unit before processing its actions, so every action it could
        // commit with would execute against a corpse.
        if (willDieToOwnTick(u)) return false;
        // Frozen is checked PRESENCE-based at the top of the engine's round-1
        // commit gate — any turnsRemaining disqualifies. Rooted does NOT
        // disqualify: a zero-distance "hold position" MOVE is legal while
        // rooted (see processMove), so a rooted unit can always commit.
        if (remaining(u, 'frozen') >= 1) return false;
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
    /** Per-slot special/passive loadout for each team (parallel to p1Slugs/p2Slugs), held constant across all games. Omit for default loadouts. */
    p1Customizations?: (UnitCustomization | undefined)[];
    p2Customizations?: (UnitCustomization | undefined)[];
    /** Log every recovered validation error with its action payload. */
    verbose?: boolean;
    /**
     * 'alternate' (default): P1 goes first in even-indexed games — removes
     * first-mover bias deterministically. 'random': engine coin flip.
     */
    firstPlayerMode?: 'alternate' | 'random';
    /**
     * 'brain' (default): the placement planner picks starting tiles per comp
     * (melee forward-center, ranged mid, healers backline, AoE-denial
     * spacing) — deterministic per comp; game variance comes from the
     * fortune meters' random phase. 'fixed': the historical fixed pattern.
     * 'random': each game draws fresh placements per side (both from the
     * seeded rng) — placement-space stress testing, not realistic play.
     */
    placementMode?: 'fixed' | 'random' | 'brain';
    /** RNG seed for fortune-meter phases and 'random' placements (default 1). Same seed → same games. */
    seed?: number;
  } = {},
): SimResult {
  const games = options.games ?? 100;
  const brain1 = options.brain1 ?? new OptimalBrain();
  const brain2 = options.brain2 ?? new OptimalBrain();
  const abilityMap = options.abilityMap ?? buildAbilityMap();
  const firstPlayerMode = options.firstPlayerMode ?? 'alternate';
  const placementMode = options.placementMode ?? 'brain';
  const rng = makeRng(options.seed ?? 1);
  const plannedP1 = placementMode === 'brain'
    ? planPlacement(p1Slugs, normalizeAbilityMap(abilityMap), options.p1Customizations)
    : undefined;
  const plannedP2 = placementMode === 'brain'
    ? mirrorPlacement(planPlacement(p2Slugs, normalizeAbilityMap(abilityMap), options.p2Customizations))
    : undefined;

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
  let lastP1Placement: BoardPosition[] | undefined;
  let lastP2Placement: BoardPosition[] | undefined;
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
    // Random placements: draw a fresh pair per PAIR of games so the
    // alternating first-player games i and i+1 share the same board — the
    // alternation then cancels first-mover bias within each placement draw.
    let p1Placement = plannedP1;
    let p2Placement = plannedP2;
    if (placementMode === 'random') {
      p1Placement = i % 2 === 0 ? randomPlacement(rng) : lastP1Placement;
      p2Placement = i % 2 === 0 ? mirrorPlacement(randomPlacement(rng)) : lastP2Placement;
      lastP1Placement = p1Placement;
      lastP2Placement = p2Placement;
    }
    const r = runMatch(p1Slugs, p2Slugs, abilityMap, brain1, brain2, {
      forceFirstPlayerId,
      p1Placement,
      p2Placement,
      rng,
      p1Customizations: options.p1Customizations,
      p2Customizations: options.p2Customizations,
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
