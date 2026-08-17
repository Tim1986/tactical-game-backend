/**
 * A5 — AI allies & escorts (ENCOUNTER_SPEC.md). Build, initiative rules,
 * doctrines (hold / follow / route), route progress, hunt hints, ally
 * objective conditions, party-wipe semantics. Campaign-only via
 * MatchState.allies; arena never carries it.
 */
import { describe, it, expect } from 'vitest';
import { MatchState, UnitInstance, AllyBehaviorState } from '../src/types/matchState.js';
import { planBestTurn, normalizeAbilityDefinitions } from '../src/ai/aiBrain.js';
import { checkWinCondition } from '../src/game/winCondition.js';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { lanternCampaign } from '../src/campaigns/lantern.js';
import { ABILITY_DEFS } from '../src/config/gameData.js';

const P = 'party-id';
const E = 'enemy-id';
const amap = new Map(normalizeAbilityDefinitions(ABILITY_DEFS as never).map((d) => [d.slug, d]));

let seq = 0;
const mk = (owner: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance => ({
  instanceId: `u${++seq}`, definitionSlug: 'fighter', ownerPlayerId: owner,
  position: { x, y }, currentHealth: 50, maxHealth: 50, isAlive: true,
  hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {},
  statusEffects: [], passives: [], abilities: [], armorClass: 8, movementRange: 3,
  ...over,
} as unknown as UnitInstance);

const mkState = (units: UnitInstance[], allies: Record<string, AllyBehaviorState>, mainId?: string): MatchState => ({
  units, turnNumber: 20, roundNumber: 3, activePlayerId: P, phase: 'action',
  initiative: { order: units.map((u) => u.instanceId), slot: 0, round1FirstPlayerId: P, activeUnitId: units[0]?.instanceId ?? null, isRound1: false },
  allies,
  objective: { partyId: P, enemyId: E, mainId: mainId ?? units[0].instanceId, allyIds: Object.keys(allies), text: 'x', win: [{ kind: 'all_enemies_dead' }], loss: [] },
} as unknown as MatchState);

describe('A5 — ally doctrines (planBestTurn dispatch)', () => {
  it('route: marches along waypoints, as far as movement allows', () => {
    const hero = mk(P, 1, 1);
    const vip = mk(P, 1, 4, { movementRange: 3 });
    const st = mkState([hero, vip], { [vip.instanceId]: { mode: 'route', waypoints: [{ x: 6, y: 4 }], routeIndex: 0 } }, hero.instanceId);
    const plan = planBestTurn(st, vip, P, amap as never);
    const move = plan.actions.find((a) => a.type === 'MOVE') as { destination: { x: number; y: number } };
    expect(move).toBeTruthy();
    expect(move.destination).toEqual({ x: 4, y: 4 }); // 3 straight steps toward the waypoint
  });

  it('route complete: holds the spot (zero-distance commit move)', () => {
    const hero = mk(P, 1, 1);
    const vip = mk(P, 6, 4);
    const st = mkState([hero, vip], { [vip.instanceId]: { mode: 'route', waypoints: [{ x: 6, y: 4 }], routeIndex: 1 } }, hero.instanceId);
    const plan = planBestTurn(st, vip, P, amap as never);
    const move = plan.actions.find((a) => a.type === 'MOVE') as { destination: { x: number; y: number } };
    expect(move.destination).toEqual({ x: 6, y: 4 }); // hold position — legal round-1 commit
  });

  it('follow: closes distance to the main when farther than 2', () => {
    const hero = mk(P, 6, 6);
    const buddy = mk(P, 1, 1, { abilities: ['sword'], cooldowns: { sword: 0 } });
    const st = mkState([hero, buddy], { [buddy.instanceId]: { mode: 'follow' } }, hero.instanceId);
    const plan = planBestTurn(st, buddy, P, amap as never);
    const move = plan.actions.find((a) => a.type === 'MOVE') as { destination: { x: number; y: number } };
    expect(move).toBeTruthy();
    const before = Math.abs(6 - 1) + Math.abs(6 - 1);
    const after = Math.abs(6 - move.destination.x) + Math.abs(6 - move.destination.y);
    expect(after).toBeLessThan(before);
  });

  it('hold: fights from its tile when an enemy is in kit range, never moves', () => {
    const hero = mk(P, 1, 1);
    const guard = mk(P, 3, 3, { abilities: ['sword'], cooldowns: { sword: 0 } });
    const orc = mk(E, 3, 4);
    const st = mkState([hero, guard, orc], { [guard.instanceId]: { mode: 'hold' } }, hero.instanceId);
    const plan = planBestTurn(st, guard, P, amap as never);
    expect(plan.actions.find((a) => a.type === 'MOVE')).toBeUndefined();
    const atk = plan.actions.find((a) => a.type === 'USE_ABILITY') as { abilitySlug: string; target: { x: number; y: number } };
    expect(atk?.abilitySlug).toBe('sword');
    expect(atk.target).toEqual({ x: 3, y: 4 });
  });

  it('defenseless VIP (empty kit) moves but never acts', () => {
    const hero = mk(P, 1, 1);
    const vip = mk(P, 1, 4, { abilities: [] });
    const orc = mk(E, 2, 4); // adjacent — a fighter would swing
    const st = mkState([hero, vip, orc], { [vip.instanceId]: { mode: 'route', waypoints: [{ x: 6, y: 4 }], routeIndex: 0 } }, hero.instanceId);
    const plan = planBestTurn(st, vip, P, amap as never);
    expect(plan.actions.find((a) => a.type === 'USE_ABILITY')).toBeUndefined();
  });
});

describe('A5 — hunt hints', () => {
  it('a hunter with priorityTarget ally attacks the escort over an equally reachable hero', () => {
    const hero = mk(P, 3, 2, { currentHealth: 50 });
    const vip = mk(P, 3, 4, { currentHealth: 50 });
    const hunter = mk(E, 3, 3, { abilities: ['sword'], cooldowns: { sword: 0 }, aiHints: { priorityTarget: 'ally' } });
    const st = mkState([hero, vip, hunter], { [vip.instanceId]: { mode: 'hold' } }, hero.instanceId);
    const plan = planBestTurn(st, hunter, E, amap as never);
    const atk = plan.actions.find((a) => a.type === 'USE_ABILITY') as { target: { x: number; y: number } };
    expect(atk?.target).toEqual({ x: 3, y: 4 }); // the VIP, not the hero
  });
});

describe('A5 — objective conditions and party wipe', () => {
  it('ally_dead loses; ally_at_tiles wins; lone VIP is a party wipe', () => {
    const hero = mk(P, 1, 1);
    const vip = mk(P, 6, 4);
    const orc = mk(E, 7, 7);
    const base = mkState([hero, vip, orc], { [vip.instanceId]: { mode: 'hold' } }, hero.instanceId);

    // ally_dead → loss
    const s1 = JSON.parse(JSON.stringify(base)) as MatchState;
    s1.objective!.loss = [{ kind: 'ally_dead', unitIds: [vip.instanceId] }];
    s1.units.find((u) => u.instanceId === vip.instanceId)!.isAlive = false;
    const r1 = checkWinCondition(s1, P, E);
    expect(r1.winnerId).toBe(E);
    expect(r1.reason).toMatch(/charge/);

    // ally_at_tiles → win
    const s2 = JSON.parse(JSON.stringify(base)) as MatchState;
    s2.objective!.win = [{ kind: 'ally_at_tiles', unitIds: [vip.instanceId], tiles: [{ x: 6, y: 4 }] }];
    const r2 = checkWinCondition(s2, P, E);
    expect(r2.winnerId).toBe(P);
    expect(r2.reason).toMatch(/escort/);

    // party dead, VIP alive → still a wipe (allies aren't a fighting force)
    const s3 = JSON.parse(JSON.stringify(base)) as MatchState;
    s3.units.find((u) => u.instanceId === hero.instanceId)!.isAlive = false;
    const r3 = checkWinCondition(s3, P, E);
    expect(r3.winnerId).toBe(E);
    expect(r3.reason).toMatch(/party/);
  });
});

describe('A5 — runtime build', () => {
  const party = ['fighter', 'cleric', 'ranger', 'rogue'];
  const choices = [undefined, undefined, undefined, undefined];
  const encKey = () => Object.keys(lanternCampaign.encounters)[0];
  const clone = () => JSON.parse(JSON.stringify(lanternCampaign));

  it('builds allies party-owned with doctrine metadata, names, and allyIds', () => {
    const c = clone();
    c.encounters[encKey()].allies = {
      merchant: { name: 'Old Fenwick', baseClass: 'cleric', maxHealth: 30, abilities: [], behavior: { mode: 'route', waypoints: [{ x: 6, y: 4 }] }, placement: { x: 2, y: 4 } },
    };
    const b = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E');
    const ally = b.state.units.find((u) => b.unitNames[u.instanceId] === 'Old Fenwick')!;
    expect(ally.ownerPlayerId).toBe('H');
    expect(ally.maxHealth).toBe(30);          // no difficulty scaling
    expect(ally.abilities).toEqual([]);
    const doc = b.state.allies![ally.instanceId];
    expect(doc).toEqual({ mode: 'route', waypoints: [{ x: 6, y: 4 }], routeIndex: 0 });
    expect(b.state.objective!.allyIds).toEqual([ally.instanceId]);
  });

  it('resolves ally objective conditions and rejects unknown ally keys', () => {
    const c = clone();
    c.encounters[encKey()].allies = {
      merchant: { name: 'Fenwick', baseClass: 'cleric', behavior: { mode: 'follow' }, placement: { x: 2, y: 4 } },
    };
    c.encounters[encKey()].objective = {
      text: 'Protect Fenwick', win: [{ kind: 'all_enemies_dead' }], loss: [{ kind: 'ally_dead', allyKey: 'merchant' }],
    };
    const b = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E');
    const loss = b.state.objective!.loss[0] as { kind: string; unitIds: string[] };
    expect(loss.unitIds).toEqual(b.state.objective!.allyIds);

    const bad = clone();
    bad.encounters[encKey()].allies = c.encounters[encKey()].allies;
    bad.encounters[encKey()].objective = { text: 'x', win: [{ kind: 'ally_at_tiles', allyKey: 'nope', tiles: [{ x: 1, y: 1 }] }] };
    expect(() => buildEncounterState(bad, encKey(), party, choices, 1, 'medium', 'H', 'E')).toThrow('unknown ally');
  });
});
