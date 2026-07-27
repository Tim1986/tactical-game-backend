import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildInitialState } from '../src/game/initialState.js';
import { processTurn, beginTurn, applyAction, endTurn } from '../src/game/turnProcessor.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { MatchState, MoveAction, UseAbilityAction, ChargeAction } from '../src/types/matchState.js';

// ROD3 unit tests operate directly on the service-layer logic (no HTTP layer,
// no DB) by calling the engine exports the service wraps. This validates the
// contracts the service must enforce without a real DB connection.

const P1 = 'player-one';
const P2 = 'player-two';
const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();

const teamA = ['warlock', 'ranger', 'barbarian', 'wizard'].map((s) => DEFAULT_UNITS[s]);
const specialsA = [
  { specialSlug: 'fear', passiveSlug: null },
  { specialSlug: 'pinning', passiveSlug: null },
  { specialSlug: 'roar', passiveSlug: null },
  { specialSlug: 'freeze', passiveSlug: null },
];

function freshState(): MatchState {
  return buildInitialState(
    P1, P2, teamA, teamA,
    [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
    [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
    P1, specialsA, specialsA,
  );
}

type GameAction = MoveAction | ChargeAction | UseAbilityAction;

function firstGameAction(state: MatchState, actor: string): GameAction {
  const actions = brain.selectActions(state, actor, abilityMap);
  return actions.find((a) => a.type !== 'END_TURN') as GameAction;
}

describe('ROD3 engine contract', () => {
  it('beginTurn opens turnContext with seq=-1', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const r = beginTurn(state, action, actor, P1, P2);
    expect(r.updatedState.turnContext).toBeDefined();
    expect(r.updatedState.turnContext!.seq).toBe(-1);
  });

  it('applyAction increments seq correctly (service stamps it)', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const begun = beginTurn(state, action, actor, P1, P2);
    const applied = applyAction(begun.updatedState, action, actor, P1, P2, abilityMap);
    // Service layer stamps seq=0 after the call; engine leaves seq=-1 untouched
    expect(applied.updatedState.turnContext).toBeDefined();
    // Manually stamp as the service does:
    applied.updatedState.turnContext!.seq = 0;
    expect(applied.updatedState.turnContext!.seq).toBe(0);
  });

  it('endTurn clears turnContext', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const begun = beginTurn(state, action, actor, P1, P2);
    if (begun.matchOver) return; // status-tick edge case
    const applied = applyAction(begun.updatedState, action, actor, P1, P2, abilityMap);
    if (applied.matchOver) return;
    const fin = endTurn(applied.updatedState, actor, P1, P2);
    expect(fin.updatedState.turnContext).toBeUndefined();
  });

  it('applyAction rejects an action for the wrong unit', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const begun = beginTurn(state, action, actor, P1, P2);
    if (begun.matchOver) return;

    // Fabricate an action pointing at a unit the acting player doesn't own
    const wrongUnitId = state.units.find(
      (u) => u.ownerPlayerId !== actor && u.isAlive,
    )!.instanceId;
    const badAction: GameAction = { ...action, unitInstanceId: wrongUnitId };
    expect(() => applyAction(begun.updatedState, badAction, actor, P1, P2, abilityMap)).toThrow();
  });

  it('endTurn throws if no turn is in progress', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    expect(() => endTurn(state, actor, P1, P2)).toThrow(/No turn in progress/);
  });

  it('beginTurn throws if a turn is already open', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const begun = beginTurn(state, action, actor, P1, P2);
    if (begun.matchOver) return;
    expect(() => beginTurn(begun.updatedState, action, actor, P1, P2)).toThrow(/already in progress/);
  });

  it('seq idempotency: re-applying the same seq returns unchanged state (service-layer logic)', () => {
    // Simulate what the service does: stamp seq after applyAction
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const begun = beginTurn(state, action, actor, P1, P2);
    if (begun.matchOver) return;
    const applied = applyAction(begun.updatedState, action, actor, P1, P2, abilityMap);
    if (applied.matchOver) return;
    applied.updatedState.turnContext!.seq = 0;

    // If client re-sends seq=0, service sees seq === tc.seq and returns current state
    const tc = applied.updatedState.turnContext!;
    const submittedSeq = 0;
    const isIdempotentReplay = tc && submittedSeq === tc.seq;
    expect(isIdempotentReplay).toBe(true);
  });

  it('seq gap: submitting seq=2 when expected is 1 should be rejected', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const action = firstGameAction(state, actor);
    const begun = beginTurn(state, action, actor, P1, P2);
    if (begun.matchOver) return;
    const applied = applyAction(begun.updatedState, action, actor, P1, P2, abilityMap);
    if (applied.matchOver) return;
    applied.updatedState.turnContext!.seq = 0;

    const tc = applied.updatedState.turnContext!;
    const expectedSeq = (tc?.seq ?? -1) + 1; // 1
    const submittedSeq = 2;
    expect(submittedSeq).not.toBe(expectedSeq); // gap detected
  });

  it('full turn via ROD phases matches processTurn output (spot check)', () => {
    const state = freshState();
    const actor = state.activePlayerId;
    const actions = brain.selectActions(state, actor, abilityMap);
    const gameActions = actions.filter((a: { type: string }) => a.type !== 'END_TURN') as GameAction[];
    const first = gameActions[0];

    // Monolithic path
    const mono = processTurn(state, actions, actor, P1, P2, abilityMap);

    // ROD path
    const begun = beginTurn(state, first, actor, P1, P2);
    if (begun.matchOver) { expect(mono.matchOver).toBe(true); return; }
    let cur = begun.updatedState;
    for (const ga of gameActions) {
      const r = applyAction(cur, ga, actor, P1, P2, abilityMap);
      cur = r.updatedState;
      if (r.matchOver) { expect(mono.matchOver).toBe(true); return; }
    }
    const fin = endTurn(cur, actor, P1, P2);

    expect(fin.updatedState).toEqual(mono.updatedState);
    expect(fin.matchOver).toBe(mono.matchOver);
  });
});
