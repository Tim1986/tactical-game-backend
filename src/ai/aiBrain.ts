/**
 * aiBrain.ts — AI decision-making for DungeonCombat PvE and sim harness.
 * Adapted from Fable's standalone aiBrain.ts v2 to use backend types.
 *
 * Exports:
 *   OptimalBrain  — full heuristic AI, targets optimal play
 *   BaselineBrain — walk-and-hit baseline for sim comparisons
 *   planBestTurn  — exposed for sim/inspection
 *   WEIGHTS       — all tuning constants
 *   CHARGE_MAX_ROUND — game rule: Charge only legal during rounds 1-10
 */

import { MatchState, UnitInstance, TurnAction, BoardPosition } from '../types/matchState.js';
import { AbilityDefinition } from '../types/index.js';
import {
  BOARD_SIZE, manhattanDistance, chebyshevDistance, samePos, isInBounds,
  hasLineOfSight, reachableTiles, reachableFrom, pushDestination,
} from './geometry.js';

export interface AIBrain {
  selectActions(state: MatchState, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): TurnAction[];
}

export const WEIGHTS = {
  damage: 1.0,
  allyDamage: 1.4,
  selfDamage: 1.7,
  heal: 0.9,
  healUrgency: 0.5,
  killBase: 55,
  killThreatFactor: 2.5,
  allyDeathPenalty: 90,
  stunFlat: 6,
  stunThreatFactor: 1.1,
  initiativeSoonBonus: 4,
  rootMeleeFactor: 0.8,
  rootRangedFlat: 4,
  pushMeleePerTile: 5,
  pushRangedPerTile: 1.5,
  statusOnAllyPenalty: 20,
  redundantStatusFactor: 0.1,
  dangerSecondary: 0.25,
  specialReserve: 8,
  danger: 0.35,
  dangerLethalMult: 2.2,
  approach: 1.5,
  approachHpBias: 0.08,
  killShotSetup: 12,
  moveTax: 0.01,
  referenceAC: 15,
};

/** GAME RULE (not a heuristic): Charge is only legal during rounds 1-10. */
export const CHARGE_MAX_ROUND = 10;

export function hitChance(armorClass: number): number {
  return Math.min(1, Math.max(0, (26 - armorClass) / 20));
}

function hasStatus(u: UnitInstance, slug: string): boolean {
  return u.statusEffects.some((e) => e.slug === slug && e.turnsRemaining > 0);
}

export function isStunned(u: UnitInstance): boolean {
  return hasStatus(u, 'stunned');
}

export function isRooted(u: UnitInstance): boolean {
  return hasStatus(u, 'rooted');
}

function abilityReady(u: UnitInstance, slug: string): boolean {
  return (u.cooldowns[slug] ?? 0) <= 0;
}

function basicDef(u: UnitInstance, map: Map<string, AbilityDefinition>): AbilityDefinition | undefined {
  return u.abilities.length > 0 ? map.get(u.abilities[0]) : undefined;
}

function isMelee(u: UnitInstance, map: Map<string, AbilityDefinition>): boolean {
  const b = basicDef(u, map);
  return (b?.range ?? 1) <= 1;
}

function expectedDamageOfAbility(def: AbilityDefinition, targetAC: number): number {
  let total = 0;
  for (const eff of def.effects) {
    if (eff.type !== 'damage') continue;
    if (eff.healthThreshold !== undefined) continue;
    const p = def.isUnblockable ? 1 : hitChance(targetAC);
    total += p * eff.value;
  }
  return total;
}

function threatPerTurn(u: UnitInstance, map: Map<string, AbilityDefinition>): number {
  const b = basicDef(u, map);
  if (!b) return 0;
  return expectedDamageOfAbility(b, WEIGHTS.referenceAC);
}

