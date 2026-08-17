import {
  MatchState, UnitInstance, GameEvent, BoardPosition,
} from '../types/matchState.js';
import {
  AbilityDefinition, AbilityEffect, DamageEffect, HealEffect, GrantMaxHealthEffect,
  ApplyStatusEffect, RemoveStatusEffect, PushEffect, PullEffect, ModifyCooldownEffect,
  LifestealEffect,
} from '../types/index.js';
import {
  getUnitsInRadius, isInAoe, getLineTiles,
  calculatePullOptions, calculatePushOptions, getUnitAtPosition, isInBounds, manhattanDistance,
} from './boardUtils.js';
import { isTerrainBlocked, wallsBlockLine } from '../ai/geometry.js';

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
export const WEAKENED_DAMAGE_REDUCTION = 4;

/**
 * Resolve one blockable dodge roll. Normal matches roll fresh randomness per
 * attack; puzzle matches carry a pre-scripted outcome queue (MatchState.rollScript)
 * so the whole fight is deterministic — the script is disclosed to the player.
 */
function rollMisses(state: MatchState, missChance: number): boolean {
  let missed: boolean;
  if (state.rollScript) {
    const i = state.rollIndex ?? 0;
    state.rollIndex = i + 1;
    missed = state.rollScript[i] === 'miss';
  } else {
    missed = Math.random() < missChance;
  }
  // Record for the offline client's dry-run capture (see MatchState.rollLog).
  if (state.rollLog) state.rollLog.push(missed ? 'miss' : 'hit');
  return missed;
}

/** Per-attack dodge chance: 5% per AC point above 6, capped at 1.0. */
export function missChanceOf(ac: number): number {
  return Math.min(1, Math.max(0, (ac - 6) * 0.05));
}
/** Flat damage-over-time dealt per stack of 'burning', once per stack per tick.
 * Exported so the AI brain scores burn with the SAME number (no drift). */
export const BURNING_DAMAGE_PER_STACK = 7;

function hasStatusEffect(unit: UnitInstance, slug: string): boolean {
  return unit.statusEffects.some((se) => se.slug === slug);
}

/** Burning applied by ENDING a move/displacement on a fire hazard (A2). */
const FIRE_HAZARD_BURN_TURNS = 2;

/**
 * CAMPAIGN-ONLY (ENCOUNTER_SPEC A2): apply hazard effects to a unit that just
 * ENDED a move, displacement, or leap on a hazard tile. Environment damage —
 * no shield interaction, no Stalwart resist (Burning is never resisted), no
 * caster attribution beyond the log line. No terrain = no-op (arena).
 */
export function applyEntryHazard(state: MatchState, unit: UnitInstance, events: GameEvent[]): void {
  if (!unit.isAlive) return;
  const hz = state.terrain?.hazards?.find((h) => h.pos.x === unit.position.x && h.pos.y === unit.position.y);
  if (!hz) return;
  if (hz.type === 'fire') {
    const existing = unit.statusEffects.find((se) => se.slug === 'burning');
    if (existing) {
      existing.turnsRemaining = Math.max(existing.turnsRemaining, FIRE_HAZARD_BURN_TURNS);
      existing.stacks = Math.min(existing.stacks + 1, 3);
    } else {
      unit.statusEffects.push({ slug: 'burning', turnsRemaining: FIRE_HAZARD_BURN_TURNS, stacks: 1, sourceUnitInstanceId: unit.instanceId });
    }
    events.push({ type: 'STATUS_APPLIED', sourceUnitInstanceId: unit.instanceId, targetUnitInstanceId: unit.instanceId, statusSlug: 'burning', message: 'Scorched by the flames' });
  }
}

