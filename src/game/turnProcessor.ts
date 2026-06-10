import { v4 as uuidv4 } from 'uuid';
import {
  MatchState, TurnAction, MoveAction, UseAbilityAction,
  GameEvent, TurnResult, UnitInstance,
} from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
import { chebyshevDistance, getUnitAtPosition, isTileOccupied, isInBounds } from './boardUtils.js';
import { executeAbility, tickStatusEffects, tickCooldowns, resetTurnFlags } from './abilityExecutor.js';
import { checkWinCondition } from './winCondition.js';

export class TurnValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'TurnValidationError'; }
}

export function processTurn(
  state: MatchState, submittedActions: TurnAction[], submittingPlayerId: string,
  playerOneId: string, playerTwoId: string, abilityMap: Map<string, AbilityDefinition>
): TurnResult {
  const workingState: MatchState = JSON.parse(JSON.stringify(state)) as MatchState;
  const events: GameEvent[] = [];
  if (workingState.activePlayerId !== submittingPlayerId) throw new TurnValidationError('It is not your turn');
  validateActionSequence(submittedActions);
  tickStatusEffects(workingState, submittingPlayerId, events);
  const tickWin = checkWinCondition(workingState, playerOneId, playerTwoId);
  if (tickWin.isOver) {
    events.push({ type: 'MATCH_OVER', winnerId: tickWin.winnerId ?? undefined });
    return { success: true, updatedState: workingState, events, matchOver: true, winnerId: tickWin.winnerId };
  }
  resetTurnFlags(workingState, submittingPlayerId);
  let matchOver = false;
  let winnerId: string | null = null;
  for (const action of submittedActions) {
    if (action.type === 'END_TURN') {
      tickCooldowns(workingState, submittingPlayerId);
      const opponentId = submittingPlayerId === playerOneId ? playerTwoId : playerOneId;
      workingState.activePlayerId = opponentId;
      workingState.turnNumber++;
      events.push({ type: 'TURN_ENDED' });
      break;
    }
    if (action.type === 'MOVE') processMove(workingState, action, submittingPlayerId, events);
    if (action.type === 'USE_ABILITY') processUseAbility(workingState, action, submittingPlayerId, events, abilityMap);
    const winCheck = checkWinCondition(workingState, playerOneId, playerTwoId);
    if (winCheck.isOver) {
      matchOver = true; winnerId = winCheck.winnerId;
      events.push({ type: 'MATCH_OVER', winnerId: winnerId ?? undefined });
      break;
    }
  }
  return { success: true, updatedState: workingState, events, matchOver, winnerId };
}

function validateActionSequence(actions: TurnAction[]): void {
  if (!Array.isArray(actions) || actions.length === 0) throw new TurnValidationError('Turn must contain at least one action');
  if (actions.length > 10) throw new TurnValidationError('Turn cannot contain more than 10 actions');
  const endTurnIndex = actions.findIndex((a) => a.type === 'END_TURN');
  if (endTurnIndex === -1) throw new TurnValidationError('Turn must end with an END_TURN action');
  if (endTurnIndex !== actions.length - 1) throw new TurnValidationError('END_TURN must be the last action');
  if (actions.filter((a) => a.type === 'END_TURN').length > 1) throw new TurnValidationError('Turn cannot contain multiple END_TURN actions');
}

function processMove(state: MatchState, action: MoveAction, playerId: string, events: GameEvent[]): void {
  const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
  if (unit.hasMovedThisTurn) throw new TurnValidationError('Unit has already moved this turn');
  if (!isInBounds(action.destination)) throw new TurnValidationError('Destination is out of bounds');
  if (isTileOccupied(state.units.filter((u) => u.instanceId !== unit.instanceId), action.destination)) throw new TurnValidationError('Destination tile is occupied');
  if (unit.statusEffects.some((se) => se.slug === 'rooted')) throw new TurnValidationError('Unit is rooted and cannot move');
  if (unit.statusEffects.some((se) => se.slug === 'stunned')) throw new TurnValidationError('Unit is stunned and cannot act');
  const unitMovementRange = getUnitMovementRange(unit);
  const distance = chebyshevDistance(unit.position, action.destination);
  if (distance > unitMovementRange) throw new TurnValidationError('Destination is out of movement range (max: ' + unitMovementRange + ', attempted: ' + distance + ')');
  unit.position = action.destination;
  unit.hasMovedThisTurn = true;
  events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: unit.instanceId, position: action.destination });
}

function processUseAbility(state: MatchState, action: UseAbilityAction, playerId: string, events: GameEvent[], abilityMap: Map<string, AbilityDefinition>): void {
  const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
  if (unit.statusEffects.some((se) => se.slug === 'stunned')) throw new TurnValidationError('Unit is stunned and cannot act');
  if (unit.hasActedThisTurn) throw new TurnValidationError('Unit has already used an ability this turn');
  const unitAbilities = getUnitAbilities(unit);
  if (!unitAbilities.includes(action.abilitySlug)) throw new TurnValidationError('Unit does not have ability: ' + action.abilitySlug);
  const ability = abilityMap.get(action.abilitySlug);
  if (!ability) throw new TurnValidationError('Unknown ability: ' + action.abilitySlug);
  const cooldown = unit.cooldowns[action.abilitySlug] ?? 0;
  if (cooldown > 0) throw new TurnValidationError('Ability ' + action.abilitySlug + ' is on cooldown (' + cooldown + ' turns remaining)');
  if (!isInBounds(action.target)) throw new TurnValidationError('Target position is out of bounds');
  if (ability.targetingType !== 'self') {
    const rangeDistance = chebyshevDistance(unit.position, action.target);
    if (rangeDistance > ability.range) throw new TurnValidationError('Target is out of range (max: ' + ability.range + ', attempted: ' + rangeDistance + ')');
  }
  if (ability.targetingType === 'single') {
    const targetUnit = getUnitAtPosition(state.units.filter((u) => u.isAlive), action.target);
    if (!targetUnit) throw new TurnValidationError('No unit at target position');
  }
  executeAbility({ state, caster: unit, targetPosition: action.target, ability, events });
  if (ability.cooldownTurns > 0) unit.cooldowns[action.abilitySlug] = ability.cooldownTurns;
  unit.hasActedThisTurn = true;
  events.push({ type: 'ABILITY_USED', sourceUnitInstanceId: unit.instanceId, position: action.target, message: 'Used ' + ability.name });
}

function findAndValidateUnit(state: MatchState, unitInstanceId: string, playerId: string): UnitInstance {
  const unit = state.units.find((u) => u.instanceId === unitInstanceId);
  if (!unit) throw new TurnValidationError('Unit not found: ' + unitInstanceId);
  if (!unit.isAlive) throw new TurnValidationError('Unit is dead');
  if (unit.ownerPlayerId !== playerId) throw new TurnValidationError('Unit does not belong to you');
  return unit;
}

function getUnitMovementRange(unit: UnitInstance): number {
  return (unit as UnitInstance & { movementRange?: number }).movementRange ?? 3;
}

function getUnitAbilities(unit: UnitInstance): string[] {
  return (unit as UnitInstance & { abilities?: string[] }).abilities ?? [];
}

export function generateInstanceId(): string { return uuidv4(); }
