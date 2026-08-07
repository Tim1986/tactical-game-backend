let _evtSeq = 0;
function nextEventId(): string { return `e${Date.now().toString(36)}_${(++_evtSeq).toString(36)}`; }
import {
  MatchState, TurnAction, MoveAction, UseAbilityAction, ChargeAction,
  GameEvent, TurnResult, UnitInstance, InitiativeState, BoardPosition,
} from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
import { chebyshevDistance, manhattanDistance, getUnitAtPosition, isTileOccupied, isInBounds, calculatePullOptions, calculatePushOptions } from './boardUtils.js';
import { reachableFrom, hasLineOfSight } from '../ai/geometry.js';
import { tickUnitStatusEffects, applyStartOfTurnStatusDamage, decrementStatusDurations, tickUnitCooldowns, resetUnitTurnFlags, willDieToStartTick, takeDamage } from './abilityExecutor.js';
import { executeAbility } from './abilityExecutor.js';
import { checkWinCondition } from './winCondition.js';

export class TurnValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'TurnValidationError'; }
}

/** Round 1 = turns 1–8, round 2 = turns 9–16, etc. (dead-unit skips still count). */
export function roundFromTurn(turnNumber: number): number {
  return Math.floor((turnNumber - 1) / 8) + 1;
}

// ─── Initiative helpers ───────────────────────────────────────────────────────

/**
 * After round 1 commitment is complete, build the canonical 8-slot interleaved order.
 * P1 (round1FirstPlayer) fills even indices 0,2,4,6; P2 fills odd indices 1,3,5,7.
 * Dead uncommitted units are appended at the end of their team's section.
 */
function buildFinalOrder(
  committed: string[],
  units: UnitInstance[],
  round1FirstPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
): string[] {
  const p2Id = round1FirstPlayerId === playerOneId ? playerTwoId : playerOneId;

  const byOwner = (pid: string) => (id: string) => {
    const u = units.find((u) => u.instanceId === id);
    return u?.ownerPlayerId === pid;
  };

  const p1Committed = committed.filter(byOwner(round1FirstPlayerId));
  const p2Committed = committed.filter(byOwner(p2Id));

  const p1Dead = units
    .filter((u) => u.ownerPlayerId === round1FirstPlayerId && !u.isAlive && !committed.includes(u.instanceId))
    .map((u) => u.instanceId);
  const p2Dead = units
    .filter((u) => u.ownerPlayerId === p2Id && !u.isAlive && !committed.includes(u.instanceId))
    .map((u) => u.instanceId);

  const p1Full = [...p1Committed, ...p1Dead];
  const p2Full = [...p2Committed, ...p2Dead];

  const order: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (p1Full[i]) order.push(p1Full[i]);
    if (p2Full[i]) order.push(p2Full[i]);
  }
  return order;
}

/**
 * Advance the initiative slot, skipping dead and frozen units.
 * Ticks frozen units' effects as their slot is skipped.
 * Returns the new slot index, the activeUnitId at that slot, and whether a new round began.
 */
function advanceSlot(
  initiative: InitiativeState,
  units: UnitInstance[],
  events: GameEvent[],
): { slot: number; activeUnitId: string; newRoundStarted: boolean; skippedSlots: number } {
  const orderLen = initiative.order.length; // should be 8 here
  let slot = (initiative.slot + 1) % orderLen;
  let newRoundStarted = slot === 0;
  let skippedSlots = 0;

  for (let attempts = 0; attempts < orderLen; attempts++) {
    const uid = initiative.order[slot];
    const unit = units.find((u) => u.instanceId === uid);

    if (!unit || !unit.isAlive) {
      events.push({
        type: 'TURN_SKIPPED',
        sourceUnitInstanceId: uid,
        message: `${unit?.definitionSlug ?? uid} — defeated, turn skipped`,
      });
      skippedSlots++;
      slot = (slot + 1) % orderLen;
      if (slot === 0) newRoundStarted = true;
      continue;
    }

    if (unit.statusEffects.some((se) => se.slug === 'frozen')) {
      // Tick effects for the frozen unit and skip their slot
      tickUnitStatusEffects(unit, events);
      events.push({
        type: 'TURN_SKIPPED',
        sourceUnitInstanceId: uid,
        message: `${unit.definitionSlug} is frozen — turn skipped`,
      });
      skippedSlots++;
      slot = (slot + 1) % orderLen;
      if (slot === 0) newRoundStarted = true;
      continue;
    }

    return { slot, activeUnitId: uid, newRoundStarted, skippedSlots };
  }

  // All dead/frozen — fallback (game should already be over)
  return { slot: 0, activeUnitId: initiative.order[0], newRoundStarted: false, skippedSlots };
}

