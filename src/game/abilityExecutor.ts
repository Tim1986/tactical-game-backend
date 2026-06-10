import {
  MatchState, UnitInstance, GameEvent, BoardPosition, ActiveStatusEffect,
} from '../types/matchState.js';
import {
  AbilityDefinition, AbilityEffect, DamageEffect, HealEffect,
  ApplyStatusEffect, RemoveStatusEffect, PushEffect, PullEffect, ModifyCooldownEffect,
} from '../types/index.js';
import {
  getUnitsInRadius, getLineTiles, calculatePushDestination,
  calculatePullDestination, getUnitAtPosition,
} from './boardUtils.js';

export interface ExecutionContext {
  state: MatchState;
  caster: UnitInstance;
  targetPosition: BoardPosition;
  ability: AbilityDefinition;
  events: GameEvent[];
}

export function executeAbility(ctx: ExecutionContext): void {
  const targets = resolveTargets(ctx);
  for (const target of targets) {
    for (const effect of ctx.ability.effects) {
      applyEffect(ctx, target, effect);
    }
  }
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
      return getUnitsInRadius(center, ability.areaRadius, aliveUnits);
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
  }
}

function applyDamage(ctx: ExecutionContext, target: UnitInstance, effect: DamageEffect): void {
  let damage = effect.value;
  if (effect.damageType !== 'true') {
    const shield = target.statusEffects.find((se) => se.slug === 'shielded');
    if (shield && shield.shieldValue && shield.shieldValue > 0) {
      const absorbed = Math.min(shield.shieldValue, damage);
      shield.shieldValue -= absorbed;
      damage -= absorbed;
      ctx.events.push({ type: 'SHIELD_ABSORBED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: absorbed });
      if (shield.shieldValue <= 0) {
        target.statusEffects = target.statusEffects.filter((se) => se.slug !== 'shielded');
        ctx.events.push({ type: 'STATUS_REMOVED', targetUnitInstanceId: target.instanceId, statusSlug: 'shielded' });
      }
    }
  }
  const casterWeakened = ctx.caster.statusEffects.find((se) => se.slug === 'weakened');
  if (casterWeakened) damage = Math.floor(damage * 0.75);
  if (damage <= 0) return;
  target.currentHealth = Math.max(0, target.currentHealth - damage);
  ctx.events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: damage, message: damage + ' ' + effect.damageType + ' damage' });
  if (target.currentHealth <= 0) {
    target.isAlive = false;
    ctx.events.push({ type: 'UNIT_DIED', targetUnitInstanceId: target.instanceId });
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
    const newEffect: ActiveStatusEffect = {
      slug: effect.statusSlug, turnsRemaining: effect.durationTurns,
      stacks: effect.stacks, sourceUnitInstanceId: ctx.caster.instanceId,
      ...(effect.statusSlug === 'shielded' && { shieldValue: 30 }),
    };
    target.statusEffects.push(newEffect);
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
  const destination = calculatePushDestination(target.position, ctx.caster.position, effect.distance);
  const finalPos = findLastFreePosition(target.position, destination, ctx.state.units, target.instanceId);
  target.position = finalPos;
  ctx.events.push({ type: 'UNIT_PUSHED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, position: finalPos });
}

function applyPull(ctx: ExecutionContext, target: UnitInstance, effect: PullEffect): void {
  if (!target.isAlive) return;
  if (hasPassive(target, 'immovable')) return;
  const destination = calculatePullDestination(target.position, ctx.caster.position, effect.distance);
  const finalPos = findLastFreePosition(target.position, destination, ctx.state.units, target.instanceId);
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
    const occupant = units.find((u) => u.isAlive && u.instanceId !== movingUnitId && u.position.x === pos.x && u.position.y === pos.y);
    if (occupant) break;
    lastFree = pos;
  }
  return lastFree;
}

function hasPassive(unit: UnitInstance, passiveSlug: string): boolean {
  const passives = (unit as UnitInstance & { passives?: string[] }).passives ?? [];
  return passives.includes(passiveSlug);
}

export function tickStatusEffects(state: MatchState, playerId: string, events: GameEvent[]): void {
  const playerUnits = state.units.filter((u) => u.isAlive && u.ownerPlayerId === playerId);
  for (const unit of playerUnits) {
    const expiredEffects: string[] = [];
    for (const effect of unit.statusEffects) {
      if (effect.slug === 'burning') {
        const damage = 8 * effect.stacks;
        unit.currentHealth = Math.max(0, unit.currentHealth - damage);
        events.push({ type: 'STATUS_TICK', targetUnitInstanceId: unit.instanceId, statusSlug: 'burning', value: damage });
        if (unit.currentHealth <= 0) { unit.isAlive = false; events.push({ type: 'UNIT_DIED', targetUnitInstanceId: unit.instanceId }); }
      }
      if (effect.slug === 'poisoned') {
        const damage = 5 * effect.stacks;
        unit.currentHealth = Math.max(0, unit.currentHealth - damage);
        events.push({ type: 'STATUS_TICK', targetUnitInstanceId: unit.instanceId, statusSlug: 'poisoned', value: damage });
        if (unit.currentHealth <= 0) { unit.isAlive = false; events.push({ type: 'UNIT_DIED', targetUnitInstanceId: unit.instanceId }); }
      }
      if (effect.slug === 'regenerating') {
        const heal = 10;
        unit.currentHealth = Math.min(unit.maxHealth, unit.currentHealth + heal);
        events.push({ type: 'STATUS_TICK', targetUnitInstanceId: unit.instanceId, statusSlug: 'regenerating', value: heal });
      }
      if (effect.turnsRemaining > 0) {
        effect.turnsRemaining--;
        if (effect.turnsRemaining === 0) expiredEffects.push(effect.slug);
      }
    }
    unit.statusEffects = unit.statusEffects.filter((se) => !expiredEffects.includes(se.slug));
  }
}

export function tickCooldowns(state: MatchState, playerId: string): void {
  const playerUnits = state.units.filter((u) => u.isAlive && u.ownerPlayerId === playerId);
  for (const unit of playerUnits) {
    for (const slug of Object.keys(unit.cooldowns)) {
      if (unit.cooldowns[slug] > 0) unit.cooldowns[slug]--;
    }
  }
}

export function resetTurnFlags(state: MatchState, playerId: string): void {
  const playerUnits = state.units.filter((u) => u.ownerPlayerId === playerId);
  for (const unit of playerUnits) {
    unit.hasMovedThisTurn = false;
    unit.hasActedThisTurn = false;
  }
}
