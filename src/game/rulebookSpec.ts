/**
 * rulebookSpec.ts — executable checks for every rule in rulebook.ts.
 *
 * Each check is keyed by a rule id and throws on failure (plain assertions,
 * no test-framework dependency). Thin wrappers run this battery in BOTH
 * repos:
 *   - backend/tests/rulebook.test.ts        (server engine)
 *   - mobile/tests/rulebook.test.ts         (mobile/engine synced copy)
 * The backend wrapper also meta-checks that every rule id in rulebook.ts
 * has at least one check here — a rule without a test fails CI.
 *
 * Keep checks BEHAVIORAL: drive the same public entry points the game uses
 * (processTurn, executeAbility, reachableFrom, buildUnitInstance), so a
 * regression anywhere in the pipeline trips the rule.
 */

import {
  MatchState, UnitInstance, GameEvent, BoardPosition,
} from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
import { processTurn } from './turnProcessor.js';
import { executeAbility } from './abilityExecutor.js';
import {
  applyStartOfTurnStatusDamage, decrementStatusDurations, tickUnitCooldowns,
} from './abilityExecutor.js';
import { checkWinCondition } from './winCondition.js';
import { isInBounds, isCorner } from './boardUtils.js';
import { reachableFrom, findPath, isCorner as geoIsCorner } from '../ai/geometry.js';
import { buildUnitInstance } from './initialState.js';
import { DEFAULT_UNITS } from '../ai/defaultData.js';

// defaultData's UnitDefinition is the slim AI-facing shape; buildUnitInstance
// wants the full one. The fields it reads all exist on both.
const defOf = (slug: string) => DEFAULT_UNITS[slug] as unknown as Parameters<typeof buildUnitInstance>[0];

export interface RuleCheck {
  /** Rule id from rulebook.ts this check verifies. */
  rule: string;
  name: string;
  run: () => void;
}

// ─── Assertion + fixture helpers ─────────────────────────────────────────────

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

function assertThrows(fn: () => void, match: string, msg: string): void {
  try {
    fn();
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    assert(m.toLowerCase().includes(match.toLowerCase()), `${msg} — threw "${m}", expected message containing "${match}"`);
    return;
  }
  throw new Error(`Assertion failed: ${msg} — expected an error, none thrown`);
}

const P1 = 'player-one';
const P2 = 'player-two';

let _seq = 0;
function mkUnit(owner: string, x: number, y: number, over: Partial<UnitInstance> = {}): UnitInstance {
  return {
    instanceId: `u${++_seq}`, definitionSlug: 'fighter', ownerPlayerId: owner,
    position: { x, y }, currentHealth: 100, maxHealth: 100,
    armorClass: 6, // dodge 0% — checks opt into dodge explicitly
    movementRange: 3, abilities: ['test_hit'], passives: [],
    isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
    cooldowns: { test_hit: 0 }, statusEffects: [], fortuneMeter: 0,
    ...over,
  };
}

/** Legacy (no-initiative) state: processTurn runs actions directly for the submitter. */
function mkLegacyState(units: UnitInstance[], active = P1): MatchState {
  return {
    board: { width: 8, height: 8 }, units, turnNumber: 1, roundNumber: 1,
    activePlayerId: active, phase: 'action',
  } as unknown as MatchState;
}

/** Round-2+ initiative state: fixed order, activeUnitId = order[slot]. */
function mkInitiativeState(units: UnitInstance[], order: string[], slot = 0): MatchState {
  const active = units.find((u) => u.instanceId === order[slot]);
  return {
    board: { width: 8, height: 8 }, units, turnNumber: 9, roundNumber: 2,
    activePlayerId: active?.ownerPlayerId ?? P1, phase: 'action',
    initiative: { order, slot, round1FirstPlayerId: P1, activeUnitId: order[slot], isRound1: false },
  } as MatchState;
}

function mkAbility(over: Partial<AbilityDefinition> = {}): AbilityDefinition {
  return {
    id: 'ab-test', slug: 'test_hit', name: 'Test Hit', description: '',
    targetingType: 'single', range: 8, areaRadius: 0, cooldownTurns: 0,
    effects: [{ type: 'damage', formula: 'flat', value: 10 }],
    ...over,
  } as AbilityDefinition;
}

function cast(ability: AbilityDefinition, caster: UnitInstance, target: UnitInstance, allUnits?: UnitInstance[]): GameEvent[] {
  const events: GameEvent[] = [];
  const state = mkLegacyState(allUnits ?? [caster, target]);
  executeAbility({ state, caster, targetPosition: target.position, ability, events });
  return events;
}

const has = (u: UnitInstance, slug: string) => u.statusEffects.some((se) => se.slug === slug);
const at = (list: BoardPosition[], x: number, y: number) => list.some((p) => p.x === x && p.y === y);

// ─── The battery ─────────────────────────────────────────────────────────────

