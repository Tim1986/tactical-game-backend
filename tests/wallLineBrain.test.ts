import { describe, it, expect } from 'vitest';
import { OptimalBrain } from '../src/ai/aiBrain.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { MatchState, UnitInstance, InitiativeState } from '../src/types/matchState.js';

/**
 * Regression: the brain must stop a LINE ability's ray at the first WALL,
 * exactly where the executor's getLineTiles stops it.
 *
 * Owner report 2026-08-24 (unlitbeacon e4): "The Torchhand (Sorcerer) tried to
 * use flame jet on two of my characters, but the wall was in front of him, and
 * it blocked it and the flame jet didn't hit anything." The brain's
 * line-scoring loop broke only on board bounds, so it scored every unit BEHIND
 * a wall and spent a once-per-battle special on stone.
 *
 * The fixture is deliberately hand-built rather than taken from a campaign:
 * it puts a wall DIRECTLY between the caster and two stacked victims, which is
 * the exact geometry that fails. (A campaign fixture passed this test even
 * with the fix reverted — its opening positions never line up that way.)
 */
const ENEMY = 'e'; const PARTY = 'p';
const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();

const unit = (id: string, owner: string, slug: string, x: number, y: number, abilities: string[]): UnitInstance => ({
  instanceId: id, definitionSlug: slug, ownerPlayerId: owner,
  position: { x, y }, currentHealth: 16, maxHealth: 30,
  armorClass: 10, movementRange: 0, abilities, passives: [],
  isAlive: true, hasMovedThisTurn: true, hasActedThisTurn: false,
  cooldowns: {}, statusEffects: [],
});

describe('brain: a line ability never fires into a wall', () => {
  // Sorcerer at (1,4). WALL at (2,4). Two heroes stacked behind it at (3,4)
  // and (4,4) — the only enemies on the board, and a juicy two-for-one to any
  // scorer that cannot see stone. Movement 0 so the only choice is the cast.
  const makeState = (): MatchState => {
    // Flame Jet is the caster's ONLY ability. With a basic attack available
    // the brain always prefers it (a free single-target hit beats spending a
    // once-per-battle special), and then this fixture never exercises the line
    // scorer at all — which is exactly how the first version of this test
    // passed with the bug still in place.
    const caster = unit('torch', ENEMY, 'sorcerer', 1, 4, ['flame_jet']);
    const h1 = unit('h1', PARTY, 'fighter', 3, 4, ['sword']);
    const h2 = unit('h2', PARTY, 'fighter', 4, 4, ['sword']);
    const initiative = {
      order: ['torch', 'h1', 'h2'], slot: 0, round1FirstPlayerId: PARTY,
      activeUnitId: 'torch', isRound1: false, roundNumber: 2,
    } as InitiativeState;
    return {
      board: { width: 8, height: 8 }, units: [caster, h1, h2],
      // ⚠ roundNumber must be set at the TOP level, not only on initiative:
      // specialReserveFor() reads state.roundNumber, and an undefined one
      // makes the reserve NaN, which makes every special's score NaN, which
      // silently suppresses the whole cast. A fixture missing it looks like a
      // brain that declines to fire — for the wrong reason.
      turnNumber: 90, roundNumber: 12, activePlayerId: ENEMY, phase: 'action', initiative,
      terrain: { blocked: [{ x: 2, y: 4 }] },
    } as unknown as MatchState;
  };

  // Both heroes sit at 16 HP — exactly Flame Jet's damage — so the ray is a
  // DOUBLE KILL and its score comfortably beats the reserve the brain puts on
  // a once-per-battle special. Without that, the brain simply saves the
  // special and the test proves nothing.
  // The ray is walked HERE rather than via the executor's resolveTargets,
  // which is not exported: mirror getLineTiles' contract — step from the
  // caster toward the aim point and STOP at the first wall — and count what
  // the cast would really touch.
  const castsThatHitNothing = (state: MatchState) => {
    const actions = brain.selectActions(state, ENEMY, abilityMap);
    const caster = state.units.find((u) => u.instanceId === 'torch')!;
    const walls = new Set(
      ((state as unknown as { terrain?: { blocked?: { x: number; y: number }[] } }).terrain?.blocked ?? [])
        .map((b) => `${b.x},${b.y}`),
    );
    return actions.filter((a) => {
      if (a.type !== 'USE_ABILITY') return false;
      const ability = abilityMap.get((a as { abilitySlug: string }).abilitySlug);
      if (!ability || ability.targetingType !== 'line') return false;
      const aim = (a as { target: { x: number; y: number } }).target;
      const dx = Math.sign(aim.x - caster.position.x);
      const dy = Math.sign(aim.y - caster.position.y);
      let hits = 0;
      for (let k = 1; k <= ability.range; k++) {
        const p = { x: caster.position.x + dx * k, y: caster.position.y + dy * k };
        if (p.x < 0 || p.y < 0 || p.x > 7 || p.y > 7) break;
        if (walls.has(`${p.x},${p.y}`)) break;   // the wall eats the ray
        if (state.units.some((u) => u.isAlive && u.ownerPlayerId !== ENEMY
          && u.position.x === p.x && u.position.y === p.y)) hits++;
      }
      return hits === 0;
    });
  };

  it('never proposes a cast the wall makes hit nothing', () => {
    expect(castsThatHitNothing(makeState())).toEqual([]);
  });

  it('control: without the wall it DOES take the double kill', () => {
    const state = makeState();
    (state as unknown as { terrain?: unknown }).terrain = undefined;
    const actions = brain.selectActions(state, ENEMY, abilityMap);
    expect(
      actions.some((a) => a.type === 'USE_ABILITY' && (a as { abilitySlug: string }).abilitySlug === 'flame_jet'),
      'the fixture must be a cast the brain actually wants, or the wall test proves nothing',
    ).toBe(true);
  });
});
