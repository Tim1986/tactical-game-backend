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
import { MatchState, TurnAction } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
import { processTurn, TurnValidationError } from './turnProcessor.js';

/** Round 1: once any action is queued, only that unit may act this turn. */
export function round1LockedUnitId(actions: TurnAction[]): string | null {
  const first = actions.find((a) => a.type !== 'END_TURN');
  return first && 'unitInstanceId' in first ? first.unitInstanceId : null;
}

/**
 * True when the queued actions use up both the move slot and the action slot
 * for the given unit — the point where the client may auto-submit.
 * CHARGE consumes the action slot (it is "move again as your action").
 */
export function isTurnComplete(unitInstanceId: string, actions: TurnAction[]): boolean {
  let moved = false;
  let acted = false;
  for (const a of actions) {
    if (a.type === 'END_TURN' || a.unitInstanceId !== unitInstanceId) continue;
    if (a.type === 'MOVE') moved = true;
    if (a.type === 'CHARGE' || a.type === 'USE_ABILITY') acted = true;
  }
  return moved && acted;
}

export type PrecheckResult = { ok: true } | { ok: false; error: string };

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
export function precheckTurn(
  state: MatchState,
  actions: TurnAction[],
  submittingPlayerId: string,
  playerOneId: string,
  playerTwoId: string,
  abilityMap: Map<string, AbilityDefinition>,
): PrecheckResult {
  try {
    processTurn(state, actions, submittingPlayerId, playerOneId, playerTwoId, abilityMap);
    return { ok: true };
  } catch (err) {
    if (err instanceof TurnValidationError) return { ok: false, error: err.message };
    // Non-validation throw = engine bug or corrupt state. Let the server be
    // the judge rather than blocking the player on a client-side defect.
    return { ok: true };
  }
}
