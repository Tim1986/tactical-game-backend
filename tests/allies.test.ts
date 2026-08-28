/**
 * A5 — AI allies & escorts (ENCOUNTER_SPEC.md). Build, initiative rules,
 * doctrines (hold / follow / route), route progress, hunt hints, ally
 * objective conditions, party-wipe semantics. Campaign-only via
 * MatchState.allies; arena never carries it.
 */
import { describe, it, expect } from 'vitest';
import { MatchState, UnitInstance, AllyBehaviorState } from '../src/types/matchState.js';
import { planBestTurn, normalizeAbilityDefinitions, OptimalBrain } from '../src/ai/aiBrain.js';
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

describe('A8 — harness surfaces the objective reason', () => {
  it('an escort loss reaches MatchResult.reason', async () => {
    const { runMatch } = await import('../src/ai/simHarness.js');
    const { buildAbilityMap } = await import('../src/ai/defaultData.js');
    const { OptimalBrain } = await import('../src/ai/aiBrain.js');
    const c = JSON.parse(JSON.stringify(lanternCampaign));
    const encKey = Object.keys(c.encounters)[0];
    // A 1-HP VIP parked next to enemy spawns: dies fast, loss reason fires.
    c.encounters[encKey].allies = {
      vip: { name: 'Doomed', baseClass: 'cleric', maxHealth: 1, abilities: [], behavior: { mode: 'hold' }, placement: { x: 5, y: 3 } },
    };
    c.encounters[encKey].objective = {
      text: 'x', win: [{ kind: 'all_enemies_dead' }], loss: [{ kind: 'ally_dead', allyKey: 'vip' }],
    };
    const party = ['fighter', 'cleric', 'ranger', 'rogue'];
    const stateFactory = () => buildEncounterState(c, encKey, party, [undefined, undefined, undefined, undefined], 1, 'nightmare', 'H', 'E').state;
    const r = runMatch(party, c.encounters[encKey].enemies, buildAbilityMap(), new OptimalBrain(), new OptimalBrain(), {
      p1Id: 'H', p2Id: 'E', forceFirstPlayerId: 'H', stateFactory,
    });
    expect(r.reason).toBeTruthy(); // whichever side wins, the objective names why
  });
});

describe('A5 — round-1 ally commit fallback (Moonberry D2 bug)', () => {
  it('commits an ALLY when every uncommitted party unit is frozen', () => {
    // Round 1, party half: one party unit left but frozen (the engine rejects
    // committing a frozen unit), plus a healthy ally. Preferring "any non-ally"
    // left the brain with no committable pick and it returned a bare END_TURN,
    // which round 1 rejects. It must fall back to the ally.
    const committed = mk(P, 0, 0);
    const frozen = mk(P, 1, 1, { statusEffects: [{ slug: 'frozen', turnsRemaining: 2, stacks: 1 }] as never });
    const ally = mk(P, 2, 2, { abilities: [] });
    const orc = mk(E, 6, 6);
    const st = mkState([committed, frozen, ally, orc], { [ally.instanceId]: { mode: 'hold' } }, committed.instanceId);
    st.initiative.isRound1 = true;
    st.initiative.order = [committed.instanceId];   // only the first is committed
    st.initiative.activeUnitId = null;              // round 1: brain picks

    const brain = new OptimalBrain();
    const actions = brain.selectActions(st, P, amap as never);
    // Must be a real commitment (not a bare END_TURN) and must be the ally.
    const committing = actions.find((a) => a.type !== 'END_TURN') as { unitInstanceId: string } | undefined;
    expect(committing, 'brain returned a bare END_TURN — round 1 rejects that').toBeTruthy();
    expect(committing!.unitInstanceId).toBe(ally.instanceId);
  });

  it('still prefers a usable PARTY unit over an ally when one exists', () => {
    const committed = mk(P, 0, 0);
    const healthy = mk(P, 1, 1, { abilities: ['sword'], cooldowns: { sword: 0 } });
    const ally = mk(P, 2, 2, { abilities: [] });
    const orc = mk(E, 6, 6);
    const st = mkState([committed, healthy, ally, orc], { [ally.instanceId]: { mode: 'hold' } }, committed.instanceId);
    st.initiative.isRound1 = true;
    st.initiative.order = [committed.instanceId];
    st.initiative.activeUnitId = null;

    const brain = new OptimalBrain();
    const actions = brain.selectActions(st, P, amap as never);
    const committing = actions.find((a) => a.type !== 'END_TURN') as { unitInstanceId: string };
    expect(committing.unitInstanceId).toBe(healthy.instanceId);   // party first
  });
});