// ─── Main processor ───────────────────────────────────────────────────────────

// ─── Phase internals ──────────────────────────────────────────────────────────
// The turn is expressed as three phases that MUTATE `ws` and push to `events`:
//   beginTurnInternal   — determine the acting unit, apply start-of-turn burn +
//                         flag reset ONCE, capture start position → ws.turnContext
//   applyGameActionInternal — process ONE MOVE/CHARGE/USE_ABILITY (server rolls)
//   finalizeTurnInternal — END_TURN: ticks, initiative advance, drain, win check,
//                         then clears ws.turnContext
// Single-shot `processTurn` composes all three in one call (byte-identical to the
// old monolith); online roll-on-demand calls them across separate HTTP requests,
// persisting ws.turnContext between them. Keep these in lock-step — there is ONE
// implementation of each rule.

/** Returns an early TurnResult if a start-of-turn status tick ended the match; else null. */
function beginTurnInternal(
  ws: MatchState,
  gameActions: (MoveAction | UseAbilityAction | ChargeAction)[],
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  events: GameEvent[],
): TurnResult | null {
  const initiative = ws.initiative;
  const isRound1 = initiative.isRound1;

  // ── Determine acting unit ────────────────────────────────────────────────
  let actingUnit: UnitInstance | null = null;
  let forcedCommit = false;

  if (isRound1) {
    if (gameActions.length === 0) {
      // Bare END_TURN is normally illegal in round 1 — but when EVERY
      // uncommitted unit is dead, frozen, or doomed to its own burning tick,
      // no legal committing action exists. Force-commit one (alive preferred)
      // without ticking it, so the player isn't hard-stuck.
      const committedIds = new Set(initiative.order);
      const uncommitted = ws.units.filter(
        (u) => u.ownerPlayerId === submittingPlayerId && !committedIds.has(u.instanceId),
      );
      const canCommit = (u: UnitInstance) =>
        u.isAlive
        && !u.statusEffects.some((se) => se.slug === 'frozen')
        && !willDieToStartTick(u);
      if (uncommitted.length === 0 || uncommitted.some(canCommit)) {
        throw new TurnValidationError('Must commit a unit in round 1 — move or use an ability');
      }
      actingUnit = uncommitted.find((u) => u.isAlive) ?? uncommitted[0];
      forcedCommit = true;
    }
    if (!forcedCommit) {
      const unitIds = new Set(gameActions.map((a) => a.unitInstanceId));
      if (unitIds.size !== 1) throw new TurnValidationError('All actions must reference the same unit');
      const actingUnitId = [...unitIds][0];
      actingUnit = ws.units.find((u) => u.instanceId === actingUnitId) ?? null;
      if (!actingUnit) throw new TurnValidationError('Unit not found');
      if (!actingUnit.isAlive) throw new TurnValidationError('Unit is dead');
      if (actingUnit.ownerPlayerId !== submittingPlayerId) throw new TurnValidationError('Unit does not belong to you');
      if (initiative.order.includes(actingUnitId)) throw new TurnValidationError('Unit already in initiative order');
      if (actingUnit.statusEffects.some((se) => se.slug === 'frozen')) {
        throw new TurnValidationError('A frozen unit cannot join the initiative — choose another unit');
      }
    }
  } else {
    // Round 2+: active unit is predetermined
    const activeUnitId = initiative.activeUnitId;
    if (!activeUnitId) throw new TurnValidationError('No active unit');
    actingUnit = ws.units.find((u) => u.instanceId === activeUnitId) ?? null;
    if (!actingUnit) throw new TurnValidationError('Active unit not found');
    if (gameActions.length > 0) {
      for (const a of gameActions) {
        if (a.unitInstanceId !== activeUnitId) {
          throw new TurnValidationError('Must act with the current initiative unit');
        }
      }
    }
  }

  // Every branch above either set actingUnit or threw.
  if (!actingUnit) throw new TurnValidationError('No acting unit');

  // ── Start-of-turn burn + reset flags for active unit ─────────────────────
  // Durations are decremented at END of this unit's turn (see finalize below),
  // so debuffs that gate the unit's OWN actions (rooted, weakened) are still in
  // force while it acts. Only burning DoT is applied here.
  // (Skipped for a forced round-1 commit: the unit never takes a turn — its
  // frozen slot is ticked by advanceSlot when the initiative reaches it.)
  if (!forcedCommit) {
    applyStartOfTurnStatusDamage(actingUnit, events);
    resetUnitTurnFlags(actingUnit);

    // Check if unit died from a status tick
    const afterTickWin = checkWinCondition(ws, playerOneId, playerTwoId);
    if (afterTickWin.isOver) {
      events.push({ type: 'MATCH_OVER', winnerId: afterTickWin.winnerId ?? undefined });
      return { success: true, updatedState: ws, events, matchOver: true, winnerId: afterTickWin.winnerId };
    }
  } else if (actingUnit.statusEffects.some((se) => se.slug === 'frozen')) {
    // A forced commit of a FROZEN unit is that unit's round-1 slot being skipped
    // by the freeze, so it ticks exactly like any other skipped frozen slot
    // (rulebook TRN-6: "status durations still tick on the skipped turn").
    // Without this the round-1 skip is free and a 2-turn freeze costs the unit
    // THREE turns — the round-1 slot plus two more ticked by advanceSlot.
    // (Other forced-commit causes — doomed-to-burn, dead — are not skipped
    // turns: those units still take a real turn later and tick then.)
    tickUnitStatusEffects(actingUnit, events);
    events.push({
      type: 'TURN_SKIPPED',
      sourceUnitInstanceId: actingUnit.instanceId,
      message: `${actingUnit.definitionSlug} is frozen — turn skipped`,
    });
    const afterTickWin = checkWinCondition(ws, playerOneId, playerTwoId);
    if (afterTickWin.isOver) {
      events.push({ type: 'MATCH_OVER', winnerId: afterTickWin.winnerId ?? undefined });
      return { success: true, updatedState: ws, events, matchOver: true, winnerId: afterTickWin.winnerId };
    }
  }

  // Capture start-of-turn position for endgame drain comparison (round 11+) and
  // stash the mid-turn context so later phases (possibly separate HTTP calls)
  // can finalize correctly.
  ws.turnContext = {
    actingUnitId: actingUnit.instanceId,
    startPos: { ...actingUnit.position },
    forcedCommit,
    seq: -1,
  };
  return null;
}

