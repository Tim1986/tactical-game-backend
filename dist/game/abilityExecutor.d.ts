import { MatchState, UnitInstance, GameEvent, BoardPosition } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
export interface ExecutionContext {
    state: MatchState;
    caster: UnitInstance;
    targetPosition: BoardPosition;
    ability: AbilityDefinition;
    events: GameEvent[];
    pushDestination?: BoardPosition;
}
/** Flat damage reduction applied to a 'weakened' caster's outgoing damage/lifesteal effects. */
/** Flat reduction to EVERY outgoing damage/lifesteal effect from a 'weakened'
 * caster. Exported so the AI brain scores weaken with the SAME number and the
 * same per-effect granularity (no drift). */
export declare const WEAKENED_DAMAGE_REDUCTION = 4;
/** Per-attack dodge chance: 5% per AC point above 6, capped at 1.0. */
export declare function missChanceOf(ac: number): number;
/** Flat damage-over-time dealt per stack of 'burning', once per stack per tick.
 * Exported so the AI brain scores burn with the SAME number (no drift). */
export declare const BURNING_DAMAGE_PER_STACK = 7;
/**
 * CAMPAIGN-ONLY (ENCOUNTER_SPEC A2): apply hazard effects to a unit that just
 * ENDED a move, displacement, or leap on a hazard tile. Environment damage —
 * no shield interaction, no Stalwart resist (Burning is never resisted), no
 * caster attribution beyond the log line. No terrain = no-op (arena).
 */
export declare function applyEntryHazard(state: MatchState, unit: UnitInstance, events: GameEvent[]): void;
export declare function executeAbility(ctx: ExecutionContext): void;
/**
 * Per-class Opportunist override, mirroring the per-class Undying HP tax
 * (undyingWith). A class slug present here uses its value instead of the base
 * OPPORTUNIST_BONUS. SHIPPED: Ranger +5 (v1.0.81); every other class gets the
 * base +4. The balance harness patches this at runtime (via a preset's
 * `oppBonus`) — a bare grid run RESETS it to empty, so re-seed shipped values
 * into any future baseline preset for comparability.
 */
export declare const OPPORTUNIST_BONUS_BY_CLASS: Record<string, number>;
/** Per-class Vengeful override, same pattern as OPPORTUNIST_BONUS_BY_CLASS.
 *  SHIPPED: Barbarian +4 (v1.0.81); every other class gets the base +3. The
 *  harness patches this via a preset's `vengBonus` (bare runs reset to empty). */
export declare const VENGEFUL_BONUS_BY_CLASS: Record<string, number>;
/** Deep Gift (campaign E0, L7/L8): flat bonus per damage effect while the
 *  caster carries the 'gift_damage' flag. Multi-hit abilities are paid per
 *  effect (Twin Strike 8+8 -> 9+9) — deliberate, mirrors opportunist. PROVISIONAL
 *  value; E0.4's gift harness may revise it. */
export declare const GIFT_DAMAGE_BONUS = 2;
/**
 * SINGLE damage sink: subtracts health and resolves death — including the
 * Undying passive (first lethal hit each match leaves the unit at 1 HP; the
 * flag is consumed). EVERY source of damage (abilities, thorns, burning,
 * endgame drain) must route through here or Undying silently won't apply.
 * Death/undying events are pushed AFTER the caller's own damage event via
 * emitAfter, preserving the DAMAGE_DEALT → UNIT_DIED order the client
 * replay depends on.
 */
export declare function takeDamage(unit: UnitInstance, damage: number, events: GameEvent[], sourceUnitInstanceId?: string, emitAfter?: (actualDamage: number) => void): number;
/**
 * Burning damage-over-time, applied at the START of the afflicted unit's own
 * turn (or when its slot is skipped, e.g. while frozen). Does NOT decrement
 * durations — that happens at end of turn (see decrementStatusDurations), so a
 * debuff that gates the unit's OWN actions (rooted, weakened) is still in force
 * while the unit acts. Applying the burn tick at start means a unit can die to
 * its burn before acting, which the caller's win check relies on.
 */
export declare function applyStartOfTurnStatusDamage(unit: UnitInstance, events: GameEvent[]): void;
/**
 * Decrement status durations and expire finished effects. Called at the END of
 * the unit's own turn, so a status applied with durationTurns:N is in force for
 * exactly N of that unit's turns before it drops off.
 */
export declare function decrementStatusDurations(unit: UnitInstance, events: GameEvent[]): void;
/** True if this unit's own start-of-turn burning tick will kill it. */
export declare function willDieToStartTick(unit: UnitInstance): boolean;
/**
 * Full tick (start-of-turn damage + duration decrement) for a unit whose turn
 * is auto-consumed without acting — i.e. a frozen unit skipped in the
 * initiative order. A skipped turn still burns and still counts against every
 * status's duration.
 */
export declare function tickUnitStatusEffects(unit: UnitInstance, events: GameEvent[]): void;
/** Tick ability cooldowns for a single unit (called at the end of that unit's initiative turn). */
export declare function tickUnitCooldowns(unit: UnitInstance): void;
/** Reset move/act flags for a single unit (called at the start of that unit's initiative turn). */
export declare function resetUnitTurnFlags(unit: UnitInstance): void;
export declare function tickStatusEffects(state: MatchState, playerId: string, events: GameEvent[]): void;
export declare function tickCooldowns(state: MatchState, playerId: string): void;
export declare function resetTurnFlags(state: MatchState, playerId: string): void;
//# sourceMappingURL=abilityExecutor.d.ts.map