export function executeAbility(ctx: ExecutionContext): void {
  // The leap lands FIRST, before targets are resolved, so the blast is centred
  // on where the caster ends up rather than where it started. Everything below
  // — targeting, push direction, thorns — then reads the landing tile.
  if (ctx.ability.effects.some((e) => e.type === 'move_self')) applyMoveSelf(ctx);

  const targets = resolveTargets(ctx);
  const dealsDamage = ctx.ability.effects.some((e) => e.type === 'damage' || e.type === 'lifesteal');
  const needsHitRoll = !ctx.ability.isUnblockable
    && ctx.ability.targetingType !== 'self'
    && dealsDamage;

  for (const target of targets) {
    if (ctx.ability.isMultiHit) {
      executeMultiHit(ctx, target, needsHitRoll);
    } else {
      executeSingleHit(ctx, target, dealsDamage, needsHitRoll);
    }
  }

  // Self-status cost (Blizzard's channeling self-freeze): applied to the
  // caster after the ability resolves, unconditionally — no shield, dodge,
  // or Stalwart check; it's a cost, not an attack.
  // durationTurns <= 0 means "no self-cost" — do NOT apply the status.
  // A 0-duration status would be PERMANENT: decrementStatusDurations only
  // ticks effects with turnsRemaining > 0, while move/charge validation tests
  // for the mere PRESENCE of 'rooted'. A channel priced at 0 turns would
  // immobilise its own caster for the rest of the match.
  if (ctx.ability.selfStatus && ctx.ability.selfStatus.durationTurns > 0 && ctx.caster.isAlive) {
    const sst = ctx.ability.selfStatus;
    const existing = ctx.caster.statusEffects.find((se) => se.slug === sst.statusSlug);
    if (existing) {
      existing.turnsRemaining = Math.max(existing.turnsRemaining, sst.durationTurns);
    } else {
      ctx.caster.statusEffects.push({
        slug: sst.statusSlug, turnsRemaining: sst.durationTurns,
        stacks: sst.stacks, sourceUnitInstanceId: ctx.caster.instanceId,
      });
    }
    ctx.events.push({ type: 'STATUS_APPLIED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: ctx.caster.instanceId, statusSlug: sst.statusSlug });
  }
}

function executeSingleHit(
  ctx: ExecutionContext,
  target: UnitInstance,
  dealsDamage: boolean,
  needsHitRoll: boolean,
): void {
  if (dealsDamage && hasStatusEffect(target, 'shielded')) {
    consumeShield(ctx, target);
    return;
  }
  // Per-attack dodge roll: exposed units never dodge; unblockable skips roll (needsHitRoll=false).
  if (needsHitRoll && !hasStatusEffect(target, 'exposed')) {
    const dodge = missChanceOf(target.armorClass ?? 6);
    if (dodge > 0 && rollMisses(ctx.state, dodge)) {
      ctx.events.push({ type: 'DODGED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Dodged' });
      return;
    }
  }
  for (const effect of ctx.ability.effects) {
    applyEffect(ctx, target, effect);
  }
}

/** Multi-hit: each damage/lifesteal effect gets its own shield check and dodge roll. */
function executeMultiHit(
  ctx: ExecutionContext,
  target: UnitInstance,
  needsHitRoll: boolean,
): void {
  const dodge = (needsHitRoll && !hasStatusEffect(target, 'exposed')) ? missChanceOf(target.armorClass ?? 6) : 0;
  for (const effect of ctx.ability.effects) {
    if (effect.type !== 'damage' && effect.type !== 'lifesteal') {
      applyEffect(ctx, target, effect);
      continue;
    }
    // Shield absorbs the first damage hit and is consumed; subsequent hits resolve normally.
    if (hasStatusEffect(target, 'shielded')) {
      consumeShield(ctx, target);
      continue;
    }
    if (dodge > 0 && rollMisses(ctx.state, dodge)) {
      ctx.events.push({ type: 'DODGED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Dodged' });
      continue;
    }
    applyEffect(ctx, target, effect);
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
      let hits = aliveUnits.filter((u) => isInAoe(center, u.position, ability.areaRadius, ability.areaShape));
      if (ability.range === 0) hits = hits.filter((u) => u.instanceId !== caster.instanceId);
      if (ability.excludeAllies) hits = hits.filter((u) => u.ownerPlayerId !== caster.ownerPlayerId);
      // CAMPAIGN-ONLY (A2): the effect spreads FROM THE CENTER and never
      // crosses walls — an affected tile needs wall-clear sight from the eye.
      // Units never block the spread; no terrain = no filter (arena).
      hits = hits.filter((u) => !wallsBlockLine(center, u.position, state.terrain));
      return hits;
    }
    case 'line': {
      // CAMPAIGN-ONLY (A2): the ray stops at the first wall (walls eat arrows
      // and flame). Default predicate is a no-op in arena.
      const tiles = getLineTiles(caster.position, targetPosition, ability.range,
        (p) => isTerrainBlocked(state.terrain, p));
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
    case 'grant_max_health': applyGrantMaxHealth(ctx, target, effect); break;
    case 'apply_status': applyStatus(ctx, target, effect); break;
    case 'remove_status': removeStatus(ctx, target, effect); break;
    case 'push': applyPush(ctx, target, effect); break;
    case 'pull': applyPull(ctx, target, effect); break;
    // move_self already resolved once at cast time — per-target it's a no-op.
    case 'move_self': break;
    case 'modify_cooldown': applyModifyCooldown(ctx, target, effect); break;
    case 'lifesteal': applyLifesteal(ctx, target, effect); break;
  }
}

/** Reduces outgoing damage from a 'weakened' caster. Floors at 0. */
function weakenedAdjustedDamage(ctx: ExecutionContext, rawValue: number): number {
  return hasStatusEffect(ctx.caster, 'weakened') ? Math.max(0, rawValue - WEAKENED_DAMAGE_REDUCTION) : rawValue;
}

const THORNS_DAMAGE = 3;
const OPPORTUNIST_BONUS = 4;
/**
 * Per-class Opportunist override, mirroring the per-class Undying HP tax
 * (undyingWith). A class slug present here uses its value instead of the base
 * OPPORTUNIST_BONUS. SHIPPED: Ranger +5 (v1.0.81); every other class gets the
 * base +4. The balance harness patches this at runtime (via a preset's
 * `oppBonus`) — a bare grid run RESETS it to empty, so re-seed shipped values
 * into any future baseline preset for comparability.
 */
export const OPPORTUNIST_BONUS_BY_CLASS: Record<string, number> = { ranger: 5 };
const VENGEFUL_BONUS = 3;
/** Per-class Vengeful override, same pattern as OPPORTUNIST_BONUS_BY_CLASS.
 *  SHIPPED: Barbarian +4 (v1.0.81); every other class gets the base +3. The
 *  harness patches this via a preset's `vengBonus` (bare runs reset to empty). */
export const VENGEFUL_BONUS_BY_CLASS: Record<string, number> = { barbarian: 4 };
/** Channeler: bonus ability damage when the caster did NOT move this turn. */
const CHANNELER_BONUS = 2;
/** Siphon: self-heal when one of the caster's abilities damages an enemy. */
const SIPHON_HEAL = 1;
/** Statuses negated by the Stalwart passive. */
const STALWART_IMMUNE = new Set(['rooted', 'weakened', 'exposed']);
/** Displacement immunity. Merged Stalwart (2026-08-13) absorbed the old Anchor,
 *  so push/pull is now resisted by the 'stalwart' flag; 'immovable' is kept for
 *  any legacy Anchor flag still in play (test fixtures, un-migrated data). */
function isImmovable(u: UnitInstance): boolean {
  return hasPassive(u, 'immovable') || hasPassive(u, 'stalwart');
}

/**
 * SINGLE damage sink: subtracts health and resolves death — including the
 * Undying passive (first lethal hit each match leaves the unit at 1 HP; the
 * flag is consumed). EVERY source of damage (abilities, thorns, burning,
 * endgame drain) must route through here or Undying silently won't apply.
 * Death/undying events are pushed AFTER the caller's own damage event via
 * emitAfter, preserving the DAMAGE_DEALT → UNIT_DIED order the client
 * replay depends on.
 */
export function takeDamage(
  unit: UnitInstance, damage: number, events: GameEvent[],
  sourceUnitInstanceId?: string,
  emitAfter?: (actualDamage: number) => void,
): number {
  let actual = Math.min(unit.currentHealth, damage);
  unit.currentHealth = Math.max(0, unit.currentHealth - damage);
  let outcome: 'alive' | 'died' | 'undying' = 'alive';
  if (unit.currentHealth <= 0) {
    const undyingIdx = (unit.passives ?? []).indexOf('undying');
    if (undyingIdx >= 0) {
      unit.passives.splice(undyingIdx, 1); // once per match
      unit.currentHealth = 1;
      outcome = 'undying';
      actual -= 1;
    } else {
      unit.isAlive = false;
      outcome = 'died';
    }
  }
  emitAfter?.(actual);
  if (outcome === 'undying') {
    events.push({ type: 'UNDYING_TRIGGERED', sourceUnitInstanceId, targetUnitInstanceId: unit.instanceId, message: 'Clings to life!' });
  } else if (outcome === 'died') {
    events.push({ type: 'UNIT_DIED', targetUnitInstanceId: unit.instanceId });
  }
  return actual;
}

/** Opportunist: bonus damage when the target suffers any status effect. Base
 *  +4, or a per-class override from OPPORTUNIST_BONUS_BY_CLASS. */
function opportunistBonus(ctx: ExecutionContext, target: UnitInstance): number {
  if (!hasPassive(ctx.caster, 'opportunist') || target.statusEffects.length === 0) return 0;
  return OPPORTUNIST_BONUS_BY_CLASS[ctx.caster.definitionSlug] ?? OPPORTUNIST_BONUS;
}

/** Vengeful: bonus damage while the caster is at or below half health. Base +3,
 *  or a per-class override from VENGEFUL_BONUS_BY_CLASS. */
function vengefulBonus(ctx: ExecutionContext): number {
  if (!hasPassive(ctx.caster, 'vengeful') || ctx.caster.currentHealth * 2 > ctx.caster.maxHealth) return 0;
  return VENGEFUL_BONUS_BY_CLASS[ctx.caster.definitionSlug] ?? VENGEFUL_BONUS;
}

/** Channeler: +2 ability damage while the caster has not moved this turn. */
function channelerBonus(ctx: ExecutionContext): number {
  return hasPassive(ctx.caster, 'channeler') && !ctx.caster.hasMovedThisTurn ? CHANNELER_BONUS : 0;
}

/**
 * Break a final damage number into its base and each modifier, so the combat
 * log can explain WHY a hit did what it did. Returns [] when nothing modified
 * the base (the common case), so the log stays terse unless there is something
 * to say. `base` is the ability's raw value; the parts sum to the final damage.
 */
function damageBreakdown(ctx: ExecutionContext, target: UnitInstance, base: number): { label: string; amount: number }[] {
  const opp = opportunistBonus(ctx, target);
  const ven = vengefulBonus(ctx);
  const chan = channelerBonus(ctx);
  const weak = hasStatusEffect(ctx.caster, 'weakened')
    ? Math.min(WEAKENED_DAMAGE_REDUCTION, base) : 0;
  if (opp === 0 && ven === 0 && chan === 0 && weak === 0) return [];
  const parts = [{ label: 'base', amount: base - weak }];
  if (weak > 0) parts[0] = { label: 'Weakened', amount: base - weak };
  if (opp > 0) parts.push({ label: 'Opportunist', amount: opp });
  if (ven > 0) parts.push({ label: 'Vengeful', amount: ven });
  if (chan > 0) parts.push({ label: 'Channeler', amount: chan });
  return parts;
}

/** Thorns: an adjacent attacker whose hit landed takes 3 damage back. */
function applyThornsRetaliation(ctx: ExecutionContext, target: UnitInstance): void {
  if (!hasPassive(target, 'thorns')) return;
  if (target.ownerPlayerId === ctx.caster.ownerPlayerId) return;
  if (!ctx.caster.isAlive) return;
  if (manhattanDistance(ctx.caster.position, target.position) !== 1) return;
  takeDamage(ctx.caster, THORNS_DAMAGE, ctx.events, target.instanceId, (actual) => {
    ctx.events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: target.instanceId, targetUnitInstanceId: ctx.caster.instanceId, value: actual, message: 'Thorns' });
  });
}