function killValue(target: UnitInstance, map: Map<string, AbilityDefinition>): number {
  let v = WEIGHTS.killBase + threatPerTurn(target, map) * WEIGHTS.killThreatFactor;
  const specialSlug = target.abilities[1];
  if (specialSlug && abilityReady(target, specialSlug)) v += 10;
  return v;
}

function bestKillThreshold(allies: UnitInstance[], map: Map<string, AbilityDefinition>): number {
  let best = 0;
  for (const a of allies) {
    for (const slug of a.abilities) {
      if (!abilityReady(a, slug)) continue;
      const def = map.get(slug);
      if (!def) continue;
      for (const eff of def.effects) {
        if (eff.type === 'damage' && eff.healthThreshold !== undefined) {
          best = Math.max(best, eff.healthThreshold);
        }
      }
    }
  }
  return best;
}

function slotsUntilUnitActs(state: MatchState, targetId: string): number {
  const { order, slot } = state.initiative;
  if (order.length === 0) return 99;
  const byId = new Map(state.units.map((u) => [u.instanceId, u]));
  let count = 0;
  for (let i = 1; i <= order.length; i++) {
    const id = order[(slot + i) % order.length];
    const u = byId.get(id);
    if (!u || !u.isAlive) continue;
    count++;
    if (id === targetId) return count;
  }
  return 99;
}

// ---------------------------------------------------------------------------
// Ability-use scoring
// ---------------------------------------------------------------------------

interface ScoreCtx {
  state: MatchState;
  map: Map<string, AbilityDefinition>;
  caster: UnitInstance;
  casterPos: BoardPosition;
  myPlayerId: string;
  killThreshold: number;
}

function effPos(ctx: ScoreCtx, u: UnitInstance): BoardPosition {
  return u.instanceId === ctx.caster.instanceId ? ctx.casterPos : u.position;
}

