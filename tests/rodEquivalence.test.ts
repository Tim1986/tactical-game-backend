import { describe, it, expect } from 'vitest';
import { processTurn, beginTurn, applyAction, endTurn } from '../src/game/turnProcessor.js';
import { buildInitialState } from '../src/game/initialState.js';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { MatchState, TurnAction, TurnResult, MoveAction, ChargeAction, UseAbilityAction } from '../src/types/matchState.js';

// ROD2 hard requirement: the incremental phase API
//   beginTurn → applyAction × N → endTurn
// must produce a result BYTE-IDENTICAL to the single-shot processTurn for the
// same actions and the same rolls. We drive whole brain-vs-brain games and, at
// every turn, resolve it BOTH ways and assert identical updatedState + events.
//
// Rolls are made deterministic with a fixed rollScript so the two independent
// deep-copies consume the same hit/miss sequence (roll-identity). The rosters
// summon no units, so no non-deterministic instance ids are generated.

const P1 = 'p1'; const P2 = 'p2';
const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();

const teamA = ['warlock', 'ranger', 'barbarian', 'wizard'].map((s) => DEFAULT_UNITS[s]);
const specialsA = [
  { specialSlug: 'fear', passiveSlug: null },
  { specialSlug: 'pinning', passiveSlug: null },
  { specialSlug: 'roar', passiveSlug: null },
  { specialSlug: 'freeze', passiveSlug: null },
];
const teamB = ['warlock', 'wizard', 'sorcerer', 'rogue'].map((s) => DEFAULT_UNITS[s]);
const specialsB = [
  { specialSlug: 'grasp', passiveSlug: null },
  { specialSlug: 'cold_snap', passiveSlug: null },
  { specialSlug: 'ignite', passiveSlug: null },
  { specialSlug: 'expose', passiveSlug: null },
];

/** Deterministic hit/miss script, long enough for a full game. */
function scriptOf(n: number): Array<'hit' | 'miss'> {
  const out: Array<'hit' | 'miss'> = [];
  for (let i = 0; i < n; i++) out.push((i * 7 + 3) % 5 === 0 ? 'miss' : 'hit');
  return out;
}

/** Resolve a turn via the incremental phase API, mirroring processTurn's control flow. */
function composeTurn(state: MatchState, actions: TurnAction[], actor: string): TurnResult {
  const gameActions = actions.filter((a) => a.type !== 'END_TURN') as (MoveAction | ChargeAction | UseAbilityAction)[];
  const first = gameActions[0] ?? null;
  const events = [];

  const begun = beginTurn(state, first, actor, P1, P2);
  events.push(...begun.events);
  if (begun.matchOver) return { ...begun, events }; // early status-tick win

  let cur = begun.updatedState;
  for (const ga of gameActions) {
    const r = applyAction(cur, ga, actor, P1, P2, abilityMap);
    events.push(...r.events);
    cur = r.updatedState;
    if (r.matchOver) {
      // processTurn breaks before END_TURN on a mid-action win; match its output.
      delete cur.turnContext;
      return { success: true, updatedState: cur, events, matchOver: true, winnerId: r.winnerId };
    }
  }

  const fin = endTurn(cur, actor, P1, P2);
  events.push(...fin.events);
  return { success: true, updatedState: fin.updatedState, events, matchOver: fin.matchOver, winnerId: fin.winnerId };
}

function assertEquivalentGame(seedSwap: boolean, roster: typeof teamA, sp: typeof specialsA): number {
  let state: MatchState = buildInitialState(
    P1, P2, roster, roster,
    [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
    [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
    seedSwap ? P2 : P1,
    sp, sp,
  );
  state.rollScript = scriptOf(6000);
  state.rollIndex = 0;

  let turns = 0;
  for (; turns < 400; turns++) {
    const actor = state.activePlayerId;
    const actions = brain.selectActions(state, actor, abilityMap);

    const mono = processTurn(state, actions, actor, P1, P2, abilityMap);
    const comp = composeTurn(state, actions, actor);

    expect(comp.events).toEqual(mono.events);
    expect(comp.updatedState).toEqual(mono.updatedState);
    expect(comp.matchOver).toBe(mono.matchOver);
    expect(comp.winnerId).toBe(mono.winnerId);

    state = mono.updatedState;
    if (mono.matchOver) break;
  }
  return turns;
}

describe('ROD2: beginTurn→applyAction×N→endTurn === processTurn', () => {
  it('roster A, P1 first — identical every turn to completion', () => {
    const turns = assertEquivalentGame(false, teamA, specialsA);
    expect(turns).toBeGreaterThan(5);
  });
  it('roster A, P2 first — identical every turn to completion', () => {
    assertEquivalentGame(true, teamA, specialsA);
  });
  it('roster B, P1 first — identical every turn to completion', () => {
    assertEquivalentGame(false, teamB, specialsB);
  });
  it('roster B, P2 first — identical every turn to completion', () => {
    assertEquivalentGame(true, teamB, specialsB);
  });

  it('phase guards: applyAction/endTurn need an open turn; beginTurn rejects a double-open', () => {
    let state: MatchState = buildInitialState(
      P1, P2, teamA, teamA,
      [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
      [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
      P1, specialsA, specialsA,
    );
    const actor = state.activePlayerId;
    const actions = brain.selectActions(state, actor, abilityMap);
    const first = actions.find((a) => a.type !== 'END_TURN') as MoveAction | ChargeAction | UseAbilityAction;

    // No turn open yet:
    expect(() => applyAction(state, first, actor, P1, P2, abilityMap)).toThrow(/No turn in progress/);
    expect(() => endTurn(state, actor, P1, P2)).toThrow(/No turn in progress/);

    const begun = beginTurn(state, first, actor, P1, P2);
    expect(begun.updatedState.turnContext).toBeDefined();
    // Can't open a second turn on top of an open one:
    expect(() => beginTurn(begun.updatedState, first, actor, P1, P2)).toThrow(/already in progress/);
    // endTurn clears the context:
    const afterApply = applyAction(begun.updatedState, first, actor, P1, P2, abilityMap);
    const fin = endTurn(afterApply.updatedState, actor, P1, P2);
    expect(fin.updatedState.turnContext).toBeUndefined();
  });
});
