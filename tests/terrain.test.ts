/**
 * A2 — campaign terrain (ENCOUNTER_SPEC.md). Walls block movement / LoS /
 * displacement / line rays and area spread; leap passes over but not onto;
 * phasing walks through; fire hazards burn on landing. Everything here is
 * gated on state.terrain — arena states never carry it (the 325 arena tests
 * are the arena-inert proof).
 */
import { describe, it, expect } from 'vitest';
import { MatchState, UnitInstance, BoardPosition, TerrainState } from '../src/types/matchState.js';
import { AbilityDefinition } from '../src/types/index.js';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { reachableFrom } from '../src/ai/geometry.js';

const P1 = 'p-one';
const P2 = 'p-two';

let seq = 0;
const mkUnit = (id: string, owner: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: id || `u${++seq}`, definitionSlug: 'test', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 100, maxHealth: 100, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {},
  statusEffects: [], passives: [], abilities: ['zap'], armorClass: 6, movementRange: 3,
  ...over,
} as unknown as UnitInstance);

const mkState = (units: UnitInstance[], terrain?: TerrainState): MatchState => ({
  units, turnNumber: 2, activePlayerId: P1, playerOneId: P1, playerTwoId: P2,
  ...(terrain ? { terrain } : {}),
} as unknown as MatchState);

const mkAbility = (over: Partial<AbilityDefinition> = {}): AbilityDefinition => ({
  slug: 'zap', name: 'Zap', targetingType: 'single', range: 6, areaRadius: 0,
  cooldownTurns: 0, isSpecial: false, isUnblockable: true,
  effects: [{ type: 'damage', formula: 'flat', value: 10 }],
  ...over,
} as unknown as AbilityDefinition);

const amap = (a: AbilityDefinition) => new Map([[a.slug, a]]);
const wallsAt = (...ps: [number, number][]): TerrainState => ({ blocked: ps.map(([x, y]) => ({ x, y })) });
const fireAt = (...ps: [number, number][]): TerrainState => ({ hazards: ps.map(([x, y]) => ({ pos: { x, y }, type: 'fire' as const })) });

const move = (state: MatchState, unitId: string, dest: BoardPosition, ability = mkAbility()) =>
  processTurn(state, [{ type: 'MOVE', unitInstanceId: unitId, destination: dest }, { type: 'END_TURN' }] as never, P1, P1, P2, amap(ability));

const cast = (state: MatchState, unitId: string, target: BoardPosition, ability: AbilityDefinition) => {
  const caster = state.units.find((u) => u.instanceId === unitId)!;
  caster.abilities = [ability.slug];
  caster.cooldowns = { [ability.slug]: 0 };
  return processTurn(state, [{ type: 'USE_ABILITY', unitInstanceId: unitId, abilitySlug: ability.slug, target }, { type: 'END_TURN' }] as never, P1, P1, P2, amap(ability));
};

describe('A2 terrain — movement', () => {
  it('a wall cannot be a destination', () => {
    const u = mkUnit('m', P1, 3, 3);
    expect(() => move(mkState([u], wallsAt([3, 4])), 'm', { x: 3, y: 4 }))
      .toThrow(TurnValidationError);
  });

  it('a wall wall blocks the path around (corridor forces the long way)', () => {
    // Walls at (3,2),(3,3),(3,4): reaching (4,3) from (2,3) must go around —
    // more than 3 movement — so it is NOT reachable at range 3.
    const u = mkUnit('m', P1, 2, 3);
    const t = wallsAt([3, 2], [3, 3], [3, 4]);
    const tiles = reachableFrom(u.position, u, [u], 3, t);
    expect(tiles.some((p) => p.x === 4 && p.y === 3)).toBe(false);
    // Without the walls it is 2 steps away.
    expect(reachableFrom(u.position, u, [u], 3).some((p) => p.x === 4 && p.y === 3)).toBe(true);
  });

  it('phasing walks THROUGH a wall but never ends on it', () => {
    const u = mkUnit('m', P1, 2, 3, { moveFlags: ['phasing'] });
    const t = wallsAt([3, 2], [3, 3], [3, 4]);
    const tiles = reachableFrom(u.position, u, [u], 3, t);
    expect(tiles.some((p) => p.x === 4 && p.y === 3)).toBe(true);  // straight through
    expect(tiles.some((p) => p.x === 3 && p.y === 3)).toBe(false); // never ON the wall
  });
});

describe('A2 terrain — sight and rays', () => {
  it('a wall blocks single-target line of sight on an aligned line', () => {
    const c = mkUnit('c', P1, 2, 3);
    const e = mkUnit('e', P2, 5, 3);
    expect(() => cast(mkState([c, e], wallsAt([4, 3])), 'c', e.position, mkAbility()))
      .toThrow('No line of sight');
    // Same shot with no terrain lands.
    const c2 = mkUnit('c', P1, 2, 3); const e2 = mkUnit('e', P2, 5, 3);
    const r = cast(mkState([c2, e2]), 'c', e2.position, mkAbility());
    expect(r.updatedState.units.find((u) => u.instanceId === 'e')!.currentHealth).toBe(90);
  });

  it('a line ability ray stops at the first wall', () => {
    const line = mkAbility({ slug: 'ray', targetingType: 'line', range: 6 });
    const c = mkUnit('c', P1, 1, 3);
    const near = mkUnit('near', P2, 2, 3);
    const far = mkUnit('far', P2, 5, 3);
    const r = cast(mkState([c, near, far], wallsAt([3, 3])), 'c', { x: 2, y: 3 }, line);
    const hp = (id: string) => r.updatedState.units.find((u) => u.instanceId === id)!.currentHealth;
    expect(hp('near')).toBe(90); // before the wall: hit
    expect(hp('far')).toBe(100); // behind the wall: the wall ate the arrow
  });
});

