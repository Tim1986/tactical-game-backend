"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnValidationError = void 0;
exports.processTurn = processTurn;
exports.generateInstanceId = generateInstanceId;
const uuid_1 = require("uuid");
const boardUtils_js_1 = require("./boardUtils.js");
const abilityExecutor_js_1 = require("./abilityExecutor.js");
const winCondition_js_1 = require("./winCondition.js");
class TurnValidationError extends Error {
    constructor(message) { super(message); this.name = 'TurnValidationError'; }
}
exports.TurnValidationError = TurnValidationError;
function processTurn(state, submittedActions, submittingPlayerId, playerOneId, playerTwoId, abilityMap) {
    const workingState = JSON.parse(JSON.stringify(state));
    const events = [];
    if (workingState.activePlayerId !== submittingPlayerId)
        throw new TurnValidationError('It is not your turn');
    validateActionSequence(submittedActions);
    (0, abilityExecutor_js_1.tickStatusEffects)(workingState, submittingPlayerId, events);
    const tickWin = (0, winCondition_js_1.checkWinCondition)(workingState, playerOneId, playerTwoId);
    if (tickWin.isOver) {
        events.push({ type: 'MATCH_OVER', winnerId: tickWin.winnerId ?? undefined });
        return { success: true, updatedState: workingState, events, matchOver: true, winnerId: tickWin.winnerId };
    }
    (0, abilityExecutor_js_1.resetTurnFlags)(workingState, submittingPlayerId);
    let matchOver = false;
    let winnerId = null;
    for (const action of submittedActions) {
        if (action.type === 'END_TURN') {
            (0, abilityExecutor_js_1.tickCooldowns)(workingState, submittingPlayerId);
            const opponentId = submittingPlayerId === playerOneId ? playerTwoId : playerOneId;
            workingState.activePlayerId = opponentId;
            workingState.turnNumber++;
            events.push({ type: 'TURN_ENDED' });
            break;
        }
        if (action.type === 'MOVE')
            processMove(workingState, action, submittingPlayerId, events);
        if (action.type === 'USE_ABILITY')
            processUseAbility(workingState, action, submittingPlayerId, events, abilityMap);
        const winCheck = (0, winCondition_js_1.checkWinCondition)(workingState, playerOneId, playerTwoId);
        if (winCheck.isOver) {
            matchOver = true;
            winnerId = winCheck.winnerId;
            events.push({ type: 'MATCH_OVER', winnerId: winnerId ?? undefined });
            break;
        }
    }
    return { success: true, updatedState: workingState, events, matchOver, winnerId };
}
function validateActionSequence(actions) {
    if (!Array.isArray(actions) || actions.length === 0)
        throw new TurnValidationError('Turn must contain at least one action');
    if (actions.length > 10)
        throw new TurnValidationError('Turn cannot contain more than 10 actions');
    const endTurnIndex = actions.findIndex((a) => a.type === 'END_TURN');
    if (endTurnIndex === -1)
        throw new TurnValidationError('Turn must end with an END_TURN action');
    if (endTurnIndex !== actions.length - 1)
        throw new TurnValidationError('END_TURN must be the last action');
    if (actions.filter((a) => a.type === 'END_TURN').length > 1)
        throw new TurnValidationError('Turn cannot contain multiple END_TURN actions');
}
function processMove(state, action, playerId, events) {
    const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
    if (unit.hasMovedThisTurn)
        throw new TurnValidationError('Unit has already moved this turn');
    if (!(0, boardUtils_js_1.isInBounds)(action.destination))
        throw new TurnValidationError('Destination is out of bounds');
    if ((0, boardUtils_js_1.isTileOccupied)(state.units.filter((u) => u.instanceId !== unit.instanceId), action.destination))
        throw new TurnValidationError('Destination tile is occupied');
    if (unit.statusEffects.some((se) => se.slug === 'rooted'))
        throw new TurnValidationError('Unit is rooted and cannot move');
    if (unit.statusEffects.some((se) => se.slug === 'stunned'))
        throw new TurnValidationError('Unit is stunned and cannot act');
    const unitMovementRange = getUnitMovementRange(unit);
    const distance = (0, boardUtils_js_1.chebyshevDistance)(unit.position, action.destination);
    if (distance > unitMovementRange)
        throw new TurnValidationError('Destination is out of movement range (max: ' + unitMovementRange + ', attempted: ' + distance + ')');
    unit.position = action.destination;
    unit.hasMovedThisTurn = true;
    events.push({ type: 'UNIT_MOVED', sourceUnitInstanceId: unit.instanceId, position: action.destination });
}
function processUseAbility(state, action, playerId, events, abilityMap) {
    const unit = findAndValidateUnit(state, action.unitInstanceId, playerId);
    if (unit.statusEffects.some((se) => se.slug === 'stunned'))
        throw new TurnValidationError('Unit is stunned and cannot act');
    if (unit.hasActedThisTurn)
        throw new TurnValidationError('Unit has already used an ability this turn');
    const unitAbilities = getUnitAbilities(unit);
    if (!unitAbilities.includes(action.abilitySlug))
        throw new TurnValidationError('Unit does not have ability: ' + action.abilitySlug);
    const ability = abilityMap.get(action.abilitySlug);
    if (!ability)
        throw new TurnValidationError('Unknown ability: ' + action.abilitySlug);
    const cooldown = unit.cooldowns[action.abilitySlug] ?? 0;
    if (cooldown > 0)
        throw new TurnValidationError('Ability ' + action.abilitySlug + ' is on cooldown (' + cooldown + ' turns remaining)');
    if (!(0, boardUtils_js_1.isInBounds)(action.target))
        throw new TurnValidationError('Target position is out of bounds');
    if (ability.targetingType !== 'self') {
        const rangeDistance = (0, boardUtils_js_1.chebyshevDistance)(unit.position, action.target);
        if (rangeDistance > ability.range)
            throw new TurnValidationError('Target is out of range (max: ' + ability.range + ', attempted: ' + rangeDistance + ')');
    }
    if (ability.targetingType === 'single') {
        const targetUnit = (0, boardUtils_js_1.getUnitAtPosition)(state.units.filter((u) => u.isAlive), action.target);
        if (!targetUnit)
            throw new TurnValidationError('No unit at target position');
    }
    (0, abilityExecutor_js_1.executeAbility)({ state, caster: unit, targetPosition: action.target, ability, events });
    if (ability.cooldownTurns > 0)
        unit.cooldowns[action.abilitySlug] = ability.cooldownTurns;
    unit.hasActedThisTurn = true;
    events.push({ type: 'ABILITY_USED', sourceUnitInstanceId: unit.instanceId, position: action.target, message: 'Used ' + ability.name });
}
function findAndValidateUnit(state, unitInstanceId, playerId) {
    const unit = state.units.find((u) => u.instanceId === unitInstanceId);
    if (!unit)
        throw new TurnValidationError('Unit not found: ' + unitInstanceId);
    if (!unit.isAlive)
        throw new TurnValidationError('Unit is dead');
    if (unit.ownerPlayerId !== playerId)
        throw new TurnValidationError('Unit does not belong to you');
    return unit;
}
function getUnitMovementRange(unit) {
    return unit.movementRange ?? 3;
}
function getUnitAbilities(unit) {
    return unit.abilities ?? [];
}
function generateInstanceId() { return (0, uuid_1.v4)(); }
//# sourceMappingURL=turnProcessor.js.map