/** Process ONE game action against the open turn. The SERVER rolls inside here. */
function applyGameActionInternal(
  ws: MatchState,
  action: MoveAction | ChargeAction | UseAbilityAction,
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  abilityMap: Map<string, AbilityDefinition>,
  events: GameEvent[],
): { matchOver: boolean; winnerId: string | null } {
  const tc = ws.turnContext;
  if (!tc) throw new TurnValidationError('No turn in progress');
  const actingUnit = ws.units.find((u) => u.instanceId === tc.actingUnitId);
  if (!actingUnit) throw new TurnValidationError('Acting unit not found');

  // The acting unit can die MID-TURN (Thorns retaliation on its own attack).
  // Skip remaining actions instead of rejecting the turn (mirrors the original
  // loop's `if (!actingUnit.isAlive) continue`).
  if (!actingUnit.isAlive) return { matchOver: false, winnerId: null };

  if (action.unitInstanceId !== tc.actingUnitId) {
    throw new TurnValidationError('Must act with the current initiative unit');
  }

  if (action.type === 'MOVE') processMove(ws, action, submittingPlayerId, events);
  if (action.type === 'CHARGE') processCharge(ws, action, submittingPlayerId, events);
  if (action.type === 'USE_ABILITY') processUseAbility(ws, action, submittingPlayerId, events, abilityMap);

  const winCheck = checkWinCondition(ws, playerOneId, playerTwoId);
  if (winCheck.isOver) {
    events.push({ type: 'MATCH_OVER', winnerId: winCheck.winnerId ?? undefined });
    return { matchOver: true, winnerId: winCheck.winnerId };
  }
  return { matchOver: false, winnerId: null };
}