function applyDamage(ctx: ExecutionContext, target: UnitInstance, effect: DamageEffect): void {
  if (effect.healthThreshold !== undefined && target.currentHealth > effect.healthThreshold) {
    ctx.events.push({ type: 'ATTACK_MISSED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Kill Shot failed — target HP too high' });
    return;
  }
  const isExecute = effect.healthThreshold !== undefined;
  const damage = weakenedAdjustedDamage(ctx, effect.value) + opportunistBonus(ctx, target) + vengefulBonus(ctx) + channelerBonus(ctx);
  const parts = damageBreakdown(ctx, target, effect.value);
  const actualDamage = takeDamage(target, damage, ctx.events, ctx.caster.instanceId, (actual) => {
    // Only attach the breakdown when the hit was NOT capped by remaining HP —
    // a partial (overkill) hit would make base+bonuses not sum to `actual`, and
    // a misleading breakdown is worse than none.
    const parts2 = actual === damage ? parts : [];
    ctx.events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: actual, message: isExecute ? 'Executed' : `${actual} damage`, ...(parts2.length ? { damageParts: parts2 } : {}) });
  });
  if (actualDamage > 0) {
    applyThornsRetaliation(ctx, target);
    // Siphon: the caster leeches a little health each time one of its abilities
    // damages an ENEMY (never friendly fire), capped at its max.
    if (hasPassive(ctx.caster, 'siphon') && ctx.caster.isAlive
        && target.ownerPlayerId !== ctx.caster.ownerPlayerId) {
      const heal = Math.min(SIPHON_HEAL, ctx.caster.maxHealth - ctx.caster.currentHealth);
      if (heal > 0) {
        ctx.caster.currentHealth += heal;
        ctx.events.push({ type: 'HEALING_DONE', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: ctx.caster.instanceId, value: heal, message: 'Siphon' });
      }
    }
  }
}