function scoreEffectsOnTarget(ctx: ScoreCtx, def: AbilityDefinition, target: UnitInstance): number {
  const { caster, map } = ctx;
  const isSelf = target.instanceId === caster.instanceId;
  const isAllyTarget = target.ownerPlayerId === caster.ownerPlayerId;
  const isEnemy = !isAllyTarget;
  let s = 0;

  for (const eff of def.effects) {
    switch (eff.type) {
      case 'damage': {
        const p = def.isUnblockable ? 1 : hitChance(target.armorClass);
        if (eff.healthThreshold !== undefined) {
          if (isEnemy && target.currentHealth <= eff.healthThreshold) {
            s += p * killValue(target, map);
          }
          break;
        }
        const effective = Math.min(eff.value, target.currentHealth);
        const expected = p * effective;
        if (isEnemy) {
          s += expected * WEIGHTS.damage;
          if (eff.value >= target.currentHealth) {
            s += p * killValue(target, map);
          } else if (
            ctx.killThreshold > 0 &&
            target.currentHealth > ctx.killThreshold &&
            target.currentHealth - eff.value <= ctx.killThreshold
          ) {
            s += p * WEIGHTS.killShotSetup;
          }
        } else {
          s -= expected * (isSelf ? WEIGHTS.selfDamage : WEIGHTS.allyDamage);
          if (eff.value >= target.currentHealth) {
            // Flat penalty — not scaled by hit chance, so high-AC allies can't
            // make AoE ally-kills score positive via reduced p.
            s -= WEIGHTS.allyDeathPenalty;
          }
        }
        break;
      }

      case 'heal': {
        if (isEnemy) { s -= eff.value; break; }
        const effective = Math.min(eff.value, target.maxHealth - target.currentHealth);
        s += effective * WEIGHTS.heal;
        if (target.currentHealth <= target.maxHealth * 0.4) {
          s += effective * WEIGHTS.healUrgency;
        }
        break;
      }

      case 'apply_status': {
        if (!isEnemy) { s -= WEIGHTS.statusOnAllyPenalty; break; }
        // Stunned supersedes rooted — skip entirely.
        if (eff.statusSlug === 'rooted' && hasStatus(target, 'stunned')) break;
        // Re-applying an active status only extends duration — steeply discount.
        if (hasStatus(target, eff.statusSlug)) {
          if (eff.statusSlug === 'stunned') {
            s += (WEIGHTS.stunFlat + eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor) * WEIGHTS.redundantStatusFactor;
          } else if (eff.statusSlug === 'rooted') {
            s += eff.durationTurns * WEIGHTS.rootRangedFlat * WEIGHTS.redundantStatusFactor;
          }
          break;
        }
        if (eff.statusSlug === 'stunned') {
          s += WEIGHTS.stunFlat + eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor;
          if (slotsUntilUnitActs(ctx.state, target.instanceId) <= 2) s += WEIGHTS.initiativeSoonBonus;
        } else if (eff.statusSlug === 'rooted') {
          if (isMelee(target, map)) {
            const someoneAdjacent = ctx.state.units.some(
              (u) => u.isAlive && u.ownerPlayerId === caster.ownerPlayerId && manhattanDistance(effPos(ctx, u), target.position) <= 1,
            );
            s += eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.rootMeleeFactor * (someoneAdjacent ? 0.3 : 1);
          } else {
            s += eff.durationTurns * WEIGHTS.rootRangedFlat;
          }
        }
        break;
      }

      case 'push': {
        if (!isEnemy) { s -= 10; break; }
        const dest = pushDestination(ctx.casterPos, target.position, eff.distance, ctx.state.units, target.instanceId);
        const moved = chebyshevDistance(target.position, dest);
        s += moved * (isMelee(target, map) ? WEIGHTS.pushMeleePerTile : WEIGHTS.pushRangedPerTile);
        break;
      }

      default:
        break;
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Candidate action enumeration
// ---------------------------------------------------------------------------

interface Candidate { action: TurnAction; score: number; }

/**
 * Hard-veto: would this ability's raw damage kill a teammate?
 * Used to discard AOE centers / line directions outright.
 */
function wouldKillTeammate(def: AbilityDefinition, caster: UnitInstance, target: UnitInstance): boolean {
  if (target.ownerPlayerId !== caster.ownerPlayerId) return false;
  for (const eff of def.effects) {
    if (eff.type !== 'damage') continue;
    if (eff.healthThreshold !== undefined) continue;
    if (eff.value >= target.currentHealth) return true;
  }
  return false;
}

const LINE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

function enumerateAbilityActions(ctx: ScoreCtx): Candidate[] {
  const { caster, casterPos, map, state } = ctx;
  const out: Candidate[] = [];
  const units = state.units;

  for (const slug of caster.abilities) {
    if (!abilityReady(caster, slug)) continue;
    const def = map.get(slug);
    if (!def) continue;
    const reserve = def.isSpecial ? WEIGHTS.specialReserve : 0;

    switch (def.targetingType) {
      case 'self': {
        const score = scoreEffectsOnTarget(ctx, def, caster) - reserve;
        if (score > 0) out.push({ action: { type: 'USE_ABILITY', unitInstanceId: caster.instanceId, abilitySlug: slug, target: casterPos }, score });
        break;
      }

      case 'single': {
        for (const t of units) {
          if (!t.isAlive) continue;
          const tPos = effPos(ctx, t);
          if (manhattanDistance(casterPos, tPos) > def.range) continue;
          if (t.instanceId !== caster.instanceId && !hasLineOfSight(casterPos, tPos, units, [caster.instanceId, t.instanceId])) continue;
          const score = scoreEffectsOnTarget(ctx, def, t) - reserve;
          if (score > 0) out.push({ action: { type: 'USE_ABILITY', unitInstanceId: caster.instanceId, abilitySlug: slug, target: tPos }, score });
        }
        break;
      }

      case 'aoe': {
        const centers: BoardPosition[] = [];
        if (def.range === 0) {
          centers.push(casterPos);
        } else {
          for (let x = 0; x < BOARD_SIZE; x++) {
            for (let y = 0; y < BOARD_SIZE; y++) {
              const c = { x, y };
              if (!isInBounds(c)) continue;
              if (manhattanDistance(casterPos, c) <= def.range) centers.push(c);
            }
          }
        }
        for (const c of centers) {
          let score = -reserve;
          let hitAny = false;
          let vetoed = false;
          for (const t of units) {
            if (!t.isAlive) continue;
            if (def.range === 0 && t.instanceId === caster.instanceId) continue;
            if (chebyshevDistance(c, effPos(ctx, t)) > def.areaRadius) continue;
            if (wouldKillTeammate(def, caster, t)) { vetoed = true; break; }
            hitAny = true;
            score += scoreEffectsOnTarget(ctx, def, t);
          }
          if (!vetoed && hitAny && score > 0) out.push({ action: { type: 'USE_ABILITY', unitInstanceId: caster.instanceId, abilitySlug: slug, target: c }, score });
        }
        break;
      }

      case 'line': {
        for (const [dx, dy] of LINE_DIRECTIONS) {
          let score = -reserve;
          let hitAny = false;
          let vetoed = false;
          let lastInBounds: BoardPosition | null = null;
          for (let k = 1; k <= def.range; k++) {
            const p = { x: casterPos.x + dx * k, y: casterPos.y + dy * k };
            if (p.x < 0 || p.x >= BOARD_SIZE || p.y < 0 || p.y >= BOARD_SIZE) break;
            if (isInBounds(p)) lastInBounds = p;
            const t = units.find((u) => u.isAlive && u.instanceId !== caster.instanceId && samePos(effPos(ctx, u), p));
            if (t) {
              if (wouldKillTeammate(def, caster, t)) { vetoed = true; break; }
              hitAny = true;
              score += scoreEffectsOnTarget(ctx, def, t);
            }
          }
          if (!vetoed && hitAny && score > 0 && lastInBounds) out.push({ action: { type: 'USE_ABILITY', unitInstanceId: caster.instanceId, abilitySlug: slug, target: lastInBounds }, score });
        }
        break;
      }

      default:
        break;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Position scoring (safety + approach)
// ---------------------------------------------------------------------------

function positionScore(state: MatchState, unit: UnitInstance, pos: BoardPosition, myPlayerId: string, map: Map<string, AbilityDefinition>): number {
  const enemies = state.units.filter((u) => u.isAlive && u.ownerPlayerId !== myPlayerId);
  if (enemies.length === 0) return 0;

  let s = 0;

  // Danger model: one unit acts per initiative slot, so real per-turn risk is the
  // single most dangerous attacker. Additional enemies in reach contribute at a
  // discounted secondary weight — consecutive slots can pile on, but summing all
  // at full value made lone units score every fighting position as suicidal.
  let maxDanger = 0;
  let totalDanger = 0;
  for (const e of enemies) {
    if (isStunned(e)) continue;
    const b = basicDef(e, map);
    if (!b) continue;
    const reach = (isRooted(e) ? 0 : e.movementRange) + (b.range || 1);
    if (manhattanDistance(e.position, pos) <= reach) {
      const d = expectedDamageOfAbility(b, unit.armorClass);
      totalDanger += d;
      if (d > maxDanger) maxDanger = d;
    }
  }
  const danger = maxDanger + (totalDanger - maxDanger) * WEIGHTS.dangerSecondary;
  const lethal = danger >= unit.currentHealth;
  s -= danger * WEIGHTS.danger * (lethal ? WEIGHTS.dangerLethalMult : 1);

  // Approach: HP bias only applies when there's a gap to close — at gap 0
  // the current position costs nothing (previously leaked into in-range positions).
  const myBasic = basicDef(unit, map);
  const prefRange = myBasic?.range ?? 1;
  let bestApproachCost = Infinity;
  for (const e of enemies) {
    const gap = Math.max(0, manhattanDistance(pos, e.position) - prefRange);
    const cost = gap > 0 ? gap * WEIGHTS.approach + e.currentHealth * WEIGHTS.approachHpBias : 0;
    if (cost < bestApproachCost) bestApproachCost = cost;
  }
  s -= bestApproachCost;

  return s;
}

// ---------------------------------------------------------------------------
// Full-turn planning
// ---------------------------------------------------------------------------

export interface TurnPlan { score: number; actions: TurnAction[]; }

export function planBestTurn(
  state: MatchState,
  unit: UnitInstance,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
  mustAct = false,
): TurnPlan {
  const allies = state.units.filter((u) => u.isAlive && u.ownerPlayerId === myPlayerId);
  const killThreshold = bestKillThreshold(allies, map);
  const rooted = isRooted(unit);
  const moveTiles = rooted ? [] : reachableTiles(unit, state.units, unit.movementRange);

  const pScore = (pos: BoardPosition) => positionScore(state, unit, pos, myPlayerId, map);

  const END: TurnAction = { type: 'END_TURN' };
  let best: TurnPlan = { score: -Infinity, actions: [END] };
  const consider = (score: number, actions: TurnAction[]) => {
    if (score > best.score) best = { score, actions };
  };

  if (!mustAct) consider(pScore(unit.position), [END]);

  for (const pos of moveTiles) {
    consider(pScore(pos) - WEIGHTS.moveTax, [{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: pos }, END]);
  }

  let bestRetreat: BoardPosition | null = null;
  let bestRetreatScore = -Infinity;
  for (const pos of moveTiles) {
    const ps = pScore(pos);
    if (ps > bestRetreatScore) { bestRetreatScore = ps; bestRetreat = pos; }
  }

  const ctxHere: ScoreCtx = { state, map, caster: unit, casterPos: unit.position, myPlayerId, killThreshold };
  for (const cand of enumerateAbilityActions(ctxHere)) {
    consider(cand.score + pScore(unit.position), [cand.action, END]);
    if (bestRetreat) {
      consider(cand.score + bestRetreatScore - WEIGHTS.moveTax, [cand.action, { type: 'MOVE', unitInstanceId: unit.instanceId, destination: bestRetreat }, END]);
    }
  }

  for (const pos of moveTiles) {
    const ps = pScore(pos) - WEIGHTS.moveTax;
    const ctx: ScoreCtx = { state, map, caster: unit, casterPos: pos, myPlayerId, killThreshold };
    for (const cand of enumerateAbilityActions(ctx)) {
      consider(cand.score + ps, [{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: pos }, cand.action, END]);
    }
  }

  // GAME RULE: Charge only legal during rounds 1-10.
  if ((state.roundNumber ?? 1) <= CHARGE_MAX_ROUND) {
    for (const posA of moveTiles) {
      const fromA = reachableFrom(posA, unit, state.units, unit.movementRange);
      for (const posB of fromA) {
        consider(pScore(posB) - 2 * WEIGHTS.moveTax, [
          { type: 'MOVE', unitInstanceId: unit.instanceId, destination: posA },
          { type: 'CHARGE', unitInstanceId: unit.instanceId, destination: posB },
          END,
        ]);
      }
    }
  }

  if (best.score === -Infinity) best = { score: 0, actions: [END] };
  return best;
}

// ---------------------------------------------------------------------------
// OptimalBrain
// ---------------------------------------------------------------------------

export class OptimalBrain implements AIBrain {
  selectActions(state: MatchState, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): TurnAction[] {
    const initiative = state.initiative;

    if (initiative.activeUnitId) {
      const u = state.units.find((x) => x.instanceId === initiative.activeUnitId);
      if (!u || u.ownerPlayerId !== myPlayerId || !u.isAlive || isStunned(u)) return [{ type: 'END_TURN' }];
      return planBestTurn(state, u, myPlayerId, abilityMap).actions;
    }

    if (initiative.isRound1) {
      const committed = new Set(initiative.order);
      const uncommitted = state.units.filter((u) => u.ownerPlayerId === myPlayerId && !committed.has(u.instanceId));

      // Group 1: usable units (alive, not stunned) — always preferred.
      const usable = uncommitted.filter((u) => u.isAlive && !isStunned(u));
      if (usable.length > 0) {
        let bestPlan: TurnPlan | null = null;
        for (const c of usable) {
          const p = planBestTurn(state, c, myPlayerId, abilityMap, true);
          if (!bestPlan || p.score > bestPlan.score) bestPlan = p;
        }
        if (bestPlan) return bestPlan.actions;
      }

      // Group 2: forced commitment (only stunned/dead remain).
      // Prefer stunned over dead; deterministic tiebreak = first in unit order.
      const stunnedUnits = uncommitted.filter((u) => u.isAlive && isStunned(u));
      const deadUnits = uncommitted.filter((u) => !u.isAlive);
      const forced = stunnedUnits.length > 0 ? stunnedUnits : deadUnits;
      if (forced.length > 0) {
        const pick = forced[0];
        return [{ type: 'MOVE', unitInstanceId: pick.instanceId, destination: pick.position }, { type: 'END_TURN' }];
      }
    }

    return [{ type: 'END_TURN' }];
  }
}

// ---------------------------------------------------------------------------
// BaselineBrain
// ---------------------------------------------------------------------------

export class BaselineBrain implements AIBrain {
  selectActions(state: MatchState, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): TurnAction[] {
    const unit = this.resolveUnit(state, myPlayerId);
    if (!unit || isStunned(unit)) return [{ type: 'END_TURN' }];

    const enemies = state.units.filter((u) => u.isAlive && u.ownerPlayerId !== myPlayerId);
    if (enemies.length === 0) return [{ type: 'END_TURN' }];

    const basicSlug = unit.abilities[0];
    const basic = basicSlug ? abilityMap.get(basicSlug) : undefined;
    const range = basic?.range ?? 1;

    let nearest = enemies[0];
    for (const e of enemies) {
      if (manhattanDistance(unit.position, e.position) < manhattanDistance(unit.position, nearest.position)) nearest = e;
    }

    const actions: TurnAction[] = [];
    let pos = unit.position;

    if (manhattanDistance(pos, nearest.position) > range && !isRooted(unit)) {
      const tiles = reachableTiles(unit, state.units, unit.movementRange);
      let bestTile: BoardPosition | null = null;
      let bestDist = manhattanDistance(pos, nearest.position);
      for (const t of tiles) {
        const d = manhattanDistance(t, nearest.position);
        if (d < bestDist) { bestDist = d; bestTile = t; }
      }
      if (bestTile) { actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: bestTile }); pos = bestTile; }
    }

    if (basic && manhattanDistance(pos, nearest.position) <= range && hasLineOfSight(pos, nearest.position, state.units, [unit.instanceId, nearest.instanceId])) {
      actions.push({ type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: basic.slug, target: nearest.position });
    }

    actions.push({ type: 'END_TURN' });
    return actions;
  }

  private resolveUnit(state: MatchState, myPlayerId: string): UnitInstance | null {
    const { initiative } = state;
    if (initiative.activeUnitId) {
      const u = state.units.find((x) => x.instanceId === initiative.activeUnitId);
      return u && u.ownerPlayerId === myPlayerId && u.isAlive ? u : null;
    }
    if (initiative.isRound1) {
      const committed = new Set(initiative.order);
      return state.units.find((u) => u.ownerPlayerId === myPlayerId && u.isAlive && !committed.has(u.instanceId) && !isStunned(u)) ?? null;
    }
    return null;
  }
}