/** END_TURN: cooldowns, durations, initiative advance, endgame drain, win check. Clears turnContext. */
function finalizeTurnInternal(
  ws: MatchState,
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  events: GameEvent[],
): { matchOver: boolean; winnerId: string | null } {
  const initiative = ws.initiative;
  const isRound1 = initiative.isRound1;
  const tc = ws.turnContext;
  if (!tc) throw new TurnValidationError('No turn in progress');
  const actingUnit = ws.units.find((u) => u.instanceId === tc.actingUnitId);
  if (!actingUnit) throw new TurnValidationError('Acting unit not found');
  const forcedCommit = tc.forcedCommit;
  const startPos = tc.startPos;

  let matchOver = false;
  let winnerId: string | null = null;

  if (!forcedCommit) {
    tickUnitCooldowns(actingUnit);
    // Decrement the acting unit's status durations now that its turn is over.
    // (Frozen units that never act are ticked in advanceSlot.)
    decrementStatusDurations(actingUnit, events);
  }

  if (isRound1) {
    // Commit acting unit
    initiative.order.push(actingUnit.instanceId);

    // Check if both teams have committed all alive units
    const otherPlayerId = submittingPlayerId === playerOneId ? playerTwoId : playerOneId;
    const myAliveLeft = ws.units.filter(
      (u) => u.ownerPlayerId === submittingPlayerId && u.isAlive && !initiative.order.includes(u.instanceId),
    ).length;
    const theirAliveLeft = ws.units.filter(
      (u) => u.ownerPlayerId === otherPlayerId && u.isAlive && !initiative.order.includes(u.instanceId),
    ).length;

    if (myAliveLeft === 0 && theirAliveLeft === 0) {
      // Transition to round 2
      initiative.order = buildFinalOrder(initiative.order, ws.units, initiative.round1FirstPlayerId, playerOneId, playerTwoId);
      initiative.isRound1 = false;
      initiative.slot = -1; // will be set by advanceSlot below (start at -1 so advance gives 0)
      // Temporarily set slot to -1 and advance
      const firstSlot = advanceSlot({ ...initiative, slot: -1 }, ws.units, events);
      initiative.slot = firstSlot.slot;
      initiative.activeUnitId = firstSlot.activeUnitId;
      ws.turnNumber += firstSlot.skippedSlots;
      ws.roundNumber = roundFromTurn(ws.turnNumber);
      // Reset all turn flags at round boundary
      for (const u of ws.units) { u.hasMovedThisTurn = false; u.hasActedThisTurn = false; }
      const firstUnit = ws.units.find((u) => u.instanceId === firstSlot.activeUnitId);
      ws.activePlayerId = firstUnit?.ownerPlayerId ?? otherPlayerId;
    } else {
      // Stay in round 1: next player is whoever has uncommitted alive units
      const otherHasAlive = ws.units.some(
        (u) => u.ownerPlayerId === otherPlayerId && u.isAlive && !initiative.order.includes(u.instanceId),
      );
      ws.activePlayerId = otherHasAlive ? otherPlayerId : submittingPlayerId;
      initiative.activeUnitId = null;
    }
  } else {
    // Round 2+: advance slot
    const next = advanceSlot(initiative, ws.units, events);
    if (next.newRoundStarted) {
      for (const u of ws.units) { u.hasMovedThisTurn = false; u.hasActedThisTurn = false; }
    }
    initiative.slot = next.slot;
    initiative.activeUnitId = next.activeUnitId;
    const nextUnit = ws.units.find((u) => u.instanceId === next.activeUnitId);
    ws.activePlayerId = nextUnit?.ownerPlayerId ?? ws.activePlayerId;
    // Each skipped slot (dead or frozen) counts as a turn in the initiative cycle
    ws.turnNumber += next.skippedSlots;
  }

  const prevRound = ws.roundNumber;
  ws.turnNumber++;
  ws.roundNumber = roundFromTurn(ws.turnNumber);
  events.push({ type: 'TURN_ENDED' });

  // ── Endgame: announce start of round 11, then apply drain ─────────────────
  if (ws.roundNumber >= 11 && prevRound < 11) {
    events.push({ type: 'ENDGAME_STARTED', message: 'Endgame — units that end their turn farther from their nearest enemy take 1 damage.' });
  }
  if (ws.roundNumber >= 11 && !isRound1 && actingUnit.isAlive && !forcedCommit) {
    const enemies = ws.units.filter((u) => u.isAlive && u.ownerPlayerId !== actingUnit.ownerPlayerId);
    if (enemies.length > 0) {
      const distBefore = Math.min(...enemies.map((e) => manhattanDistance(startPos, e.position)));
      const distAfter  = Math.min(...enemies.map((e) => manhattanDistance(actingUnit.position, e.position)));
      if (distAfter > distBefore) {
        takeDamage(actingUnit, 1, events, actingUnit.instanceId, (actual) => {
          events.push({ type: 'ENDGAME_DRAIN', sourceUnitInstanceId: actingUnit.instanceId, targetUnitInstanceId: actingUnit.instanceId, value: actual, message: 'Retreated — 1 drain' });
        });
      }
    }
  }

  // A skipped slot's status tick (advanceSlot ticks frozen units, which now
  // includes burning DoT) can end the match without any MOVE/CHARGE/USE_ABILITY
  // action being processed this call — check here too.
  const endTurnWinCheck = checkWinCondition(ws, playerOneId, playerTwoId);
  if (endTurnWinCheck.isOver) {
    matchOver = true; winnerId = endTurnWinCheck.winnerId;
    events.push({ type: 'MATCH_OVER', winnerId: winnerId ?? undefined });
  }

  delete ws.turnContext;
  return { matchOver, winnerId };
}

