/**
 * aiBrain.ts — AI decision-making for the DungeonCombat sim harness and PvE.
 *
 * Exports:
 *   - AIBrain          (interface — matches the sim harness spec)
 *   - OptimalBrain     (full heuristic AI targeting optimal play)
 *   - BaselineBrain    (dumb "walk up and hit things" AI for sim baselines)
 *   - planBestTurn     (exposed so the sim/PvE layer can reuse or inspect plans)
 *   - WEIGHTS          (all tuning constants in one place)
 *
 * Design principles:
 *   - Everything is derived from the passed-in MatchState + AbilityDefinition
 *     map at runtime. No stats are hardcoded — balance changes flow through
 *     automatically (Kill Shot threshold, freeze duration, damage values, AC).
 *   - The brain works in expected values (hit chance = P(roll+5 >= AC)); the
 *     engine still does the actual dice rolls when it applies the actions.
 *   - One full turn is planned per selectActions() call and returned as an
 *     ordered TurnAction[] ending in END_TURN.
 *
 * Turn plans considered (exhaustive over move tiles, targets, AOE centers,
 * line directions):
 *   1. Do nothing (END_TURN)
 *   2. Move only
 *   3. Act from current tile, then optionally retreat (hit-and-run)
 *   4. Move, then act
 *   5. Move + Charge (double move) when no ability use is worth it
 */

import {
  MatchState,
  UnitInstance,
  TurnAction,
  AbilityDefinition,
  BoardPosition,
} from './types';
import {
  BOARD_SIZE,
  manhattanDistance,
  chebyshevDistance,
  samePos,
  isInBounds,
  hasLineOfSight,
  reachableTiles,
  reachableFrom,
  pushDestination,
} from './geometry';

// ---------------------------------------------------------------------------
// Public interface (matches the sim harness spec)
// ---------------------------------------------------------------------------

export interface AIBrain {
  selectActions(
    state: MatchState,
    myPlayerId: string,
    abilityMap: Map<string, AbilityDefinition>,
  ): TurnAction[];
}

// ---------------------------------------------------------------------------
// Tuning weights — every heuristic constant lives here so balance passes can
// tweak AI temperament without touching logic.
// ---------------------------------------------------------------------------