export const RULE_CHECKS: RuleCheck[] = [

  // ── BRD ────────────────────────────────────────────────────────────────────
  {
    rule: 'BRD-1', name: 'board is 8×8 minus 4 corners = 60 tiles; corners and off-board are illegal',
    run: () => {
      let count = 0;
      for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) if (isInBounds({ x, y })) count++;
      assert(count === 60, `expected 60 playable tiles, got ${count}`);
      for (const c of [[0, 0], [0, 7], [7, 0], [7, 7]] as const) {
        assert(!isInBounds({ x: c[0], y: c[1] }), `corner (${c[0]},${c[1]}) must be out of bounds`);
        assert(isCorner(c[0], c[1]) && geoIsCorner(c[0], c[1]), 'boardUtils.isCorner and geometry.isCorner must agree');
      }
      assert(!isInBounds({ x: -1, y: 3 }) && !isInBounds({ x: 8, y: 3 }), 'off-board tiles out of bounds');
      // a corner is never reachable nor on a path
      const u = mkUnit(P1, 1, 0);
      assert(!at(reachableFrom(u.position, u, [u], 4), 0, 0), 'removed corner must never be reachable');
    },
  },
  {
    rule: 'BRD-2', name: 'cannot end a move on any occupied tile',
    run: () => {
      const mover = mkUnit(P1, 1, 1);
      const ally = mkUnit(P1, 2, 1);
      const enemy = mkUnit(P2, 1, 2);
      const state = mkLegacyState([mover, ally, enemy]);
      for (const dest of [ally.position, enemy.position]) {
        assertThrows(
          () => processTurn(state, [{ type: 'MOVE', unitInstanceId: mover.instanceId, destination: dest }, { type: 'END_TURN' }], P1, P1, P2, new Map()),
          'occupied', `move onto occupied tile (${dest.x},${dest.y}) must be rejected`,
        );
      }
    },
  },

  // ── TRN ────────────────────────────────────────────────────────────────────
  {
    rule: 'TRN-1', name: 'round 1 alternating commits build the initiative order',
    run: () => {
      const state = mkRound1State();
      // First player commits one unit with a hold-position move; turn passes to the other player.
      const first = state.activePlayerId;
      const unit = state.units.find((u) => u.ownerPlayerId === first)!;
      const r = processTurn(state, [{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: unit.position }, { type: 'END_TURN' }], first, P1, P2, new Map());
      assert(r.updatedState.initiative!.order[0] === unit.instanceId, 'committed unit must be first in initiative order');
      assert(r.updatedState.activePlayerId !== first, 'after a round-1 commit the other player is up');
    },
  },
  {
    rule: 'TRN-2', name: 'round 1 bare pass is illegal while a unit can still commit',
    run: () => {
      const state = mkRound1State();
      assertThrows(
        () => processTurn(state, [{ type: 'END_TURN' }], state.activePlayerId, P1, P2, new Map()),
        'commit', 'bare END_TURN in round 1 must be rejected',
      );
    },
  },
  {
    rule: 'TRN-3', name: 'after round 1 the order interleaves first player at 1,3,5,7 and stays fixed',
    run: () => {
      let state = mkRound1State();
      const firstPlayer = state.initiative!.round1FirstPlayerId;
      for (let i = 0; i < 8; i++) {
        const pid = state.activePlayerId;
        const committed = new Set(state.initiative!.order);
        const unit = state.units.find((u) => u.ownerPlayerId === pid && !committed.has(u.instanceId))!;
        state = processTurn(state, [{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: unit.position }, { type: 'END_TURN' }], pid, P1, P2, new Map()).updatedState;
      }
      const init = state.initiative!;
      assert(!init.isRound1 && init.order.length === 8, 'all 8 commits must end round 1');
      const ownerOf = (id: string) => state.units.find((u) => u.instanceId === id)!.ownerPlayerId;
      for (let i = 0; i < 8; i++) {
        const expected = i % 2 === 0 ? firstPlayer : (firstPlayer === P1 ? P2 : P1);
        assert(ownerOf(init.order[i]) === expected, `slot ${i} must belong to ${expected}`);
      }
      assert(init.activeUnitId === init.order[0], 'round 2 starts at slot 0');
    },
  },
  {
    rule: 'TRN-4', name: 'a unit may move once and use one ability in the same turn',
    run: () => {
      const a = mkUnit(P1, 1, 1);
      const b = mkUnit(P2, 3, 1);
      const state = mkInitiativeState([a, b], [a.instanceId, b.instanceId]);
      const abilityMap = new Map([['test_hit', mkAbility({ isUnblockable: true })]]);
      const r = processTurn(state, [
        { type: 'MOVE', unitInstanceId: a.instanceId, destination: { x: 2, y: 1 } },
        { type: 'USE_ABILITY', unitInstanceId: a.instanceId, abilitySlug: 'test_hit', target: b.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, abilityMap);
      const target = r.updatedState.units.find((u) => u.instanceId === b.instanceId)!;
      assert(target.currentHealth === 90, 'move + ability in one turn must both apply');
    },
  },
  {
    rule: 'TRN-5', name: 'dead units are skipped in the initiative order',
    run: () => {
      const a = mkUnit(P1, 1, 1);
      const dead = mkUnit(P2, 2, 1, { isAlive: false, currentHealth: 0 });
      const c = mkUnit(P1, 3, 1);
      const d = mkUnit(P2, 4, 1);
      const state = mkInitiativeState([a, dead, c, d], [a.instanceId, dead.instanceId, c.instanceId, d.instanceId]);
      const r = processTurn(state, [{ type: 'END_TURN' }], P1, P1, P2, new Map());
      assert(r.updatedState.initiative!.activeUnitId === c.instanceId, 'dead unit slot must be skipped');
    },
  },
  {
    rule: 'TRN-6', name: 'frozen slots are skipped; burning and durations still tick on the skipped turn',
    run: () => {
      const a = mkUnit(P1, 1, 1);
      const frozen = mkUnit(P2, 2, 1, {
        statusEffects: [
          { slug: 'frozen', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' },
          { slug: 'burning', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' },
        ],
      });
      const c = mkUnit(P1, 3, 1);
      const d = mkUnit(P2, 4, 1);
      const state = mkInitiativeState([a, frozen, c, d], [a.instanceId, frozen.instanceId, c.instanceId, d.instanceId]);
      const r = processTurn(state, [{ type: 'END_TURN' }], P1, P1, P2, new Map());
      const f = r.updatedState.units.find((u) => u.instanceId === frozen.instanceId)!;
      assert(r.updatedState.initiative!.activeUnitId === c.instanceId, 'frozen unit slot must be skipped');
      assert(f.currentHealth === 95, `burning must tick on the skipped turn (got HP ${f.currentHealth})`);
      assert(!has(f, 'frozen'), 'frozen duration must tick down on the skipped turn');
    },
  },
  {
    rule: 'TRN-7', name: 'charge is a second move as the action: once per turn, normal movement rules, available all rounds',
    run: () => {
      const a = mkUnit(P1, 1, 1);
      const b = mkUnit(P2, 7, 6);
      const ok = processTurn(mkLegacyState([a, b]), [
        { type: 'MOVE', unitInstanceId: a.instanceId, destination: { x: 3, y: 1 } },
        { type: 'CHARGE', unitInstanceId: a.instanceId, destination: { x: 5, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map());
      const moved = ok.updatedState.units.find((u) => u.instanceId === a.instanceId)!;
      assert(moved.position.x === 5 && moved.hasActedThisTurn, 'move + charge must reach 6 tiles and consume the action');

      assertThrows(() => processTurn(mkLegacyState([mkUnit(P1, 1, 1), b]), [
        { type: 'CHARGE', unitInstanceId: 'u_x', destination: { x: 2, y: 1 } },
        { type: 'CHARGE', unitInstanceId: 'u_x', destination: { x: 3, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'once', 'two charges in one turn must be rejected');

      // charge is available in round 11 (no longer restricted to first 10 rounds)
      const a2 = mkUnit(P1, 1, 1); const b2 = mkUnit(P2, 7, 6);
      const late = mkInitiativeState([a2, b2], [a2.instanceId, b2.instanceId], 0);
      (late as any).roundNumber = 11; (late as any).turnNumber = 81;
      const lateOk = processTurn(late, [
        { type: 'CHARGE', unitInstanceId: a2.instanceId, destination: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map());
      assert(lateOk.updatedState.units.find(u => u.instanceId === a2.instanceId)!.position.x === 2, 'charge must be allowed in round 11');

      // charge respects enemy blocking like a normal move
      const walled = mkUnit(P1, 0, 3, { movementRange: 2 });
      const wall1 = mkUnit(P2, 0, 4); const wall2 = mkUnit(P2, 1, 3); const wall3 = mkUnit(P2, 1, 4);
      assertThrows(() => processTurn(mkLegacyState([walled, wall1, wall2, wall3]), [
        { type: 'CHARGE', unitInstanceId: walled.instanceId, destination: { x: 0, y: 5 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'reachable', 'charge through an enemy wall must be rejected');
    },
  },

  // ── MOV ────────────────────────────────────────────────────────────────────
  {
    rule: 'MOV-1', name: 'movement is orthogonal steps; a diagonal costs 2',
    run: () => {
      const u = mkUnit(P1, 3, 3, { movementRange: 1 });
      const tiles = reachableFrom(u.position, u, [u], 1);
      assert(at(tiles, 4, 3) && at(tiles, 2, 3) && at(tiles, 3, 4) && at(tiles, 3, 2), 'all 4 orthogonal neighbors reachable at range 1');
      assert(!at(tiles, 4, 4), 'diagonal must NOT be reachable at range 1');
      const two = reachableFrom(u.position, u, [u], 2);
      assert(at(two, 4, 4), 'diagonal reachable at range 2 (costs 2 steps)');
    },
  },
  {
    rule: 'MOV-2', name: 'allies can be moved through but not landed on',
    run: () => {
      const u = mkUnit(P1, 0, 3, { movementRange: 2 });
      const ally = mkUnit(P1, 0, 4);
      const tiles = reachableFrom(u.position, u, [u, ally], 2);
      assert(at(tiles, 0, 5), 'tile beyond an ally must be reachable (pass through)');
      assert(!at(tiles, 0, 4), 'the ally tile itself must not be a destination');
    },
  },
  {
    rule: 'MOV-3', name: 'enemies block movement completely — no pass-through, and the client path never crosses one',
    run: () => {
      const u = mkUnit(P1, 0, 3, { movementRange: 2 });
      const enemy = mkUnit(P2, 0, 4);
      const tiles = reachableFrom(u.position, u, [u, enemy], 2);
      assert(!at(tiles, 0, 4), 'enemy tile must not be a destination');
      assert(!at(tiles, 0, 5), 'tile whose only path crosses an enemy must be unreachable');
      // The step-path used for movement animation must respect the same rule.
      const walled = mkUnit(P1, 0, 3, { movementRange: 6 });
      const w1 = mkUnit(P2, 0, 4); const w2 = mkUnit(P2, 1, 4); const w3 = mkUnit(P2, 1, 3);
      const path = findPath(walled.position, { x: 0, y: 6 }, walled, [walled, w1, w2, w3]);
      assert(path === null || path.every((p) => !(p.x === 0 && p.y === 4) && !(p.x === 1 && p.y === 4) && !(p.x === 1 && p.y === 3)),
        'findPath must never route through an enemy tile');
      const open = findPath(u.position, { x: 2, y: 3 }, u, [u, enemy]);
      assert(open !== null && open.length === 2, 'findPath must find the open route');
    },
  },
  {
    rule: 'MOV-4', name: 'rooted blocks moving and charging, but not holding position or acting',
    run: () => {
      const rooted = () => mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const b = mkUnit(P2, 2, 1);
      let u = rooted();
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: 2, y: 2 } }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'rooted', 'rooted move must be rejected');
      u = rooted();
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'CHARGE', unitInstanceId: u.instanceId, destination: { x: 2, y: 2 } }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'rooted', 'rooted charge must be rejected');
      u = rooted();
      const hold = processTurn(mkLegacyState([u, b]), [
        { type: 'MOVE', unitInstanceId: u.instanceId, destination: u.position }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map());
      assert(hold.success, 'rooted hold-position must be allowed');
      u = rooted();
      const act = processTurn(mkLegacyState([u, b]), [
        { type: 'USE_ABILITY', unitInstanceId: u.instanceId, abilitySlug: 'test_hit', target: b.position }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map([['test_hit', mkAbility({ isUnblockable: true })]]));
      assert(act.updatedState.units[1].currentHealth === 90, 'rooted unit must still be able to use abilities');
    },
  },
  {
    rule: 'MOV-5', name: 'a unit may move at most once per turn',
    run: () => {
      const u = mkUnit(P1, 1, 1);
      const b = mkUnit(P2, 6, 6);
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: 2, y: 1 } },
        { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: 3, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'already moved', 'second move in one turn must be rejected');
    },
  },

  // ── DGE ────────────────────────────────────────────────────────────────────
  {
    rule: 'DGE-1', name: 'dodge chance = (AC − 6) × 5%: AC 6 never dodges, AC 26 always dodges',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const never = mkUnit(P2, 2, 1, { armorClass: 6 });
      for (let i = 0; i < 5; i++) cast(mkAbility(), caster, never);
      assert(never.currentHealth === 50, 'AC 6 (0% dodge) must be hit every time');
      const always = mkUnit(P2, 2, 1, { armorClass: 26 });
      for (let i = 0; i < 5; i++) cast(mkAbility(), caster, always);
      assert(always.currentHealth === 100, 'AC 26 (100% dodge) must dodge every time');
    },
  },
  {
    rule: 'DGE-2', name: 'fortune meter accumulates dodge chance; at 100% the attack misses and the meter drops by 100',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { armorClass: 16 }); // 50% dodge
      cast(mkAbility(), caster, t);
      assert(t.currentHealth === 90 && Math.abs(t.fortuneMeter - 0.5) < 1e-9, 'first attack hits, meter 0.5');
      const ev = cast(mkAbility(), caster, t);
      assert(t.currentHealth === 90, 'second attack must miss when meter reaches 1.0');
      assert(ev.some((e) => e.type === 'ATTACK_MISSED'), 'miss must emit ATTACK_MISSED');
      assert(Math.abs(t.fortuneMeter) < 1e-9, 'meter must drop by 100 after the miss');
    },
  },
  {
    rule: 'DGE-3', name: 'the meter starts empty — a fresh unit\'s meter is 0',
    run: () => {
      const inst = buildUnitInstance(defOf('fighter'), P1, { x: 1, y: 1 });
      assert(inst.fortuneMeter === 0, 'buildUnitInstance must start the fortune meter at 0');
    },
  },
  {
    rule: 'DGE-4', name: 'unblockable abilities always hit and never touch the meter',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { armorClass: 26, fortuneMeter: 0.4 });
      cast(mkAbility({ isUnblockable: true }), caster, t);
      assert(t.currentHealth === 90, 'unblockable must hit a 100%-dodge target');
      assert(Math.abs(t.fortuneMeter - 0.4) < 1e-9, 'unblockable must not change the meter');
    },
  },
  {
    rule: 'DGE-5', name: 'attacks on an exposed unit always hit, meter untouched',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, {
        armorClass: 26, fortuneMeter: 0.4,
        statusEffects: [{ slug: 'exposed', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' }],
      });
      cast(mkAbility(), caster, t);
      assert(t.currentHealth === 90, 'exposed target must always be hit');
      assert(Math.abs(t.fortuneMeter - 0.4) < 1e-9, 'exposed hit must not change the meter');
    },
  },
  {
    rule: 'DGE-6', name: 'multi-hit rolls each hit separately — one can hit while the other misses',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { armorClass: 16 }); // 50%: hit1 lands (meter .5), hit2 misses (meter 0)
      const twin = mkAbility({
        isMultiHit: true,
        effects: [
          { type: 'damage', formula: 'flat', value: 9 },
          { type: 'damage', formula: 'flat', value: 8 },
        ],
      });
      const ev = cast(twin, caster, t);
      assert(t.currentHealth === 91, `first hit lands, second misses (got HP ${t.currentHealth})`);
      assert(ev.some((e) => e.type === 'ATTACK_MISSED'), 'the missed hit must emit ATTACK_MISSED');
      assert(Math.abs(t.fortuneMeter) < 1e-9, 'meter resets after the missing hit');
    },
  },
  {
    rule: 'DGE-7', name: 'a shield negates the next hit (even unblockable) and is consumed; multi-hit loses only its first hit',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const shielded = () => mkUnit(P2, 2, 1, {
        statusEffects: [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: 'x' }],
        fortuneMeter: 0.25,
      });
      let t = shielded();
      const ev = cast(mkAbility({ isUnblockable: true }), caster, t);
      assert(t.currentHealth === 100 && !has(t, 'shielded'), 'shield must absorb an unblockable hit and be consumed');
      assert(ev.some((e) => e.type === 'SHIELD_ABSORBED'), 'absorption must emit SHIELD_ABSORBED');
      assert(Math.abs(t.fortuneMeter - 0.25) < 1e-9, 'shielded hit must not touch the meter');
      t = shielded();
      cast(mkAbility({
        isMultiHit: true, isUnblockable: true,
        effects: [
          { type: 'damage', formula: 'flat', value: 9 },
          { type: 'damage', formula: 'flat', value: 8 },
        ],
      }), caster, t);
      assert(t.currentHealth === 92 && !has(t, 'shielded'), 'shield must absorb only the FIRST hit of a multi-hit');
    },
  },
  {
    rule: 'DGE-8', name: 'non-damaging abilities never miss',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { armorClass: 26, currentHealth: 50, fortuneMeter: 0.9 });
      const ev = cast(mkAbility({ effects: [{ type: 'heal', formula: 'flat', value: 20 }] }), caster, t);
      assert(t.currentHealth === 70, 'heal must land on a 100%-dodge target');
      assert(!ev.some((e) => e.type === 'ATTACK_MISSED'), 'no miss event for a non-damaging ability');
      assert(Math.abs(t.fortuneMeter - 0.9) < 1e-9, 'non-damaging ability must not touch the meter');
    },
  },

  // ── ABL ────────────────────────────────────────────────────────────────────
  {
    rule: 'ABL-1', name: 'one ability per turn; cooldown blocks reuse and ticks down each of the unit\'s turns',
    run: () => {
      const u = mkUnit(P1, 1, 1);
      const b = mkUnit(P2, 2, 1);
      const map = new Map([['test_hit', mkAbility({ isUnblockable: true, cooldownTurns: 2 })]]);
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'USE_ABILITY', unitInstanceId: u.instanceId, abilitySlug: 'test_hit', target: b.position },
        { type: 'USE_ABILITY', unitInstanceId: u.instanceId, abilitySlug: 'test_hit', target: b.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, map), 'already used', 'second ability in one turn must be rejected');

      const u2 = mkUnit(P1, 1, 1);
      const r = processTurn(mkLegacyState([u2, mkUnit(P2, 2, 1)]), [
        { type: 'USE_ABILITY', unitInstanceId: u2.instanceId, abilitySlug: 'test_hit', target: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, map);
      const after = r.updatedState.units[0];
      assert(after.cooldowns['test_hit'] === 2, 'cooldown must be set on use');
      const onCd = mkUnit(P1, 1, 1, { cooldowns: { test_hit: 2 } });
      assertThrows(() => processTurn(mkLegacyState([onCd, mkUnit(P2, 2, 1)]), [
        { type: 'USE_ABILITY', unitInstanceId: onCd.instanceId, abilitySlug: 'test_hit', target: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, map), 'cooldown', 'ability on cooldown must be rejected');
      tickUnitCooldowns(after);
      const cdAfterTick: number = after.cooldowns['test_hit'];
      assert(cdAfterTick === 1, 'cooldown must tick down by 1 per own turn');
    },
  },
  {
    rule: 'ABL-2', name: 'ability range is Manhattan distance (diagonal counts as 2)',
    run: () => {
      const u = mkUnit(P1, 1, 1);
      const diag = mkUnit(P2, 2, 2);
      const map = new Map([['test_hit', mkAbility({ isUnblockable: true, range: 1 })]]);
      assertThrows(() => processTurn(mkLegacyState([u, diag]), [
        { type: 'USE_ABILITY', unitInstanceId: u.instanceId, abilitySlug: 'test_hit', target: diag.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, map), 'range', 'diagonal target must be out of range 1 (Manhattan 2)');
      const ortho = mkUnit(P2, 2, 1);
      const u2 = mkUnit(P1, 1, 1);
      const ok = processTurn(mkLegacyState([u2, ortho]), [
        { type: 'USE_ABILITY', unitInstanceId: u2.instanceId, abilitySlug: 'test_hit', target: ortho.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, map);
      assert(ok.updatedState.units[1].currentHealth === 90, 'orthogonal neighbor must be in range 1');
    },
  },
  {
    rule: 'ABL-3', name: 'single-target LOS: a living unit on the straight line blocks; non-aligned never blocked; pushes exempt',
    run: () => {
      const map = (ab: AbilityDefinition) => new Map([[ab.slug, ab]]);
      const shooter = mkUnit(P1, 1, 1);
      const blocker = mkUnit(P2, 3, 1);
      const target = mkUnit(P2, 5, 1);
      assertThrows(() => processTurn(mkLegacyState([shooter, blocker, target]), [
        { type: 'USE_ABILITY', unitInstanceId: shooter.instanceId, abilitySlug: 'test_hit', target: target.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, map(mkAbility({ isUnblockable: true }))), 'line of sight', 'aligned shot through a unit must be blocked');

      const s2 = mkUnit(P1, 1, 1);
      const off = mkUnit(P2, 3, 2); // not on the line
      const t2 = mkUnit(P2, 5, 1);
      const okNonAligned = processTurn(mkLegacyState([s2, off, t2]), [
        { type: 'USE_ABILITY', unitInstanceId: s2.instanceId, abilitySlug: 'test_hit', target: t2.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, map(mkAbility({ isUnblockable: true })));
      assert(okNonAligned.updatedState.units[2].currentHealth === 90, 'off-line unit must not block');

      const s3 = mkUnit(P1, 1, 1);
      const b3 = mkUnit(P2, 3, 1);
      const t3 = mkUnit(P2, 5, 1);
      const push = mkAbility({ slug: 'test_push', isUnblockable: true, effects: [{ type: 'push', direction: 'away_from_caster', distance: 1 }] });
      const s3u = { ...s3, abilities: ['test_push'], cooldowns: { test_push: 0 } };
      const okPush = processTurn(mkLegacyState([s3u, b3, t3]), [
        { type: 'USE_ABILITY', unitInstanceId: s3u.instanceId, abilitySlug: 'test_push', target: t3.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, map(push));
      assert(okPush.success, 'push abilities must ignore LOS');
    },
  },
  {
    rule: 'ABL-4', name: 'health floors at 0 and the unit dies',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { currentHealth: 5 });
      const ev = cast(mkAbility({ isUnblockable: true }), caster, t);
      assert(t.currentHealth === 0, 'HP must floor at 0, never negative');
      assert(!t.isAlive, 'unit at 0 HP must be dead');
      assert(ev.some((e) => e.type === 'UNIT_DIED'), 'death must emit UNIT_DIED');
    },
  },
  {
    rule: 'ABL-5', name: 'healing and lifesteal are capped at max health',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { currentHealth: 95, maxHealth: 100 });
      cast(mkAbility({ effects: [{ type: 'heal', formula: 'flat', value: 20 }] }), caster, t);
      assert(t.currentHealth === 100, 'heal must cap at max health');
      const drainCaster = mkUnit(P1, 1, 1, { currentHealth: 96, maxHealth: 100 });
      const victim = mkUnit(P2, 2, 1);
      cast(mkAbility({ isUnblockable: true, effects: [{ type: 'lifesteal', formula: 'flat', value: 10, healValue: 8 }] }), drainCaster, victim);
      assert(victim.currentHealth === 90, 'lifesteal must deal its damage');
      assert(drainCaster.currentHealth === 100, 'lifesteal heal must cap at max health');
    },
  },
  {
    rule: 'ABL-6', name: 'execute abilities fail above the health threshold and work at or below it',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const exec = mkAbility({ isUnblockable: true, effects: [{ type: 'damage', formula: 'flat', value: 99, healthThreshold: 15 }] });
      const high = mkUnit(P2, 2, 1, { currentHealth: 16 });
      const evFail = cast(exec, caster, high);
      assert(high.currentHealth === 16, 'execute must do nothing above the threshold');
      assert(evFail.some((e) => e.type === 'ATTACK_MISSED'), 'failed execute must be reported');
      const low = mkUnit(P2, 2, 1, { currentHealth: 15 });
      cast(exec, caster, low);
      assert(low.currentHealth === 0 && !low.isAlive, 'execute must kill at/below the threshold');
    },
  },
  {
    rule: 'ABL-7', name: 'push/pull slides straight and stops early at edges, corners, and occupied tiles',
    run: () => {
      const pusher = mkUnit(P1, 3, 3);
      const pushAb = mkAbility({ slug: 'test_push', isUnblockable: true, effects: [{ type: 'push', direction: 'away_from_caster', distance: 3 }] });
      // stops at board edge
      let t = mkUnit(P2, 3, 6);
      cast(pushAb, pusher, t, [pusher, t]);
      assert(t.position.x === 3 && t.position.y === 7, `push must stop at the edge (got ${t.position.x},${t.position.y})`);
      // stops before an occupied tile
      t = mkUnit(P2, 3, 4);
      const wall = mkUnit(P2, 3, 6);
      cast(pushAb, pusher, t, [pusher, t, wall]);
      assert(t.position.y === 5, 'push must stop on the last free tile before an occupant');
      // never lands on a removed corner
      const cornerPusher = mkUnit(P1, 3, 7);
      t = mkUnit(P2, 5, 7);
      cast(pushAb, cornerPusher, t, [cornerPusher, t]);
      assert(t.position.x === 6 && t.position.y === 7, 'push toward a removed corner must stop before it');
      // pull
      const puller = mkUnit(P1, 1, 1);
      t = mkUnit(P2, 5, 1);
      cast(mkAbility({ slug: 'test_pull', isUnblockable: true, effects: [{ type: 'pull', direction: 'toward_caster', distance: 2 }] }), puller, t, [puller, t]);
      assert(t.position.x === 3 && t.position.y === 1, 'pull must draw the target 2 tiles toward the caster');
    },
  },

  // ── STA ────────────────────────────────────────────────────────────────────
  {
    rule: 'STA-1', name: 'a status lasting N turns is in force for N of the victim\'s turns and drops at end of the Nth',
    run: () => {
      const u = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'weakened', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const ev: GameEvent[] = [];
      applyStartOfTurnStatusDamage(u, ev);
      assert(has(u, 'weakened'), 'status must still be in force at the start of the turn');
      decrementStatusDurations(u, ev);
      assert(!has(u, 'weakened'), '1-turn status must expire at end of that turn');
      assert(ev.some((e) => e.type === 'STATUS_REMOVED'), 'expiry must emit STATUS_REMOVED');
    },
  },
  {
    rule: 'STA-2', name: 'burning deals 5 per stack at start of turn, stacks cap at 3, and can kill before acting',
    run: () => {
      const u = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'burning', turnsRemaining: 2, stacks: 2, sourceUnitInstanceId: 'x' }] });
      applyStartOfTurnStatusDamage(u, []);
      assert(u.currentHealth === 90, '2 burning stacks must deal 10 at start of turn');
      // stack cap via applyStatus (reapply path)
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1);
      const ignite = mkAbility({ isUnblockable: true, effects: [{ type: 'apply_status', statusSlug: 'burning', durationTurns: 2, stacks: 2 }] });
      cast(ignite, caster, t); cast(ignite, caster, t);
      assert(t.statusEffects.find((se) => se.slug === 'burning')!.stacks === 3, 'burning stacks must cap at 3');
      // lethal tick
      const dying = mkUnit(P1, 1, 1, { currentHealth: 5, statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const ev: GameEvent[] = [];
      applyStartOfTurnStatusDamage(dying, ev);
      assert(!dying.isAlive && ev.some((e) => e.type === 'UNIT_DIED'), 'a unit can die to its own burn before acting');
    },
  },
  {
    rule: 'STA-3', name: 'rooted: no move/charge, abilities still allowed',
    run: () => {
      // Same behavior as MOV-4 — asserted again under the status rule id so
      // retiring either rule keeps the other covered.
      const u = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const b = mkUnit(P2, 2, 1);
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: 1, y: 2 } }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'rooted', 'rooted move must be rejected');
      const u2 = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const r = processTurn(mkLegacyState([u2, mkUnit(P2, 2, 1)]), [
        { type: 'USE_ABILITY', unitInstanceId: u2.instanceId, abilitySlug: 'test_hit', target: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map([['test_hit', mkAbility({ isUnblockable: true })]]));
      assert(r.updatedState.units[1].currentHealth === 90, 'rooted unit must still be able to use abilities');
    },
  },
  {
    rule: 'STA-4', name: 'frozen: cannot move or act',
    run: () => {
      const frozenFx = [{ slug: 'frozen', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }];
      let u = mkUnit(P1, 1, 1, { statusEffects: frozenFx.map((f) => ({ ...f })) });
      const b = mkUnit(P2, 2, 1);
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'MOVE', unitInstanceId: u.instanceId, destination: { x: 1, y: 2 } }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map()), 'frozen', 'frozen move must be rejected');
      u = mkUnit(P1, 1, 1, { statusEffects: frozenFx.map((f) => ({ ...f })) });
      assertThrows(() => processTurn(mkLegacyState([u, b]), [
        { type: 'USE_ABILITY', unitInstanceId: u.instanceId, abilitySlug: 'test_hit', target: b.position }, { type: 'END_TURN' },
      ], P1, P1, P2, new Map([['test_hit', mkAbility()]])), 'frozen', 'frozen ability use must be rejected');
    },
  },
  {
    rule: 'STA-5', name: 'weakened reduces outgoing damage by 4, never below 0',
    run: () => {
      const weak = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'weakened', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const t = mkUnit(P2, 2, 1);
      cast(mkAbility({ isUnblockable: true }), weak, t);
      assert(t.currentHealth === 94, 'weakened 10-damage hit must deal 6');
      const t2 = mkUnit(P2, 2, 1);
      cast(mkAbility({ isUnblockable: true, effects: [{ type: 'damage', formula: 'flat', value: 3 }] }), weak, t2);
      assert(t2.currentHealth === 100, 'weakened damage must floor at 0');
    },
  },
  {
    rule: 'STA-6', name: 'reapplying a status keeps the longer duration and adds stacks up to 3',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1);
      cast(mkAbility({ isUnblockable: true, effects: [{ type: 'apply_status', statusSlug: 'burning', durationTurns: 3, stacks: 1 }] }), caster, t);
      cast(mkAbility({ isUnblockable: true, effects: [{ type: 'apply_status', statusSlug: 'burning', durationTurns: 1, stacks: 1 }] }), caster, t);
      const burn = t.statusEffects.find((se) => se.slug === 'burning')!;
      assert(burn.turnsRemaining === 3, 'reapply must keep the longer duration');
      assert(burn.stacks === 2, 'reapply must add stacks');
    },
  },

  // ── PAS ────────────────────────────────────────────────────────────────────
  {
    rule: 'PAS-1', name: 'Vitality adds max health',
    run: () => {
      const base = buildUnitInstance(defOf('fighter'), P1, { x: 1, y: 1 });
      const vit = buildUnitInstance(defOf('fighter'), P1, { x: 1, y: 1 }, { specialSlug: 'second_wind', passiveSlug: 'vitality' });
      assert(vit.maxHealth > base.maxHealth && vit.currentHealth === vit.maxHealth, 'vitality must raise max health');
    },
  },
  {
    rule: 'PAS-2', name: 'Hardened adds armor class (dodge)',
    run: () => {
      const base = buildUnitInstance(defOf('rogue'), P1, { x: 1, y: 1 });
      const hard = buildUnitInstance(defOf('rogue'), P1, { x: 1, y: 1 }, { specialSlug: 'assassinate', passiveSlug: 'hardened' });
      assert(hard.armorClass > base.armorClass, 'hardened must raise AC');
    },
  },
  {
    rule: 'PAS-3', name: 'Swift adds 1 movement',
    run: () => {
      const base = buildUnitInstance(defOf('ranger'), P1, { x: 1, y: 1 });
      const swift = buildUnitInstance(defOf('ranger'), P1, { x: 1, y: 1 }, { specialSlug: 'piercing', passiveSlug: 'swift' });
      assert(swift.movementRange === base.movementRange + 1, 'swift must add exactly 1 movement');
    },
  },
  {
    rule: 'PAS-4', name: 'Immovable adds 6 max health and blocks push and pull',
    run: () => {
      const base = buildUnitInstance(defOf('fighter'), P1, { x: 1, y: 1 });
      const anchor = buildUnitInstance(defOf('fighter'), P2, { x: 3, y: 3 }, { specialSlug: 'second_wind', passiveSlug: 'immovable' });
      assert(anchor.maxHealth === base.maxHealth + 6, 'immovable must add 6 max health');
      assert(anchor.passives.includes('immovable'), 'immovable flag must be on the instance');
      const pusher = mkUnit(P1, 3, 1);
      cast(mkAbility({ slug: 'test_push', isUnblockable: true, effects: [{ type: 'push', direction: 'away_from_caster', distance: 2 }] }), pusher, anchor, [pusher, anchor]);
      assert(anchor.position.x === 3 && anchor.position.y === 3, 'immovable unit must not be pushed');
      cast(mkAbility({ slug: 'test_pull', isUnblockable: true, effects: [{ type: 'pull', direction: 'toward_caster', distance: 2 }] }), pusher, anchor, [pusher, anchor]);
      assert(anchor.position.x === 3 && anchor.position.y === 3, 'immovable unit must not be pulled');
    },
  },
  {
    rule: 'PAS-5', name: 'Warded starts the match with a shield that negates the first hit',
    run: () => {
      const warded = buildUnitInstance(defOf('sorcerer'), P2, { x: 2, y: 1 }, { specialSlug: 'ffh', passiveSlug: 'warded' });
      assert(has(warded, 'shielded'), 'warded unit must begin shielded');
      const caster = mkUnit(P1, 1, 1);
      cast(mkAbility({ isUnblockable: true }), caster, warded);
      assert(warded.currentHealth === warded.maxHealth && !has(warded, 'shielded'), 'the starting shield must negate the first hit');
    },
  },

  // ── WIN ────────────────────────────────────────────────────────────────────
  // ── END ───────────────────────────────────────────────────────────────────
  {
    rule: 'END-1', name: 'round 11 emits ENDGAME_STARTED announcement',
    run: () => {
      const a = mkUnit(P1, 1, 1); const b = mkUnit(P2, 7, 6);
      // Set to last turn of round 10 so next END_TURN crosses into round 11
      const state = mkInitiativeState([a, b], [a.instanceId, b.instanceId], 0);
      (state as any).roundNumber = 10; (state as any).turnNumber = 80;
      const r = processTurn(state, [{ type: 'END_TURN' }], P1, P1, P2, new Map());
      const announced = r.events.some((e) => e.type === 'ENDGAME_STARTED');
      assert(announced, 'ENDGAME_STARTED must be emitted when round transitions to 11');
      // Must not emit again on subsequent round-11 turns
      const r2 = processTurn(r.updatedState, [{ type: 'END_TURN' }], P2, P1, P2, new Map());
      assert(!r2.events.some((e) => e.type === 'ENDGAME_STARTED'), 'ENDGAME_STARTED must not repeat on subsequent turns');
    },
  },
  {
    rule: 'END-2', name: 'retreating in round 11+ costs 1 HP; holding or advancing is free',
    run: () => {
      // Attacker starts at (1,1), enemy at (7,1) — distance 6
      const a = mkUnit(P1, 1, 1, { currentHealth: 20 }); const b = mkUnit(P2, 7, 1);
      const state = mkInitiativeState([a, b], [a.instanceId, b.instanceId], 0);
      (state as any).roundNumber = 11; (state as any).turnNumber = 81;

      // Retreat (move away from enemy): (1,1) → (1,0), distance 7 > 6 → drain
      const retreatState = JSON.parse(JSON.stringify(state));
      const r = processTurn(retreatState, [
        { type: 'MOVE', unitInstanceId: a.instanceId, destination: { x: 1, y: 0 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map());
      const afterRetreat = r.updatedState.units.find(u => u.instanceId === a.instanceId)!;
      assert(afterRetreat.currentHealth === 19, 'retreating must cost 1 HP');
      assert(r.events.some(e => e.type === 'ENDGAME_DRAIN'), 'ENDGAME_DRAIN event must be emitted');

      // Advance (move toward enemy): (1,1) → (2,1), distance 5 < 6 → no drain
      const advanceState = JSON.parse(JSON.stringify(state));
      const r2 = processTurn(advanceState, [
        { type: 'MOVE', unitInstanceId: a.instanceId, destination: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map());
      const afterAdvance = r2.updatedState.units.find(u => u.instanceId === a.instanceId)!;
      assert(afterAdvance.currentHealth === 20, 'advancing must not drain');

      // Hold position (no move): distance unchanged → no drain
      const holdState = JSON.parse(JSON.stringify(state));
      const r3 = processTurn(holdState, [{ type: 'END_TURN' }], P1, P1, P2, new Map());
      const afterHold = r3.updatedState.units.find(u => u.instanceId === a.instanceId)!;
      assert(afterHold.currentHealth === 20, 'holding position must not drain');
    },
  },
  {
    rule: 'END-3', name: 'drain uses Manhattan distance; no drain before round 11',
    run: () => {
      const a = mkUnit(P1, 1, 1, { currentHealth: 20 }); const b = mkUnit(P2, 7, 1);
      const state = mkInitiativeState([a, b], [a.instanceId, b.instanceId], 0);
      (state as any).roundNumber = 10; (state as any).turnNumber = 79;

      // Move away in round 10 — must NOT drain
      const r = processTurn(JSON.parse(JSON.stringify(state)), [
        { type: 'MOVE', unitInstanceId: a.instanceId, destination: { x: 1, y: 0 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map());
      const after = r.updatedState.units.find(u => u.instanceId === a.instanceId)!;
      assert(after.currentHealth === 20, 'drain must not apply before round 11');
    },
  },

  {
    rule: 'WIN-1', name: 'a player loses when all their units are defeated',
    run: () => {
      const alive = mkUnit(P1, 1, 1);
      const dead = mkUnit(P2, 2, 1, { isAlive: false, currentHealth: 0 });
      const over = checkWinCondition(mkLegacyState([alive, dead]), P1, P2);
      assert(over.isOver && over.winnerId === P1 && over.loserId === P2, 'wiping a team must end the match');
      const ongoing = checkWinCondition(mkLegacyState([mkUnit(P1, 1, 1), mkUnit(P2, 2, 1)]), P1, P2);
      assert(!ongoing.isOver, 'match must continue while both sides have units');
    },
  },
];

// ─── Round-1 fixture (needs 4v4 with initiative) ─────────────────────────────

function mkRound1State(): MatchState {
  const units = [
    mkUnit(P1, 1, 1), mkUnit(P1, 1, 3), mkUnit(P1, 1, 5), mkUnit(P1, 2, 6),
    mkUnit(P2, 6, 1), mkUnit(P2, 6, 3), mkUnit(P2, 6, 5), mkUnit(P2, 5, 6),
  ];
  return {
    board: { width: 8, height: 8 }, units, turnNumber: 1, roundNumber: 1,
    activePlayerId: P1, phase: 'action',
    initiative: { order: [], slot: 0, round1FirstPlayerId: P1, activeUnitId: null, isRound1: true },
  } as MatchState;
}

/** Run every check; returns failures (empty = all rules hold). */
export function runRulebookChecks(): { rule: string; name: string; error: string }[] {
  const failures: { rule: string; name: string; error: string }[] = [];
  for (const check of RULE_CHECKS) {
    try {
      check.run();
    } catch (e) {
      failures.push({ rule: check.rule, name: check.name, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return failures;
}