// ─── Single-shot processor (byte-identical to the pre-ROD2 monolith) ──────────
// Composed from the three phase internals above so there is exactly ONE
// implementation of the turn rules. Offline, puzzles, campaign, legacy online,
// and the whole test/solver battery depend on this staying identical.
export function processTurn(
  state: MatchState,
  submittedActions: TurnAction[],
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  abilityMap: Map<string, AbilityDefinition>,
): TurnResult {
  const ws: MatchState = JSON.parse(JSON.stringify(state)) as MatchState;
  const events: GameEvent[] = [];

  if (ws.activePlayerId !== submittingPlayerId) throw new TurnValidationError('It is not your turn');

  validateActionSequence(submittedActions);

  // Backward-compat: old matches created before the initiative system use legacy processing
  if (!ws.initiative) {
    return processLegacyTurn(ws, submittedActions, submittingPlayerId, playerOneId, playerTwoId, abilityMap, events);
  }

  const gameActions = submittedActions.filter((a) => a.type !== 'END_TURN') as (MoveAction | UseAbilityAction | ChargeAction)[];

  const early = beginTurnInternal(ws, gameActions, submittingPlayerId, playerOneId, playerTwoId, events);
  if (early) { delete ws.turnContext; return early; }

  let matchOver = false;
  let winnerId: string | null = null;

  for (const action of submittedActions) {
    if (action.type === 'END_TURN') {
      const r = finalizeTurnInternal(ws, submittingPlayerId, playerOneId, playerTwoId, events);
      matchOver = r.matchOver; winnerId = r.winnerId;
      break;
    }
    const r = applyGameActionInternal(ws, action, submittingPlayerId, playerOneId, playerTwoId, abilityMap, events);
    if (r.matchOver) { matchOver = true; winnerId = r.winnerId; break; }
  }

  // Safety: the single-shot path always finalizes within one call, so turnContext
  // must never leak into its output (a mid-action win breaks before END_TURN).
  if (ws.turnContext) delete ws.turnContext;
  return { success: true, updatedState: ws, events, matchOver, winnerId };
}

// ─── Incremental API (roll-on-demand online: ROD3 calls these across HTTP) ─────
// Each takes the persisted state, deep-copies it, mutates, and returns the new
// state. ws.turnContext is the mid-turn handoff and must be stored between calls.

/** Open a turn: establish the acting unit + run start-of-turn effects ONCE.
 *  `firstAction` names the acting unit (round 1) / is validated against the
 *  predetermined unit (round 2+); pass null for a bare-END_TURN forced commit. */