function applyLifesteal(ctx: ExecutionContext, target: UnitInstance, effect: LifestealEffect): void {
  const damage = weakenedAdjustedDamage(ctx, effect.value) + opportunistBonus(ctx, target) + vengefulBonus(ctx);
  const parts = damageBreakdown(ctx, target, effect.value);
  const actualDamage = takeDamage(target, damage, ctx.events, ctx.caster.instanceId, (actual) => {
    const parts2 = actual === damage ? parts : [];
    ctx.events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, value: actual, message: `${actual} damage`, ...(parts2.length ? { damageParts: parts2 } : {}) });
  });
  if (actualDamage > 0) applyThornsRetaliation(ctx, target);
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

/**
 * Ward's proactive protection: raise max health for the rest of the match and
 * grant the same amount as current health. Never wasted on a full-HP ally —
 * that is the whole point (see GrantMaxHealthEffect).
 */
function applyGrantMaxHealth(ctx: ExecutionContext, target: UnitInstance, effect: GrantMaxHealthEffect): void {
  if (!target.isAlive) return;
  target.maxHealth += effect.value;
  target.currentHealth += effect.value;
  ctx.events.push({
    type: 'HEALING_DONE',
    sourceUnitInstanceId: ctx.caster.instanceId,
    targetUnitInstanceId: target.instanceId,
    value: effect.value,
    message: `+${effect.value} max health`,
  });
}