export const WEIGHTS = {
  /** Value per point of expected damage dealt to an enemy. */
  damage: 1.0,
  /** Penalty multiplier per point of expected damage dealt to an ally (friendly fire). */
  allyDamage: 1.4,
  /** Penalty multiplier per point of expected self-damage. */
  selfDamage: 1.7,
  /** Value per point of effective healing on an ally. */
  heal: 0.9,
  /** Extra heal value multiplier when the ally is below 40% HP. */
  healUrgency: 0.5,
  /** Base value of killing an enemy unit outright. */
  killBase: 55,
  /** Additional kill value per point of the target's expected damage per turn. */
  killThreatFactor: 2.5,
  /** Penalty for an ability that would kill one of our own units. */
  allyDeathPenalty: 90,
  /** Fraction of max HP below which an ally counts as dangerously wounded. */
  allyNearDeathThreshold: 0.3,
  /** Fraction of allyDeathPenalty applied when a hit would leave an ally near death. */
  allyNearDeathFactor: 0.5,
  /** Flat value of landing a stun (movement + action denial baseline). */
  stunFlat: 6,
  /** Stun value per (duration x target's expected damage per turn). */
  stunThreatFactor: 1.1,
  /** Bonus for stunning a unit that acts within the next 2 initiative slots. */
  initiativeSoonBonus: 4,
  /**
   * Root turn-denial: value per (denied turn x target's expected damage per
   * turn). Denied turns = root duration where the target can't reach any of
   * our units from its post-push position, PLUS the travel turns it needs to
   * re-close the pushed gap afterward. This is what makes Fear correctly
   * beat a basic attack against an adjacent melee threat: push 3 + root
   * denies ~2 full turns of that unit's damage output.
   */
  rootTurnDenialFactor: 1.0,
  /** Flat root value per turn vs ranged targets (mobility denial only). */
  rootRangedFlat: 4,
  /** Push value per tile displaced, vs a melee target. */
  pushMeleePerTile: 5,
  /** Push value per tile displaced, vs a ranged target. */
  pushRangedPerTile: 1.5,
  /** Penalty for landing a hostile status effect on an ally. */
  statusOnAllyPenalty: 20,
  /** Value multiplier for re-applying a status the target already has (duration extension only). */
  redundantStatusFactor: 0.1,
  /**
   * Weight on danger from enemies beyond the single most dangerous one.
   * Only one unit acts per initiative slot, so real per-turn risk is one
   * attacker's damage — but standing in reach of many enemies is still worse
   * than one, since consecutive slots can pile on. 0 = pure per-turn model.
   */
  dangerSecondary: 0.25,
  /**
   * Cornered-unit fallback threshold: if our last living unit can't reduce
   * expected incoming danger by at least this much anywhere it can move,
   * there is no meaningful escape — ignore danger and fight on action value.
   */
  corneredDangerSpread: 4,
  /**
   * Root exploitation: bonus fraction of the best qualifying melee ally's
   * per-turn threat, when that ally can reach the rooted target. Rooting a
   * unit our fighter can pounce on is worth far more than rooting one in an
   * empty corner.
   */
  rootExploitFactor: 0.6,
  /**
   * Opportunity cost of spending a once-per-game special. A special must beat
   * the best basic-attack option by at least this margin to be chosen.
   */
  specialReserve: 8,
  /**
   * THREAT-HOLDING: minimum enemies an AOE special must hit to be worth
   * spending — while more than one enemy is still alive. A held Firestorm
   * zones the whole enemy team (they must spread out or eat a multi-hit);
   * spent on one target it's just an overpriced basic attack. When only one
   * enemy remains there is nothing left to save it for, so the gate lifts.
   */
  aoeSpecialMinEnemies: 2,
  /**
   * THREAT-HOLDING (defensive side): penalty factor on positions that stand
   * clustered with an ally while an enemy holds an unspent damaging AOE
   * special that could plausibly reach. This is what makes the enemy's held
   * Firestorm actually cost us tempo — we spread out, or we knowingly pay.
   */
  aoeClusterAvoidance: 0.3,
  /** How much the brain cares about standing in enemy threat range. */
  danger: 0.35,
  /** Danger multiplier when the incoming expected damage could kill us. */
  dangerLethalMult: 2.2,
  /** Pull toward closing the gap to attackable targets (per tile of gap). */
  approach: 1.5,
  /** Lean toward approaching low-HP enemies (per point of target HP). */
  approachHpBias: 0.08,
  /** Bonus for chipping an enemy into an ally's execute (Kill Shot) threshold. */
  killShotSetup: 12,
  /** Tiny tax per move action so the AI doesn't shuffle pointlessly on ties. */
  moveTax: 0.01,
  /** Assumed AC when estimating a unit's generic threat output. */
  referenceAC: 15,
};

/**
 * GAME RULE (not a heuristic): Charge is only legal during rounds 1-10.
 * After round 10 the AI must not generate Charge candidates.
 */
export const CHARGE_MAX_ROUND = 10;

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** P(hit) for a blockable ability: roll 1-20, hit if roll + 5 >= AC. */
export function hitChance(armorClass: number): number {
  return Math.min(1, Math.max(0, (26 - armorClass) / 20));
}

function hasStatus(u: UnitInstance, slug: string): boolean {
  // Match engine behavior: engine checks slug existence without filtering
  // turnsRemaining, so expired effects still block actions until removed.
  return u.statusEffects.some((e) => e.slug === slug);
}

export function isStunned(u: UnitInstance): boolean {
  return hasStatus(u, 'frozen');
}

export function isRooted(u: UnitInstance): boolean {
  return hasStatus(u, 'rooted');
}

function abilityReady(u: UnitInstance, slug: string): boolean {
  return (u.cooldowns[slug] ?? 0) <= 0;
}

function basicDef(
  u: UnitInstance,
  map: Map<string, AbilityDefinition>,
): AbilityDefinition | undefined {
  return u.abilities.length > 0 ? map.get(u.abilities[0]) : undefined;
}

function isMelee(u: UnitInstance, map: Map<string, AbilityDefinition>): boolean {
  const b = basicDef(u, map);
  return (b?.range ?? 1) <= 1;
}

/** Expected damage of one ability use vs a given AC (execute effects excluded). */
function expectedDamageOfAbility(
  def: AbilityDefinition,
  targetAC: number,
): number {
  let total = 0;
  for (const eff of def.effects) {
    if (eff.type !== 'damage') continue;
    if (eff.healthThreshold !== undefined) continue; // conditional executes aren't steady DPS
    const p = def.isUnblockable ? 1 : hitChance(targetAC);
    total += p * eff.value;
  }
  return total;
}

/** Expected damage per turn this unit projects with its basic attack. */
function threatPerTurn(
  u: UnitInstance,
  map: Map<string, AbilityDefinition>,
): number {
  const b = basicDef(u, map);
  if (!b) return 0;
  return expectedDamageOfAbility(b, WEIGHTS.referenceAC);
}