export function beginTurn(
  state: MatchState,
  firstAction: MoveAction | ChargeAction | UseAbilityAction | null,
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
): TurnResult {
  const ws: MatchState = JSON.parse(JSON.stringify(state)) as MatchState;
  const events: GameEvent[] = [];
  if (ws.activePlayerId !== submittingPlayerId) throw new TurnValidationError('It is not your turn');
  if (!ws.initiative) throw new TurnValidationError('Legacy match does not support incremental turns');
  if (ws.turnContext) throw new TurnValidationError('A turn is already in progress');
  const gameActions = firstAction ? [firstAction] : [];
  const early = beginTurnInternal(ws, gameActions, submittingPlayerId, playerOneId, playerTwoId, events);
  if (early) { delete ws.turnContext; return early; }
  return { success: true, updatedState: ws, events, matchOver: false, winnerId: null };
}

/** Resolve ONE action against the open turn. The server rolls here. */
export function applyAction(
  state: MatchState,
  action: MoveAction | ChargeAction | UseAbilityAction,
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  abilityMap: Map<string, AbilityDefinition>,
): TurnResult {
  const ws: MatchState = JSON.parse(JSON.stringify(state)) as MatchState;
  const events: GameEvent[] = [];
  if (ws.activePlayerId !== submittingPlayerId) throw new TurnValidationError('It is not your turn');
  if (!ws.turnContext) throw new TurnValidationError('No turn in progress — call beginTurn first');
  const r = applyGameActionInternal(ws, action, submittingPlayerId, playerOneId, playerTwoId, abilityMap, events);
  return { success: true, updatedState: ws, events, matchOver: r.matchOver, winnerId: r.winnerId };
}

/** Finalize the open turn and advance initiative. */
export function endTurn(
  state: MatchState,
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
): TurnResult {
  const ws: MatchState = JSON.parse(JSON.stringify(state)) as MatchState;
  const events: GameEvent[] = [];
  if (ws.activePlayerId !== submittingPlayerId) throw new TurnValidationError('It is not your turn');
  if (!ws.turnContext) throw new TurnValidationError('No turn in progress — call beginTurn first');
  const r = finalizeTurnInternal(ws, submittingPlayerId, playerOneId, playerTwoId, events);
  return { success: true, updatedState: ws, events, matchOver: r.matchOver, winnerId: r.winnerId };
}

// ─── Action processors (unchanged from before) ────────────────────────────────

function validateActionSequence(actions: TurnAction[]): void {
  if (!Array.isArray(actions) || actions.length === 0) throw new TurnValidationError('Turn must contain at least one action');
  if (actions.length > 4) throw new TurnValidationError('Too many actions in one turn');
  const endIdx = actions.findIndex((a) => a.type === 'END_TURN');
  if (endIdx === -1) throw new TurnValidationError('Turn must end with an END_TURN action');
  if (endIdx !== actions.length - 1) throw new TurnValidationError('END_TURN must be the last action');
  if (actions.filter((a) => a.type === 'END_TURN').length > 1) throw new TurnValidationError('Multiple END_TURN actions');
  if (actions.filter((a) => a.type === 'CHARGE').length > 1) throw new TurnValidationError('Cannot charge more than once per turn');
}

function processCharge(state: MatchState, action: ChargeAction, playerId: string, events: GameEvent[]): void {
  const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
  if (unit.hasActedThisTurn) throw new TurnValidationError('Unit has already used its action this turn');
  if (unit.statusEffects.some((se) => se.slug === 'frozen')) throw new TurnValidationError('Unit is frozen and cannot act');
  if (unit.statusEffects.some((se) => se.slug === 'rooted')) throw new TurnValidationError('Unit is rooted and cannot move');
  if (!isInBounds(action.destination)) throw new TurnValidationError('Destination is out of bounds');
  if (isTileOccupied(state.units.filter((u) => u.instanceId !== unit.instanceId), action.destination)) throw new TurnValidationError('Destination tile is occupied');
  const distance = manhattanDistance(unit.position, action.destination);
  if (distance > (unit.movementRange ?? 3)) throw new TurnValidationError('Charge destination out of movement range');
  const chargeReachable = reachableFrom(unit.position, unit, state.units, unit.movementRange ?? 3);
  if (!chargeReachable.some((p) => p.x === action.destination.x && p.y === action.destination.y)) throw new TurnValidationError('Charge destination is not reachable (path blocked by enemy)');
  unit.position = action.destination;
  unit.hasActedThisTurn = true;
  events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: unit.instanceId, position: action.destination, message: `${unit.definitionSlug} charged` });
}