function applyStatus(ctx: ExecutionContext, target: UnitInstance, effect: ApplyStatusEffect): void {
  if (!target.isAlive) return;
  if (hasPassive(target, 'stalwart') && STALWART_IMMUNE.has(effect.statusSlug)) {
    ctx.events.push({ type: 'STATUS_RESISTED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, statusSlug: effect.statusSlug, message: 'Resisted — Stalwart' });
    return;
  }
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
    // sourceUnitInstanceId marks this as a DELIBERATE cleanse (Purify) — the log
    // builder shows a line only for these. Natural status EXPIRY also emits
    // STATUS_REMOVED (decrementStatusDurations) but carries no source, so it
    // stays silent; without this tag the two are indistinguishable and every
    // expiring debuff would spam "no longer frozen".
    ctx.events.push({ type: 'STATUS_REMOVED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, statusSlug: effect.statusSlug });
  }
}

function applyPush(ctx: ExecutionContext, target: UnitInstance, effect: PushEffect): void {
  if (!target.isAlive) return;
  if (isImmovable(target)) {
    ctx.events.push({ type: 'PUSH_RESISTED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Resisted' });
    return;
  }
  const options = calculatePushOptions(
    target.position, ctx.caster.position, effect.distance, blockedFor(ctx, target),
  );
  // The client may steer which cardinal a diagonal push takes (Fear's prompt);
  // turnProcessor has already validated that choice against this same option
  // list, so anything unrecognised here is an AI/campaign cast that didn't
  // choose — fall back to the first option rather than trusting the input.
  const finalPos = pickDestination(options, ctx.pushDestination);
  // No actual displacement (blocked by a wall or another unit): don't emit a
  // UNIT_PUSHED event, so the log doesn't claim a push that never happened.
  if (finalPos.x === target.position.x && finalPos.y === target.position.y) return;
  target.position = finalPos;
  ctx.events.push({ type: 'UNIT_PUSHED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, position: finalPos });
  applyEntryHazard(ctx.state, target, ctx.events); // shoved into the fire (A2)
}

function applyPull(ctx: ExecutionContext, target: UnitInstance, effect: PullEffect): void {
  if (!target.isAlive) return;
  if (isImmovable(target)) {
    ctx.events.push({ type: 'PUSH_RESISTED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, message: 'Resisted' });
    return;
  }
  const options = calculatePullOptions(
    target.position, ctx.caster.position, effect.distance, blockedFor(ctx, target),
  );
  // Same contract as push: a diagonally-adjacent drag offers two corner-cutting
  // tiles and the player picks; turnProcessor validated it, so an unrecognised
  // value means nobody chose (AI/campaign) and we take the first option.
  const finalPos = pickDestination(options, ctx.pushDestination);
  if (finalPos.x === target.position.x && finalPos.y === target.position.y) return;
  target.position = finalPos;
  ctx.events.push({ type: 'UNIT_PULLED', sourceUnitInstanceId: ctx.caster.instanceId, targetUnitInstanceId: target.instanceId, position: finalPos });
  applyEntryHazard(ctx.state, target, ctx.events); // dragged into the fire (A2)
}

/**
 * Leap the caster onto the targeted tile. Deliberately NOT routed through the
 * push/pull walkers: a leap goes OVER intervening units, so nothing between
 * here and there can shorten it — only the destination matters. Anchor does not
 * stop it either; Anchor resists being MOVED by someone else, and this is the
 * caster moving itself.
 *
 * Silently declines (no move, no event) if the landing tile is out of bounds or
 * occupied. Range is enforced at validation (processUseAbility); this is the
 * belt-and-braces layer for AI-generated and campaign-scripted casts, which
 * reach executeAbility by other paths.
 */
function applyMoveSelf(ctx: ExecutionContext): void {
  const dest = ctx.targetPosition;
  if (!isInBounds(dest)) return;
  // A leap passes OVER walls but may not LAND on one (A2).
  if (isTerrainBlocked(ctx.state.terrain, dest)) return;
  const occupant = getUnitAtPosition(ctx.state.units.filter((u) => u.isAlive), dest);
  if (occupant && occupant.instanceId !== ctx.caster.instanceId) return;
  if (dest.x === ctx.caster.position.x && dest.y === ctx.caster.position.y) return;
  ctx.caster.position = { x: dest.x, y: dest.y };
  ctx.events.push({
    type: 'UNIT_MOVED',
    sourceUnitInstanceId: ctx.caster.instanceId,
    targetUnitInstanceId: ctx.caster.instanceId,
    position: { x: dest.x, y: dest.y },
  });
  applyEntryHazard(ctx.state, ctx.caster, ctx.events); // leapt into the fire (A2)
}

function applyModifyCooldown(_ctx: ExecutionContext, target: UnitInstance, effect: ModifyCooldownEffect): void {
  const current = target.cooldowns[effect.abilitySlug] ?? 0;
  target.cooldowns[effect.abilitySlug] = Math.max(0, current + effect.delta);
}

/**
 * "Is this tile occupied by someone other than the unit being displaced?" —
 * the blocker predicate both push and pull hand to the boardUtils walkers.
 */
function blockedFor(ctx: ExecutionContext, target: UnitInstance): (p: BoardPosition) => boolean {
  return (p) => isTerrainBlocked(ctx.state.terrain, p) || ctx.state.units.some(
    (u) => u.isAlive && u.instanceId !== target.instanceId && u.position.x === p.x && u.position.y === p.y,
  );
}

/**
 * Take the caster's chosen destination only if it is one the rules actually
 * offer; otherwise use the first option. Never trust `chosen` blindly — before
 * this existed, a crafted pushDestination could shove a unit any distance in
 * any direction because applyPush passed it straight through.
 */
function pickDestination(options: BoardPosition[], chosen?: BoardPosition): BoardPosition {
  if (chosen && options.some((o) => o.x === chosen.x && o.y === chosen.y)) return chosen;
  return options[0];
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
    takeDamage(unit, burnDamage, events, burning.sourceUnitInstanceId, (actual) => {
      events.push({ type: 'DAMAGE_DEALT', sourceUnitInstanceId: burning.sourceUnitInstanceId, targetUnitInstanceId: unit.instanceId, value: actual, message: `${actual} burning damage` });
    });
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
  if (!burning || (unit.passives ?? []).includes('undying')) return false;
  return unit.currentHealth <= BURNING_DAMAGE_PER_STACK * burning.stacks;
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
