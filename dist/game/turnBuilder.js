"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round1LockedUnitId = round1LockedUnitId;
exports.isTurnComplete = isTurnComplete;
exports.precheckTurn = precheckTurn;
exports.dryRunTurnSoFar = dryRunTurnSoFar;
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
/**
 * Resolve the turn's actions SO FAR, without ending the turn.
 *
 * The offline client needs the engine's real outcome the moment an attack is
 * made — dice, damage, statuses, cooldowns — while the turn is still open.
 * It used to ask for this by calling processTurn() with the in-progress action
 * list, but processTurn requires the list to END with an END_TURN action and
 * throws 'Turn must end with an END_TURN action' otherwise. That threw on
 * EVERY player action: the dry run silently failed (a console.warn), so the
 * player's own attacks never showed a die, never logged a roll line, and never
 * applied HP/status/cooldown until the turn was submitted. Fable's turns were
 * unaffected because they replay real server/engine events.
 *
 * Appending a synthetic END_TURN would be wrong — that finalizes the turn,
 * decrementing status durations and advancing initiative a turn early. So use
 * the same incremental primitives the ROD server path uses (beginTurn opens the
 * turn, applyAction resolves each action) and simply never finalize.
 *
 * Returns the accumulated events and the post-actions state. Throws
 * TurnValidationError exactly as the real submit would.
 */
function dryRunTurnSoFar(state, actions, submittingPlayerId, playerOneId, playerTwoId, abilityMap) {
    const gameActions = actions.filter((a) => a.type !== 'END_TURN');
    const events = [];
    let ws = state;
    if (!ws.turnContext) {
        const begun = (0, turnProcessor_js_1.beginTurn)(ws, gameActions[0] ?? null, submittingPlayerId, playerOneId, playerTwoId);
        events.push(...begun.events);
        ws = begun.updatedState;
    }
    for (const action of gameActions) {
        const applied = (0, turnProcessor_js_1.applyAction)(ws, action, submittingPlayerId, playerOneId, playerTwoId, abilityMap);
        events.push(...applied.events);
        ws = applied.updatedState;
    }
    return { events, updatedState: ws };
}
//# sourceMappingURL=turnBuilder.js.map