function processMove(state: MatchState, action: MoveAction, playerId: string, events: GameEvent[]): void {
  const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
  if (unit.hasMovedThisTurn) throw new TurnValidationError('Unit has already moved this turn');
  if (!isInBounds(action.destination)) throw new TurnValidationError('Destination is out of bounds');
  if (isTileOccupied(state.units.filter((u) => u.instanceId !== unit.instanceId), action.destination)) throw new TurnValidationError('Destination tile is occupied');
  const distance = manhattanDistance(unit.position, action.destination);
  // Rooted blocks movement, not standing still: a zero-distance MOVE ("hold
  // position") stays legal so a rooted unit can always satisfy the round-1
  // commitment requirement.
  if (distance > 0 && unit.statusEffects.some((se) => se.slug === 'rooted')) throw new TurnValidationError('Unit is rooted and cannot move');
  if (unit.statusEffects.some((se) => se.slug === 'frozen')) throw new TurnValidationError('Unit is frozen and cannot act');
  if (distance > (unit.movementRange ?? 3)) throw new TurnValidationError('Destination out of movement range');
  if (distance > 0) {
    const reachable = reachableFrom(unit.position, unit, state.units, unit.movementRange ?? 3);
    if (!reachable.some((p) => p.x === action.destination.x && p.y === action.destination.y)) throw new TurnValidationError('Destination is not reachable (path blocked by enemy)');
  }
  unit.position = action.destination;
  unit.hasMovedThisTurn = true;
  events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: unit.instanceId, position: action.destination });
}

function processUseAbility(state: MatchState, action: UseAbilityAction, playerId: string, events: GameEvent[], abilityMap: Map<string, AbilityDefinition>): void {
  const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
  if (unit.statusEffects.some((se) => se.slug === 'frozen')) throw new TurnValidationError('Unit is frozen and cannot act');
  if (unit.hasActedThisTurn) throw new TurnValidationError('Unit has already used an ability this turn');
  const unitAbilities = unit.abilities ?? [];
  if (!unitAbilities.includes(action.abilitySlug)) throw new TurnValidationError('Unit does not have ability: ' + action.abilitySlug);
  const ability = abilityMap.get(action.abilitySlug);
  if (!ability) throw new TurnValidationError('Unknown ability: ' + action.abilitySlug);
  const cooldown = unit.cooldowns[action.abilitySlug] ?? 0;
  if (cooldown > 0) throw new TurnValidationError('Ability on cooldown (' + cooldown + ' turns remaining)');
  if (!isInBounds(action.target)) throw new TurnValidationError('Target position is out of bounds');
  if (ability.targetingType !== 'self') {
    // Line abilities: target is a direction indicator, range measured in steps (Chebyshev)
    // All others: Manhattan distance
    const rangeDistance = ability.targetingType === 'line'
      ? chebyshevDistance(unit.position, action.target)
      : manhattanDistance(unit.position, action.target);
    if (rangeDistance > ability.range) throw new TurnValidationError('Target out of range');
  }
  // Leap (move_self): the caster ends the cast standing on the target tile, so
  // that tile must be free. Nothing in BETWEEN is checked — a leap passes over
  // units by design, which is the whole point of giving melee some reach.
  if (ability.effects.some((e) => e.type === 'move_self')) {
    const occupant = getUnitAtPosition(state.units.filter((u) => u.isAlive), action.target);
    if (occupant && occupant.instanceId !== unit.instanceId) {
      throw new TurnValidationError('Cannot leap onto an occupied tile');
    }
  }
  if (ability.targetingType === 'single') {
    const targetUnit = getUnitAtPosition(state.units.filter((u) => u.isAlive), action.target);
    if (!targetUnit) throw new TurnValidationError('No unit at target position');
    // LOS: single-target abilities are blocked by a living unit on a true line
    // (orthogonal/diagonal) between caster and target; non-aligned targets are
    // never blocked. Push abilities (Fear) are exempt — mirrors the client's
    // targeting UI exactly. Line/AoE/self are LOS-free by design.
    const hasPushEffect = ability.effects.some((e) => e.type === 'push');
    if (!hasPushEffect && !hasLineOfSight(unit.position, action.target, state.units, [unit.instanceId, targetUnit.instanceId])) {
      throw new TurnValidationError('No line of sight to target');
    }
  }
  // The client may steer a displacement (which cardinal Fear shoves toward,
  // which corner a diagonal Shadow Grasp cuts). That choice MUST be checked
  // against the options the rules actually offer: it used to be passed straight
  // through to applyPush, so a crafted pushDestination could shove a unit any
  // distance in any direction — including toward the caster.
  if (action.pushDestination) {
    const disp = ability.effects.find((e) => e.type === 'push' || e.type === 'pull');
    if (!disp || (disp as { distance?: number }).distance === undefined) {
      throw new TurnValidationError('Ability has no displacement to steer');
    }
    const displaced = getUnitAtPosition(state.units.filter((u) => u.isAlive), action.target);
    if (!displaced) throw new TurnValidationError('No unit at target position');
    const blocked = (p: BoardPosition) => state.units.some(
      (u) => u.isAlive && u.instanceId !== displaced.instanceId && u.position.x === p.x && u.position.y === p.y,
    );
    const distance = (disp as { distance: number }).distance;
    const legal = disp.type === 'pull'
      ? calculatePullOptions(displaced.position, unit.position, distance, blocked)
      : calculatePushOptions(displaced.position, unit.position, distance, blocked);
    if (!legal.some((p) => p.x === action.pushDestination!.x && p.y === action.pushDestination!.y)) {
      throw new TurnValidationError('Illegal displacement destination');
    }
  }
  events.push({ type: 'ABILITY_USED', sourceUnitInstanceId: unit.instanceId, position: action.target, message: `Used ${ability.name}`, abilitySlug: ability.slug });
  executeAbility({ state, caster: unit, targetPosition: action.target, ability, events, pushDestination: action.pushDestination });
  if (ability.cooldownTurns > 0) unit.cooldowns[action.abilitySlug] = ability.cooldownTurns;
  unit.hasActedThisTurn = true;
}

