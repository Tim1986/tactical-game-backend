/**
 * A3 — campaign objectives (ENCOUNTER_SPEC.md). Compositional win/loss on
 * MatchState.objective; arena states never carry it (kill-all fallback is the
 * original implementation — the arena suite is the inertness proof).
 */
import { describe, it, expect } from 'vitest';
import { MatchState, UnitInstance, ObjectiveState } from '../src/types/matchState.js';
import { checkWinCondition } from '../src/game/winCondition.js';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { lanternCampaign } from '../src/campaigns/lantern.js';

const P = 'party-id';
const E = 'enemy-id';

let seq = 0;
const mk = (owner: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: `u${++seq}`, definitionSlug: 'test', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 50, maxHealth: 50, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {},
  statusEffects: [], passives: [], abilities: [], armorClass: 8, movementRange: 3,
  ...over,
} as unknown as UnitInstance);

const st = (units: UnitInstance[], objective: Partial<ObjectiveState>, roundNumber = 1): MatchState => ({
  units, roundNumber, turnNumber: 1, activePlayerId: P,
  objective: {
    partyId: P, enemyId: E, mainId: units[0]?.instanceId ?? 'none',
    text: 'test', win: [], loss: [], ...objective,
  },
} as unknown as MatchState);

describe('A3 objectives — win conditions', () => {
  it('survive: wins once the round COMPLETES (roundNumber > N)', () => {
    const u = [mk(P, 1, 1), mk(E, 5, 5)];
    const o = { win: [{ kind: 'round_reached', round: 8 }] } as Partial<ObjectiveState>;
    expect(checkWinCondition(st(u, o, 8), P, E).isOver).toBe(false);   // round 8 in progress
    const r = checkWinCondition(st(u, o, 9), P, E);                     // round 8 done
    expect(r.isOver).toBe(true);
    expect(r.winnerId).toBe(P);
    expect(r.reason).toMatch(/survived/);
  });

  it('kill-target: named ids dead wins even with other enemies alive', () => {
    const boss = mk(E, 5, 5, { isAlive: false });
    const add = mk(E, 6, 5);
    const hero = mk(P, 1, 1);
    const r = checkWinCondition(st([hero, boss, add], { win: [{ kind: 'units_dead', unitIds: [boss.instanceId] }] }), P, E);
    expect(r.isOver).toBe(true);
    expect(r.winnerId).toBe(P);
  });

  it('units_at_tiles: any / main / all / simultaneous', () => {
    const a = mk(P, 2, 2), b = mk(P, 3, 3), e = mk(E, 7, 7);
    const tiles = [{ x: 2, y: 2 }, { x: 3, y: 3 }];
    const on = (spec: object, units = [a, b, e]) =>
      checkWinCondition(st(units, { win: [spec as never], mainId: a.instanceId }), P, E).isOver;
    expect(on({ kind: 'units_at_tiles', scope: 'any', tiles: [{ x: 2, y: 2 }] })).toBe(true);
    expect(on({ kind: 'units_at_tiles', scope: 'any', tiles: [{ x: 6, y: 6 }] })).toBe(false);
    expect(on({ kind: 'units_at_tiles', scope: 'main', tiles: [{ x: 2, y: 2 }] })).toBe(true);
    expect(on({ kind: 'units_at_tiles', scope: 'main', tiles: [{ x: 3, y: 3 }] })).toBe(false); // b is there, main is not
    expect(on({ kind: 'units_at_tiles', scope: 'all', tiles })).toBe(true);
    expect(on({ kind: 'units_at_tiles', scope: 'all', tiles: [{ x: 2, y: 2 }] })).toBe(false);  // b elsewhere
    expect(on({ kind: 'units_at_tiles', scope: 'any', tiles, simultaneous: true })).toBe(true);
    expect(on({ kind: 'units_at_tiles', scope: 'any', tiles: [...tiles, { x: 4, y: 4 }], simultaneous: true })).toBe(false);
  });
});

