import {
  MatchState, UnitInstance, GameEvent, BoardPosition,
} from '../types/matchState.js';
import {
  AbilityDefinition, AbilityEffect, DamageEffect, HealEffect,
  ApplyStatusEffect, RemoveStatusEffect, PushEffect, PullEffect, ModifyCooldownEffect,
  LifestealEffect,
} from '../types/index.js';
import {
  getUnitsInRadius, getLineTiles, calculatePushDestination,
  calculatePullDestination, getUnitAtPosition, isInBounds,
} from './boardUtils.js';

export interface ExecutionContext {
  state: MatchState;
  caster: UnitInstance;
  targetPosition: BoardPosition;
  ability: AbilityDefinition;
  events: GameEvent[];
  pushDestination?: BoardPosition;
}

/** Flat damage reduction applied to a 'weakened' caster's outgoing damage/lifesteal effects. */
const WEAKENED_DAMAGE_REDUCTION = 4;
/** Flat damage-over-time dealt per stack of 'burning', once per stack per tick. */
const BURNING_DAMAGE_PER_STACK = 5;

function hasStatusEffect(unit: UnitInstance, slug: string): boolean {
  return unit.statusEffects.some((se) => se.slug === slug);
}

export function executeAbility(ctx: ExecutionContext): void {
  const targets = resolveTargets(ctx);
  const dealsDamage = ctx.ability.effects.some((e) => e.type === 'damage' || e.type === 'lifesteal');
  const needsHitRoll = !ctx.ability.isUnblockable
    && ctx.ability.targetingType !== 'self'
    && dealsDamage;

  for (const target of targets) {
    // Shielded fully negates the next hit (including unblockable/execute
    // effects) and is consumed entirely — checked before the hit roll so an
    // unblockable ability never even reaches the fortune meter for this target.
    if (dealsDamage && hasStatusEffect(target, 'shielded')) {
      consumeShield(ctx, target);
      continue;
    }
    if (needsHitRoll) {
      // Exposed bypasses the fortune meter entirely — the attack always
      // connects and the meter is left untouched (mirrors unblockable).
      if (!hasStatusEffect(target, 'exposed')) {
        // Pseudo-random distribution (Bresenham accumulator): each attack adds the
        // unit's miss chance to its fortune meter; when it crosses 1.0, the attack
        // misses and the meter resets by 1. Outcomes converge exactly to the
        // intended dodge rate with no streaks.
        const missChance = Math.max(0, target.armorClass - 6) / 20;
        target.fortuneMeter = (target.fortuneMeter ?? 0) + missChance;
        if (target.fortuneMeter >= 1) {
          target.fortuneMeter -= 1;
          ctx.events.push({ type: 'ATTACK_MISSED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Attack missed' });
          continue;
        }
      }
    }
    for (const effect of ctx.ability.effects) {
      applyEffect(ctx, target, effect);
    }
  }
}

function consumeShield(ctx: ExecutionContext, target: UnitInstance): void {
  target.statusEffects = target.statusEffects.filter((se) => se.slug !== 'shielded');
  ctx.events.push({ type: 'SHIELD_ABSORBED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Shield absorbed the hit' });
}

function resolveTargets(ctx: ExecutionContext): UnitInstance[] {
  const { state, caster, targetPosition, ability } = ctx;
  const aliveUnits = state.units.filter((u) => u.isAlive);
  switch (ability.targetingType) {
    case 'single': {
      const target = getUnitAtPosition(aliveUnits, targetPosition);
      return target ? [target] : [];
    }
    case 'self': return [caster];
    case 'aoe': {
      const center = ability.range === 0 ? caster.position : targetPosition;
      let hits = getUnitsInRadius(center, ability.areaRadius, aliveUnits);
      if (ability.range === 0) hits = hits.filter((u) => u.instanceId !== caster.instanceId);
      if (ability.excludeAllies) hits = hits.filter((u) => u.ownerPlayerId !== caster.ownerPlayerId);
      return hits;
    }
    case 'line': {
      const tiles = getLineTiles(caster.position, targetPosition, ability.range);
      return aliveUnits.filter((u) => tiles.some((t) => t.x === u.position.x && t.y === u.position.y));
    }
    case 'cone': return getUnitsInRadius(targetPosition, 1, aliveUnits);
    default: return [];
  }
}

function applyEffect(ctx: ExecutionContext, target: UnitInstance, effect: AbilityEffect): void {
  switch (effect.type) {
    case 'damage': applyDamage(ctx, target, effect); break;
    case 'heal': applyHeal(ctx, target, effect); break;
    case 'apply_status': applyStatus(ctx, target, effect); break;
    case 'remove_status': removeStatus(ctx, target, effect); break;
    case 'push': applyPush(ctx, target, effect); break;
    case 'pull': applyPull(ctx, target, effect); break;
    case 'modify_cooldown': applyModifyCooldown(ctx, target, effect); break;
    case 'lifesteal': applyLifesteal(ctx, target, effect); break;
  }
}