describe('A2 terrain — placed AoE', () => {
  const aoe = (radius = 1) => mkAbility({ slug: 'blast', targetingType: 'aoe', range: 4, areaRadius: radius });

  it('cannot centre an AoE on a wall', () => {
    const c = mkUnit('c', P1, 2, 3);
    expect(() => cast(mkState([c], wallsAt([4, 3])), 'c', { x: 4, y: 3 }, aoe()))
      .toThrow('Cannot centre an area effect on a wall');
  });

  it('needs wall-clear sight to the centre (the eye of the storm)', () => {
    const c = mkUnit('c', P1, 2, 3);
    expect(() => cast(mkState([c], wallsAt([3, 3])), 'c', { x: 5, y: 3 }, aoe()))
      .toThrow('No sight to the centre tile');
  });

  it('the effect spreads from the centre and never crosses a wall', () => {
    // Centre (4,3); victim at (6,3) with a wall at (5,3) between them; second
    // victim at (4,5) with clear spread. Radius-2 blast.
    const c = mkUnit('c', P1, 4, 1);
    const walled = mkUnit('walled', P2, 6, 3);
    const open = mkUnit('open', P2, 4, 5);
    const r = cast(mkState([c, walled, open], wallsAt([5, 3])), 'c', { x: 4, y: 3 }, aoe(2));
    const hp = (id: string) => r.updatedState.units.find((u) => u.instanceId === id)!.currentHealth;
    expect(hp('open')).toBe(90);    // in radius, clear from the eye
    expect(hp('walled')).toBe(100); // in radius, but behind a wall from the eye
  });
});

describe('A2 terrain — displacement and leap', () => {
  it('a push stops short of a wall', () => {
    const push = mkAbility({ slug: 'shove', effects: [{ type: 'damage', formula: 'flat', value: 1 }, { type: 'push', direction: 'away_from_caster', distance: 3 }] as never, range: 1 });
    const c = mkUnit('c', P1, 3, 2);
    const e = mkUnit('e', P2, 3, 3);
    const r = cast(mkState([c, e], wallsAt([3, 5])), 'c', e.position, push);
    const pos = r.updatedState.units.find((u) => u.instanceId === 'e')!.position;
    expect(pos).toEqual({ x: 3, y: 4 }); // slid 1, stopped before the wall at (3,5)
  });

  it('a leap passes over a wall but cannot land on one', () => {
    const leap = mkAbility({ slug: 'jump', targetingType: 'aoe', range: 2, areaRadius: 1, areaShape: 'ring', effects: [{ type: 'move_self' }, { type: 'damage', formula: 'flat', value: 3 }] as never });
    // Over: wall between start and landing — legal.
    const c = mkUnit('c', P1, 3, 2);
    const r = cast(mkState([c], wallsAt([3, 3])), 'c', { x: 3, y: 4 }, leap);
    expect(r.updatedState.units.find((u) => u.instanceId === 'c')!.position).toEqual({ x: 3, y: 4 });
    // Onto: rejected at validation.
    const c2 = mkUnit('c', P1, 3, 2);
    expect(() => cast(mkState([c2], wallsAt([3, 4])), 'c', { x: 3, y: 4 }, leap))
      .toThrow('Cannot leap onto a wall');
  });
});

describe('A2 terrain — fire hazards', () => {
  const burning = (u: UnitInstance) => u.statusEffects.find((s) => s.slug === 'burning');

  it('ending a move on fire applies 1 burning stack', () => {
    const u = mkUnit('m', P1, 3, 3);
    const r = move(mkState([u], fireAt([3, 4])), 'm', { x: 3, y: 4 });
    const b = burning(r.updatedState.units.find((x) => x.instanceId === 'm')!);
    expect(b).toBeTruthy();
    expect(b!.stacks).toBe(1);
  });

  it('being pushed onto fire applies burning; stacks respect the cap logic', () => {
    const push = mkAbility({ slug: 'shove', effects: [{ type: 'damage', formula: 'flat', value: 1 }, { type: 'push', direction: 'away_from_caster', distance: 2 }] as never, range: 1 });
    const c = mkUnit('c', P1, 3, 2);
    const e = mkUnit('e', P2, 3, 3, { statusEffects: [{ slug: 'burning', turnsRemaining: 3, stacks: 1, sourceUnitInstanceId: 'x' }] });
    const r = cast(mkState([c, e], fireAt([3, 5])), 'c', e.position, push);
    const eu = r.updatedState.units.find((u) => u.instanceId === 'e')!;
    expect(eu.position).toEqual({ x: 3, y: 5 });
    const b = burning(eu)!;
    expect(b.stacks).toBe(2);           // 1 existing + 1 from the fire
    expect(b.turnsRemaining).toBe(3);   // refresh keeps the LONGER duration
  });

  it('a leap landing on fire burns the leaper', () => {
    const leap = mkAbility({ slug: 'jump', targetingType: 'aoe', range: 2, areaRadius: 1, areaShape: 'ring', effects: [{ type: 'move_self' }, { type: 'damage', formula: 'flat', value: 3 }] as never });
    const c = mkUnit('c', P1, 3, 2);
    const r = cast(mkState([c], fireAt([3, 4])), 'c', { x: 3, y: 4 }, leap);
    expect(burning(r.updatedState.units.find((u) => u.instanceId === 'c')!)).toBeTruthy();
  });

  it('moving to a plain tile applies nothing (hazard is positional, not global)', () => {
    const u = mkUnit('m', P1, 3, 3);
    const r = move(mkState([u], fireAt([5, 5])), 'm', { x: 3, y: 4 });
    expect(burning(r.updatedState.units.find((x) => x.instanceId === 'm')!)).toBeFalsy();
  });
});
