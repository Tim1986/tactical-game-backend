/**
 * turnBuilder.ts — Pure helpers for CLIENT-side turn construction.
 *
 * The mobile match screen builds an action list optimistically and re-derives
 * engine rules in UI state; every re-derivation is a client/engine seam that
 * can (and did) desync. These helpers let the client ask the REAL engine
 * instead of guessing:
 *
 *  - precheckTurn(): dry-runs the exact action array through processTurn
 *    against the last authoritative state. If the engine would reject it, the
 *    client learns BEFORE submitting — no server round-trip, no retry loops,
 *    and for offline matches it is literally the same engine that will run it.
 *  - round1LockedUnitId(): the "one unit per round-1 commit" rule.
 *  - isTurnComplete(): drives auto-end-turn from the action list itself.
 *
 * Lives in the engine (backend/src, synced to mobile/engine) so it is unit
 * tested here and shared verbatim with the app.
 */
import { MatchState, TurnAction, GameEvent } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
/** Round 1: once any action is queued, only that unit may act this turn. */
export declare function round1LockedUnitId(actions: TurnAction[]): string | null;
/**
 * True when the queued actions use up both the move slot and the action slot
 * for the given unit — the point where the client may auto-submit.
 * CHARGE consumes the action slot (it is "move again as your action").
 */
export declare function isTurnComplete(unitInstanceId: string, actions: TurnAction[]): boolean;
export type PrecheckResult = {
    ok: true;
} | {
    ok: false;
    error: string;
};
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
export declare function precheckTurn(state: MatchState, actions: TurnAction[], submittingPlayerId: string, playerOneId: string, playerTwoId: string, abilityMap: Map<string, AbilityDefinition>): PrecheckResult;
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
export declare function dryRunTurnSoFar(state: MatchState, actions: TurnAction[], submittingPlayerId: string, playerOneId: string, playerTwoId: string, abilityMap: Map<string, AbilityDefinition>): {
    events: GameEvent[];
    updatedState: MatchState;
};
//# sourceMappingURL=turnBuilder.d.ts.map