/** Reduces outgoing damage from a 'weakened' caster. Floors at 0. */
function weakenedAdjustedDamage(ctx: ExecutionContext, rawValue: number): number {
  return hasStatusEffect(ctx.caster, 'weakened') ? Math.max(0, rawValue - WEAKENED_DAMAGE_REDUCTION) : rawValue;
}

function applyDamage(ctx: ExecutionContext, target: UnitInstance, effect: DamageEffect): void {
  if (effect.healthThreshold !== undefined && target.currentHealth > effect.healthThreshold) {
    ctx.events.push({ type: 'ATTACK_MISSED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Kill Shot failed — target HP too high' });
    return;
  }
  const damage = weakenedAdjustedDamage(ctx, effect.value);
  target.currentHealth = Math.max(0, target.currentHealth - damage);
  ctx.events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: damage, message: `${damage} damage` });
  if (target.currentHealth <= 0) {
    target.isAlive = false;
    ctx.events.push({ type: 'UNIT_DIED', targetUnitInstanceId: target.instanceId });
  }
}

function applyLifesteal(ctx: ExecutionContext, target: UnitInstance, effect: LifestealEffect): void {
  const damage = weakenedAdjustedDamage(ctx, effect.value);
  target.currentHealth = Math.max(0, target.currentHealth - damage);
  ctx.events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: damage, message: `${damage} damage` });
  if (target.currentHealth <= 0) {
    target.isAlive = false;
    ctx.events.push({ type: 'UNIT_DIED', targetUnitInstanceId: target.instanceId });
  }
  if (ctx.caster.isAlive) {
    const healAmount = Math.min(effect.healValue, ctx.caster.maxHealth - ctx.caster.currentHealth);
    if (healAmount > 0) {
      ctx.caster.currentHealth += healAmount;
      ctx.events.push({ type: 'HEALING_DONE', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: ctx.caster.instanceId, value: healAmount });
    }
  }
}

function applyHeal(ctx: ExecutionContext, target: UnitInstance, effect: HealEffect): void {
  if (!target.isAlive) return;
  const healAmount = Math.min(effect.value, target.maxHealth - target.currentHealth);
  if (healAmount <= 0) return;
  target.currentHealth += healAmount;
  ctx.events.push({ type: 'HEALING_DONE', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: healAmount });
}

