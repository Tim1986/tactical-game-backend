"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round1LockedUnitId = round1LockedUnitId;
exports.isTurnComplete = isTurnComplete;
exports.precheckTurn = precheckTurn;
const turnProcessor_js_1 = require("./turnProcessor.js");
/** Round 1: once any action is queued, only that unit may act this turn. */
function round1LockedUnitId(actions) {
    const first = actions.find((a) => a.type !== 'END_TURN');
    return first && 'unitInstanceId' in first ? first.unitInstanceId : null;
}
/**
 * True when the queued actions use up both the move slot and the action slot
 * for the given unit — the point where the client may auto-submit.
 * CHARGE consumes the action slot (it is "move again as your action").
 */
function isTurnComplete(unitInstanceId, actions) {
    let moved = false;
    let acted = false;
    for (const a of actions) {
        if (a.type === 'END_TURN' || a.unitInstanceId !== unitInstanceId)
            continue;
        if (a.type === 'MOVE')
            moved = true;
        if (a.type === 'CHARGE' || a.type === 'USE_ABILITY')
            acted = true;
    }
    return moved && acted;
}
/**
 * Dry-run a full turn through the real engine. `state` must be the last
 * AUTHORITATIVE state (server-returned / stored), not optimistic UI state.
 * processTurn deep-clones internally, so the passed state is never mutated.
 *
 * A precheck failure means the submit is doomed: surface the message and let
 * the player revise. A precheck success is not a guarantee (server state may
 * have advanced), so the server result must still be handled — but in
 * practice it eliminates the reject-retry class of failures.
 */
function precheckTurn(state, actions, submittingPlayerId, playerOneId, playerTwoId, abilityMap) {
    try {
        (0, turnProcessor_js_1.processTurn)(state, actions, submittingPlayerId, playerOneId, playerTwoId, abilityMap);
        return { ok: true };
    }
    catch (err) {
        if (err instanceof turnProcessor_js_1.TurnValidationError)
            return { ok: false, error: err.message };
        // Non-validation throw = engine bug or corrupt state. Let the server be
        // the judge rather than blocking the player on a client-side defect.
        return { ok: true };
    }
}
//# sourceMappingURL=turnBuilder.js.map