function findAndValidateUnit(state: MatchState, unitInstanceId: string, playerId: string): UnitInstance {
  const unit = state.units.find((u) => u.instanceId === unitInstanceId);
  if (!unit) throw new TurnValidationError('Unit not found: ' + unitInstanceId);
  if (!unit.isAlive) throw new TurnValidationError('Unit is dead');
  if (unit.ownerPlayerId !== playerId) throw new TurnValidationError('Unit does not belong to you');
  return unit;
}

export function generateInstanceId(): string { return nextEventId(); }

// Legacy processor for matches created before the initiative system
function processLegacyTurn(
  ws: MatchState,
  submittedActions: TurnAction[],
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  abilityMap: Map<string, AbilityDefinition>,
  events: GameEvent[],
): TurnResult {
  validateActionSequence(submittedActions);
  let matchOver = false;
  let winnerId: string | null = null;

  for (const action of submittedActions) {
    if (action.type === 'END_TURN') {
      const otherPlayerId = submittingPlayerId === playerOneId ? playerTwoId : playerOneId;
      ws.activePlayerId = otherPlayerId;
      ws.turnNumber++;
      ws.roundNumber = roundFromTurn(ws.turnNumber);
      events.push({ type: 'TURN_ENDED' });
      break;
    }
    if (action.type === 'MOVE') processMove(ws, action, submittingPlayerId, events);
    if (action.type === 'CHARGE') processCharge(ws, action, submittingPlayerId, events);
    if (action.type === 'USE_ABILITY') processUseAbility(ws, action, submittingPlayerId, events, abilityMap);
    const winCheck = checkWinCondition(ws, playerOneId, playerTwoId);
    if (winCheck.isOver) {
      matchOver = true; winnerId = winCheck.winnerId;
      events.push({ type: 'MATCH_OVER', winnerId: winnerId ?? undefined });
      break;
    }
  }
  return { success: true, updatedState: ws, events, matchOver, winnerId };
}
