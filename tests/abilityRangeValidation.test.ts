/**
 * abilityRangeValidation.test.ts — an ability may never be cast at a tile
 * further from the caster than its range, no matter what the client sends.
 *
 * Regression: the match screen's AoE targeting is two taps, and the range check
 * lived only on the FIRST tap (place the centre). "Cancel Move" reverted the
 * unit's position but left `pendingAoeTarget` set, so re-selecting the ability
 * skipped straight to the second tap — which never re-checks range — and
 * committed a cast at a tile the unit could no longer reach.
 *
 * Found by a tester: move the Wizard forward, aim Ring of Frost (range 4) at
 * something far, Cancel Move, cast. The client fix is in
 * `mobile/app/match/[id].tsx` (`beginTargeting` + a confirm-time re-check);
 * these tests pin the server side, which is what makes it un-exploitable
 * regardless of what any client does.
 */
import { describe, it, expect } from 'vitest';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { MatchState, UnitInstance } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';

const P1 = 'player-one';
const P2 = 'player-two';

// Mirrors gameData's 'blizzard' (Ring of Frost): placed AoE, range 4, radius 1.
const ringOfFrost: AbilityDefinition = {
  slug: 'blizzard', name: 'Ring of Frost', description: '', targetingType: 'aoe',
  range: 4, areaRadius: 1, cooldownTurns: 0, isSpecial: true, isUnblockable: true,
  effects: [{ type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 }],
} as unknown as AbilityDefinition;

const bolt: AbilityDefinition = {
  slug: 'bolt', name: 'Bolt', description: '', targetingType: 'single',
  range: 3, areaRadius: 0, cooldownTurns: 0, isSpecial: false, isUnblockable: true,
  effects: [{ type: 'damage', formula: 'flat', value: 5 }],
} as unknown as AbilityDefinition;

const mkUnit = (id: string, owner: string, x: number, y: number): UnitInstance => ({
  instanceId: id, definitionSlug: 'test', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 100, maxHealth: 100, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {},
  statusEffects: [], passives: [], abilities: ['blizzard', 'bolt'],
  armorClass: 1, movementRange: 3,
} as unknown as UnitInstance);

// Caster at (1,4) — the Wizard's "original" tile before the cancelled move.
// `near` sits inside bolt's range-3, `far` outside it: single-target casts also
// require a unit ON the tile, so both are needed to separate "no target there"
// from "target out of range".
function mkState(): MatchState {
  return {
    units: [mkUnit('wizard', P1, 1, 4), mkUnit('near', P2, 4, 4), mkUnit('far', P2, 6, 4)],
    turnNumber: 2, activePlayerId: P1, playerOneId: P1, playerTwoId: P2,
  } as unknown as MatchState;
}

const abilityMap = new Map<string, AbilityDefinition>([
  ['blizzard', ringOfFrost], ['bolt', bolt],
]);

function cast(abilitySlug: string, target: { x: number; y: number }) {
  return processTurn(
    mkState(),
    [{ type: 'USE_ABILITY', unitInstanceId: 'wizard', abilitySlug, target }, { type: 'END_TURN' }] as any,
    P1, P1, P2, abilityMap,
  );
}

describe('ability range is enforced against the caster\'s CURRENT position', () => {
  it('accepts a placed AoE exactly at max range', () => {
    // (1,4) -> (5,4) is manhattan 4, the limit.
    expect(() => cast('blizzard', { x: 5, y: 4 })).not.toThrow();
  });

  it('REJECTS the cancel-move exploit: AoE centred beyond range', () => {
    // The tile a moved-forward Wizard could legally have reached. From the
    // ORIGINAL tile it is manhattan 6 — out of range, and must be refused.
    expect(() => cast('blizzard', { x: 7, y: 4 })).toThrow(TurnValidationError);
    expect(() => cast('blizzard', { x: 7, y: 4 })).toThrow(/out of range/i);
  });

  it('REJECTS an out-of-range AoE on the diagonal too', () => {
    // (1,4) -> (4,7) is manhattan 6; a Chebyshev reading would call it 3 and pass.
    expect(() => cast('blizzard', { x: 4, y: 7 })).toThrow(TurnValidationError);
  });

  it('REJECTS an out-of-range single-target cast', () => {
    // Same class of bug via the single-target path: (1,4) -> (6,4) is 5 vs range 3.
    expect(() => cast('bolt', { x: 6, y: 4 })).toThrow(TurnValidationError);
  });

  it('still accepts an honest single-target cast in range', () => {
    expect(() => cast('bolt', { x: 4, y: 4 })).not.toThrow();
  });
});