/** Value of removing an enemy unit from the board. */
function killValue(
  target: UnitInstance,
  map: Map<string, AbilityDefinition>,
): number {
  let v = WEIGHTS.killBase + threatPerTurn(target, map) * WEIGHTS.killThreatFactor;
  const specialSlug = target.abilities[1];
  if (specialSlug && abilityReady(target, specialSlug)) v += 10; // unspent special = extra latent threat
  return v;
}

/**
 * Highest execute threshold (e.g., Kill Shot's healthThreshold) available to
 * any living ally right now — used to reward chipping enemies into range.
 */
function bestKillThreshold(
  allies: UnitInstance[],
  map: Map<string, AbilityDefinition>,
): number {
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

/** How many living-unit initiative slots until `targetId` acts (99 if unknown). */
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
  /** Hypothetical caster position (may differ from caster.position when planning move-then-act). */
  casterPos: BoardPosition;
  myPlayerId: string;
  /** Best execute threshold available to our team (0 if none). */
  killThreshold: number;
}

/** A unit's effective position within a hypothetical plan. */
function effPos(ctx: ScoreCtx, u: UnitInstance): BoardPosition {
  return u.instanceId === ctx.caster.instanceId ? ctx.casterPos : u.position;
}

/** Score all of an ability's effects as applied to one target unit. */
function scoreEffectsOnTarget(
  ctx: ScoreCtx,
  def: AbilityDefinition,
  target: UnitInstance,
): number {
  const { caster, map } = ctx;
  const isSelf = target.instanceId === caster.instanceId;
  const isAllyTarget = target.ownerPlayerId === caster.ownerPlayerId;
  const isEnemy = !isAllyTarget;
  let s = 0;
  // Effects apply in sequence: a push moves the target BEFORE a subsequent
  // root lands (Fear = push, then root). Track the projected position so
  // position-sensitive effects evaluate where the target will actually be,
  // and the actual pushed distance so the root's turn-denial model can
  // count the re-closing travel turns (0 for a fully blocked push).
  let projectedPos = target.position;
  let pushedDistance = 0;

  for (const eff of def.effects) {
    switch (eff.type) {
      case 'damage': {
        const p = def.isUnblockable ? 1 : hitChance(target.armorClass);

        // Execute effect (Kill Shot): only worth anything at/below threshold.
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
            // Potential kill this action
            s += p * killValue(target, map);
          } else if (
            ctx.killThreshold > 0 &&
            target.currentHealth > ctx.killThreshold &&
            target.currentHealth - eff.value <= ctx.killThreshold
          ) {
            // Sets up an ally's execute (Kill Shot combo awareness)
            s += p * WEIGHTS.killShotSetup;
          }
        } else {
          s -= expected * (isSelf ? WEIGHTS.selfDamage : WEIGHTS.allyDamage);
          if (eff.value >= target.currentHealth) {
            // NOT scaled by hit chance: a high-AC ally (p = 0.45) previously
            // discounted this penalty enough for a big enemy killValue to
            // outweigh it. Risking an ally's life is bad regardless of odds;
            // the hit roll already discounts the expected-damage component.
            s -= WEIGHTS.allyDeathPenalty;
          } else if (
            target.currentHealth - expected <=
            target.maxHealth * WEIGHTS.allyNearDeathThreshold
          ) {
            // Near-death deterrent: this hit wouldn't kill the ally, but it
            // would leave them one hit from dying to anything. Softer than
            // the death penalty — high strategic upside can still justify
            // it, but the brain prefers centers that don't clip wounded allies.
            s -= WEIGHTS.allyDeathPenalty * WEIGHTS.allyNearDeathFactor;
          }
        }
        break;
      }

      case 'heal': {
        if (isEnemy) {
          s -= eff.value; // never heal enemies
          break;
        }
        const effective = Math.min(
          eff.value,
          target.maxHealth - target.currentHealth,
        );
        s += effective * WEIGHTS.heal;
        if (target.currentHealth <= target.maxHealth * 0.4) {
          s += effective * WEIGHTS.healUrgency; // triage bonus
        }
        break;
      }

      case 'apply_status': {
        if (!isEnemy) {
          s -= WEIGHTS.statusOnAllyPenalty;
          break;
        }
        // Redundancy guards — don't waste debuffs on already-debuffed targets:
        // a frozen unit can't move or act, so rooting it adds nothing.
        if (eff.statusSlug === 'rooted' && hasStatus(target, 'frozen')) break;
        // Re-applying an active status only extends its duration — worth a
        // small fraction of a fresh application, never a once-per-game special.
        if (hasStatus(target, eff.statusSlug)) {
          if (eff.statusSlug === 'frozen') {
            s +=
              (WEIGHTS.stunFlat +
                eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor) *
              WEIGHTS.redundantStatusFactor;
          } else if (eff.statusSlug === 'rooted') {
            s += eff.durationTurns * WEIGHTS.rootRangedFlat * WEIGHTS.redundantStatusFactor;
          }
          break;
        }
        if (eff.statusSlug === 'frozen') {
          s +=
            WEIGHTS.stunFlat +
            eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor;
          if (slotsUntilUnitActs(ctx.state, target.instanceId) <= 2) {
            s += WEIGHTS.initiativeSoonBonus;
          }
        } else if (eff.statusSlug === 'rooted') {
          if (isMelee(target, map)) {
            // TURN-DENIAL MODEL: the real value of rooting a melee unit is
            // how many turns of its damage output we deny, not tiles gained.
            //
            // (a) Immobile turns: for the root's duration it attacks only if
            //     one of our units sits within its basic range of where it
            //     will actually stand (post-push projected position).
            const tBasic = basicDef(target, map);
            const tRange = tBasic?.range ?? 1;
            const canStillReachUs = ctx.state.units.some(
              (u) =>
                u.isAlive &&
                u.ownerPlayerId === caster.ownerPlayerId &&
                manhattanDistance(effPos(ctx, u), projectedPos) <= tRange,
            );
            const immobileTurns = eff.durationTurns * (canStillReachUs ? 0.3 : 1);
            // (b) Travel turns: after the root expires it must re-close the
            //     gap the push opened before it can attack again. A fully
            //     blocked push (pushedDistance 0) contributes nothing here.
            const travelTurns =
              pushedDistance / Math.max(1, target.movementRange);
            s +=
              (immobileTurns + travelTurns) *
              threatPerTurn(target, map) *
              WEIGHTS.rootTurnDenialFactor;
          } else {
            s += eff.durationTurns * WEIGHTS.rootRangedFlat;
          }
          // Ally exploitation: a rooted unit that one of our melee units can
          // reach is a free target for the root's duration. Bonus scales with
          // the best qualifying ally's per-turn threat. Uses the projected
          // (post-push) position — pushing an enemy AWAY from our fighter
          // and then rooting it earns no exploitation credit.
          let exploit = 0;
          for (const a of ctx.state.units) {
            if (!a.isAlive || a.ownerPlayerId !== caster.ownerPlayerId) continue;
            if (a.instanceId === caster.instanceId) continue;
            if (!isMelee(a, map)) continue;
            if (
              manhattanDistance(effPos(ctx, a), projectedPos) <=
              a.movementRange + 1
            ) {
              exploit = Math.max(exploit, threatPerTurn(a, map));
            }
          }
          s += exploit * eff.durationTurns * WEIGHTS.rootExploitFactor;
        }
        break;
      }

      case 'push': {
        if (!isEnemy) {
          s -= 10;
          break;
        }
        // pushDestination walks tile-by-tile and stops at occupied/invalid
        // tiles, so `moved` is the ACTUAL displacement — a fully blocked
        // push scores zero. Record the destination so later effects in the
        // same ability (e.g., Fear's root) evaluate the post-push position.
        const dest = pushDestination(
          ctx.casterPos,
          projectedPos,
          eff.distance,
          ctx.state.units,
          target.instanceId,
        );
        const moved = chebyshevDistance(projectedPos, dest);
        projectedPos = dest;
        pushedDistance += moved;
        s += moved * (isMelee(target, map) ? WEIGHTS.pushMeleePerTile : WEIGHTS.pushRangedPerTile);
        break;
      }

      default:
        break; // pull / modify_cooldown / remove_status: no current abilities use them
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Candidate action enumeration
// ---------------------------------------------------------------------------

interface Candidate {
  action: TurnAction;
  score: number;
}

/**
 * Hard-veto check: would this ability's raw damage kill a teammate (an ally
 * or the caster itself)? Used to discard AOE centers / line directions
 * outright — no enemy kill bonus is allowed to buy an ally's death.
 * (Execute effects with healthThreshold are enemy-only and ignored here.)
 */
function wouldKillTeammate(
  def: AbilityDefinition,
  caster: UnitInstance,
  target: UnitInstance,
): boolean {
  if (target.ownerPlayerId !== caster.ownerPlayerId) return false;
  for (const eff of def.effects) {
    if (eff.type !== 'damage') continue;
    if (eff.healthThreshold !== undefined) continue;
    if (eff.value >= target.currentHealth) return true;
  }
  return false;
}

const LINE_DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Enumerate every worthwhile ability use available to the caster from
 * ctx.casterPos. Returns only candidates with positive score (a negative or
 * zero-value ability use is always dominated by doing nothing).
 */
function enumerateAbilityActions(ctx: ScoreCtx): Candidate[] {
  const { caster, casterPos, map, state } = ctx;
  const out: Candidate[] = [];
  const units = state.units;
  const aliveEnemyCount = units.filter(
    (u) => u.isAlive && u.ownerPlayerId !== caster.ownerPlayerId,
  ).length;

  for (const slug of caster.abilities) {
    if (!abilityReady(caster, slug)) continue;
    const def = map.get(slug);
    if (!def) continue;
    const reserve = def.isSpecial ? WEIGHTS.specialReserve : 0;

    switch (def.targetingType) {
      case 'self': {
        const score = scoreEffectsOnTarget(ctx, def, caster) - reserve;
        if (score > 0) {
          out.push({
            action: {
              type: 'USE_ABILITY',
              unitInstanceId: caster.instanceId,
              abilitySlug: slug,
              target: casterPos,
            },
            score,
          });
        }
        break;
      }

      case 'single': {
        for (const t of units) {
          if (!t.isAlive) continue;
          const tPos = effPos(ctx, t);
          const dist = manhattanDistance(casterPos, tPos);
          if (dist > def.range) continue;
          if (
            t.instanceId !== caster.instanceId &&
            !hasLineOfSight(casterPos, tPos, units, [
              caster.instanceId,
              t.instanceId,
            ])
          ) {
            continue;
          }
          const score = scoreEffectsOnTarget(ctx, def, t) - reserve;
          if (score > 0) {
            out.push({
              action: {
                type: 'USE_ABILITY',
                unitInstanceId: caster.instanceId,
                abilitySlug: slug,
                target: tPos,
              },
              score,
            });
          }
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
          let enemiesHit = 0;
          let vetoed = false;
          for (const t of units) {
            if (!t.isAlive) continue;
            // Self-centered AOE (Whirlwind) hits everything adjacent but not the caster.
            if (def.range === 0 && t.instanceId === caster.instanceId) continue;
            if (chebyshevDistance(c, effPos(ctx, t)) > def.areaRadius) continue;
            // HARD VETO: never place an AOE where it could kill a teammate.
            if (wouldKillTeammate(def, caster, t)) {
              vetoed = true;
              break;
            }
            hitAny = true;
            if (t.ownerPlayerId !== caster.ownerPlayerId) enemiesHit++;
            score += scoreEffectsOnTarget(ctx, def, t);
          }
          // THREAT-HOLDING: a once-per-game AOE only fires on a real cluster.
          // Spent on a single target it's a wasted zoning threat — unless
          // only one enemy remains, in which case there's nothing to hold for.
          if (
            def.isSpecial &&
            enemiesHit < WEIGHTS.aoeSpecialMinEnemies &&
            aliveEnemyCount >= 2
          ) {
            continue;
          }
          if (!vetoed && hitAny && score > 0) {
            out.push({
              action: {
                type: 'USE_ABILITY',
                unitInstanceId: caster.instanceId,
                abilitySlug: slug,
                target: c,
              },
              score,
            });
          }
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
            const t = units.find(
              (u) =>
                u.isAlive &&
                u.instanceId !== caster.instanceId &&
                samePos(effPos(ctx, u), p),
            );
            if (t) {
              // HARD VETO: never fire a line that could kill a teammate.
              if (wouldKillTeammate(def, caster, t)) {
                vetoed = true;
                break;
              }
              hitAny = true;
              score += scoreEffectsOnTarget(ctx, def, t);
            }
          }
          if (!vetoed && hitAny && score > 0 && lastInBounds) {
            // Target = farthest in-bounds tile along the ray; the engine only
            // needs it to derive the direction.
            out.push({
              action: {
                type: 'USE_ABILITY',
                unitInstanceId: caster.instanceId,
                abilitySlug: slug,
                target: lastInBounds,
              },
              score,
            });
          }
        }
        break;
      }

      default:
        break; // 'cone' — no current abilities use it
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Position scoring (safety + approach)
// ---------------------------------------------------------------------------

/**
 * Expected per-turn danger at a tile: the single most dangerous enemy who can
 * reach it, plus a discounted contribution from every other enemy in reach
 * (only one unit acts per initiative slot, so summing at full value wildly
 * overestimates real per-turn threat).
 */
function dangerAt(
  state: MatchState,
  unit: UnitInstance,
  pos: BoardPosition,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
): number {
  let maxDanger = 0;
  let totalDanger = 0;
  for (const e of state.units) {
    if (!e.isAlive || e.ownerPlayerId === myPlayerId) continue;
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
  return maxDanger + (totalDanger - maxDanger) * WEIGHTS.dangerSecondary;
}

function positionScore(
  state: MatchState,
  unit: UnitInstance,
  pos: BoardPosition,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
  dangerScale = 1,
): number {
  const enemies = state.units.filter(
    (u) => u.isAlive && u.ownerPlayerId !== myPlayerId,
  );
  if (enemies.length === 0) return 0;

  let s = 0;

  // Danger term (scalable: the cornered-unit fallback zeroes this out when
  // no reachable tile is meaningfully safer than any other).
  if (dangerScale > 0) {
    const danger = dangerAt(state, unit, pos, myPlayerId, map);
    const lethal = danger >= unit.currentHealth;
    s -=
      dangerScale *
      danger *
      WEIGHTS.danger *
      (lethal ? WEIGHTS.dangerLethalMult : 1);
  }

  // Approach: shrink the gap to the most attractive target for our basic
  // attack. The low-HP bias only applies while there IS a gap to close —
  // an in-range position costs nothing (previously the bias leaked into
  // gap-0 positions and nudged units to drift out of fights).
  const myBasic = basicDef(unit, map);
  const prefRange = myBasic?.range ?? 1;
  let bestApproachCost = Infinity;
  for (const e of enemies) {
    const gap = Math.max(0, manhattanDistance(pos, e.position) - prefRange);
    const cost =
      gap > 0
        ? gap * WEIGHTS.approach + e.currentHealth * WEIGHTS.approachHpBias
        : 0;
    if (cost < bestApproachCost) bestApproachCost = cost;
  }
  s -= bestApproachCost;

  // THREAT-HOLDING (defensive): respect enemy zoning. If an enemy still
  // holds a damaging AOE special that could plausibly reach this tile next
  // turn, standing clustered with an ally hands them a multi-hit. Penalize
  // proportionally to the held special's damage — the unit spreads out
  // unless the position buys something worth more.
  for (const e of enemies) {
    if (isStunned(e)) continue;
    const specialSlug = e.abilities[1];
    if (!specialSlug || !abilityReady(e, specialSlug)) continue;
    const sd = map.get(specialSlug);
    if (!sd || sd.targetingType !== 'aoe') continue;
    const dmg = sd.effects.reduce(
      (t, ef) =>
        ef.type === 'damage' && ef.healthThreshold === undefined
          ? t + ef.value
          : t,
      0,
    );
    if (dmg <= 0) continue;
    const castReach =
      (isRooted(e) ? 0 : e.movementRange) + sd.range + sd.areaRadius;
    if (manhattanDistance(e.position, pos) > castReach) continue;
    const clusteredWithAlly = state.units.some(
      (u) =>
        u.isAlive &&
        u.instanceId !== unit.instanceId &&
        u.ownerPlayerId === myPlayerId &&
        chebyshevDistance(u.position, pos) <= sd.areaRadius * 2,
    );
    if (clusteredWithAlly) s -= dmg * WEIGHTS.aoeClusterAvoidance;
  }

  return s;
}

// ---------------------------------------------------------------------------
// Full-turn planning
// ---------------------------------------------------------------------------

export interface TurnPlan {
  score: number;
  actions: TurnAction[];
}

/**
 * Plan the best full turn for `unit`: some combination of movement, one
 * ability use (or Charge), in either order, ending with END_TURN.
 *
 * `mustAct` forces the plan to contain at least one unit-identifying action
 * (needed in Round 1 where END_TURN commits a unit and the engine must know
 * which one was selected).
 */
export function planBestTurn(
  state: MatchState,
  unit: UnitInstance,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
  mustAct = false,
): TurnPlan {
  const allies = state.units.filter(
    (u) => u.isAlive && u.ownerPlayerId === myPlayerId,
  );
  const killThreshold = bestKillThreshold(allies, map);
  const rooted = isRooted(unit);
  const moveTiles = rooted
    ? []
    : reachableTiles(unit, state.units, unit.movementRange);

  // Cornered-unit fallback (anti-kiting): when this is our LAST living unit
  // and no reachable tile is meaningfully safer than any other, retreating
  // gains nothing — the danger penalty just makes every fighting position
  // look suicidal (dangerLethalMult fires everywhere). Zero the danger term
  // so pure action value decides, and the unit fights instead of fleeing.
  // The approach term stays active, so it still closes toward targets.
  let dangerScale = 1;
  if (allies.length === 1 && moveTiles.length > 0) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const pos of [unit.position, ...moveTiles]) {
      const d = dangerAt(state, unit, pos, myPlayerId, map);
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
    if (hi - lo < WEIGHTS.corneredDangerSpread) dangerScale = 0;
  }

  const pScore = (pos: BoardPosition) =>
    positionScore(state, unit, pos, myPlayerId, map, dangerScale);

  const END: TurnAction = { type: 'END_TURN' };
  let best: TurnPlan = { score: -Infinity, actions: [END] };
  const consider = (score: number, actions: TurnAction[]) => {
    if (score > best.score) best = { score, actions };
  };

  // 1. Do nothing.
  if (!mustAct) {
    consider(pScore(unit.position), [END]);
  }

  // 2. Move only.
  for (const pos of moveTiles) {
    consider(pScore(pos) - WEIGHTS.moveTax, [
      { type: 'MOVE', unitInstanceId: unit.instanceId, destination: pos },
      END,
    ]);
  }

  // Precompute the best retreat tile (for act-then-move / hit-and-run).
  let bestRetreat: BoardPosition | null = null;
  let bestRetreatScore = -Infinity;
  for (const pos of moveTiles) {
    const ps = pScore(pos);
    if (ps > bestRetreatScore) {
      bestRetreatScore = ps;
      bestRetreat = pos;
    }
  }

  // 3. Act from the current tile, optionally retreating afterward.
  const ctxHere: ScoreCtx = {
    state,
    map,
    caster: unit,
    casterPos: unit.position,
    myPlayerId,
    killThreshold,
  };
  for (const cand of enumerateAbilityActions(ctxHere)) {
    consider(cand.score + pScore(unit.position), [cand.action, END]);
    if (bestRetreat) {
      consider(cand.score + bestRetreatScore - WEIGHTS.moveTax, [
        cand.action,
        { type: 'MOVE', unitInstanceId: unit.instanceId, destination: bestRetreat },
        END,
      ]);
    }
  }

  // 4. Move, then act.
  for (const pos of moveTiles) {
    const ps = pScore(pos) - WEIGHTS.moveTax;
    const ctx: ScoreCtx = {
      state,
      map,
      caster: unit,
      casterPos: pos,
      myPlayerId,
      killThreshold,
    };
    for (const cand of enumerateAbilityActions(ctx)) {
      consider(cand.score + ps, [
        { type: 'MOVE', unitInstanceId: unit.instanceId, destination: pos },
        cand.action,
        END,
      ]);
    }
  }

  // 5. Move + Charge (double move). Pure repositioning — competes on position
  //    score alone, so it only wins when no ability use is worth anything.
  //    GAME RULE: Charge is only legal during rounds 1-10.
  if (state.roundNumber <= CHARGE_MAX_ROUND) {
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

  // Fallback for mustAct when the unit literally cannot move or act.
  if (best.score === -Infinity) {
    best = { score: 0, actions: [END] };
  }
  return best;
}

// ---------------------------------------------------------------------------
// OptimalBrain
// ---------------------------------------------------------------------------

export class OptimalBrain implements AIBrain {
  selectActions(
    state: MatchState,
    myPlayerId: string,
    abilityMap: Map<string, AbilityDefinition>,
  ): TurnAction[] {
    const initiative = state.initiative;

    // Case 1: the engine has designated the active unit (Round 2+, or a
    // Round-1 harness that pre-selects). We must act with that unit.
    if (initiative.activeUnitId) {
      const u = state.units.find(
        (x) => x.instanceId === initiative.activeUnitId,
      );
      if (!u || u.ownerPlayerId !== myPlayerId || !u.isAlive || isStunned(u)) {
        return [{ type: 'END_TURN' }];
      }
      return planBestTurn(state, u, myPlayerId, abilityMap).actions;
    }

    // Case 2: Round 1 with no pre-selected unit — the brain also chooses
    // which uncommitted unit to commit. Units already in initiative.order
    // are committed. Round 1 commitment is about locking a unit into the
    // initiative order, so even frozen or dead units must eventually be
    // committed — the engine rejects END_TURN without a commitment.
    if (initiative.isRound1) {
      const committed = new Set(initiative.order);
      const uncommitted = state.units.filter(
        (u) => u.ownerPlayerId === myPlayerId && !committed.has(u.instanceId),
      );

      // Group 1 — usable this round (alive, not frozen): always preferred.
      // Commit the unit whose best turn scores highest, which naturally
      // front-loads units with real work available.
      const usable = uncommitted.filter((u) => u.isAlive && !isStunned(u));
      if (usable.length > 0) {
        let bestPlan: TurnPlan | null = null;
        for (const c of usable) {
          const p = planBestTurn(state, c, myPlayerId, abilityMap, true);
          if (!bestPlan || p.score > bestPlan.score) bestPlan = p;
        }
        if (bestPlan) return bestPlan.actions;
      }

      // Group 2 — forced commitment: only frozen/dead units remain. Prefer
      // frozen over dead (a frozen unit will eventually act; a dead one
      // never will, so it belongs later in the order). Tiebreak is the first
      // in unit order — deterministic for sim reproducibility; the choice
      // doesn't affect game outcomes.
      const frozenUnits = uncommitted.filter((u) => u.isAlive && isStunned(u));
      const deadUnits = uncommitted.filter((u) => !u.isAlive);
      const forced = frozenUnits.length > 0 ? frozenUnits : deadUnits;
      if (forced.length > 0) {
        // Frozen and dead units cannot be committed via MOVE — the engine
        // ticks freeze before processing the action and then rejects MOVE
        // for frozen units. Return bare END_TURN so the harness's Round 1
        // recovery force-commits the unit directly into initiative.order.
        return [{ type: 'END_TURN' }];
      }
    }

    return [{ type: 'END_TURN' }];
  }
}

// ---------------------------------------------------------------------------
// BaselineBrain — the sim-baseline "minimum" AI: walk toward the nearest
// enemy and basic-attack when in range. Useful as a sanity-check opponent
// and for measuring how much the OptimalBrain's heuristics matter.
// ---------------------------------------------------------------------------

export class BaselineBrain implements AIBrain {
  selectActions(
    state: MatchState,
    myPlayerId: string,
    abilityMap: Map<string, AbilityDefinition>,
  ): TurnAction[] {
    const unit = this.resolveUnit(state, myPlayerId);
    if (!unit || isStunned(unit)) return [{ type: 'END_TURN' }];

    const enemies = state.units.filter(
      (u) => u.isAlive && u.ownerPlayerId !== myPlayerId,
    );
    if (enemies.length === 0) return [{ type: 'END_TURN' }];

    const basicSlug = unit.abilities[0];
    const basic = basicSlug ? abilityMap.get(basicSlug) : undefined;
    const range = basic?.range ?? 1;

    let nearest = enemies[0];
    for (const e of enemies) {
      if (
        manhattanDistance(unit.position, e.position) <
        manhattanDistance(unit.position, nearest.position)
      ) {
        nearest = e;
      }
    }

    const actions: TurnAction[] = [];
    let pos = unit.position;

    // Step toward the nearest enemy if out of range.
    if (manhattanDistance(pos, nearest.position) > range && !isRooted(unit)) {
      const tiles = reachableTiles(unit, state.units, unit.movementRange);
      let bestTile: BoardPosition | null = null;
      let bestDist = manhattanDistance(pos, nearest.position);
      for (const t of tiles) {
        const d = manhattanDistance(t, nearest.position);
        if (d < bestDist) {
          bestDist = d;
          bestTile = t;
        }
      }
      if (bestTile) {
        actions.push({
          type: 'MOVE',
          unitInstanceId: unit.instanceId,
          destination: bestTile,
        });
        pos = bestTile;
      }
    }

    // Attack if now in range with LOS.
    if (
      basic &&
      manhattanDistance(pos, nearest.position) <= range &&
      hasLineOfSight(pos, nearest.position, state.units, [
        unit.instanceId,
        nearest.instanceId,
      ])
    ) {
      actions.push({
        type: 'USE_ABILITY',
        unitInstanceId: unit.instanceId,
        abilitySlug: basic.slug,
        target: nearest.position,
      });
    }

    actions.push({ type: 'END_TURN' });
    return actions;
  }

  private resolveUnit(
    state: MatchState,
    myPlayerId: string,
  ): UnitInstance | null {
    const { initiative } = state;
    if (initiative.activeUnitId) {
      const u = state.units.find(
        (x) => x.instanceId === initiative.activeUnitId,
      );
      return u && u.ownerPlayerId === myPlayerId && u.isAlive ? u : null;
    }
    if (initiative.isRound1) {
      const committed = new Set(initiative.order);
      return (
        state.units.find(
          (u) =>
            u.ownerPlayerId === myPlayerId &&
            u.isAlive &&
            !committed.has(u.instanceId) &&
            !isStunned(u),
        ) ?? null
      );
    }
    return null;
  }
}
