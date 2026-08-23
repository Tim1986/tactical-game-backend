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
import { buildCampaignPlayerInstance, GIFT_MOVEMENT_BONUS, GIFT_ARMOR_BONUS } from '../campaigns/runtime.js';
import { GIFT_DAMAGE_BONUS } from './abilityExecutor.js';
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from '../ai/defaultData.js';
import { isInAoe, getLineTiles } from './boardUtils.js';

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
    cooldowns: { test_hit: 0 }, statusEffects: [],
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

function cast(ability: AbilityDefinition, caster: UnitInstance, target: UnitInstance, allUnits?: UnitInstance[], pushDestination?: BoardPosition): GameEvent[] {
  const events: GameEvent[] = [];
  const state = mkLegacyState(allUnits ?? [caster, target]);
  executeAbility({ state, caster, targetPosition: target.position, ability, events, pushDestination });
  return events;
}

/** Cast at a bare TILE rather than at a unit — placed AoEs, rings, leaps. */
function castAt(ability: AbilityDefinition, caster: UnitInstance, targetPosition: BoardPosition, allUnits: UnitInstance[]): GameEvent[] {
  const events: GameEvent[] = [];
  executeAbility({ state: mkLegacyState(allUnits), caster, targetPosition, ability, events });
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
    rule: 'TRN-2', name: 'round 1: an all-frozen player is auto-skipped inside the previous submit',
    run: () => {
      // P2's whole side is frozen before round 1 begins. P1 commits normally;
      // the engine must skip P2's commit turns automatically — activePlayerId
      // returns to P1 after every P1 submit, P2 never receives a turn, and the
      // frozen units still land in the initiative order with ticked durations
      // (TRN-6: the skipped turn is not free).
      let state = mkRound1State();
      for (const u of state.units) {
        if (u.ownerPlayerId === P2) u.statusEffects.push({ slug: 'frozen', turnsRemaining: 9, stacks: 1, sourceUnitInstanceId: u.instanceId });
      }
      let skips = 0;
      for (let i = 0; i < 4; i++) {
        assert(state.activePlayerId === P1, `P1 must hold every round-1 commit turn (iteration ${i})`);
        const committed = new Set(state.initiative!.order);
        const unit = state.units.find((u) => u.ownerPlayerId === P1 && !committed.has(u.instanceId))!;
        const r = processTurn(state, [{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: unit.position }, { type: 'END_TURN' }], P1, P1, P2, new Map());
        skips += r.events.filter((e) => e.type === 'TURN_SKIPPED').length;
        state = r.updatedState;
      }
      assert(skips >= 4, `every P2 commit must appear as a TURN_SKIPPED event (saw ${skips})`);
      assert(!state.initiative!.isRound1, 'round 1 must complete without P2 ever acting');
      assert(state.initiative!.order.length === 8, 'all 8 units (4 frozen) must be in the final order');
      const p2Frozen = state.units.filter((u) => u.ownerPlayerId === P2);
      assert(p2Frozen.every((u) => u.statusEffects.some((se) => se.slug === 'frozen' && se.turnsRemaining < 9)),
        'skipped frozen units must have TICKED durations — the skip is not free');
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
      assert(f.currentHealth === 93, `burning must tick on the skipped turn (got HP ${f.currentHealth})`);
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
    rule: 'DGE-1', name: 'the stated AC range 8-12 matches the actual roster',
    run: () => {
      // DGE-1 tells the player "Each unit has an Armor Class (AC) between 8 and
      // 12". That is a claim about the CHASSIS TABLE, not about engine
      // behaviour, and until 2026-08-23 nothing checked it — the rule text
      // could quietly become a lie the next time a class was tuned.
      //
      // This is not hypothetical. The unit-info pip scale carried the same kind
      // of hardcoded bound (AC_MIN 13 / AC_MAX 17, left over from an older stat
      // table) and rotted silently: every class in the game displayed a single
      // armour pip because the real range had moved entirely below the constant.
      // A number shown to players must be derived from the data or asserted
      // against it. This asserts.
      const acs = Object.values(DEFAULT_UNITS).map((d) => d.armorClass);
      const lo = Math.min(...acs), hi = Math.max(...acs);
      assert(lo === 8 && hi === 12,
        `DGE-1 says AC runs 8-12 but the roster spans ${lo}-${hi} — update the rule TEXT and any UI that hardcodes the range (see src/components/statPips.ts in mobile)`);
    },
  },
  {
    rule: 'DGE-1', name: 'AC-based hit chance: d20+5 vs AC; each attack rolls fresh',
    run: () => {
      // AC 6 → 0% dodge: must always hit
      const caster = mkUnit(P1, 1, 1);
      const noAc = mkUnit(P2, 2, 1, { armorClass: 6 });
      for (let i = 0; i < 20; i++) cast(mkAbility(), caster, noAc);
      assert(noAc.currentHealth === Math.max(0, 100 - 20 * 10), 'AC 6 target (0% dodge) must be hit every time');
      // AC 26 → 100% dodge: must never be hit over many attacks
      const fullAc = mkUnit(P2, 2, 1, { armorClass: 26 });
      for (let i = 0; i < 20; i++) cast(mkAbility(), caster, fullAc);
      assert(fullAc.currentHealth === 100, 'AC 26 target (100% dodge) must never be hit');
    },
  },
  {
    rule: 'DGE-2', name: 'unblockable abilities always hit',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { armorClass: 26 });
      cast(mkAbility({ isUnblockable: true }), caster, t);
      assert(t.currentHealth === 90, 'unblockable must hit even maximum-AC target');
    },
  },
  {
    rule: 'DGE-3', name: 'attacks on an exposed unit always hit',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, {
        armorClass: 26,
        statusEffects: [{ slug: 'exposed', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' }],
      });
      cast(mkAbility(), caster, t);
      assert(t.currentHealth === 90, 'exposed target must always be hit');
    },
  },
  {
    rule: 'DGE-4', name: 'multi-hit applies each damage effect independently',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1);
      const twin = mkAbility({
        isMultiHit: true,
        effects: [
          { type: 'damage', formula: 'flat', value: 9 },
          { type: 'damage', formula: 'flat', value: 8 },
        ],
      });
      cast(twin, caster, t);
      assert(t.currentHealth === 83, `both hits must land (got HP ${t.currentHealth})`);

      // The check above builds its OWN ability with isMultiHit hard-coded, so it
      // passed even while DEFAULT_ABILITIES silently dropped the flag and every
      // offline/AI Twin Strike ran down the single-hit path (one roll for both
      // daggers). Assert the flag survives the real gameData → AbilityDefinition
      // conversion, and that the shipped ability actually rolls twice.
      const realTwin = DEFAULT_ABILITIES.find((a) => a.slug === 'twin');
      assert(realTwin, 'twin must exist in DEFAULT_ABILITIES');
      assert(realTwin.isMultiHit === true, 'shipped Twin Strike must carry isMultiHit through defaultData');

      const atk = mkUnit(P1, 1, 1);
      const def = mkUnit(P2, 2, 1, { armorClass: 12 }); // AC > 6 so a dodge roll is actually made
      const state = mkLegacyState([atk, def]);
      state.rollLog = [];
      const events: GameEvent[] = [];
      executeAbility({ state, caster: atk, targetPosition: def.position, ability: realTwin, events });
      const resolved = events.filter((e) => e.type === 'DAMAGE_DEALT' || e.type === 'DODGED').length;
      assert(
        state.rollLog.length === resolved && resolved === 2,
        `Twin Strike must roll once per blow — got ${state.rollLog.length} roll(s) for ${resolved} resolution(s)`,
      );
    },
  },
  {
    rule: 'DGE-5', name: 'a shield negates the next hit (even unblockable) and is consumed; multi-hit loses only its first hit',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const shielded = () => mkUnit(P2, 2, 1, {
        statusEffects: [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: 'x' }],
      });
      let t = shielded();
      const ev = cast(mkAbility({ isUnblockable: true }), caster, t);
      assert(t.currentHealth === 100 && !has(t, 'shielded'), 'shield must absorb an unblockable hit and be consumed');
      assert(ev.some((e) => e.type === 'SHIELD_ABSORBED'), 'absorption must emit SHIELD_ABSORBED');
      t = shielded();
      cast(mkAbility({
        isMultiHit: true, isUnblockable: true,
        effects: [
          { type: 'damage', formula: 'flat', value: 9 },
          { type: 'damage', formula: 'flat', value: 8 },
        ],
      }), caster, t);
      assert(t.currentHealth === 92 && !has(t, 'shielded'), 'shield must absorb only the FIRST hit of a multi-hit');
      // The absorbed hit takes its whole payload with it: a status carried by
      // the same damaging attack (Pinning Shot's root) must NOT land.
      t = shielded();
      cast(mkAbility({
        effects: [
          { type: 'damage', formula: 'flat', value: 7 },
          { type: 'apply_status', statusSlug: 'rooted', stacks: 1, durationTurns: 2 },
        ],
      }), caster, t);
      assert(t.currentHealth === 100 && !has(t, 'rooted') && !has(t, 'shielded'),
        'a status on an absorbed damaging hit must be negated with it (no damage, no root, shield spent)');
    },
  },
  {
    rule: 'DGE-6', name: 'non-damaging abilities always land',
    run: () => {
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1, { armorClass: 26, currentHealth: 50 });
      const ev = cast(mkAbility({ effects: [{ type: 'heal', formula: 'flat', value: 20 }] }), caster, t);
      assert(t.currentHealth === 70, 'heal must land on a max-AC target');
      assert(!ev.some((e) => e.type === 'ATTACK_MISSED'), 'no miss event for a non-damaging ability');
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
      // Line abilities are the exception: range runs in TILES along the ray
      // (Chebyshev), so a diagonal aim at full printed range is legal where
      // Manhattan counting would reject it.
      const shooter = mkUnit(P1, 1, 1, { abilities: ['test_line'] });
      const farDiag = mkUnit(P2, 4, 4); // chebyshev 3, manhattan 6
      const lineMap = new Map([['test_line', mkAbility({ slug: 'test_line', targetingType: 'line', range: 3, isUnblockable: true })]]);
      const lr = processTurn(mkLegacyState([shooter, farDiag]), [
        { type: 'USE_ABILITY', unitInstanceId: shooter.instanceId, abilitySlug: 'test_line', target: farDiag.position },
        { type: 'END_TURN' },
      ], P1, P1, P2, lineMap);
      assert(lr.updatedState.units[1].currentHealth === 90, 'diagonal line target at chebyshev range must be legal and hit');
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
    rule: 'ABL-7', name: 'a push travels one cardinal direction; an exactly-diagonal target lets the caster pick',
    run: () => {
      const pushAb = mkAbility({ slug: 'test_push', isUnblockable: true, effects: [{ type: 'push', direction: 'away_from_caster', distance: 3 }] });
      // A push is CARDINAL, never diagonal: an exactly-diagonal target offers
      // both cardinals and the caster picks. Without a choice the first is used,
      // and either way one axis must stay put.
      const diagPusher = mkUnit(P1, 3, 3);
      let dp = mkUnit(P2, 4, 4);
      cast(pushAb, diagPusher, dp, [diagPusher, dp]);
      assert(dp.position.x === 4 || dp.position.y === 4,
        `diagonal push must travel one cardinal, not diagonally (got ${dp.position.x},${dp.position.y})`);
      dp = mkUnit(P2, 4, 4);
      cast(pushAb, diagPusher, dp, [diagPusher, dp], { x: 4, y: 7 });
      assert(dp.position.x === 4 && dp.position.y === 7, `caster's chosen cardinal must be honoured (got ${dp.position.x},${dp.position.y})`);
    },
  },
  {
    rule: 'ABL-13', name: 'a pull drags toward the caster, diagonals cost two, and stops one tile short',
    run: () => {
      const puller = mkUnit(P1, 1, 1);
      let t = mkUnit(P2, 5, 1);
      const pull2 = mkAbility({ slug: 'test_pull', isUnblockable: true, effects: [{ type: 'pull', direction: 'toward_caster', distance: 2 }] });
      cast(pull2, puller, t, [puller, t]);
      assert(t.position.x === 3 && t.position.y === 1, 'orthogonal pull must draw the target 2 tiles toward the caster');
      // Diagonal pull counts each diagonal step as 2 tiles of the distance, so a
      // distance-2 pull moves ONE diagonal tile (not two) — a diagonal drag can
      // never cover more ground than a straight one of the same tile count.
      const dPuller = mkUnit(P1, 1, 1);
      let dt = mkUnit(P2, 5, 5);
      cast(pull2, dPuller, dt, [dPuller, dt]);
      assert(dt.position.x === 4 && dt.position.y === 4, `diagonal pull-2 must move exactly one diagonal tile (got ${dt.position.x},${dt.position.y})`);
      // With 1 budget left after a diagonal, the drag straightens along the
      // dominant axis: a distance-3 diagonal pull lands 1 diagonal + 1 straight.
      const d3Puller = mkUnit(P1, 1, 1);
      let d3t = mkUnit(P2, 5, 5);
      const pull3 = mkAbility({ slug: 'test_pull3', isUnblockable: true, effects: [{ type: 'pull', direction: 'toward_caster', distance: 3 }] });
      cast(pull3, d3Puller, d3t, [d3Puller, d3t]);
      assert(d3t.position.x === 3 && d3t.position.y === 4, `diagonal pull-3 must land 1 diagonal + 1 straight (got ${d3t.position.x},${d3t.position.y})`);

      // A diagonally-adjacent target CAN be pulled: it cuts the corner onto one
      // of the two tiles beside the caster, and the caster picks which.
      const adjPuller = mkUnit(P1, 3, 3);
      let ap = mkUnit(P2, 4, 4);
      cast(pull3, adjPuller, ap, [adjPuller, ap], { x: 4, y: 3 });
      assert(ap.position.x === 4 && ap.position.y === 3, `chosen corner-cut must be honoured (got ${ap.position.x},${ap.position.y})`);
      ap = mkUnit(P2, 4, 4);
      cast(pull3, adjPuller, ap, [adjPuller, ap], { x: 3, y: 4 });
      assert(ap.position.x === 3 && ap.position.y === 4, `the other corner-cut must also be reachable (got ${ap.position.x},${ap.position.y})`);

      // An out-of-set destination is ignored by the executor (turnProcessor
      // rejects it outright); the target must never teleport to it.
      ap = mkUnit(P2, 4, 4);
      cast(pull3, adjPuller, ap, [adjPuller, ap], { x: 7, y: 7 });
      assert(!(ap.position.x === 7 && ap.position.y === 7), 'a bogus displacement destination must never be honoured');
    },
  },
  {
    rule: 'ABL-14', name: 'displacement stops early at edges, removed corners, and occupied tiles',
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
    },
  },
  {
    rule: 'ABL-8', name: 'AOE shape: blasts include diagonals; every arena AoE is a ring (parity sweep over all real AOE abilities)',
    run: () => {
      // Generic behavior: orthogonal hits the cardinal neighbor, never the diagonal.
      const orthoAb = mkAbility({ slug: 'test_ortho', targetingType: 'aoe', range: 0, areaRadius: 1, areaShape: 'orthogonal', isUnblockable: true });
      const caster = mkUnit(P1, 3, 3);
      const cardinal = mkUnit(P2, 3, 2);
      const diagonal = mkUnit(P2, 4, 4);
      const ev = cast(orthoAb, caster, caster, [caster, cardinal, diagonal]);
      assert(ev.some((e) => e.targetUnitInstanceId === cardinal.instanceId), 'orthogonal AOE must hit the cardinal neighbor');
      assert(!ev.some((e) => e.targetUnitInstanceId === diagonal.instanceId), 'orthogonal AOE must NOT hit the diagonal neighbor');

      const chebAb = mkAbility({ slug: 'test_cheb', targetingType: 'aoe', range: 0, areaRadius: 1, isUnblockable: true });
      const c2 = mkUnit(P1, 3, 3);
      const card2 = mkUnit(P2, 3, 2);
      const diag2 = mkUnit(P2, 4, 4);
      const ev2 = cast(chebAb, c2, c2, [c2, card2, diag2]);
      assert(ev2.some((e) => e.targetUnitInstanceId === card2.instanceId), 'default (chebyshev) AOE must hit the cardinal neighbor');
      assert(ev2.some((e) => e.targetUnitInstanceId === diag2.instanceId), 'default (chebyshev) AOE must hit the diagonal neighbor');

      // Data-level guard: EVERY arena AoE is a ring (owner ruling 2026-08-22 —
      // Whirlwind and Ground Slam joined the rings; 'orthogonal' and default
      // chebyshev survive in the engine only for campaign enemy content).
      for (const def of DEFAULT_ABILITIES.filter((a) => a.targetingType === 'aoe')) {
        assert(def.areaShape === 'ring', `${def.slug} must have areaShape 'ring' — every arena AoE is a ring`);
      }

      // PARITY SWEEP: for EVERY real AOE ability, the engine's resolved hit set
      // must match the shared isInAoe predicate — this is the guard against the
      // engine and AI brain (which uses the same predicate) drifting apart.
      for (const def of DEFAULT_ABILITIES.filter((a) => a.targetingType === 'aoe')) {
        const c = mkUnit(P1, 3, 3);
        const near = mkUnit(P2, 3, 2);  // cardinal, dist 1
        const diag = mkUnit(P2, 4, 4);  // diagonal, chebyshev 1
        const center = { x: 3, y: 3 };
        // Capture pre-cast positions — push effects mutate them during the cast.
        const startPositions = new Map([near, diag].map((u) => [u.instanceId, { ...u.position }]));
        const events = cast(def, c, c, [c, near, diag]);
        for (const enemy of [near, diag]) {
          const pos = startPositions.get(enemy.instanceId)!;
          const predicted = isInAoe(center, pos, def.areaRadius, def.areaShape);
          const actual = events.some((e) => e.targetUnitInstanceId === enemy.instanceId);
          assert(predicted === actual,
            `${def.slug}: engine hit=${actual} but isInAoe predicts ${predicted} for enemy at (${pos.x},${pos.y})`);
        }
      }
    },
  },

  {
    rule: 'ABL-9', name: 'line abilities sweep the FULL range past the tapped tile, stopping only at the board edge',
    run: () => {
      // Owner repro (C22b item 11): 5 units queued in a row, tap the 2nd — all
      // 5 must be hit. The ray used to stop at the tapped tile, hitting only 2.
      const caster = mkUnit(P1, 0, 3);
      const line = [1, 2, 3, 4, 5].map((x) => mkUnit(P2, x, 3));
      const ab = mkAbility({ slug: 'test_line', targetingType: 'line', range: 6, isUnblockable: true });
      const ev = cast(ab, caster, line[1], [caster, ...line]); // tap the SECOND unit
      for (const u of line) {
        assert(ev.some((e) => e.type === 'DAMAGE_DEALT' && e.targetUnitInstanceId === u.instanceId),
          `line ability must hit the unit at (${u.position.x},${u.position.y}) — the ray does not stop at the tapped tile`);
      }

      // Direction only: the ray extends the ability's full range from the caster.
      const tiles = getLineTiles({ x: 0, y: 3 }, { x: 1, y: 3 }, 6);
      assert(tiles.length === 6, `full-range ray must be 6 tiles, got ${tiles.length}`);
      assert(at(tiles, 6, 3), 'ray must reach the 6th tile even though the tap was at distance 1');

      // Stops at the board edge rather than running off it.
      const edge = getLineTiles({ x: 5, y: 3 }, { x: 6, y: 3 }, 6);
      assert(edge.every((t) => t.x <= 7), 'ray must not leave the board');
      assert(edge.length === 2, `ray from x=5 must stop at the edge (2 tiles), got ${edge.length}`);

      // Data guard: Piercing Shot stays a full-range line ability.
      const piercing = DEFAULT_ABILITIES.find((a) => a.slug === 'piercing');
      assert(piercing?.targetingType === 'line', 'piercing must stay targetingType line');
      assert(piercing!.range === 6, 'piercing must keep its 6-tile range');
    },
  },
  {
    rule: 'ABL-10', name: 'area and line abilities hit allies; a self-centred blast never hits its own caster',
    run: () => {
      // Whirlwind: hits the caster's ALLY standing cardinally adjacent.
      const wwDef = DEFAULT_ABILITIES.find((a) => a.slug === 'whirlwind')!;
      const caster = mkUnit(P1, 3, 3);
      const ally = mkUnit(P1, 3, 2);       // cardinal ally — must be hit
      const enemy = mkUnit(P2, 2, 3);      // cardinal enemy — must be hit
      const ev = cast(wwDef, caster, caster, [caster, ally, enemy]);
      assert(ev.some((e) => e.targetUnitInstanceId === ally.instanceId),
        'Whirlwind must hit the caster\'s own adjacent ally');
      assert(ev.some((e) => e.targetUnitInstanceId === enemy.instanceId),
        'Whirlwind must hit the adjacent enemy');
      assert(!ev.some((e) => e.targetUnitInstanceId === caster.instanceId),
        'a self-centred blast must never hit its own caster');

      // Piercing Shot: an ally standing in the ray takes the hit too.
      const shooter = mkUnit(P1, 0, 5);
      const allyInLine = mkUnit(P1, 1, 5);
      const foeBehind = mkUnit(P2, 2, 5);
      const lineAb = mkAbility({ slug: 'test_line2', targetingType: 'line', range: 6, isUnblockable: true });
      const ev2 = cast(lineAb, shooter, foeBehind, [shooter, allyInLine, foeBehind]);
      assert(ev2.some((e) => e.targetUnitInstanceId === allyInLine.instanceId),
        'a line ability must hit an ally standing in the ray');
      assert(ev2.some((e) => e.targetUnitInstanceId === foeBehind.instanceId),
        'a line ability must hit the enemy behind the ally (the ray does not stop at the first unit)');

      // Data guard: none of these may quietly gain excludeAllies.
      for (const slug of ['whirlwind', 'shockwave', 'piercing']) {
        const def = DEFAULT_ABILITIES.find((a) => a.slug === slug);
        assert(!def?.excludeAllies, `${slug} must keep hitting allies (excludeAllies must stay falsy)`);
      }
    },
  },
  {
    rule: 'ABL-11', name: 'a ring blast covers its radius but spares the centre tile it was aimed at',
    run: () => {
      const ring = mkAbility({
        slug: 'test_ring', targetingType: 'aoe', range: 4, areaRadius: 1,
        areaShape: 'ring', isUnblockable: true,
        effects: [{ type: 'damage', formula: 'flat', value: 5 }],
      });
      const caster = mkUnit(P1, 0, 0);
      const eye = mkUnit(P1, 3, 3);        // stands in the calm centre — spared
      const edge = mkUnit(P2, 3, 4);       // orthogonal neighbour — hit
      const corner = mkUnit(P2, 4, 4);     // diagonal neighbour — hit
      const ev = castAt(ring, caster, eye.position, [caster, eye, edge, corner]);
      assert(!ev.some((e) => e.targetUnitInstanceId === eye.instanceId),
        'a ring must NOT hit the unit standing on the tile it was aimed at');
      assert(ev.some((e) => e.targetUnitInstanceId === edge.instanceId),
        'a ring must hit the orthogonal neighbour of its centre');
      assert(ev.some((e) => e.targetUnitInstanceId === corner.instanceId),
        'a ring must hit the diagonal neighbour of its centre');
    },
  },
  {
    rule: 'ABL-12', name: 'a leap relocates the caster over intervening units; the landing tile must be free',
    run: () => {
      const leap = mkAbility({
        slug: 'test_leap', targetingType: 'aoe', range: 3, areaRadius: 1,
        areaShape: 'ring', isUnblockable: true,
        effects: [
          { type: 'move_self' },
          { type: 'damage', formula: 'flat', value: 6 },
        ],
      });

      // Leaps OVER a blocker: the wall at (3,2) would stop a MOVE dead.
      const barb = mkUnit(P1, 3, 1);
      const wall = mkUnit(P2, 3, 2);
      const victim = mkUnit(P2, 4, 3);
      const ev = castAt(leap, barb, { x: 3, y: 3 }, [barb, wall, victim]);
      assert(barb.position.x === 3 && barb.position.y === 3,
        'the caster must end the leap standing on the targeted tile');
      assert(ev.some((e) => e.type === 'UNIT_MOVED' && e.targetUnitInstanceId === barb.instanceId),
        'a leap must emit UNIT_MOVED for the caster');
      // Blast is centred on the LANDING tile, not the take-off tile: the victim
      // adjacent to (3,3) is hit, and the caster in the calm eye is not.
      assert(ev.some((e) => e.targetUnitInstanceId === victim.instanceId),
        'the blast must resolve around where the caster landed');
      assert(!ev.some((e) => e.type === 'DAMAGE_DEALT' && e.targetUnitInstanceId === barb.instanceId),
        'the leaping caster must land in the calm eye of its own ring');

      // An occupied landing tile is declined outright — no move, no blast.
      const barb2 = mkUnit(P1, 1, 1);
      const squatter = mkUnit(P2, 1, 3);
      castAt(leap, barb2, squatter.position, [barb2, squatter]);
      assert(barb2.position.x === 1 && barb2.position.y === 1,
        'a leap onto an occupied tile must not move the caster');

      // Anchor blocks being MOVED by someone else, never self-propelled travel.
      const anchored = mkUnit(P1, 5, 5, { passives: ['immovable'] });
      castAt(leap, anchored, { x: 5, y: 3 }, [anchored]);
      assert(anchored.position.y === 3, 'Anchor must not prevent a unit leaping under its own power');
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
      const expiryRemoved = ev.find((e) => e.type === 'STATUS_REMOVED');
      assert(!!expiryRemoved, 'expiry must emit STATUS_REMOVED');
      // Natural expiry carries NO source — that is how the combat log tells it
      // apart from a deliberate cleanse (Purify) and keeps it silent. If this
      // ever gains a source, expiring debuffs would spam the log.
      assert(!expiryRemoved!.sourceUnitInstanceId, 'expiry STATUS_REMOVED must have no source unit');
    },
  },
  {
    rule: 'STA-2', name: 'burning deals 7 per stack at start of turn, stacks cap at 3, and can kill before acting',
    run: () => {
      const u = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'burning', turnsRemaining: 2, stacks: 2, sourceUnitInstanceId: 'x' }] });
      applyStartOfTurnStatusDamage(u, []);
      assert(u.currentHealth === 86, '2 burning stacks must deal 14 at start of turn');
      // stack cap via applyStatus (reapply path)
      const caster = mkUnit(P1, 1, 1);
      const t = mkUnit(P2, 2, 1);
      const ignite = mkAbility({ isUnblockable: true, effects: [{ type: 'apply_status', statusSlug: 'burning', durationTurns: 2, stacks: 2 }] });
      cast(ignite, caster, t); cast(ignite, caster, t);
      assert(t.statusEffects.find((se) => se.slug === 'burning')!.stacks === 3, 'burning stacks must cap at 3');
      // lethal tick
      const dying = mkUnit(P1, 1, 1, { currentHealth: 7, statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
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
  {
    rule: 'STA-7', name: 'only burning uses its stack count; weakened/frozen/rooted stacks are inert',
    run: () => {
      // Burning DOES scale with stacks: two stacks tick for 14, not 7.
      const burner = mkUnit(P2, 5, 5, { statusEffects: [{ slug: 'burning', turnsRemaining: 2, stacks: 2, sourceUnitInstanceId: 'x' }] });
      const before = burner.currentHealth;
      applyStartOfTurnStatusDamage(burner, []);
      assert(before - burner.currentHealth === 14, 'two burning stacks must tick for 14');

      // Weakened does NOT: two stacks still reduce outgoing damage by 4, not 8.
      const weak = mkUnit(P1, 1, 1, { statusEffects: [{ slug: 'weakened', turnsRemaining: 2, stacks: 2, sourceUnitInstanceId: 'x' }] });
      const t = mkUnit(P2, 2, 1);
      cast(mkAbility({ isUnblockable: true }), weak, t); // 10 base
      assert(t.currentHealth === 94, 'two weakened stacks must still reduce by only 4 (10 -> 6)');
    },
  },

  // ── PAS ────────────────────────────────────────────────────────────────────
  {
    rule: 'PAS-1', name: 'Swift adds 1 movement and is only offered to melee-basic classes',
    run: () => {
      const base = buildUnitInstance(defOf('rogue'), P1, { x: 1, y: 1 });
      const swift = buildUnitInstance(defOf('rogue'), P1, { x: 1, y: 1 }, { specialSlug: 'assassinate', passiveSlug: 'swift' });
      assert(swift.movementRange === base.movementRange + 1, 'swift must add exactly 1 movement');
      // Roster guard: Swift on ranged classes turns the endgame drain into a
      // guaranteed kiting win — it must only appear on melee-basic classes.
      for (const slug of ['ranger', 'wizard', 'sorcerer', 'warlock']) {
        const def = DEFAULT_UNITS[slug];
        assert(!def.passiveOptions.some((p) => p.slug === 'swift'), `${slug} (ranged basic) must not offer Swift`);
      }
    },
  },
  {
    rule: 'PAS-3', name: 'Warded starts the match with a shield that negates the first hit, at a 2 HP cost',
    run: () => {
      const base = buildUnitInstance(defOf('cleric'), P1, { x: 1, y: 2 });
      const warded = buildUnitInstance(defOf('cleric'), P2, { x: 2, y: 1 }, { specialSlug: 'heal', passiveSlug: 'warded' });
      assert(warded.maxHealth === base.maxHealth - 2, 'warded must cost 2 maximum health');
      assert(has(warded, 'shielded'), 'warded unit must begin shielded');
      const caster = mkUnit(P1, 1, 1);
      cast(mkAbility({ isUnblockable: true }), caster, warded);
      assert(warded.currentHealth === warded.maxHealth && !has(warded, 'shielded'), 'the starting shield must negate the first hit');
    },
  },
  {
    rule: 'PAS-4', name: 'Thorns deals 3 to adjacent attackers whose hit lands; never to ranged, allies, or missed hits',
    run: () => {
      // mkUnit defaults to definitionSlug 'fighter', and Fighter's Thorns is 5
      // (THORNS_DAMAGE_BY_CLASS) — so spell the class out in both directions.
      const mkThorns = (x: number, y: number, slug = 'barbarian') =>
        mkUnit(P2, x, y, { passives: ['thorns'], definitionSlug: slug });
      const hit = mkAbility({ isUnblockable: true }); // 10 damage
      // adjacent attacker takes the base 3 back off a non-Fighter
      let attacker = mkUnit(P1, 3, 2);
      let thorny = mkThorns(3, 3);
      const ev = cast(hit, attacker, thorny, [attacker, thorny]);
      assert(attacker.currentHealth === attacker.maxHealth - 3, 'adjacent attacker must take 3 thorns damage');
      // ...and 5 off a Fighter (per-class override, shipped 2026-08-22)
      const fAtk = mkUnit(P1, 3, 2);
      const fThorny = mkThorns(3, 3, 'fighter');
      cast(hit, fAtk, fThorny, [fAtk, fThorny]);
      assert(fAtk.currentHealth === fAtk.maxHealth - 5, "Fighter's thorns must deal 5");
      assert(ev.some((e) => e.message === 'Thorns'), 'thorns retaliation must be a visible event');
      // ranged (non-adjacent) attacker is safe
      attacker = mkUnit(P1, 3, 0);
      thorny = mkThorns(3, 3);
      cast(hit, attacker, thorny, [attacker, thorny]);
      assert(attacker.currentHealth === attacker.maxHealth, 'ranged attacker must not take thorns damage');
      // diagonal attacker is safe (adjacent means the 4 cardinal tiles)
      attacker = mkUnit(P1, 2, 2);
      thorny = mkThorns(3, 3);
      cast(hit, attacker, thorny, [attacker, thorny]);
      assert(attacker.currentHealth === attacker.maxHealth, 'diagonal attacker must not take thorns damage');
      // ring blast from a diagonal: HITS the thorny unit but never triggers
      // thorns (owner ruling 2026-08-22 — Thorns is reach, reach is adjacent).
      // Possible since Whirlwind/Ground Slam became rings.
      const ringer = mkUnit(P1, 2, 2);
      thorny = mkThorns(3, 3);
      const ringAb = mkAbility({ slug: 'test_ring', targetingType: 'aoe', range: 0, areaRadius: 1, areaShape: 'ring', isUnblockable: true });
      const rev = cast(ringAb, ringer, ringer, [ringer, thorny]);
      assert(rev.some((e) => e.targetUnitInstanceId === thorny.instanceId), 'ring from diagonal must hit the thorny unit');
      assert(ringer.currentHealth === ringer.maxHealth, 'a ring hit from a diagonal tile must NOT trigger thorns');
      // a dodged hit deals no thorns (shielded absorb: no damage landed either)
      attacker = mkUnit(P1, 3, 2);
      thorny = mkThorns(3, 3);
      thorny.statusEffects.push({ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: thorny.instanceId });
      cast(hit, attacker, thorny, [attacker, thorny]);
      assert(attacker.currentHealth === attacker.maxHealth, 'an absorbed hit must not trigger thorns');
      // an attacker killed by its own thorns retaliation mid-turn must not
      // invalidate the rest of its queued turn (attack → move → end)
      const frail = mkUnit(P1, 3, 2, { currentHealth: 2 });
      const spiky = mkThorns(3, 3);
      const st = mkInitiativeState([frail, spiky], [frail.instanceId, spiky.instanceId], 0);
      const r = processTurn(st, [
        { type: 'USE_ABILITY', unitInstanceId: frail.instanceId, abilitySlug: 'test_hit', target: { x: 3, y: 3 } },
        { type: 'MOVE', unitInstanceId: frail.instanceId, destination: { x: 3, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, new Map([['test_hit', hit]]));
      const frailAfter = r.updatedState.units.find((u) => u.instanceId === frail.instanceId)!;
      assert(!frailAfter.isAlive, 'the 2 HP attacker must die to thorns retaliation');
      assert(frailAfter.position.x === 3 && frailAfter.position.y === 2, 'the dead unit must not execute its queued move');
    },
  },
  {
    rule: 'PAS-5', name: 'Undying survives the first lethal hit at 1 HP, once, from any damage source',
    run: () => {
      // survives a lethal ability hit at exactly 1 HP, flag consumed
      let u = mkUnit(P2, 3, 3, { currentHealth: 5, passives: ['undying'] });
      const caster = mkUnit(P1, 3, 2);
      const ev = cast(mkAbility({ isUnblockable: true }), caster, u, [caster, u]);
      assert(u.isAlive && u.currentHealth === 1, 'undying unit must survive the lethal hit at 1 HP');
      assert(!u.passives.includes('undying'), 'undying must be consumed');
      assert(ev.some((e) => e.type === 'UNDYING_TRIGGERED'), 'surviving must emit UNDYING_TRIGGERED');
      // second lethal hit kills
      cast(mkAbility({ isUnblockable: true }), caster, u, [caster, u]);
      assert(!u.isAlive, 'a second lethal hit must kill — undying is once per match');
      // works against executes
      u = mkUnit(P2, 3, 3, { currentHealth: 5, passives: ['undying'] });
      cast(mkAbility({ isUnblockable: true, effects: [{ type: 'damage', formula: 'flat', value: 9999, healthThreshold: 18 }] }), caster, u, [caster, u]);
      assert(u.isAlive && u.currentHealth === 1, 'undying must survive an execute');
      // works against the burning tick
      u = mkUnit(P2, 3, 3, { currentHealth: 3, passives: ['undying'], statusEffects: [{ slug: 'burning', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' }] });
      const tickEv: GameEvent[] = [];
      applyStartOfTurnStatusDamage(u, tickEv);
      assert(u.isAlive && u.currentHealth === 1, 'undying must survive a lethal burning tick');
    },
  },
  {
    rule: 'PAS-7', name: 'Vengeful deals +3 while at or below half health',
    run: () => {
      const hit = mkAbility({ isUnblockable: true }); // 10 damage
      // above half: no bonus
      let v = mkUnit(P1, 3, 2, { passives: ['vengeful'] });
      let t = mkUnit(P2, 3, 3);
      cast(hit, v, t, [v, t]);
      assert(t.currentHealth === t.maxHealth - 10, 'no bonus above half health');
      // at half: +3
      v = mkUnit(P1, 3, 2, { passives: ['vengeful'] });
      v.currentHealth = Math.floor(v.maxHealth / 2);
      t = mkUnit(P2, 3, 3);
      cast(hit, v, t, [v, t]);
      assert(t.currentHealth === t.maxHealth - 13, 'vengeful must deal +3 at or below half health');
      // Barbarian's Vengeful is +4 (per-class override)
      const bv = mkUnit(P1, 3, 2, { definitionSlug: 'barbarian', passives: ['vengeful'] });
      bv.currentHealth = Math.floor(bv.maxHealth / 2);
      const bt = mkUnit(P2, 3, 3);
      cast(hit, bv, bt, [bv, bt]);
      assert(bt.currentHealth === bt.maxHealth - 14, 'barbarian vengeful must deal +4 at or below half health');
    },
  },
  {
    rule: 'PAS-8', name: 'Stalwart resists push/pull + rooted/weakened/exposed with feedback; frozen still applies; carries a per-class HP rider',
    run: () => {
      const caster = mkUnit(P1, 3, 2);
      const stal = mkUnit(P2, 3, 3, { passives: ['stalwart'] });
      for (const slug of ['rooted', 'weakened', 'exposed']) {
        const ev = cast(mkAbility({ slug: `t_${slug}`, isUnblockable: true, effects: [{ type: 'apply_status', statusSlug: slug, stacks: 1, durationTurns: 2 }] }), caster, stal, [caster, stal]);
        assert(!has(stal, slug), `stalwart must resist ${slug}`);
        assert(ev.some((e) => e.type === 'STATUS_RESISTED'), `resisting ${slug} must emit STATUS_RESISTED feedback`);
      }
      cast(mkAbility({ slug: 't_frz', isUnblockable: true, effects: [{ type: 'apply_status', statusSlug: 'frozen', stacks: 1, durationTurns: 1 }] }), caster, stal, [caster, stal]);
      assert(has(stal, 'frozen'), 'frozen must still apply through stalwart');
      // Merged Stalwart also blocks push/pull (absorbed the old Anchor).
      const pushEv = cast(mkAbility({ slug: 't_push', isUnblockable: true, effects: [{ type: 'push', direction: 'away_from_caster', distance: 2 }] }), caster, stal, [caster, stal]);
      assert(stal.position.x === 3 && stal.position.y === 3, 'stalwart unit must not be pushed');
      assert(pushEv.some((e) => e.type === 'PUSH_RESISTED'), 'a negated push must emit PUSH_RESISTED feedback');
      const pullEv = cast(mkAbility({ slug: 't_pull', isUnblockable: true, effects: [{ type: 'pull', direction: 'toward_caster', distance: 2 }] }), caster, stal, [caster, stal]);
      assert(stal.position.x === 3 && stal.position.y === 3, 'stalwart unit must not be pulled');
      assert(pullEv.some((e) => e.type === 'PUSH_RESISTED'), 'a negated pull must emit PUSH_RESISTED feedback');
      // Per-class HP rider: Wizard's Stalwart is +4 (varies by class).
      const wBase = buildUnitInstance(defOf('wizard'), P1, { x: 1, y: 1 });
      const wStal = buildUnitInstance(defOf('wizard'), P2, { x: 5, y: 5 }, { specialSlug: 'blizzard', passiveSlug: 'stalwart' });
      assert(wStal.maxHealth === wBase.maxHealth + 4, `wizard stalwart must carry +4 max health (got ${wStal.maxHealth - wBase.maxHealth})`);
    },
  },
  {
    rule: 'PAS-6', name: 'Opportunist deals +4 against targets with any status effect (Ranger +5)',
    run: () => {
      const opp = mkUnit(P1, 3, 2, { passives: ['opportunist'] });
      // clean target: base damage only
      let t = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), opp, t, [opp, t]);
      assert(t.currentHealth === t.maxHealth - 10, 'no bonus against a clean target');
      // statused target: +4
      t = mkUnit(P2, 3, 3, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      cast(mkAbility({ isUnblockable: true }), opp, t, [opp, t]);
      assert(t.currentHealth === t.maxHealth - 14, 'opportunist must deal +4 against a statused target');
      // Ranger's Opportunist is +5 (per-class override)
      const rOpp = mkUnit(P1, 3, 2, { definitionSlug: 'ranger', passives: ['opportunist'] });
      const rt = mkUnit(P2, 3, 3, { statusEffects: [{ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' }] });
      cast(mkAbility({ isUnblockable: true }), rOpp, rt, [rOpp, rt]);
      assert(rt.currentHealth === rt.maxHealth - 15, 'ranger opportunist must deal +5 against a statused target');
    },
  },
  {
    rule: 'PAS-9', name: 'Channeler deals +2 with abilities only on a turn the caster did not move',
    run: () => {
      // Roster guard, mirroring PAS-1: the rule text says "Offered to the
      // Wizard", which is a claim about the DATA. Unasserted numbers and
      // roster claims in player-facing text rot silently — see the DGE-1 AC-range
      // check for what that looks like when it happens.
      {
        const offering = Object.entries(DEFAULT_UNITS)
          .filter(([, d]) => d.passiveOptions.some((x) => x.slug === 'channeler'))
          .map(([sl]) => sl);
        assert(offering.length === 1 && offering[0] === 'wizard',
          `PAS-9 says Channeler is offered to the Wizard, but the roster offers it to: ${offering.join(', ') || 'nobody'}`);
      }
      const still = mkUnit(P1, 3, 2, { passives: ['channeler'], hasMovedThisTurn: false });
      let t = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), still, t, [still, t]);
      assert(t.currentHealth === t.maxHealth - 12, 'channeler must add +2 when the caster has not moved');
      const moved = mkUnit(P1, 3, 2, { passives: ['channeler'], hasMovedThisTurn: true });
      t = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), moved, t, [moved, t]);
      assert(t.currentHealth === t.maxHealth - 10, 'channeler must add nothing on a turn the caster moved');
    },
  },
  {
    rule: 'PAS-10', name: 'Siphon heals the caster 1 when its ability damages an enemy, capped at max',
    run: () => {
      // Roster guard, mirroring PAS-1: the rule text says "Offered to the
      // Warlock", which is a claim about the DATA. Unasserted numbers and
      // roster claims in player-facing text rot silently — see the DGE-1 AC-range
      // check for what that looks like when it happens.
      {
        const offering = Object.entries(DEFAULT_UNITS)
          .filter(([, d]) => d.passiveOptions.some((x) => x.slug === 'siphon'))
          .map(([sl]) => sl);
        assert(offering.length === 1 && offering[0] === 'warlock',
          `PAS-10 says Siphon is offered to the Warlock, but the roster offers it to: ${offering.join(', ') || 'nobody'}`);
      }
      const siph = mkUnit(P1, 3, 2, { passives: ['siphon'] });
      siph.currentHealth = 50;
      const t = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), siph, t, [siph, t]);
      assert(siph.currentHealth === 51, 'siphon must heal 1 on damaging an enemy');
      // no overheal at full health
      const full = mkUnit(P1, 3, 2, { passives: ['siphon'] });
      const t2 = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), full, t2, [full, t2]);
      assert(full.currentHealth === full.maxHealth, 'siphon must not heal above maximum');
    },
  },

  // ── GFT (campaign Deep Gifts + Second Charge, E0) ─────────────────────────
  {
    rule: 'GFT-1', name: 'Gift of Fangs adds +1 per damage effect, including each hit of a multi-hit',
    run: () => {
      const g = mkUnit(P1, 3, 2, { passives: ['gift_damage'] });
      let t = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), g, t, [g, t]);
      assert(t.currentHealth === 100 - (10 + GIFT_DAMAGE_BONUS), 'gift must add its bonus to a 10-damage effect');
      // multi-hit: two damage effects -> +1 EACH
      const g2 = mkUnit(P1, 3, 2, { passives: ['gift_damage'] });
      t = mkUnit(P2, 3, 3);
      cast(mkAbility({
        isUnblockable: true, isMultiHit: true,
        effects: [
          { type: 'damage', formula: 'flat', value: 8 },
          { type: 'damage', formula: 'flat', value: 8 },
        ],
      } as Partial<AbilityDefinition>), g2, t, [g2, t]);
      assert(t.currentHealth === 100 - (16 + 2 * GIFT_DAMAGE_BONUS), 'gift must add its bonus to EACH hit of a multi-hit');
      // no flag, no bonus
      const plain = mkUnit(P1, 3, 2);
      t = mkUnit(P2, 3, 3);
      cast(mkAbility({ isUnblockable: true }), plain, t, [plain, t]);
      assert(t.currentHealth === 100 - 10, 'no gift flag must mean no bonus');
    },
  },
  {
    rule: 'GFT-2', name: 'Gift of Stride grants +1 movement at campaign build',
    run: () => {
      const def = DEFAULT_UNITS['fighter'];
      const base = buildCampaignPlayerInstance(def, P1, { x: 1, y: 1 }, 8, { specialSlug: 'shield_bash' });
      const gifted = buildCampaignPlayerInstance(def, P1, { x: 1, y: 1 }, 8, { specialSlug: 'shield_bash', deepGiftSlug: 'movement' });
      assert(gifted.movementRange === base.movementRange + GIFT_MOVEMENT_BONUS, 'Stride must add its bonus over the ungifted build');
    },
  },
  {
    rule: 'GFT-3', name: 'Gift of Stone grants +2 armor class at campaign build',
    run: () => {
      const def = DEFAULT_UNITS['fighter'];
      const base = buildCampaignPlayerInstance(def, P1, { x: 1, y: 1 }, 8, { specialSlug: 'shield_bash' });
      const gifted = buildCampaignPlayerInstance(def, P1, { x: 1, y: 1 }, 8, { specialSlug: 'shield_bash', deepGiftSlug: 'armor' });
      assert(gifted.armorClass === base.armorClass + GIFT_ARMOR_BONUS, 'Stone must add its bonus over the ungifted build');
    },
  },
  {
    rule: 'GFT-4', name: 'Second Charge: special usable twice (back to back allowed), third use rejected',
    run: () => {
      const map = new Map([['test_hit', mkAbility({ cooldownTurns: 99, isUnblockable: true })]]);
      const mk = () => mkUnit(P1, 1, 1, { extraCharges: { test_hit: 1 } });
      // use 1: spends the spare charge, cooldown stays 0
      let u = mk();
      let st = mkLegacyState([u, mkUnit(P2, 2, 1, { currentHealth: 100 })]);
      let r = processTurn(st, [
        { type: 'USE_ABILITY', unitInstanceId: u.instanceId, abilitySlug: 'test_hit', target: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, map);
      let after = r.updatedState.units[0];
      assert((after.cooldowns['test_hit'] ?? 0) === 0, 'first use must NOT start the cooldown while a spare charge exists');
      assert((after.extraCharges?.['test_hit'] ?? 0) === 0, 'first use must consume the spare charge');
      // use 2 (back to back, next turn): allowed, cooldown NOW starts
      after.hasActedThisTurn = false; after.hasMovedThisTurn = false;
      st = mkLegacyState([after, mkUnit(P2, 2, 1, { currentHealth: 100 })]);
      r = processTurn(st, [
        { type: 'USE_ABILITY', unitInstanceId: after.instanceId, abilitySlug: 'test_hit', target: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, map);
      after = r.updatedState.units[0];
      assert(after.cooldowns['test_hit'] === 99, 'second use must start the full cooldown — done for the encounter');
      // use 3: rejected, exactly like arena after its single use
      after.hasActedThisTurn = false; after.hasMovedThisTurn = false;
      assertThrows(() => processTurn(mkLegacyState([after, mkUnit(P2, 2, 1)]), [
        { type: 'USE_ABILITY', unitInstanceId: after.instanceId, abilitySlug: 'test_hit', target: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ], P1, P1, P2, map), 'cooldown', 'third use must be rejected');
      // L10 build wires the charge on the SPECIAL only
      const built = buildCampaignPlayerInstance(DEFAULT_UNITS['fighter'], P1, { x: 1, y: 1 }, 10, { specialSlug: 'shield_bash' });
      assert((built.extraCharges?.['shield_bash'] ?? 0) === 1, 'L10 build must grant one spare charge on the special');
      const l9 = buildCampaignPlayerInstance(DEFAULT_UNITS['fighter'], P1, { x: 1, y: 1 }, 9, { specialSlug: 'shield_bash' });
      assert(l9.extraCharges === undefined, 'below L10 there must be no spare charge');
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