describe('A3 objectives — loss conditions and ties', () => {
  it('deadline: round completes without a win → enemy wins', () => {
    const u = [mk(P, 1, 1), mk(E, 5, 5)];
    const o = { win: [{ kind: 'all_enemies_dead' }], loss: [{ kind: 'round_reached', round: 6 }] } as Partial<ObjectiveState>;
    expect(checkWinCondition(st(u, o, 6), P, E).isOver).toBe(false);
    const r = checkWinCondition(st(u, o, 7), P, E);
    expect(r.winnerId).toBe(E);
    expect(r.reason).toMatch(/deadline/i);
  });

  it('win-before-loss: a simultaneous win+loss resolves as a WIN (owner call)', () => {
    const u = [mk(P, 1, 1), mk(E, 5, 5)];
    const o = {
      win: [{ kind: 'round_reached', round: 6 }],
      loss: [{ kind: 'round_reached', round: 6 }],
    } as Partial<ObjectiveState>;
    const r = checkWinCondition(st(u, o, 7), P, E);
    expect(r.winnerId).toBe(P);
  });

  it('main_dead loses even with the rest of the party alive', () => {
    const main = mk(P, 1, 1, { isAlive: false });
    const buddy = mk(P, 2, 2);
    const e = mk(E, 5, 5);
    const r = checkWinCondition(st([main, buddy, e], { mainId: main.instanceId, win: [{ kind: 'all_enemies_dead' }], loss: [{ kind: 'main_dead' }] }), P, E);
    expect(r.winnerId).toBe(E);
    expect(r.reason).toMatch(/hero/);
  });

  it('party wipe is an implicit loss without being listed', () => {
    const dead1 = mk(P, 1, 1, { isAlive: false });
    const e = mk(E, 5, 5);
    const r = checkWinCondition(st([dead1, e], { win: [{ kind: 'round_reached', round: 9 }] }), P, E);
    expect(r.winnerId).toBe(E);
  });

  it('mercy rule: enemy wipe wins even under a survive-only objective', () => {
    const hero = mk(P, 1, 1);
    const deadE = mk(E, 5, 5, { isAlive: false });
    const r = checkWinCondition(st([hero, deadE], { win: [{ kind: 'round_reached', round: 9 }] }), P, E);
    expect(r.winnerId).toBe(P);
  });
});

describe('A3 objectives — runtime resolution', () => {
  const party = ['fighter', 'cleric', 'ranger', 'rogue'];
  const choices = [undefined, undefined, undefined, undefined];
  const encKey = () => Object.keys(lanternCampaign.encounters)[0];
  const clone = () => JSON.parse(JSON.stringify(lanternCampaign));

  it('resolves enemyKeys to every instance of that key', () => {
    const c = clone();
    const enc = c.encounters[encKey()];
    const firstKey = enc.enemies[0];
    const keyCount = enc.enemies.filter((k: string) => k === firstKey).length;
    enc.objective = { text: 'Slay them', win: [{ kind: 'units_dead', enemyKeys: [firstKey] }] };
    const b = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'h', 'e');
    const cond = b.state.objective!.win[0] as { kind: string; unitIds: string[] };
    expect(cond.unitIds.length).toBe(keyCount);
    expect(b.state.objective!.mainId).toBe(b.state.units[0].instanceId);
  });

  it('throws on an unknown enemy key and on ally conditions (A5)', () => {
    const c1 = clone();
    c1.encounters[encKey()].objective = { text: 'x', win: [{ kind: 'units_dead', enemyKeys: ['nope'] }] };
    expect(() => buildEncounterState(c1, encKey(), party, choices, 1, 'medium', 'h', 'e')).toThrow('unknown enemy key');
    const c2 = clone();
    c2.encounters[encKey()].objective = { text: 'x', win: [{ kind: 'all_enemies_dead' }], loss: [{ kind: 'ally_dead', allyKey: 'vip' }] };
    expect(() => buildEncounterState(c2, encKey(), party, choices, 1, 'medium', 'h', 'e')).toThrow('roadmap A5');
  });

  it('no objective authored → state carries none (legacy kill-all path)', () => {
    const b = buildEncounterState(lanternCampaign, encKey(), party, choices, 1, 'medium', 'h', 'e');
    expect(b.state.objective).toBeUndefined();
  });
});