describe('A5 — an armed escort must actually use its kit (owner medium run, 2026-08-27)', () => {
  it('HEALS a wounded party member instead of standing there', () => {
    // The bug: planAllyTurn scored only abilities with damage > 0, so Tam
    // Emberwright — a cleric carrying ['mace','heal'] — could never fire his
    // heal. Owner: "he doesn't use his special or attack... he isn't helping
    // himself." An escort's defining ability was dead code.
    const hero = mk(P, 1, 1, { currentHealth: 20, maxHealth: 50 });   // 30 missing
    const tam  = mk(P, 1, 2, { abilities: ['mace', 'heal'] });
    const foe  = mk(E, 7, 7);
    const st = mkState([hero, tam, foe], { [tam.instanceId]: { mode: 'follow' } }, hero.instanceId);
    const plan = planBestTurn(st, tam, P, amap as never);
    const cast = plan.actions.find((a) => a.type === 'USE_ABILITY') as { abilitySlug: string; target: { x: number; y: number } } | undefined;
    expect(cast?.abilitySlug).toBe('heal');
    expect(cast?.target).toEqual(hero.position);
  });

  it('can heal ITSELF — which is what lets an escort be saved at all', () => {
    const hero = mk(P, 1, 1);
    const tam  = mk(P, 1, 2, { abilities: ['mace', 'heal'], currentHealth: 15, maxHealth: 70 });
    const st = mkState([hero, tam, mk(E, 7, 7)], { [tam.instanceId]: { mode: 'follow' } }, hero.instanceId);
    const cast = planBestTurn(st, tam, P, amap as never).actions
      .find((a) => a.type === 'USE_ABILITY') as { abilitySlug: string; target: { x: number; y: number } } | undefined;
    expect(cast?.abilitySlug).toBe('heal');
    expect(cast?.target).toEqual(tam.position);
  });

  it('does NOT burn a once-per-battle heal on a scratch', () => {
    // heal is cooldown 99 (once per encounter) for 27 points. Firing it to top
    // up 4 HP is a real loss, so it waits until at least half would land.
    const hero = mk(P, 1, 1, { currentHealth: 46, maxHealth: 50 });   // only 4 missing
    const tam  = mk(P, 1, 2, { abilities: ['mace', 'heal'] });
    const st = mkState([hero, tam, mk(E, 7, 7)], { [tam.instanceId]: { mode: 'follow' } }, hero.instanceId);
    const cast = planBestTurn(st, tam, P, amap as never).actions.find((a) => a.type === 'USE_ABILITY');
    expect(cast).toBeUndefined();
  });

  it('follow keeps him BESIDE the hero rather than lurching every few rounds', () => {
    // Was: only move when >2 tiles away, so he stood still until the hero had
    // drifted three tiles then closed the whole gap at once. Owner read that as
    // malfunction — "he moves every other turn or something". At >1 he takes a
    // short step whenever the hero moves, which is also what the UI can now
    // promise: "Tam stays beside your hero."
    const hero = mk(P, 1, 1);
    const tam  = mk(P, 3, 1, { abilities: ['mace'] });                 // 2 away: old code idled
    const st = mkState([hero, tam, mk(E, 7, 7)], { [tam.instanceId]: { mode: 'follow' } }, hero.instanceId);
    const move = planBestTurn(st, tam, P, amap as never).actions
      .find((a) => a.type === 'MOVE') as { destination: { x: number; y: number } } | undefined;
    expect(move).toBeDefined();
    const d = Math.abs(move!.destination.x - hero.position.x) + Math.abs(move!.destination.y - hero.position.y);
    expect(d).toBeLessThan(2);                                          // ends up adjacent
  });
});
