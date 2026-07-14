import { describe, it, expect } from 'vitest';
import { processTurn } from '../src/game/turnProcessor.js';
import { buildInitialState } from '../src/game/initialState.js';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { MatchState } from '../src/types/matchState.js';

// End-to-end smoke test: drive a complete game with the real brain on BOTH
// sides, using a roster whose chosen specials exercise the status system
// (Fear=rooted, Pinning=rooted, Roar=weakened, Freeze=frozen). The point is to
// prove the engine (end-of-turn tick) and brain (presence-based willBlockOwnAction)
// stay in sync across many turns — a desync would throw a TurnValidationError
// (e.g. the brain moving a rooted unit) and fail the run.

const P1 = 'p1'; const P2 = 'p2';
const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();

const team = ['warlock', 'ranger', 'barbarian', 'wizard'].map((s) => DEFAULT_UNITS[s]);
const specials = [
  { specialSlug: 'fear', passiveSlug: null },
  { specialSlug: 'pinning', passiveSlug: null },
  { specialSlug: 'roar', passiveSlug: null },
  { specialSlug: 'freeze', passiveSlug: null },
];

// Second roster covering the remaining status-applying specials.
const team2 = ['warlock', 'wizard', 'sorcerer', 'rogue'].map((s) => DEFAULT_UNITS[s]);
const specials2 = [
  { specialSlug: 'grasp', passiveSlug: null },      // rooted + pull + damage
  { specialSlug: 'cold_snap', passiveSlug: null },  // rooted + damage
  { specialSlug: 'ignite', passiveSlug: null },     // burning
  { specialSlug: 'expose', passiveSlug: null },     // exposed
];

function runGame(seedSwap: boolean, roster = team, sp = specials): { turns: number; over: boolean } {
  let state: MatchState = buildInitialState(
    P1, P2, roster, roster,
    [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 1, y: 5 }, { x: 1, y: 7 }],
    [{ x: 6, y: 0 }, { x: 6, y: 2 }, { x: 6, y: 4 }, { x: 6, y: 6 }],
    seedSwap ? P2 : P1,
    sp, sp,
  );

  let turns = 0;
  let over = false;
  // Generous cap: a full game resolves well within this.
  for (; turns < 400; turns++) {
    const actor = state.activePlayerId;
    const actions = brain.selectActions(state, actor, abilityMap);
    const result = processTurn(state, actions, actor, P1, P2, abilityMap);
    state = result.updatedState;
    if (result.matchOver) { over = true; break; }
  }
  return { turns, over };
}

describe('full brain-vs-brain game runs without engine/brain desync', () => {
  it('plays to completion (P1 first) with no TurnValidationError', () => {
    expect(() => {
      const { over } = runGame(false);
      expect(over).toBe(true);
    }).not.toThrow();
  });

  it('plays to completion (P2 first) with no TurnValidationError', () => {
    expect(() => {
      const { over } = runGame(true);
      expect(over).toBe(true);
    }).not.toThrow();
  });

  it('second roster (grasp/cold_snap/ignite/expose) plays out cleanly both seatings', () => {
    expect(() => {
      expect(runGame(false, team2, specials2).over).toBe(true);
      expect(runGame(true, team2, specials2).over).toBe(true);
    }).not.toThrow();
  });
});