function applyStatus(ctx: ExecutionContext, target: UnitInstance, effect: ApplyStatusEffect): void {
  if (!target.isAlive) return;
  const existing = target.statusEffects.find((se) => se.slug === effect.statusSlug);
  if (existing) {
    existing.turnsRemaining = Math.max(existing.turnsRemaining, effect.durationTurns);
    existing.stacks = Math.min(existing.stacks + effect.stacks, 3);
  } else {
    target.statusEffects.push({
      slug: effect.statusSlug, turnsRemaining: effect.durationTurns,
      stacks: effect.stacks, sourceUnitInstanceId: ctx.caster.instanceId,
    });
  }
  ctx.events.push({ type: 'STATUS_APPLIED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, statusSlug: effect.statusSlug });
}

function removeStatus(ctx: ExecutionContext, target: UnitInstance, effect: RemoveStatusEffect): void {
  const before = target.statusEffects.length;
  target.statusEffects = target.statusEffects.filter((se) => se.slug !== effect.statusSlug);
  if (target.statusEffects.length < before) {
    ctx.events.push({ type: 'STATUS_REMOVED', targetUnitInstanceId: target.instanceId, statusSlug: effect.statusSlug });
  }
}

function applyPush(ctx: ExecutionContext, target: UnitInstance, effect: PushEffect): void {
  if (!target.isAlive) return;
  if (hasPassive(target, 'immovable')) return;
  const idealDestination = ctx.pushDestination
    ?? calculatePushDestination(target.position, ctx.caster.position, effect.distance);
  const finalPos = findLastFreePosition(target.position, idealDestination, ctx.state.units, target.instanceId);
  // No actual displacement (blocked by a wall or another unit): don't emit a
  // UNIT_PUSHED event, so the log doesn't claim a push that never happened.
  if (finalPos.x === target.position.x && finalPos.y === target.position.y) return;
  target.position = finalPos;
  ctx.events.push({ type: 'UNIT_PUSHED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, position: finalPos });
}

function applyPull(ctx: ExecutionContext, target: UnitInstance, effect: PullEffect): void {
  if (!target.isAlive) return;
  if (hasPassive(target, 'immovable')) return;
  const destination = calculatePullDestination(target.position, ctx.caster.position, effect.distance);
  const finalPos = findLastFreePosition(target.position, destination, ctx.state.units, target.instanceId);
  if (finalPos.x === target.position.x && finalPos.y === target.position.y) return;
  target.position = finalPos;
  ctx.events.push({ type: 'UNIT_PULLED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, position: finalPos });
}

function applyModifyCooldown(_ctx: ExecutionContext, target: UnitInstance, effect: ModifyCooldownEffect): void {
  const current = target.cooldowns[effect.abilitySlug] ?? 0;
  target.cooldowns[effect.abilitySlug] = Math.max(0, current + effect.delta);
}

function findLastFreePosition(start: BoardPosition, end: BoardPosition, units: UnitInstance[], movingUnitId: string): BoardPosition {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  if (steps === 0) return start;
  const normX = dx === 0 ? 0 : dx / Math.abs(dx);
  const normY = dy === 0 ? 0 : dy / Math.abs(dy);
  let lastFree = start;
  for (let i = 1; i <= steps; i++) {
    const pos = { x: start.x + Math.round(normX * i), y: start.y + Math.round(normY * i) };
    if (!isInBounds(pos)) break;
    const occupant = units.find((u) => u.isAlive && u.instanceId !== movingUnitId && u.position.x === pos.x && u.position.y === pos.y);
    if (occupant) break;
    lastFree = pos;
  }
  return lastFree;
}

function hasPassive(unit: UnitInstance, passiveSlug: string): boolean {
  return (unit.passives ?? []).includes(passiveSlug);
}

/**
 * Burning damage-over-time, applied at the START of the afflicted unit's own
 * turn (or when its slot is skipped, e.g. while frozen). Does NOT decrement
 * durations — that happens at end of turn (see decrementStatusDurations), so a
 * debuff that gates the unit's OWN actions (rooted, weakened) is still in force
 * while the unit acts. Applying the burn tick at start means a unit can die to
 * its burn before acting, which the caller's win check relies on.
 */
export function applyStartOfTurnStatusDamage(unit: UnitInstance, events: GameEvent[]): void {
  if (!unit.isAlive) return;
  const burning = unit.statusEffects.find((se) => se.slug === 'burning');
  if (burning) {
    const burnDamage = BURNING_DAMAGE_PER_STACK * burning.stacks;
    unit.currentHealth = Math.max(0, unit.currentHealth - burnDamage);
    events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: burning.sourceUnitInstanceId, targetUnitInstanceId: unit.instanceId, value: burnDamage, message: `${burnDamage} burning damage` });
    if (unit.currentHealth <= 0 && unit.isAlive) {
      unit.isAlive = false;
      events.push({ type: 'UNIT_DIED', targetUnitInstanceId: unit.instanceId });
    }
  }
}

/**
 * Decrement status durations and expire finished effects. Called at the END of
 * the unit's own turn, so a status applied with durationTurns:N is in force for
 * exactly N of that unit's turns before it drops off.
 */
export function decrementStatusDurations(unit: UnitInstance, events: GameEvent[]): void {
  if (!unit.isAlive) return;
  const expiredEffects: string[] = [];
  for (const effect of unit.statusEffects) {
    if (effect.turnsRemaining > 0) {
      effect.turnsRemaining--;
      if (effect.turnsRemaining === 0) expiredEffects.push(effect.slug);
    }
  }
  unit.statusEffects = unit.statusEffects.filter((se) => !expiredEffects.includes(se.slug));
  for (const slug of expiredEffects) {
    events.push({ type: 'STATUS_REMOVED', targetUnitInstanceId: unit.instanceId, statusSlug: slug });
  }
}

/** True if this unit's own start-of-turn burning tick will kill it. */
export function willDieToStartTick(unit: UnitInstance): boolean {
  const burning = unit.statusEffects.find((se) => se.slug === 'burning');
  return !!burning && unit.currentHealth <= BURNING_DAMAGE_PER_STACK * burning.stacks;
}

/**
 * Full tick (start-of-turn damage + duration decrement) for a unit whose turn
 * is auto-consumed without acting — i.e. a frozen unit skipped in the
 * initiative order. A skipped turn still burns and still counts against every
 * status's duration.
 */
export function tickUnitStatusEffects(unit: UnitInstance, events: GameEvent[]): void {
  applyStartOfTurnStatusDamage(unit, events);
  decrementStatusDurations(unit, events);
}

/** Tick ability cooldowns for a single unit (called at the end of that unit's initiative turn). */
export function tickUnitCooldowns(unit: UnitInstance): void {
  for (const slug of Object.keys(unit.cooldowns)) {
    if (unit.cooldowns[slug] > 0) unit.cooldowns[slug]--;
  }
}

/** Reset move/act flags for a single unit (called at the start of that unit's initiative turn). */
export function resetUnitTurnFlags(unit: UnitInstance): void {
  unit.hasMovedThisTurn = false;
  unit.hasActedThisTurn = false;
}

// Legacy per-player helpers (kept for any non-initiative code paths)
export function tickStatusEffects(state: MatchState, playerId: string, events: GameEvent[]): void {
  for (const unit of state.units.filter((u) => u.isAlive && u.ownerPlayerId === playerId)) {
    tickUnitStatusEffects(unit, events);
  }
}
export function tickCooldowns(state: MatchState, playerId: string): void {
  for (const unit of state.units.filter((u) => u.isAlive && u.ownerPlayerId === playerId)) {
    tickUnitCooldowns(unit);
  }
}
export function resetTurnFlags(state: MatchState, playerId: string): void {
  for (const unit of state.units.filter((u) => u.ownerPlayerId === playerId)) {
    resetUnitTurnFlags(unit);
  }
}
