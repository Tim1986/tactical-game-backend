/**
 * aiBrain.ts (v7) — AI decision-making for DungeonCombat, updated for:
 *  - 8x8 CROSS BOARD: all board loops use BOARD_SIZE (see geometry.ts —
 *    BOARD_WIDTH=10 was a pre-existing engine bug, now fixed; this brain
 *    always used the correct 8x8 board and never needed BOARD_WIDTH/HEIGHT).
 *  - CUSTOMIZATION: chosen stat passives are baked into instance stats by
 *    matchService (transparent here); 'immovable' behavioral passive zeroes
 *    push/pull value; specials resolved by isSpecial (order-agnostic).
 *  - NEW EFFECTS/STATUSES: pull + remove_status scoring; burning / weakened
 *    / exposed / shielded scoring (active only when those slugs appear —
 *    forward-compatible with the new special roster).
 *  - ENGINE ALIGNMENT: round-1 commitment rejects frozen units PRE-tick
 *    (presence-based again, per current turnProcessor); LOS matches the
 *    engine (currently NOT enforced — see geometry.LOS_ENFORCED).
 *
 * PERFECT-INFORMATION NOTE: this brain reads actual enemy ability slugs from
 * state (fine for sims — symmetric — and for PvE). Hidden-special inference
 * for a "fair" opponent model is future work.
 *
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
  LOS_ENFORCED,
  reachableTiles,
  reachableFrom,
  findPath,
  pushDestination,
  pullDestination,
  isTerrainBlocked,
  wallsBlockLine,
} from './geometry';
// Shared AOE shape predicate — the engine's resolveTargets uses the SAME
// function, so brain hit prediction can never diverge from engine resolution.
import { isInAoe } from '../game/boardUtils.js';
import {
  BURNING_DAMAGE_PER_STACK, missChanceOf, WEAKENED_DAMAGE_REDUCTION,
  OPPORTUNIST_BONUS_BY_CLASS, VENGEFUL_BONUS_BY_CLASS,
} from '../game/abilityExecutor.js';

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
  /** Root value factor vs melee targets (denies their whole turn if nobody is adjacent). */
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
  /** Round at which the special reserve starts fading (see specialReserveFor). */
  reserveDecayStartRound: 6,
  /** Round at which the special reserve reaches 0. */
  reserveDecayEndRound: 12,
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
  /**
   * FIRST-STRIKE MODEL (v8): extra danger multiplier on plans that end inside
   * enemy threat range WITHOUT attacking (a gifted first hit).
   *
   * SHIPPED AT 1.0 (DORMANT) — A/B sims (240 games/cell, new-vs-old, mirror
   * comps incl. 2rogue+2ranger, plus a turtle-proxy opponent) showed every
   * value above 1 LOSES: 3.0 dropped mirror win rate to ~33% and even
   * underperformed against the turtle. Caution at the reach boundary cedes
   * board space and tempo; the aggressor picks where to concentrate. The
   * anti-bait work is done by unsupportedDangerMult instead. Knob + round
   * decay kept for future tuning against real human data.
   */
  firstStrikeDangerMult: 1.0,
  /** Round at which the first-strike multiplier starts fading toward 1 —
   *  someone has to blink or mirror matches stall forever. */
  firstStrikeDecayStartRound: 8,
  /** Round at which the first-strike multiplier reaches 1 (base danger). */
  firstStrikeDecayEndRound: 14,
  /**
   * COORDINATED ADVANCE (v8): danger multiplier when NO living ally is within
   * supportRadius of the evaluated tile. A lone unit inside enemy threat
   * range is the overextension a waiting player collapses on ("let the AI
   * come to you piecemeal" — the Gloomhaven bait). With a teammate in
   * support range the same tile is a front line, at base danger.
   *
   * TUNING (A/B sims): us=2.0 + supportRadius 6 beats a turtle-proxy 66-88%
   * across comps with NO regression vs the old aggressive brain (~50%
   * mirrors). Radius 4 was too tight for melee trains (fighter engaging with
   * backline 5-6 behind is supported in practice — allies arrive next turn)
   * and cost 14 points in the physical mirror.
   */
  unsupportedDangerMult: 2.0,
  /** Manhattan radius within which an ally counts as supporting a tile (legacy
   *  fallback, used when supportProjection is 0). */
  supportRadius: 6,
  /**
   * PROJECTION-BASED SUPPORT (v9): 1 = an ally supports a tile only if it
   * could attack an enemy ADJACENT to that tile next turn (its move + basic
   * range + 1). 0 = legacy flat supportRadius.
   *
   * Motivation (exploit battery, SpongeBaitBot): with the flat radius, a
   * lone fighter round-1 charging into the enemy corner counted a cleric six
   * tiles behind as "support" — a move-3 melee ally at distance 6 cannot
   * project any force there next turn, and the corner wall collapsed on the
   * charger piecemeal (48% bot wins on the melee mirror). Projection makes
   * melee support tighter (5) and ranged support LONGER (9-10) than the old
   * radius — support now means "can actually help", not "is near-ish".
   */
  supportProjection: 1,
  /** Danger multiplier when the incoming expected damage could kill us. */
  dangerLethalMult: 2.2,
  /** Pull toward closing the gap to attackable targets (per tile of gap). */
  approach: 1.5,
  /** Lean toward approaching low-HP enemies (per point of target HP). */
  approachHpBias: 0.08,

  // ── OBJ1 (2026-08-31): objective play. See the rewritten tile block in
  // positionScore for the four defects these replace.
  /** Per-step pull toward the escort's goal — leads the NPC without crowding
   *  it, since the escort's own doctrine does the walking.
   *  MEASURED: 1.2/3.5 gives OBJ +1.7pts; the softer 0.6/2.0 variant was
   *  tried to cure a ranged-party regression on e10 and came out WORSE
   *  overall (+1.3) and less consistent. Do not re-soften without new data. */
  escortLead: 1.2,
  /** Manhattan distance from the escort beyond which the party is failing to
   *  shield it. Matches supportRadius: past this, help arrives too late. */
  escortShieldRadius: 6,
  /** Penalty per step beyond escortShieldRadius. Losing the charge loses the
   *  encounter outright, so drifting off it is expensive. */
  escortShield: 3.5,
  /** Urgency multiplier on objective approach when the loss clock is close.
   *  1 = no deadline pressure; ramps to this at the deadline. */
  objectiveUrgencyMax: 3.0,
  /** Bonus for chipping an enemy into an ally's execute (Kill Shot) threshold. */
  killShotSetup: 12,
  /** Value of burning an enemy's shielded status with a cheap attack. */
  shieldBurn: 5,
  /** Penalty for friendly-fire AOE consuming an ally's shield. */
  shieldWastePenalty: 6,
  /** Floor value of applying shielded to an ally. */
  shieldBaseValue: 10,
  /** Bonus when the shielded ally sits inside the enemy execute window. */
  shieldExecuteDenial: 25,
  /** Discount on burning's total dot (target may die/heal before it ticks). */
  burningFactor: 0.85,
  /** Base value of exposing a target (focus mark). */
  exposedBase: 5,
  /** Value per tile an enemy is dragged toward us. */
  pullPerTile: 3,
  /** Fraction of our reachable melee threat credited to a hostile pull. */
  pullExploitFactor: 0.6,
  /** Fraction of removed danger credited to Rescue-style ally pulls. */
  rescueDangerFactor: 0.7,
  /** Tiny tax per move action so the AI doesn't shuffle pointlessly on ties. */
  moveTax: 0.01,
  /** Assumed AC when estimating a unit's generic threat output. */
  referenceAC: 15,

  /**
   * ENDGAME (round 11+): ending a turn farther (Manhattan) from the nearest
   * enemy than it started costs the unit 1 HP (engine drain rule). The real
   * cost is 1, but the penalty is slightly higher because the drain is
   * deterministic while most danger the brain weighs against it is
   * probabilistic — a certain loss should outweigh an equal expected loss.
   */
  endgameDrainPenalty: 2,
};


// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** Long-run hit rate for a blockable ability. Complement of missChanceOf. */
export function hitChance(armorClass: number): number {
  return 1 - missChanceOf(armorClass);
}


function hasStatus(u: UnitInstance, slug: string): boolean {
  // NOTE: no turnsRemaining filter — the engine's validators don't filter
  // either (tickUnitStatusEffects removes expired effects, so presence in
  // the array means active). Matching the engine exactly avoids brain/engine
  // disagreements at tick boundaries (see V3 feedback, Bug B).
  return u.statusEffects.some((e) => e.slug === slug);
}

/** Patch 1.0.04: the freeze/immobilize status slug is 'frozen' everywhere. */
export function isFrozen(u: UnitInstance): boolean {
  return hasStatus(u, 'frozen');
}

export function isRooted(u: UnitInstance): boolean {
  return hasStatus(u, 'rooted');
}

/** Highest turnsRemaining for a status on this unit (0 if absent). */
function statusTurnsRemaining(u: UnitInstance, slug: string): number {
  let max = 0;
  for (const e of u.statusEffects) {
    if (e.slug === slug && e.turnsRemaining > max) max = e.turnsRemaining;
  }
  return max;
}

/**
 * END-OF-TURN TICK SEMANTICS: the engine applies only burning DoT at the start
 * of a unit's turn and decrements status durations at the END of that turn, so
 * a debuff is in force for every turn it is present (turnsRemaining >= 1). A
 * rooted/weakened unit with any remaining duration is blocked/affected on its
 * next turn. (Was `>= 2` under the old tick-first engine, which expired a
 * 1-turn debuff before it could bite.)
 */
export function willBlockOwnAction(u: UnitInstance, slug: string): boolean {
  return statusTurnsRemaining(u, slug) >= 1;
}

/**
 * True if this unit's own start-of-turn status tick will kill it. The engine
 * ticks the acting unit's statuses BEFORE processing its actions (burning:
 * 5 dmg/stack), so a doomed unit's queued actions would all throw
 * "Unit is dead" — it must submit bare END_TURN (round 2+) and cannot be
 * chosen for a round-1 commitment.
 */
export function willDieToOwnTick(u: UnitInstance): boolean {
  const burning = u.statusEffects.find((e) => e.slug === 'burning');
  if (!burning) return false;
  return u.currentHealth <= BURNING_DAMAGE_PER_STACK * burning.stacks;
}

function abilityReady(u: UnitInstance, slug: string): boolean {
  return (u.cooldowns[slug] ?? 0) <= 0;
}

function basicDef(
  u: UnitInstance,
  map: Map<string, AbilityDefinition>,
): AbilityDefinition | undefined {
  // Prefer the first NON-special ability rather than trusting index 0 —
  // ability array order is a convention, not a guarantee, across data
  // sources (defensive hardening from the V4 review).
  for (const slug of u.abilities) {
    const d = map.get(slug);
    if (d && !d.isSpecial) return d;
  }
  return u.abilities.length > 0 ? map.get(u.abilities[0]) : undefined;
}

/** The unit's special ability slug, resolved by isSpecial (order-agnostic). */
function specialSlugOf(
  u: UnitInstance,
  map: Map<string, AbilityDefinition>,
): string | undefined {
  for (const slug of u.abilities) {
    if (map.get(slug)?.isSpecial) return slug;
  }
  return u.abilities[1];
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
    if (eff.type !== 'damage' && eff.type !== 'lifesteal') continue;
    if (eff.type === 'damage' && eff.healthThreshold !== undefined) continue; // conditional executes aren't steady DPS
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
  const specialSlug = specialSlugOf(target, map);
  if (specialSlug && abilityReady(target, specialSlug)) v += 10; // unspent special = extra latent threat
  return v;
}

/**
 * The REAL execute window for one effect against one target.
 *
 * ⚠ THIS MUST MIRROR abilityExecutor's threshold exactly. An execute may carry
 * a flat cutoff, a PERCENT-OF-MAX cutoff, or both, and the engine takes the
 * higher. The brain used to read only the flat field, which meant that in
 * campaign — where `applyCampaignAbilityTuning` gives assassinate a 25%-of-max
 * window — the brain believed it could only execute below 22 HP while the
 * engine was happy to execute a 320 HP boss below 80. The brain therefore
 * neither cashed the window in nor chipped toward it, and assassinate measured
 * as the WORST special in every boss cell while actually being one of the most
 * dangerous. Found because the owner said the numbers were not plausible.
 */
export function executeWindow(
  eff: { healthThreshold?: number; healthThresholdPercent?: number },
  target: UnitInstance,
): number {
  return Math.max(
    eff.healthThreshold ?? 0,
    Math.round((eff.healthThresholdPercent ?? 0) * target.maxHealth),
  );
}

/**
 * Highest execute threshold available to any living ally right now — used to
 * reward chipping enemies into range. Returns BOTH parts because the percent
 * part cannot be resolved without knowing the target; call `killWindowFor` to
 * combine them against a specific enemy.
 */
function bestKillThreshold(
  allies: UnitInstance[],
  map: Map<string, AbilityDefinition>,
): KillWindow {
  let flat = 0;
  let percent = 0;
  for (const a of allies) {
    for (const slug of a.abilities) {
      if (!abilityReady(a, slug)) continue;
      const def = map.get(slug);
      if (!def) continue;
      for (const eff of def.effects) {
        if (eff.type === 'damage' && (eff.healthThreshold !== undefined || eff.healthThresholdPercent !== undefined)) {
          flat = Math.max(flat, eff.healthThreshold ?? 0);
          percent = Math.max(percent, eff.healthThresholdPercent ?? 0);
        }
      }
    }
  }
  return { flat, percent };
}

export interface KillWindow { flat: number; percent: number }

/** Resolve a KillWindow against a specific target, engine-identically. */
export const killWindowFor = (w: KillWindow, target: UnitInstance): number =>
  Math.max(w.flat, Math.round(w.percent * target.maxHealth));

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
  killThreshold: KillWindow;
  /** Best execute threshold available to the ENEMY team (0 if none) —
   *  used to value Ward/shielded as Kill Shot denial. */
  enemyKillThreshold: KillWindow;
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

  // ── NEGATION GATE (shielded) ──
  // 'shielded' negates the next hit entirely — including unblockable damage.
  const isDamaging = def.effects.some((e) => e.type === 'damage' || e.type === 'lifesteal');
  if (isDamaging && !isSelf) {
    if (hasStatus(target, 'shielded')) {
      return isEnemy ? WEIGHTS.shieldBurn : -WEIGHTS.shieldWastePenalty;
    }
  }

  // Weakened caster: the engine's weakenedAdjustedDamage runs on EVERY
  // damage/lifesteal effect, flooring each at 0 — not once per ability. This
  // used to model it as a single 4-point budget consumed by the first effect,
  // so a weakened multi-effect attack was overvalued: Twin Strike scored
  // (8-4)+8 = 12 while the engine actually deals (8-4)+(8-4) = 8.
  const weakenCut = hasStatus(caster, 'weakened') ? WEAKENED_DAMAGE_REDUCTION : 0;
  // Opportunist passive: engine adds +4 (per-class override: Ranger +5) per
  // damage/lifesteal effect against a target with ANY status effect (added
  // after the weaken cut, not reduced by it). Read the engine's own per-class
  // maps so a shipped override can never drift from the brain's model.
  const oppValue = OPPORTUNIST_BONUS_BY_CLASS[caster.definitionSlug] ?? 4;
  const vengValue = VENGEFUL_BONUS_BY_CLASS[caster.definitionSlug] ?? 3;
  const opportunistBonus =
    ((caster.passives ?? []).includes('opportunist') && target.statusEffects.length > 0 ? oppValue : 0)
    // Vengeful passive: +3 (Barbarian +4) while the caster sits at or below half health.
    + ((caster.passives ?? []).includes('vengeful') && caster.currentHealth * 2 <= caster.maxHealth ? vengValue : 0)
    // Channeler passive: +2 per damage effect on a turn the caster does not
    // move. ctx.casterPos is the PROJECTED cast tile — if this plan moves
    // first, the bonus is off, so "stay and cast" naturally outscores
    // "step and cast" when both reach the same target.
    + ((caster.passives ?? []).includes('channeler')
        && !caster.hasMovedThisTurn
        && ctx.casterPos.x === caster.position.x && ctx.casterPos.y === caster.position.y ? 2 : 0);
  // Siphon passive: the caster leeches 1 HP per damage/lifesteal effect that
  // lands on an enemy. Tiny, but a real tiebreaker toward aggression when hurt.
  const siphonHeal = (caster.passives ?? []).includes('siphon')
    && caster.currentHealth < caster.maxHealth ? 1 : 0;
  const targetUndying = (target.passives ?? []).includes('undying');
  const targetThorns = isEnemy && (target.passives ?? []).includes('thorns');
  // Thorns passive: each damage/lifesteal effect that lands from an adjacent
  // (cardinal) tile costs the caster 3 HP back. Charged per effect, matching
  // the engine (multi-hit = multiple procs) — the lethality check is
  // CUMULATIVE across procs (twin strike = 6 back; a 5 HP attacker dies).
  let thornsTaken = 0;
  const thornsCost = (targetPos: BoardPosition): number => {
    if (!targetThorns || manhattanDistance(ctx.casterPos, targetPos) !== 1) return 0;
    thornsTaken += 3;
    let cost = 3 * WEIGHTS.selfDamage;
    // A retaliation that would kill the caster is close to never worth it.
    if (caster.currentHealth <= thornsTaken && !(caster.passives ?? []).includes('undying')) {
      cost += WEIGHTS.allyDeathPenalty;
    }
    return cost;
  };
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
        // FORTUNE MODEL: by this point the ability is known to LAND on this
        // target (the negation gate above returned early otherwise), so
        // damage is scored at full deterministic value — no probabilities.

        // Execute effect (Kill Shot): only worth anything at/below threshold.
        if (eff.healthThreshold !== undefined || eff.healthThresholdPercent !== undefined) {
          if (isEnemy && target.currentHealth <= executeWindow(eff, target)) {
            // Undying eats the execute (target survives at 1, flag consumed):
            // still valuable — near-full damage + the safety net stripped —
            // but NOT a kill.
            s += targetUndying
              ? (target.currentHealth - 1) * WEIGHTS.damage
              : killValue(target, map);
          }
          break;
        }

        let raw = Math.max(0, eff.value - weakenCut);
        raw += opportunistBonus;
        const effective = Math.min(raw, target.currentHealth);
        if (isEnemy) {
          s += effective * WEIGHTS.damage;
          // CAMPAIGN objective (A3): a named kill-target (units_dead) draws the
          // party's focus — extra weight on damaging and finishing it.
          const objK = ctx.state.objective;
          if (objK && caster.ownerPlayerId === objK.partyId
            && objK.win.some((w) => w.kind === 'units_dead' && w.unitIds.includes(target.instanceId))) {
            s += effective * WEIGHTS.damage * 0.5;
            if (raw >= target.currentHealth && !targetUndying) s += killValue(target, map) * 0.5;
          }
          // CAMPAIGN protect instinct (A5): when losing the escort loses the
          // encounter (ally_dead), enemies within striking range of a living
          // protected ally are priority kills for the party.
          if (objK && caster.ownerPlayerId === objK.partyId
            && objK.loss.some((l) => l.kind === 'ally_dead')) {
            const protectedIds = objK.loss.flatMap((l) => l.kind === 'ally_dead' ? l.unitIds : []);
            const wards = ctx.state.units.filter((u) => u.isAlive && protectedIds.includes(u.instanceId));
            const threatens = wards.some((w) =>
              manhattanDistance(target.position, w.position) <= (target.movementRange ?? 3) + 1);
            if (threatens) {
              s += effective * WEIGHTS.damage * 0.4;
              if (raw >= target.currentHealth && !targetUndying) s += killValue(target, map) * 0.4;
            }
          }
          // CAMPAIGN objective (A3), DEFENDER side: the party unit nearest the
          // goal tiles is the one actually winning the encounter. Weight is
          // deliberately below the party's own kill-target bonus (0.5) — the
          // defender should lean toward the runner, not tunnel on it.
          if (objK && caster.ownerPlayerId !== objK.partyId) {
            const urgency = raceUrgency(ctx.state, target);
            if (urgency > 0) {
              s += effective * WEIGHTS.damage * 0.45 * urgency;
              if (raw >= target.currentHealth && !targetUndying) s += killValue(target, map) * 0.45 * urgency;
            }
          }
          // CAMPAIGN protect instinct, HERO variant (BR1, the rider GAMEPLAN
          // attaches to any brain revision). `ally_dead` earns +40% protect
          // above; `main_dead` earned NOTHING, so the brain sheltered the hero
          // exactly as much as any other unit while a human shelters the hero
          // more — which made the sim UNDERESTIMATE the player's win rate on
          // every encounter that can be lost by losing the hero. Same shape
          // and weight as the escort instinct: enemies in striking range of
          // the main are priority kills for the party.
          if (objK && caster.ownerPlayerId === objK.partyId
            && objK.loss.some((l) => l.kind === 'main_dead')) {
            const hero = ctx.state.units.find((u) => u.isAlive && u.instanceId === objK.mainId);
            if (hero && manhattanDistance(target.position, hero.position) <= (target.movementRange ?? 3) + 1) {
              s += effective * WEIGHTS.damage * 0.4;
              if (raw >= target.currentHealth && !targetUndying) s += killValue(target, map) * 0.4;
            }
          }
          // CAMPAIGN aiHints (A5): a hunter prioritizes its quarry — the
          // escort ('ally') or the main character ('main'). Strong bias, not
          // absolute (free kills elsewhere still outscore chip damage here).
          if (objK && caster.aiHints?.priorityTarget) {
            const quarry = caster.aiHints.priorityTarget === 'ally'
              ? (objK.allyIds ?? []) : [objK.mainId];
            if (quarry.includes(target.instanceId)) {
              s += effective * WEIGHTS.damage * 0.6;
              if (raw >= target.currentHealth && !targetUndying) s += killValue(target, map) * 0.6;
            }
          }
          if (effective > 0) {
            s -= thornsCost(projectedPos);
            s += siphonHeal * WEIGHTS.heal; // Siphon: leech 1 per landing damage effect
          }
          if (raw >= target.currentHealth && targetUndying) {
            // Lethal damage on an Undying target leaves it at 1 — no kill credit.
          } else if (raw >= target.currentHealth) {
            s += killValue(target, map); // guaranteed kill this action
          } else if (
            killWindowFor(ctx.killThreshold, target) > 0 &&
            target.currentHealth > killWindowFor(ctx.killThreshold, target) &&
            target.currentHealth - raw <= killWindowFor(ctx.killThreshold, target)
          ) {
            s += WEIGHTS.killShotSetup; // banks the execute window for real
          }
        } else {
          s -= effective * (isSelf ? WEIGHTS.selfDamage : WEIGHTS.allyDamage);
          if (raw >= target.currentHealth) {
            s -= WEIGHTS.allyDeathPenalty;
          } else if (
            target.currentHealth - effective <=
            target.maxHealth * WEIGHTS.allyNearDeathThreshold
          ) {
            // Near-death deterrent: this hit wouldn't kill the ally, but it
            // would leave them one hit from dying to anything.
            s -= WEIGHTS.allyDeathPenalty * WEIGHTS.allyNearDeathFactor;
          }
        }
        break;
      }

      case 'lifesteal': {
        // Damages target, heals caster (Life Drain). Scored like flat damage
        // for the target side, plus a heal-on-caster term.
        let raw = Math.max(0, eff.value - weakenCut);
        raw += opportunistBonus;
        const effective = Math.min(raw, target.currentHealth);
        if (isEnemy) {
          s += effective * WEIGHTS.damage;
          if (effective > 0) {
            s -= thornsCost(projectedPos);
            s += siphonHeal * WEIGHTS.heal; // Siphon procs on lifesteal effects too
          }
          if (raw >= target.currentHealth && targetUndying) {
            // Lethal damage on an Undying target leaves it at 1 — no kill credit.
          } else if (raw >= target.currentHealth) {
            s += killValue(target, map);
          } else if (
            killWindowFor(ctx.killThreshold, target) > 0 &&
            target.currentHealth > killWindowFor(ctx.killThreshold, target) &&
            target.currentHealth - raw <= killWindowFor(ctx.killThreshold, target)
          ) {
            s += WEIGHTS.killShotSetup;
          }
        } else {
          s -= effective * (isSelf ? WEIGHTS.selfDamage : WEIGHTS.allyDamage);
          if (raw >= target.currentHealth) s -= WEIGHTS.allyDeathPenalty;
        }
        // Self-heal component: only meaningful if the caster is actually
        // missing HP (matches applyHeal's clamp-to-max in the executor).
        const casterMissing = caster.maxHealth - caster.currentHealth;
        if (casterMissing > 0) {
          const healEffective = Math.min(eff.healValue, casterMissing);
          s += healEffective * WEIGHTS.heal;
          if (caster.currentHealth <= caster.maxHealth * 0.4) {
            s += healEffective * WEIGHTS.healUrgency;
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

      case 'grant_max_health': {
        // Ward: permanent durability for an ALLY. Unlike a heal this is never
        // wasted at full health, so it scores its full value; slight bonus for
        // putting it on a frontliner (the unit that will actually eat hits).
        if (isEnemy) { s -= eff.value; break; }
        s += eff.value * WEIGHTS.heal;
        if (isMelee(target, map)) s += eff.value * 0.25;
        break;
      }

      case 'apply_status': {
        // Stalwart passive: rooted/weakened/exposed are negated outright —
        // the status is worth nothing against this target (engine skips it).
        if (
          (target.passives ?? []).includes('stalwart') &&
          (eff.statusSlug === 'rooted' || eff.statusSlug === 'weakened' || eff.statusSlug === 'exposed')
        ) {
          break;
        }
        // Beneficial statuses (Ward's shielded) are FOR allies.
        if (eff.statusSlug === 'shielded') {
          if (isEnemy) { s -= WEIGHTS.statusOnAllyPenalty; break; }
          // Shields don't stack: landing one on an already-shielded target
          // (Warded passive) throws the shield half of a once-per-match special
          // away. A flat 0 here still let the max-health half carry the cast —
          // Warded clerics with no unshielded ally in range self-cast Ward and
          // wasted it. Charge the floor value the shield WOULD have been worth,
          // so holding the special (or just attacking) wins until the passive
          // shield breaks and the cast is worth its whole payload.
          if (hasStatus(target, 'shielded')) { s -= WEIGHTS.shieldBaseValue; break; }
          // Worth roughly the biggest single hit the enemy team projects
          // at this target, weighted up if the target sits in the enemy's
          // execute window (eating an Assassinate is the dream block).
          let biggest = 0;
          for (const e of ctx.state.units) {
            if (!e.isAlive || e.ownerPlayerId === caster.ownerPlayerId) continue;
            const b = basicDef(e, map);
            if (b) {
              for (const be of b.effects) {
                if (be.type === 'damage' && be.healthThreshold === undefined) {
                  biggest = Math.max(biggest, be.value);
                } else if (be.type === 'lifesteal') {
                  biggest = Math.max(biggest, be.value);
                }
              }
            }
          }
          s += Math.max(WEIGHTS.shieldBaseValue, biggest);
          if (
            killWindowFor(ctx.enemyKillThreshold, target) > 0 &&
            target.currentHealth <= killWindowFor(ctx.enemyKillThreshold, target)
          ) {
            s += WEIGHTS.shieldExecuteDenial; // blocks a pending Kill Shot
          }
          break;
        }
        if (!isEnemy) {
          s -= WEIGHTS.statusOnAllyPenalty;
          break;
        }
        // ── New hostile statuses (v6 roster) ──
        if (eff.statusSlug === 'burning') {
          // 5 damage at the start of each of the target's turns. Attrition
          // value discounted slightly (they may die/heal first), capped by
          // remaining HP.
          const dot = Math.min(BURNING_DAMAGE_PER_STACK * eff.durationTurns, target.currentHealth);
          s += dot * WEIGHTS.burningFactor;
          if (hasStatus(target, 'burning')) s *= WEIGHTS.redundantStatusFactor;
          break;
        }
        if (eff.statusSlug === 'weakened') {
          // -4 outgoing damage while active: worth 4 per turn the target
          // would actually be attacking, scaled by how threatening it is.
          const rel = Math.min(1, threatPerTurn(target, map) / 8);
          s += 4 * eff.durationTurns * (0.5 + rel);
          if (hasStatus(target, 'weakened')) s *= WEIGHTS.redundantStatusFactor;
          break;
        }
        if (eff.statusSlug === 'exposed') {
          s += WEIGHTS.exposedBase * eff.durationTurns;
          if (hasStatus(target, 'exposed')) s *= WEIGHTS.redundantStatusFactor;
          break;
        }
        // CAMPAIGN objective (A3), DEFENDER side: against a RACE, denying
        // movement is worth far more than chip damage — a frozen runner loses
        // a whole turn of ground and a rooted one cannot close at all. Applied
        // to the movement-denying statuses only, scaled by how close the
        // target is to winning. This is what turns "scary-looking freeze
        // casters that fight like brawlers" into a defence.
        if (isEnemy && (eff.statusSlug === 'frozen' || eff.statusSlug === 'rooted')) {
          const urgency = raceUrgency(ctx.state, target);
          if (urgency > 0 && !hasStatus(target, eff.statusSlug)) {
            // Priced against the existing freeze value (stunFlat) rather
            // than a new constant, so it scales with the rest of the model.
            s += WEIGHTS.stunFlat * eff.durationTurns * urgency;
          }
        }
        // Redundancy guards — don't waste debuffs on already-debuffed targets:
        // a frozen unit can't move or act, so rooting it adds nothing.
        if (eff.statusSlug === 'rooted' && hasStatus(target, 'frozen')) break;
        // Re-applying an active status only refreshes its duration. Graded
        // by how much is left: >= 2 turns remaining -> nearly worthless
        // (redundantStatusFactor); exactly 1 remaining -> about half value,
        // since the old application is one tick from expiring.
        {
          const remaining = statusTurnsRemaining(target, eff.statusSlug);
          if (remaining > 0) {
            const factor =
              remaining >= 2 ? WEIGHTS.redundantStatusFactor : 0.5;
            if (eff.statusSlug === 'frozen') {
              s +=
                (WEIGHTS.stunFlat +
                  eff.durationTurns * threatPerTurn(target, map) * WEIGHTS.stunThreatFactor) *
                factor;
            } else if (eff.statusSlug === 'rooted') {
              s += eff.durationTurns * WEIGHTS.rootRangedFlat * factor;
            }
            break;
          }
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
            // END-OF-TURN TICK SEMANTICS: durations decrement at the end of the
            // target's turn, so a root of duration d denies movement for d of the
            // target's turns (a 1-turn root blocks its next turn outright).
            const immobileTurns =
              eff.durationTurns * (canStillReachUs ? 0.3 : 1);
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
        // Displacement immunity: the engine resists push on 'immovable' OR the
        // merged Stalwart flag — no displacement value against either.
        if ((target.passives ?? []).includes('immovable') || (target.passives ?? []).includes('stalwart')) break;
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
          ctx.state.terrain,
        );
        // Manhattan: displacement is valued in TILES OF GROUND, and a diagonal
        // is two of those (MOV-1). Chebyshev scored a diagonal shove as 1.
        const moved = manhattanDistance(projectedPos, dest);
        projectedPos = dest;
        pushedDistance += moved;
        s += moved * (isMelee(target, map) ? WEIGHTS.pushMeleePerTile : WEIGHTS.pushRangedPerTile);
        // CAMPAIGN terrain (A2): shoving an enemy onto a fire hazard is worth
        // the burn it inflicts (discounted like burn damage).
        if (moved > 0 && ctx.state.terrain?.hazards?.some((h) => h.pos.x === dest.x && h.pos.y === dest.y)) {
          s += BURNING_DAMAGE_PER_STACK * WEIGHTS.burningFactor * WEIGHTS.damage;
        }
        break;
      }

      case 'pull': {
        // Eldritch Grasp (enemy) / Rescue (ally). Immovable OR merged-Stalwart
        // targets don't move (engine resists pull on either flag).
        if ((target.passives ?? []).includes('immovable') || (target.passives ?? []).includes('stalwart')) break;
        const dest = pullDestination(
          ctx.casterPos,
          projectedPos,
          eff.distance,
          ctx.state.units,
          target.instanceId,
          ctx.state.terrain,
        );
        // Manhattan for the same reason as push: a diagonal drag covers two
        // tiles of ground, so Chebyshev valued diagonal pulls at half.
        const moved = manhattanDistance(projectedPos, dest);
        projectedPos = dest;
        if (isEnemy) {
          // Dragging an enemy INTO our melee: exploitation value — how much
          // of our melee threat can now reach the landing tile.
          let exploit = 0;
          for (const a of ctx.state.units) {
            if (!a.isAlive || a.ownerPlayerId !== caster.ownerPlayerId) continue;
            if (!isMelee(a, map)) continue;
            const ab = basicDef(a, map);
            if (!ab) continue;
            if (manhattanDistance(effPos(ctx, a), dest) <= a.movementRange + 1) {
              exploit += threatPerTurn(a, map);
            }
          }
          s += moved * WEIGHTS.pullPerTile + exploit * WEIGHTS.pullExploitFactor;
        // CAMPAIGN terrain (A2): dragging someone onto a fire hazard — a bonus
        // against enemies, a real cost when repositioning an ally (Rescue).
        if (moved > 0 && ctx.state.terrain?.hazards?.some((h) => h.pos.x === dest.x && h.pos.y === dest.y)) {
          s += (isEnemy ? 1 : -1) * BURNING_DAMAGE_PER_STACK * WEIGHTS.burningFactor * WEIGHTS.damage;
        }
          // Dragging a RANGED enemy out of its safe pocket is extra tempo.
          if (!isMelee(target, map)) s += moved * 1.5;
        } else {
          // Rescue: value = how much danger the pull removes from the ally.
          const before = dangerAt(ctx.state, target, target.position, caster.ownerPlayerId, map);
          const after = dangerAt(ctx.state, target, dest, caster.ownerPlayerId, map);
          s += Math.max(0, before - after) * WEIGHTS.rescueDangerFactor;
        }
        break;
      }

      case 'remove_status': {
        // Purify: worth the harm it removes from an ALLY.
        if (isEnemy) { s -= 10; break; }
        const rem = statusTurnsRemaining(target, eff.statusSlug);
        if (rem <= 0) break;
        if (eff.statusSlug === 'frozen') {
          s += rem * threatPerTurn(target, map) * 1.1 + 6; // restored turns
        } else if (eff.statusSlug === 'rooted') {
          s += rem * (isMelee(target, map) ? threatPerTurn(target, map) : 4);
        } else if (eff.statusSlug === 'burning') {
          s += Math.min(BURNING_DAMAGE_PER_STACK * rem, target.currentHealth) * WEIGHTS.burningFactor;
        } else if (eff.statusSlug === 'weakened') {
          s += 4 * rem;
        }
        break;
      }

      default:
        // modify_cooldown / teleport: no current abilities use them.
        // move_self scores 0 here BY DESIGN — a leap's value is already
        // expressed in which tiles the blast can reach (the centre enumeration
        // in the 'aoe' case), so paying for it per-target would double-count.
        break;
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Candidate action enumeration
// ---------------------------------------------------------------------------

/**
 * Opportunity cost of spending a once-per-game special, decaying with round
 * number: early on, holding preserves option value; late game an unspent
 * special is simply a wasted special (V4 Bug 2 — specials were dying
 * unspent in 93% of long games). Linear fade between the decay rounds.
 */
/**
 * CAMPAIGN objective (A3), ENEMY side: how close this party unit is to WINNING
 * a tile objective, as a 0..1 urgency.
 *
 * The three objective-aware scoring blocks all gate on `caster === party`, so
 * the defending side was objective-BLIND: it picked targets purely on damage
 * value while a hero walked past it to the goal. The owner played the Storm
 * Door (a race to one door tile, defended by two freeze casters and two
 * blizzard wisps) and reported: "looked really scary, lots of freeze effects,
 * but didn't turn out hard, felt like the AI was playing it badly... a
 * powerful opponent playing badly, not a well balanced opponent playing
 * reasonably well." It had exactly the tools to stop a runner and no reason
 * to aim them at one.
 *
 * Returns 0 when there is no tile objective (every arena match, and every
 * kill-all encounter), so this is inert outside the case it is for.
 */
/**
 * OBJ1: how hard the clock is pressing, as a multiplier on objective approach.
 *
 * A race with a `round_reached` LOSS condition is not the same board on round
 * 1 and round 5, but the old gradient was a flat -1.2/step either way — so the
 * brain ambled toward a deadline it could see. Ramps linearly from 1 (plenty
 * of time) to objectiveUrgencyMax at the deadline, and returns 1 when there is
 * no deadline at all, which keeps every non-timed encounter byte-identical.
 */
function objectiveUrgencyMult(state: MatchState): number {
  const obj = state.objective;
  if (!obj) return 1;
  const deadlines = obj.loss
    .filter((l) => l.kind === 'round_reached')
    .map((l) => (l as { round: number }).round);
  if (deadlines.length === 0) return 1;
  const deadline = Math.min(...deadlines);
  const left = deadline - (state.roundNumber ?? 1);
  if (left <= 0) return WEIGHTS.objectiveUrgencyMax;
  // Pressure begins to bite inside the last 4 rounds.
  const RAMP = 4;
  if (left >= RAMP) return 1;
  return 1 + (WEIGHTS.objectiveUrgencyMax - 1) * ((RAMP - left) / RAMP);
}

function raceUrgency(state: MatchState, target: UnitInstance): number {
  const obj = state.objective;
  if (!obj || target.ownerPlayerId !== obj.partyId) return 0;
  let best = 0;
  for (const w of obj.win) {
    if (w.kind !== 'units_at_tiles') continue;
    const applies = w.scope === 'any' || w.scope === 'all'
      || (w.scope === 'main' && target.instanceId === obj.mainId);
    if (!applies) continue;
    const d = Math.min(...w.tiles.map((t) => manhattanDistance(target.position, t)));
    // 0 tiles away = 1.0, 8+ away = 0. A racer two steps from the door is the
    // whole encounter; one still crossing the board is just a unit.
    best = Math.max(best, Math.max(0, 1 - d / 8));
  }
  return best;
}

function specialReserveFor(state: MatchState): number {
  const r = state.roundNumber;
  const start = WEIGHTS.reserveDecayStartRound;
  const end = WEIGHTS.reserveDecayEndRound;
  if (r <= start) return WEIGHTS.specialReserve;
  if (r >= end) return 0;
  return (WEIGHTS.specialReserve * (end - r)) / (end - start);
}

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
    if (eff.type !== 'damage' && eff.type !== 'lifesteal') continue;
    if (eff.type === 'damage' && eff.healthThreshold !== undefined) continue;
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
    // Self-status cost (Blizzard's channeling self-freeze): losing our own
    // next turn is worth roughly what denying an enemy turn is worth —
    // the caster's threat per turn plus the flat stun baseline.
    const selfStatusCost =
      def.selfStatus?.statusSlug === 'frozen'
        ? threatPerTurn(caster, map) * WEIGHTS.stunThreatFactor + WEIGHTS.stunFlat
        : def.selfStatus?.statusSlug === 'rooted'
          ? WEIGHTS.stunFlat // mobility denial only — the caster still acts
          : 0;
    const reserve = (def.isSpecial ? specialReserveFor(state) : 0) + selfStatusCost;

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
        const damaging = def.effects.some((e) => e.type === 'damage' || e.type === 'lifesteal');
        for (const t of units) {
          if (!t.isAlive) continue;
          const tPos = effPos(ctx, t);
          const dist = manhattanDistance(casterPos, tPos);
          if (dist > def.range) continue;
          // LOS: matches processUseAbility exactly — single-target abilities
          // are LOS-checked unless they carry a push effect (Fear is exempt,
          // mirroring the client UI). Flips with the engine via
          // geometry.LOS_ENFORCED.
          if (
            LOS_ENFORCED &&
            !def.effects.some((e) => e.type === 'push') &&
            t.instanceId !== caster.instanceId &&
            !hasLineOfSight(casterPos, tPos, units, [
              caster.instanceId,
              t.instanceId,
            ], ctx.state.terrain)
          ) {
            continue;
          }
          // HARD GATE (V5): a once-per-game special never fires into a
          // guaranteed negation — a known dodge or an active shield. Basics
          // may (dodge/shield burn is real value); specials retarget/defer.
          if (
            def.isSpecial &&
            damaging &&
            t.ownerPlayerId !== caster.ownerPlayerId &&
            hasStatus(t, 'shielded')
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
        // A leap (move_self) relocates the caster to the blast centre, so the
        // centre doubles as a landing tile: it must be unoccupied, and the
        // caster must not be scored as a victim of its own blast at the tile it
        // is about to VACATE (effPos still reports the pre-leap position).
        const isLeap = def.effects.some((e) => e.type === 'move_self');
        const centers: BoardPosition[] = [];
        if (def.range === 0) {
          centers.push(casterPos);
        } else {
          for (let x = 0; x < BOARD_SIZE; x++) {
            for (let y = 0; y < BOARD_SIZE; y++) {
              const c = { x, y };
              if (!isInBounds(c)) continue;
              if (manhattanDistance(casterPos, c) > def.range) continue;
              // CAMPAIGN terrain (A2): the engine rejects wall centres and
              // wall-blocked centre sight — never propose them. Leaps are
              // exempt from the sight rule (they sail over walls); a wall can
              // still never be the landing/centre tile.
              if (isTerrainBlocked(ctx.state.terrain, c)) continue;
              if (!isLeap && wallsBlockLine(casterPos, c, ctx.state.terrain)) continue;
              if (isLeap && units.some((u) => u.isAlive
                && u.instanceId !== caster.instanceId
                && effPos(ctx, u).x === c.x && effPos(ctx, u).y === c.y)) continue;
              centers.push(c);
            }
          }
        }
        for (const c of centers) {
          let score = -reserve;
          let hitAny = false;
          let enemiesHit = 0;
          let expectsKill = false;
          let vetoed = false;
          for (const t of units) {
            if (!t.isAlive) continue;
            // Self-centered AOE (Whirlwind) hits everything adjacent but not the caster.
            if ((def.range === 0 || isLeap) && t.instanceId === caster.instanceId) continue;
            if (!isInAoe(c, effPos(ctx, t), def.areaRadius, def.areaShape)) continue;
            // CAMPAIGN terrain (A2): the blast spreads from the centre and
            // never crosses walls — mirror the executor exactly.
            if (wallsBlockLine(c, effPos(ctx, t), ctx.state.terrain)) continue;
            // AOE ally exclusion (e.g. Roar): filter allies out entirely
            // before any scoring, matching the engine's resolveTargets.
            if (def.excludeAllies && t.ownerPlayerId === caster.ownerPlayerId) continue;
            const hits = !hasStatus(t, 'shielded');
            // HARD VETO: never place an AOE where it could kill a teammate.
            if (hits && wouldKillTeammate(def, caster, t)) {
              vetoed = true;
              break;
            }
            hitAny = true;
            if (t.ownerPlayerId !== caster.ownerPlayerId && hits) {
              enemiesHit++;
              // Lethal check for the gate bypass below: raw AOE damage
              // covers the target's remaining HP (execute effects excluded;
              // an Undying target survives at 1 — not a kill).
              if (!(t.passives ?? []).includes('undying')) {
                for (const ef of def.effects) {
                  if (
                    (ef.type === 'damage' &&
                      ef.healthThreshold === undefined &&
                      ef.value >= t.currentHealth) ||
                    (ef.type === 'lifesteal' && ef.value >= t.currentHealth)
                  ) {
                    expectsKill = true;
                  }
                }
              }
            }
            score += scoreEffectsOnTarget(ctx, def, t);
          }
          // THREAT-HOLDING: a once-per-game AOE only fires on a real cluster.
          // Spent on a single target it's a wasted zoning threat — unless
          // only one enemy remains (nothing left to hold for), OR the blast
          // would KILL someone (a kill now beats a hypothetical multi-hit
          // later — V4 Bug 2, the gate was suppressing lethal single-target
          // casts and leaving specials unspent in 93% of games).
          if (
            def.isSpecial &&
            enemiesHit < WEIGHTS.aoeSpecialMinEnemies &&
            aliveEnemyCount >= 2 &&
            !expectsKill
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
            // Stop exactly where the engine's getLineTiles stops. Breaking only
            // on the 8x8 box let the ray "pass through" a removed corner and
            // score hits the executor never delivers.
            if (!isInBounds(p)) break;
            // CAMPAIGN terrain (A2): walls EAT the ray — getLineTiles is given
            // isTerrainBlocked as its stop predicate, so the executor's line
            // ends at the first wall. Without the same break here the brain
            // scored every unit BEHIND a wall and cast into stone: the owner
            // watched a Torchhand burn its once-per-battle Flame Jet on two
            // heroes it could not reach (2026-08-24, unlitbeacon e4). No-op in
            // arena, where state.terrain is undefined.
            if (isTerrainBlocked(ctx.state.terrain, p)) break;
            lastInBounds = p;
            const t = units.find(
              (u) =>
                u.isAlive &&
                u.instanceId !== caster.instanceId &&
                samePos(effPos(ctx, u), p),
            );
            if (t) {
              const hits = !hasStatus(t, 'shielded');
              if (hits && wouldKillTeammate(def, caster, t)) {
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
  const guaranteed: number[] = [];
  for (const e of state.units) {
    if (!e.isAlive || e.ownerPlayerId === myPlayerId) continue;
    if (isFrozen(e)) continue;
    const b = basicDef(e, map);
    if (!b) continue;
    const reach =
      (willBlockOwnAction(e, 'rooted') ? 0 : e.movementRange) + (b.range || 1);
    if (manhattanDistance(e.position, pos) > reach) continue;
    // Weaken is applied per damage effect and floored at 0 by the engine, so it
    // must be subtracted inside this loop — taking it off the SUM once
    // understated how much a weakened multi-effect attacker was defanged
    // (a weakened Twin Strike threatens 8, not 12).
    const eWeakenCut = hasStatus(e, 'weakened') ? WEAKENED_DAMAGE_REDUCTION : 0;
    let raw = 0;
    for (const eff of b.effects) {
      if (
        (eff.type === 'damage' && eff.healthThreshold === undefined) ||
        eff.type === 'lifesteal'
      ) {
        raw += Math.max(0, eff.value - eWeakenCut);
      }
    }
    if (raw <= 0) continue;
    guaranteed.push(raw);
  }
  if (guaranteed.length === 0) return 0;
  if (hasStatus(unit, 'shielded')) {
    const rest = [...guaranteed];
    if (rest.length > 0) rest.splice(rest.indexOf(Math.min(...rest)), 1);
    if (rest.length === 0) return 0;
    const mx = Math.max(...rest);
    return mx + (rest.reduce((s, v) => s + v, 0) - mx) * WEIGHTS.dangerSecondary;
  }
  const mx = Math.max(...guaranteed);
  return mx + (guaranteed.reduce((s, v) => s + v, 0) - mx) * WEIGHTS.dangerSecondary;
}

/** First-strike danger multiplier, fading to 1 late-game (see WEIGHTS). */
function firstStrikeMultFor(state: MatchState): number {
  const r = state.roundNumber;
  const start = WEIGHTS.firstStrikeDecayStartRound;
  const end = WEIGHTS.firstStrikeDecayEndRound;
  const m = WEIGHTS.firstStrikeDangerMult;
  if (r <= start) return m;
  if (r >= end) return 1;
  return 1 + ((m - 1) * (end - r)) / (end - start);
}

function positionScore(
  state: MatchState,
  unit: UnitInstance,
  pos: BoardPosition,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
  dangerScale = 1,
  /** Does the plan being scored deal damage to an enemy this turn? Ending in
   *  enemy reach without attacking is penalized as a gifted first strike. */
  attacking = false,
): number {
  let s = 0;

  // ── CAMPAIGN pulls (A2/A3/A4) come BEFORE the no-enemies early return:
  // a cleared room is exactly when the door / objective-tile gradient is the
  // ONLY thing that should move the party (the old `return 0` made every tile
  // look identical and the party stood still forever).

  // CAMPAIGN terrain (A2): ending a move on a fire hazard costs a burn stack —
  // charge it like taking that damage (discounted the same way burn is).
  if (state.terrain?.hazards?.some((h) => h.pos.x === pos.x && h.pos.y === pos.y)) {
    s -= BURNING_DAMAGE_PER_STACK * WEIGHTS.burningFactor * WEIGHTS.selfDamage;
  }

  // CAMPAIGN rooms (A4): when the current room is done and rooms remain, the
  // party is pulled toward the ACTIVE exit doors ('always' doors pull as soon
  // as they exist; 'on_clear' doors once no enemy is left standing). Without
  // this the sim party clears a room and then mills around forever.
  const ep = state.encounterProgress;
  if (ep && ep.rooms.length > 0 && ep.exitDoors.length > 0 && unit.ownerPlayerId === myPlayerId
    && ep.partyIds.includes(unit.instanceId)) {
    const partySet = new Set(ep.partyIds);
    const doorActive = ep.doorMode === 'always'
      || !state.units.some((u) => u.isAlive && !partySet.has(u.instanceId));
    if (doorActive) {
      const onDoor = ep.exitDoors.some((d) => d.x === pos.x && d.y === pos.y);
      const nearest = Math.min(...ep.exitDoors.map((d) => manhattanDistance(pos, d)));
      s += onDoor ? 30 : -nearest * 1.5;
    }
  }

  // CAMPAIGN aiHints (A5): a hunter drifts toward its quarry even when it
  // cannot reach it this turn.
  if (unit.aiHints?.priorityTarget && state.objective) {
    const objH = state.objective;
    const quarryIds = unit.aiHints.priorityTarget === 'ally' ? (objH.allyIds ?? []) : [objH.mainId];
    const quarry = state.units.filter((u) => u.isAlive && quarryIds.includes(u.instanceId));
    if (quarry.length > 0) {
      const nearest = Math.min(...quarry.map((q) => manhattanDistance(pos, q.position)));
      s -= nearest * 0.8;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CAMPAIGN objective (A3): tile conditions shape positioning.
  //
  // ⚠ OBJ1 (2026-08-31) — WHAT WAS TRIED HERE AND REVERTED, so nobody burns
  // the same day twice. The brain plays objectives worse than a human (owner
  // found e2, a fight, HARDER than e3, an objective, while the sim scored
  // them 100% and 70%). Four fixes were implemented and A/B'd on a SEEDED
  // harness (objectiveHarness.ts, 100 games x 36 cells):
  //     (1) a win-completing tile paying 200 instead of a flat 25 — because
  //         25 loses to killBase 55, i.e. winning was worth less than a kill;
  //     (2) `simultaneous` support, so a tile an ally already holds stops
  //         attracting a second body (e3 is "hold BOTH bridgeheads");
  //     (3) clock urgency, sharpening the pull as a round_reached deadline
  //         approaches;
  //     (4) runner designation, so `scope: 'any'` pulls only the closest ally
  //         instead of the whole party.
  // NET RESULT: OBJ +1.1pts, and violently bimodal — e6/nightmare +67 and
  // e10/nightmare +49, against e3/medium -55 and e7/medium -40. Not shippable:
  // it moves cells more than it improves them.
  //
  // The diagnosed reason (4) backfired: on a ONE-TILE race like e7 the party
  // advancing together is not redundancy, it is MUTUAL SUPPORT. Designating a
  // lone runner sent it in unsupported, where unsupportedDangerMult says it
  // dies — and a dead runner loses the race outright. Any future attempt must
  // treat "who goes" as a COORDINATION problem (who goes, who screens, do
  // they arrive together) rather than a per-unit position score. That is
  // plan-level work, not a weight tweak.
  //
  // The ESCORT block below DID earn its place and stays — see it for why.
  //  - Party side: units the condition covers are pulled to the marked tiles.
  //  - Enemy side: standing ON a marked tile denies it.
  const objP = state.objective;
  if (objP) {
    const tileWins = objP.win.filter((w) => w.kind === 'units_at_tiles');
    if (tileWins.length > 0) {
      if (unit.ownerPlayerId === objP.partyId) {
        // ⚠ TILE-OBJECTIVE SCORING IS DELIBERATELY UNCHANGED — see OBJ1 below.
        for (const w of tileWins) {
          if (w.kind !== 'units_at_tiles') continue;
          const applies = w.scope === 'any' || w.scope === 'all'
            || (w.scope === 'main' && unit.instanceId === objP.mainId);
          if (!applies) continue;
          const onTile = w.tiles.some((t) => t.x === pos.x && t.y === pos.y);
          const nearest = Math.min(...w.tiles.map((t) => manhattanDistance(pos, t)));
          s += onTile ? 25 : -nearest * 1.2;
        }
      } else {
        for (const w of tileWins) {
          if (w.kind !== 'units_at_tiles') continue;
          if (w.tiles.some((t) => t.x === pos.x && t.y === pos.y)) s += 15;
        }
      }
    }

    // ── ESCORT (ally_at_tiles): defect 3. The party does not stand on the
    // goal itself — it clears the ROAD for an NPC and stays close enough to
    // shield it. Pull toward the tile the escort must reach, but only enough
    // to lead it there; the escort's own doctrine does the walking.
    const escortWins = objP.win.filter((w) => w.kind === 'ally_at_tiles');
    if (escortWins.length > 0 && unit.ownerPlayerId === objP.partyId) {
      for (const w of escortWins) {
        if (w.kind !== 'ally_at_tiles') continue;
        const escort = state.units.find((u) => u.isAlive && w.unitIds.includes(u.instanceId));
        if (!escort) continue;
        // Lead, do not crowd: stand between the escort and its goal.
        const goalGap = Math.min(...w.tiles.map((t) => manhattanDistance(pos, t)));
        const escortGap = manhattanDistance(pos, escort.position);
        s -= goalGap * WEIGHTS.escortLead * objectiveUrgencyMult(state);
        // Staying in support range of the charge — falling behind means the
        // escort walks into the next enemy alone, which is how e10 is lost.
        if (escortGap > WEIGHTS.escortShieldRadius) {
          s -= (escortGap - WEIGHTS.escortShieldRadius) * WEIGHTS.escortShield;
        }
      }
    }
  }

  const enemies = state.units.filter(
    (u) => u.isAlive && u.ownerPlayerId !== myPlayerId,
  );
  if (enemies.length === 0) return s; // only the campaign pulls matter now

  // Danger term (scalable: the cornered-unit fallback zeroes this out when
  // no reachable tile is meaningfully safer than any other).
  if (dangerScale > 0) {
    const danger = dangerAt(state, unit, pos, myPlayerId, map);
    if (danger > 0) {
      const lethal = danger >= unit.currentHealth;
      let mult = 1;
      // FIRST-STRIKE (v8): in reach without swinging = the enemy hits first.
      if (!attacking) mult *= firstStrikeMultFor(state);
      // COORDINATED ADVANCE (v8): a lone unit in threat range is the
      // overextension the enemy team collapses on. v9: "support" means the
      // ally can PROJECT FORCE next turn — it could attack an enemy adjacent
      // to this tile (move + basic range + 1). A melee ally six tiles back
      // is scenery; a ranged ally eight tiles back is cover.
      const supported = state.units.some((u) => {
        if (
          !u.isAlive ||
          u.instanceId === unit.instanceId ||
          u.ownerPlayerId !== myPlayerId ||
          isFrozen(u)
        ) {
          return false;
        }
        if (!WEIGHTS.supportProjection) {
          return manhattanDistance(u.position, pos) <= WEIGHTS.supportRadius;
        }
        const ab = basicDef(u, map);
        const reach =
          (willBlockOwnAction(u, 'rooted') ? 0 : u.movementRange) +
          (ab?.range ?? 1) +
          1;
        return manhattanDistance(u.position, pos) <= reach;
      });
      if (!supported) mult *= WEIGHTS.unsupportedDangerMult;
      s -=
        dangerScale *
        danger *
        WEIGHTS.danger *
        mult *
        (lethal ? WEIGHTS.dangerLethalMult : 1);
    }
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
    if (isFrozen(e)) continue;
    const specialSlug = specialSlugOf(e, map);
    if (!specialSlug || !abilityReady(e, specialSlug)) continue;
    const sd = map.get(specialSlug);
    if (!sd || sd.targetingType !== 'aoe') continue;
    const dmg = sd.effects.reduce(
      (t, ef) =>
        (ef.type === 'damage' && ef.healthThreshold === undefined) || ef.type === 'lifesteal'
          ? t + ef.value
          : t,
      0,
    );
    if (dmg <= 0) continue;
    const castReach =
      (willBlockOwnAction(e, 'rooted') ? 0 : e.movementRange) +
      sd.range +
      sd.areaRadius;
    if (manhattanDistance(e.position, pos) > castReach) continue;
    // "Could one enemy blast catch us both?" — measured in the SHAPE that blast
    // actually uses. Hardcoding Chebyshev over-estimated clustering risk for an
    // orthogonal-shaped AoE (Whirlwind/Ground Slam never hit diagonals), making
    // Fable spread out more than the threat warranted.
    const clusterSpan = sd.areaRadius * 2;
    const clusteredWithAlly = state.units.some(
      (u) =>
        u.isAlive &&
        u.instanceId !== unit.instanceId &&
        u.ownerPlayerId === myPlayerId &&
        (sd.areaShape === 'orthogonal'
          ? manhattanDistance(u.position, pos) <= clusterSpan
          : chebyshevDistance(u.position, pos) <= clusterSpan),
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
/**
 * CAMPAIGN allies (A5): doctrine-driven planning for AI allies. Allies are
 * NPCs, not soldiers — 'follow' shadows the main character and fights
 * opportunistically, 'hold' stands and fights, 'route' walks its waypoints
 * and swings only in self-defense. Dispatched from planBestTurn so every
 * driver (campaignSim, the mobile local runner) gets it without changes.
 */
function planAllyTurn(
  state: MatchState,
  unit: UnitInstance,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
): TurnPlan {
  const doctrine = state.allies![unit.instanceId];
  const END: TurnAction = { type: 'END_TURN' };
  const enemies = state.units.filter((u) => u.isAlive && u.ownerPlayerId !== myPlayerId);

  // Best single-target damage cast available from `pos` (self-defense / kit
  // swing). Allies keep it simple: damage abilities, range + LoS respected.
  const bestAttackFrom = (pos: BoardPosition): TurnAction | null => {
    let best: { score: number; action: TurnAction } | null = null;
    for (const slug of unit.abilities) {
      if ((unit.cooldowns[slug] ?? 0) > 0) continue;
      const def = map.get(slug);
      if (!def || def.targetingType === 'self') continue;
      const dmg = def.effects.reduce((acc, e) => acc + ((e.type === 'damage' || e.type === 'lifesteal') ? (e as { value?: number }).value ?? 0 : 0), 0);
      if (dmg <= 0) continue;
      for (const t of enemies) {
        const d = def.targetingType === 'line'
          ? chebyshevDistance(pos, t.position)
          : manhattanDistance(pos, t.position);
        if (d > def.range) continue;
        if (def.targetingType === 'single' && LOS_ENFORCED
          && !def.effects.some((e) => e.type === 'push')
          && !hasLineOfSight(pos, t.position, state.units, [unit.instanceId, t.instanceId], state.terrain)) continue;
        // CAMPAIGN terrain (A2): a line ray stops at the first wall, so a
        // wall-blocked enemy is not a threat from this tile and must not
        // inflate the tile's score (same blindness as the scoring loop).
        if (def.targetingType === 'line'
          && wallsBlockLine(pos, t.position, state.terrain)) continue;
        const score = Math.min(dmg, t.currentHealth) + (dmg >= t.currentHealth ? 20 : 0);
        if (!best || score > best.score) {
          best = { score, action: { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: t.position } };
        }
      }
    }
    return best?.action ?? null;
  };

  // ⚠ ALLIES MUST BE ABLE TO USE SUPPORT ABILITIES, NOT ONLY DAMAGE.
  // bestAttackFrom above filters to abilities with damage > 0, so a support
  // kit is INERT: Tam Emberwright (unlitbeacon e10) is a cleric carrying
  // ['mace','heal'] whose heal could never fire — every turn it was skipped by
  // the damage filter. The owner played it and reported exactly that shape:
  // "he doesn't use his special or attack... he isn't helping himself", and
  // then the survivability consequence — "if they targeted him aggressively
  // enough with him being useless enough, I don't think I could save him."
  // He was right, and it was not a tuning problem: an armed escort's defining
  // ability was dead code.
  //
  // Triage rule, deliberately simple because the owner's complaint was that
  // Tam is UNPREDICTABLE: heal the lowest-health friendly in range, but only
  // when at least half the heal would land. Heal is once-per-battle
  // (cooldown 99), so burning it on a scratch is a real loss — and hoarding it
  // forever, which is what the old behaviour amounted to, is a bigger one.
  // Self is a legal target (the ability reads "yourself or an ally"), which is
  // what lets Tam actually save himself.
  const friendlies = state.units.filter((u) => u.isAlive && u.ownerPlayerId === myPlayerId);
  const bestSupportFrom = (pos: BoardPosition): TurnAction | null => {
    let best: { score: number; action: TurnAction } | null = null;
    for (const slug of unit.abilities) {
      if ((unit.cooldowns[slug] ?? 0) > 0) continue;
      const def = map.get(slug);
      if (!def) continue;
      const healAmt = def.effects.reduce((acc, e) => acc + (e.type === 'heal' ? ((e as { value?: number }).value ?? 0) : 0), 0);
      if (healAmt <= 0) continue;
      for (const f of friendlies) {
        const missing = f.maxHealth - f.currentHealth;
        if (missing * 2 < healAmt) continue;           // don't burn it on a scratch
        // ⚠ SELF-TARGET MUST USE THE POST-MOVE TILE. `pos` is where this unit
        // will STAND after the move in this same plan, so f.position for self
        // is the tile it is about to LEAVE — targeting it threw "No unit at
        // target position" and the whole turn was rejected, which put the ally
        // right back to doing nothing (217 validation errors on one e10 cell).
        // Distance to self is 0 for the same reason: measuring from `pos` to
        // the old tile could exceed range on a long move.
        const self = f.instanceId === unit.instanceId;
        const tgt = self ? pos : f.position;
        if (!self && manhattanDistance(pos, f.position) > def.range) continue;
        // Same LoS contract the damage path uses — proposing an illegal action
        // would just get the turn rejected and Tam would do nothing at all.
        if (def.targetingType === 'single' && LOS_ENFORCED && !self
          && !hasLineOfSight(pos, f.position, state.units, [unit.instanceId, f.instanceId], state.terrain)) continue;
        const score = 1000 - f.currentHealth;          // lowest health first
        if (!best || score > best.score) {
          best = { score, action: { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target: tgt } };
        }
      }
    }
    return best?.action ?? null;
  };

  // Walk as far along the path to `goal` as this turn's movement allows;
  // falls back to the reachable tile that closes the most distance.
  const stepToward = (goal: BoardPosition): BoardPosition | null => {
    if (isRooted(unit) || samePos(unit.position, goal)) return null;
    const tiles = reachableTiles(unit, state.units, unit.movementRange, state.terrain);
    if (tiles.length === 0) return null;
    const path = findPath(unit.position, goal, unit, state.units, state.terrain);
    if (path) {
      for (let i = path.length - 1; i >= 0; i--) {
        const step = path[i];
        if (tiles.some((t) => samePos(t, step))) return step;
      }
    }
    let best: BoardPosition | null = null;
    let bestD = manhattanDistance(unit.position, goal);
    for (const t of tiles) {
      const d = manhattanDistance(t, goal);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  };

  const finish = (move: BoardPosition | null, fight: boolean): TurnPlan => {
    const pos = move ?? unit.position;
    // Support outranks a swing: a 27-point heal is worth more than a mace hit,
    // and an escort that heals is the difference between an asset and luggage.
    const attack = fight ? (bestSupportFrom(pos) ?? bestAttackFrom(pos)) : null;
    const actions: TurnAction[] = [];
    if (move) actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: move });
    if (attack) actions.push(attack);
    // Round-1 commitment needs an action; a zero-distance hold-position MOVE
    // is always legal (MOV-4) and harmless in later rounds.
    if (actions.length === 0) actions.push({ type: 'MOVE', unitInstanceId: unit.instanceId, destination: unit.position });
    actions.push(END);
    return { score: 0, actions };
  };

  if (doctrine.mode === 'hold') return finish(null, true);

  if (doctrine.mode === 'route') {
    const wps = doctrine.waypoints;
    const idx = Math.min(doctrine.routeIndex, wps.length - 1);
    const goal = wps[idx];
    if (doctrine.routeIndex >= wps.length || samePos(unit.position, goal)) {
      return finish(null, true); // route complete — hold the spot
    }
    // Self-defense only: swing when something is in reach AFTER the march.
    return finish(stepToward(goal), true);
  }

  // follow: stay BESIDE the hero, and fight with the kit.
  //
  // ⚠ THE THRESHOLD WAS 2 AND THAT IS WHAT MADE HIM LOOK BROKEN. At >2 the
  // ally does nothing until the hero has drifted three tiles away, then closes
  // the whole gap at once — so he alternates standing-still turns with big
  // catch-up lunges. The owner read that as malfunction, not doctrine: "It
  // seems like he moves every other turn or something... He has moved once in
  // the first four rounds... Round 5 he moved two spaces forward? Very
  // confusing." At >1 he takes a short step whenever the hero moves, which is
  // both smoother and STATABLE — the UI can promise "Tam stays beside your
  // hero" and the player can watch him do exactly that.
  const main = state.units.find((u) => u.isAlive && u.instanceId === state.objective?.mainId);
  if (main && manhattanDistance(unit.position, main.position) > 1) {
    return finish(stepToward(main.position), true);
  }
  return finish(null, true);
}

export function planBestTurn(
  state: MatchState,
  unit: UnitInstance,
  myPlayerId: string,
  map: Map<string, AbilityDefinition>,
  mustAct = false,
): TurnPlan {
  // CAMPAIGN allies (A5): doctrine planning, not battle planning.
  if (state.allies?.[unit.instanceId]) return planAllyTurn(state, unit, myPlayerId, map);

  const allies = state.units.filter(
    (u) => u.isAlive && u.ownerPlayerId === myPlayerId,
  );
  const killThreshold = bestKillThreshold(allies, map);
  const enemies = state.units.filter(
    (u) => u.isAlive && u.ownerPlayerId !== myPlayerId,
  );
  const enemyKillThreshold = bestKillThreshold(enemies, map);
  const rooted = willBlockOwnAction(unit, 'rooted'); // end-of-turn tick: any rooted duration blocks this turn
  const moveTiles = rooted
    ? []
    : reachableTiles(unit, state.units, unit.movementRange, state.terrain);

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

  // LAST-PAIR STANDOFF (2026-08-20): the cornered fallback above only fires
  // when danger is UNIFORM across every reachable tile — a unit with room to
  // keep its distance is never "cornered", so two last survivors who cannot
  // reach each other this turn both hold, forever. Measured: ~1.7% of
  // brain-vs-brain games deadlock this way (rogue mirrors worst, highest
  // movement = widest gap between reach and separation), running past turn
  // 1500 with neither unit moving. The engine's Endgame drain (END-2) does
  // not break it: it punishes RETREATING, and holding is explicitly safe.
  //
  // In a 1v1 where nobody can strike this turn, caution has no upside —
  // there is no ally to wait for and no reinforcement coming, so waiting
  // changes nothing except the turn counter. Zero the danger term and let
  // the approach term close the gap; whoever the geometry favors still
  // fights on action value once contact is made.
  if (allies.length === 1 && enemies.length === 1 && moveTiles.length > 0 && dangerScale > 0) {
    /** Longest range among a unit's READY damaging abilities (0 = none). */
    const strikeRange = (u: UnitInstance): number => {
      let best = -1;
      for (const slug of u.abilities) {
        if (!abilityReady(u, slug)) continue;
        const def = map.get(slug);
        if (!def) continue;
        if (!def.effects.some((e) => e.type === 'damage' || e.type === 'lifesteal')) continue;
        if (def.range > best) best = def.range;
      }
      return best;
    };
    /** Could `a` land a damaging hit on `b` this turn (move included)? */
    const canStrike = (a: UnitInstance, b: UnitInstance): boolean => {
      const r = strikeRange(a);
      if (r < 0) return false;
      const from = willBlockOwnAction(a, 'rooted')
        ? [a.position]
        : [a.position, ...reachableTiles(a, state.units, a.movementRange, state.terrain)];
      return from.some((pos) => manhattanDistance(pos, b.position) <= r);
    };
    const foe = enemies[0];
    if (!canStrike(unit, foe) && !canStrike(foe, unit)) dangerScale = 0;
  }

  // CAMPAIGN objective (A3): posture follows the objective.
  //  - Party surviving to a round: caution up (living IS winning).
  //  - Party racing a deadline: caution down (stalling IS losing).
  //  - An enemy unit the party must kill (units_dead): self-preservation up.
  const obj = state.objective;
  if (obj && dangerScale > 0) {
    if (myPlayerId === obj.partyId) {
      if (obj.win.some((w) => w.kind === 'round_reached')) dangerScale *= 1.5;
      if (obj.loss.some((l) => l.kind === 'round_reached')) dangerScale *= 0.6;
    } else if (obj.win.some((w) => w.kind === 'units_dead' && w.unitIds.includes(unit.instanceId))) {
      dangerScale *= 1.4;
    }
  }

  const pScore = (pos: BoardPosition, attacking = false) =>
    positionScore(state, unit, pos, myPlayerId, map, dangerScale, attacking);

  /** Does this candidate action deal damage to an enemy? (Heals/buffs from
   *  inside enemy reach still gift the first strike — only real offense
   *  earns the trade discount on danger.) */
  const isOffensive = (a: TurnAction): boolean => {
    if (a.type !== 'USE_ABILITY') return false;
    const def = map.get(a.abilitySlug);
    return !!def?.effects.some((e) => e.type === 'damage' || e.type === 'lifesteal');
  };

  const END: TurnAction = { type: 'END_TURN' };
  let best: TurnPlan = { score: -Infinity, actions: [END] };

  // ENDGAME DRAIN (round 11+). Read the round the engine is actually keeping,
  // not a turnNumber/8 estimate of it: a round is one LAP of the initiative
  // order, and since dead slots stopped consuming turn numbers (TRN-5) that
  // estimate drifts by one turn per death — which by round 10 could leave the
  // brain retreating into a drain it did not know had started. Penalize any
  // candidate whose FINAL position is farther (Manhattan) from the nearest
  // enemy than its start.
  const roundNow = state.roundNumber ?? 1;
  // The engine drains the acting unit when the round is 11+ AFTER this turn
  // advances the order, so the LAST live slot of round 10 already drains. That
  // used to fall out of the turnNumber/8 arithmetic for free; with wrap-based
  // rounds it has to be asked directly — is there any living unit still to act
  // this lap? Getting this wrong in either direction is a real cost: too early
  // and the brain refuses good ground for seven turns, too late and it retreats
  // into damage it could have seen coming.
  const ord = state.initiative?.order ?? [];
  const slotNow = state.initiative?.slot ?? 0;
  const liveLater = ord.slice(slotNow + 1).some((uid) => {
    const u = state.units.find((x) => x.instanceId === uid);
    return !!u?.isAlive;
  });
  const drainApplies = roundNow >= 11 || (roundNow === 10 && !liveLater);
  const nearestEnemyDist = (pos: BoardPosition) =>
    enemies.length ? Math.min(...enemies.map((e) => manhattanDistance(pos, e.position))) : 0;
  const startEnemyDist = nearestEnemyDist(unit.position);
  const drainPenalty = (actions: TurnAction[]): number => {
    if (!drainApplies || enemies.length === 0) return 0;
    let finalPos = unit.position;
    for (const a of actions) {
      if (a.type === 'MOVE' || a.type === 'CHARGE') finalPos = a.destination;
    }
    return nearestEnemyDist(finalPos) > startEnemyDist ? WEIGHTS.endgameDrainPenalty : 0;
  };

  const consider = (score: number, actions: TurnAction[]) => {
    const adjusted = score - drainPenalty(actions);
    if (adjusted > best.score) best = { score: adjusted, actions };
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

  // Precompute the best retreat tile (for act-then-move / hit-and-run), in
  // both flavors: after an offensive act (base danger — we traded) and after
  // a non-offensive one (first-strike danger still applies at the end tile).
  let bestRetreatAtk: BoardPosition | null = null;
  let bestRetreatAtkScore = -Infinity;
  let bestRetreatIdle: BoardPosition | null = null;
  let bestRetreatIdleScore = -Infinity;
  for (const pos of moveTiles) {
    const psAtk = pScore(pos, true);
    if (psAtk > bestRetreatAtkScore) {
      bestRetreatAtkScore = psAtk;
      bestRetreatAtk = pos;
    }
    const psIdle = pScore(pos, false);
    if (psIdle > bestRetreatIdleScore) {
      bestRetreatIdleScore = psIdle;
      bestRetreatIdle = pos;
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
    enemyKillThreshold,
  };
  for (const cand of enumerateAbilityActions(ctxHere)) {
    const off = isOffensive(cand.action);
    consider(cand.score + pScore(unit.position, off), [cand.action, END]);

    // Retreat after acting. If the ability DISPLACES a unit (push/pull —
    // Fear, Rescue), the board changes before our MOVE executes: the
    // displaced unit can occupy the precomputed retreat tile or block its
    // path (this produced real "Destination is not reachable" engine
    // rejections). Recompute the retreat against the post-ability board.
    let retreat = off ? bestRetreatAtk : bestRetreatIdle;
    let retreatScore = off ? bestRetreatAtkScore : bestRetreatIdleScore;
    const act = cand.action.type === 'USE_ABILITY' ? cand.action : null;
    const candDef = act ? map.get(act.abilitySlug) : undefined;
    // A self-rooting/self-freezing cast (Blizzard's channel) makes any queued
    // retreat ILLEGAL — the engine applies selfStatus at the cast, so the
    // planned MOVE throws "Unit is rooted and cannot move" and forfeits the
    // action (C22-era grid runs: 3.6k validation errors, all this shape; it
    // also silently tanked Blizzard's marginals in every prior battery).
    if (candDef?.selfStatus && ['rooted', 'frozen'].includes(candDef.selfStatus.statusSlug)) {
      continue; // cast-then-stay was already considered above
    }
    // A leap (move_self) relocates the caster mid-turn, so every retreat tile
    // below — precomputed from unit.position, with a path traced from it — is
    // measured from a tile the unit no longer occupies. Queuing one produces
    // "Destination is not reachable" rejections that forfeit the action, the
    // same failure shape as the self-root case above. The leap already IS the
    // repositioning; cast-then-stay (considered above) is the right plan.
    if (candDef?.effects.some((e) => e.type === 'move_self')) continue;
    const dispEffect = candDef?.effects.find(
      (e) => e.type === 'push' || e.type === 'pull',
    );
    if (act && dispEffect && retreat) {
      const targetUnit = state.units.find(
        (u) => u.isAlive && samePos(u.position, act.target),
      );
      if (targetUnit && targetUnit.instanceId !== unit.instanceId) {
        // The engine's exact landing tile can differ from our model by a
        // step (immovable no-ops, diagonal clamping, findLastFreePosition),
        // but it always lies ON the displacement ray between the target's
        // original tile and the ideal destination. Block the whole segment
        // when pathing the retreat — conservative, never invalid.
        const ideal =
          dispEffect.type === 'push'
            ? act.pushDestination ??
              pushDestination(unit.position, targetUnit.position, dispEffect.distance, state.units, targetUnit.instanceId, state.terrain)
            : pullDestination(unit.position, targetUnit.position, dispEffect.distance, state.units, targetUnit.instanceId, state.terrain);
        const segment: BoardPosition[] = [{ ...targetUnit.position }];
        {
          const sx = Math.sign(ideal.x - targetUnit.position.x);
          const sy = Math.sign(ideal.y - targetUnit.position.y);
          let cur = { ...targetUnit.position };
          while (cur.x !== ideal.x || cur.y !== ideal.y) {
            cur = { x: cur.x + sx * (cur.x !== ideal.x ? 1 : 0), y: cur.y + sy * (cur.y !== ideal.y ? 1 : 0) };
            segment.push({ ...cur });
          }
        }
        const adjustedUnits = [
          ...state.units.filter((u) => u.instanceId !== targetUnit.instanceId),
          ...segment.map((pos, k) => ({ ...targetUnit, instanceId: `${targetUnit.instanceId}#seg${k}`, position: pos })),
        ];
        const validTiles = reachableTiles(unit, adjustedUnits, unit.movementRange, state.terrain);
        retreat = null;
        retreatScore = -Infinity;
        for (const pos of validTiles) {
          const ps = pScore(pos, off);
          if (ps > retreatScore) { retreatScore = ps; retreat = pos; }
        }
      }
    }
    if (retreat) {
      consider(cand.score + retreatScore - WEIGHTS.moveTax, [
        cand.action,
        { type: 'MOVE', unitInstanceId: unit.instanceId, destination: retreat },
        END,
      ]);
    }
  }

  // 4. Move, then act.
  for (const pos of moveTiles) {
    const psAtk = pScore(pos, true) - WEIGHTS.moveTax;
    const psIdle = pScore(pos, false) - WEIGHTS.moveTax;
    const ctx: ScoreCtx = {
      state,
      map,
      caster: unit,
      casterPos: pos,
      myPlayerId,
      killThreshold,
      enemyKillThreshold,
    };
    for (const cand of enumerateAbilityActions(ctx)) {
      consider(cand.score + (isOffensive(cand.action) ? psAtk : psIdle), [
        { type: 'MOVE', unitInstanceId: unit.instanceId, destination: pos },
        cand.action,
        END,
      ]);
    }
  }

  // 5. Move + Charge (double move). Pure repositioning — competes on position
  //    score alone, so it only wins when no ability use is worth anything.
  //    Charge is legal in every round (the 10-round cap was removed with the
  //    endgame drain rule).
  for (const posA of moveTiles) {
    const fromA = reachableFrom(posA, unit, state.units, unit.movementRange, state.terrain);
    for (const posB of fromA) {
      consider(pScore(posB) - 2 * WEIGHTS.moveTax, [
        { type: 'MOVE', unitInstanceId: unit.instanceId, destination: posA },
        { type: 'CHARGE', unitInstanceId: unit.instanceId, destination: posB },
        END,
      ]);
    }
  }

  // Fallback for mustAct when the unit literally cannot move or act.
  if (best.score === -Infinity) {
    best = { score: 0, actions: [END] };
  }
  return best;
}


// ---------------------------------------------------------------------------
// Integration diagnostics (V4)
// ---------------------------------------------------------------------------

/**
 * Defensive normalization for DB-seeded ability definitions. Effect JSON
 * coming out of Postgres sometimes carries snake_case keys
 * (health_threshold, status_slug, duration_turns) — if healthThreshold
 * arrives undefined, execute abilities like assassinate mis-score silently.
 * Apply this once wherever the ability map is built. Camel-cased input
 * passes through untouched.
 */
export function normalizeAbilityDefinitions(
  defs: AbilityDefinition[],
): AbilityDefinition[] {
  const topMap: Record<string, string> = {
    targeting_type: 'targetingType',
    area_radius: 'areaRadius',
    cooldown_turns: 'cooldownTurns',
    is_special: 'isSpecial',
    is_unblockable: 'isUnblockable',
    exclude_allies: 'excludeAllies',
  };
  const effMap: Record<string, string> = {
    health_threshold: 'healthThreshold',
    status_slug: 'statusSlug',
    duration_turns: 'durationTurns',
    ability_slug: 'abilitySlug',
    heal_value: 'healValue',
  };
  const lift = (obj: Record<string, unknown>, map: Record<string, string>) => {
    const out: Record<string, unknown> = { ...obj };
    for (const [snake, camel] of Object.entries(map)) {
      if (out[snake] !== undefined && out[camel] === undefined) {
        out[camel] = out[snake];
      }
    }
    return out;
  };
  return defs.map((d) => {
    const top = lift(d as unknown as Record<string, unknown>, topMap);
    top.effects = ((d.effects ?? []) as unknown[]).map((e) =>
      lift(e as Record<string, unknown>, effMap),
    );
    return top as unknown as AbilityDefinition;
  });
}

/** Map-level convenience wrapper for normalizeAbilityDefinitions. */
export function normalizeAbilityMap(
  map: Map<string, AbilityDefinition>,
): Map<string, AbilityDefinition> {
  const defs = normalizeAbilityDefinitions([...map.values()]);
  return new Map(defs.map((d) => [d.slug, d]));
}

/**
 * Human-readable dump of everything the brain considered for one unit:
 * statuses (with tick-aware blocking), reserve, every positive-scoring
 * ability candidate from the current tile AND from the best move tile, and
 * the chosen plan. Purpose: when a special "never fires" in sims (V4 Bug 1),
 * run this on a saved state and read exactly where it drops out.
 *
 *   console.log(explainTurn(state, unitId, playerId, abilityMap));
 */
export function explainTurn(
  state: MatchState,
  unitInstanceId: string,
  myPlayerId: string,
  abilityMap: Map<string, AbilityDefinition>,
): string {
  const unit = state.units.find((u) => u.instanceId === unitInstanceId);
  if (!unit) return `explainTurn: no unit ${unitInstanceId}`;
  const lines: string[] = [];
  const allies = state.units.filter(
    (u) => u.isAlive && u.ownerPlayerId === myPlayerId,
  );
  const killThreshold = 0; // recomputed below via ctx like the planner does
  void killThreshold;

  lines.push(
    `unit ${unit.definitionSlug} @(${unit.position.x},${unit.position.y}) ` +
      `hp ${unit.currentHealth}/${unit.maxHealth} round ${state.roundNumber}`,
  );
  for (const e of unit.statusEffects) {
    lines.push(
      `  status ${e.slug} remaining=${e.turnsRemaining} ` +
        `blocksOwnAction=${willBlockOwnAction(unit, e.slug)}`,
    );
  }
  for (const slug of unit.abilities) {
    const def = abilityMap.get(slug);
    if (!def) {
      lines.push(`  ability ${slug}: *** NOT IN ABILITY MAP ***`);
      continue;
    }
    const execEff = def.effects.find(
      (e) => e.type === 'damage' && e.healthThreshold !== undefined,
    );
    lines.push(
      `  ability ${slug}: ready=${abilityReady(unit, slug)} ` +
        `special=${!!def.isSpecial} type=${def.targetingType} ` +
        `range=${def.range}` +
        (execEff && execEff.type === 'damage'
          ? ` executeThreshold=${execEff.healthThreshold}`
          : ''),
    );
    if (
      def.effects.some(
        (e) =>
          (e as unknown as Record<string, unknown>)['health_threshold'] !==
          undefined,
      )
    ) {
      lines.push(
        `    *** snake_case health_threshold detected — run ` +
          `normalizeAbilityDefinitions on your ability map ***`,
      );
    }
  }
  lines.push(`  specialReserve now = ${specialReserveFor(state).toFixed(1)}`);

  const ctx: ScoreCtx = {
    state,
    map: abilityMap,
    caster: unit,
    casterPos: unit.position,
    myPlayerId,
    killThreshold: bestKillThreshold(allies, abilityMap),
    enemyKillThreshold: bestKillThreshold(
      state.units.filter((u) => u.isAlive && u.ownerPlayerId !== myPlayerId),
      abilityMap,
    ),
  };
  const here = enumerateAbilityActions(ctx);
  lines.push(`  candidates from current tile: ${here.length}`);
  for (const c of here.sort((a, b) => b.score - a.score).slice(0, 8)) {
    if (c.action.type === 'USE_ABILITY') {
      lines.push(
        `    ${c.action.abilitySlug} @(${c.action.target.x},${c.action.target.y}) ` +
          `score=${c.score.toFixed(1)}`,
      );
    }
  }
  const plan = planBestTurn(state, unit, myPlayerId, abilityMap);
  lines.push(
    `  chosen plan (score ${plan.score.toFixed(1)}): ` +
      plan.actions
        .map((a) =>
          a.type === 'USE_ABILITY'
            ? `${a.type}:${a.abilitySlug}`
            : a.type === 'MOVE' || a.type === 'CHARGE'
              ? `${a.type}->(${a.destination.x},${a.destination.y})`
              : a.type,
        )
        .join(' '),
  );
  return lines.join('\n');
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
      if (!u || u.ownerPlayerId !== myPlayerId || !u.isAlive || willBlockOwnAction(u, 'frozen')) {
        return [{ type: 'END_TURN' }];
      }
      // Doomed to the burning tick: any queued action would execute against
      // a corpse. Bare END_TURN lets the engine tick, bury, and advance.
      if (willDieToOwnTick(u)) return [{ type: 'END_TURN' }];
      return planBestTurn(state, u, myPlayerId, abilityMap).actions;
    }

    // Case 2: Round 1 with no pre-selected unit — the brain also chooses
    // which uncommitted unit to commit. Units already in initiative.order
    // are committed. Round 1 commitment is about locking a unit into the
    // initiative order, so even frozen or dead units must eventually be
    // committed — the engine rejects END_TURN without a commitment.
    if (initiative.isRound1) {
      const committed = new Set(initiative.order);
      const allUncommitted = state.units.filter(
        (u) => u.ownerPlayerId === myPlayerId && !committed.has(u.instanceId),
      );
      // CAMPAIGN allies (A5): the party commits first; allies take the tail of
      // the player's half. The preference must test USABILITY, not mere
      // presence — with a frozen/doomed party unit left and a healthy ally,
      // preferring "any non-ally" left the brain with nothing committable and
      // it emitted a bare END_TURN, which round 1 rejects ("Must commit a unit").
      // The harness pre-flight can't rescue that either: it sees the usable
      // ally and correctly declines to force-commit.
      const committable = (u: UnitInstance) =>
        u.isAlive && !hasStatus(u, 'frozen') && !willDieToOwnTick(u);
      const nonAlly = allUncommitted.filter((u) => !state.allies?.[u.instanceId]);
      const uncommitted = nonAlly.some(committable) ? nonAlly : allUncommitted;

      // Group 1 — usable this round (alive, not frozen): always preferred.
      // Commit the unit whose best turn scores highest, which naturally
      // front-loads units with real work available.
      // Frozen commitment is rejected by the engine's round-1 gate ("A frozen
      // unit cannot join the initiative"), so the commit filter is
      // PRESENCE-based for frozen. Rooted units CAN commit: via an ability if
      // a target is in range, or via a zero-distance "hold position" MOVE
      // (legal while rooted — see processMove).
      const usable = uncommitted.filter(
        (u) => u.isAlive && !hasStatus(u, 'frozen') && !willDieToOwnTick(u),
      );
      if (usable.length > 0) {
        let bestPlan: TurnPlan | null = null;
        for (const c of usable) {
          const p = planBestTurn(state, c, myPlayerId, abilityMap, true);
          // Round 1 REQUIRES a per-unit action (move or ability) — a plan
          // that degenerated to bare END_TURN cannot commit anything and
          // would draw "Must commit a unit in round 1" from the engine.
          if (!p.actions.some((a) => a.type !== 'END_TURN')) continue;
          if (!bestPlan || p.score > bestPlan.score) bestPlan = p;
        }
        if (bestPlan) return bestPlan.actions;

        // Group 1b — forced commitment move: every usable unit's best plan
        // degenerated to "do nothing" (a well-planned opening can make
        // idling optimal — nothing in range, no danger to flee), but round 1
        // still requires committing a unit with a move or ability. Take the
        // least-bad MOVE: across all mobile usable units, the reachable tile
        // with the lowest incoming danger, tie-broken toward staying close
        // to the current tile.
        let fbUnit: UnitInstance | null = null;
        let fbTile: BoardPosition | null = null;
        let fbCost = Infinity;
        for (const c of usable) {
          if (willBlockOwnAction(c, 'rooted')) continue;
          for (const t of reachableTiles(c, state.units, c.movementRange, state.terrain)) {
            if (samePos(t, c.position)) continue;
            const cost =
              dangerAt(state, c, t, myPlayerId, abilityMap) * 10 +
              manhattanDistance(t, c.position);
            if (cost < fbCost) { fbCost = cost; fbUnit = c; fbTile = t; }
          }
        }
        if (fbUnit && fbTile) {
          return [
            { type: 'MOVE', unitInstanceId: fbUnit.instanceId, destination: fbTile },
            { type: 'END_TURN' },
          ];
        }

        // Group 1b2 — rooted hold-position commit: every remaining usable
        // unit is rooted with no better plan. A zero-distance MOVE is legal
        // while rooted and commits for free — strictly better than burning a
        // special into empty air (group 1c) or an illegal bare END_TURN.
        const rootedHold = usable.find((c) => willBlockOwnAction(c, 'rooted'));
        if (rootedHold) {
          return [
            { type: 'MOVE', unitInstanceId: rootedHold.instanceId, destination: rootedHold.position },
            { type: 'END_TURN' },
          ];
        }

        // Group 1c — forced ability commit: no usable unit can move (e.g.
        // the last uncommitted unit is rooted) but an ability can still
        // legally REACH AN ENEMY. Fire the least valuable such cast: basics
        // before specials. This can burn a special into a bad shot (e.g. a
        // guaranteed dodge) — the rules force a commitment, so eat the cost.
        // If no enemy is reachable at all, fall through to bare END_TURN:
        // the harness/server pre-flight force-commits for free, which beats
        // wasting a special on empty air.
        let fcAction: TurnAction | null = null;
        let fcRank = Infinity; // lower is better: basic=0, special=10
        for (const c of usable) {
          for (const slug of c.abilities) {
            if (!abilityReady(c, slug)) continue;
            const def = abilityMap.get(slug);
            if (!def) continue;
            const rank = def.isSpecial ? 10 : 0;
            if (rank >= fcRank) continue;
            let target: BoardPosition | null = null;
            if (def.targetingType === 'aoe' && def.range === 0) {
              // Self-centered blast: only worth committing if it clips an enemy.
              const clipsEnemy = state.units.some(
                (t) => t.isAlive && t.ownerPlayerId !== myPlayerId &&
                  chebyshevDistance(c.position, t.position) <= def.areaRadius,
              );
              if (clipsEnemy) target = c.position;
            } else if (def.targetingType === 'single') {
              const hasPush = def.effects.some((e) => e.type === 'push');
              for (const t of state.units) {
                if (!t.isAlive || t.ownerPlayerId === myPlayerId) continue;
                if (manhattanDistance(c.position, t.position) > def.range) continue;
                if (!hasPush && LOS_ENFORCED &&
                    !hasLineOfSight(c.position, t.position, state.units, [c.instanceId, t.instanceId], state.terrain)) continue;
                target = t.position;
                break;
              }
            } else if (def.targetingType !== 'self') {
              // aoe (placed) / line / cone: aim at any enemy in range.
              for (const t of state.units) {
                if (!t.isAlive || t.ownerPlayerId === myPlayerId) continue;
                const d = def.targetingType === 'line'
                  ? chebyshevDistance(c.position, t.position)
                  : manhattanDistance(c.position, t.position);
                if (d > def.range) continue;
                // CAMPAIGN terrain (A2): the engine rejects wall-blocked AoE
                // centres — the fallback must not propose an invalid cast.
                if (def.targetingType === 'aoe' && def.range > 0
                  && (isTerrainBlocked(state.terrain, t.position) || wallsBlockLine(c.position, t.position, state.terrain))) continue;
                // ...and a line ray dies at the first wall, so a blocked enemy
                // is not a legal fallback aim either.
                if (def.targetingType === 'line'
                  && wallsBlockLine(c.position, t.position, state.terrain)) continue;
                target = t.position; break;
              }
            }
            if (!target) continue;
            fcRank = rank;
            fcAction = { type: 'USE_ABILITY', unitInstanceId: c.instanceId, abilitySlug: slug, target };
          }
        }
        // (An earlier build had a last-resort "basic attack your own ally to
        // commit" fallback here. The engine now rejects a harmful single-target
        // ability aimed at your own side — owner rule, 2026-08-23 — so that
        // action is illegal and the fallback is gone. When no legal commit
        // exists at all, the bare END_TURN below lets the server/harness
        // force-commit, which is free and was always the better outcome.)
        if (fcAction) return [fcAction, { type: 'END_TURN' }];
      }

      // Group 2 — forced commitment: only frozen/dead units remain. The
      // engine rejects frozen units from joining the initiative PRE-tick
      // and dead units always, so the brain returns bare END_TURN and the
      // harness/server pre-flight appends the unit to initiative.order
      // directly. (V3 Bug A + v6 engine frozen-join rule.)
      if (uncommitted.length > 0) {
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
    if (!unit || isFrozen(unit)) return [{ type: 'END_TURN' }];

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
      const tiles = reachableTiles(unit, state.units, unit.movementRange, state.terrain);
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
      ], state.terrain)
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
            !isFrozen(u),
        ) ?? null
      );
    }
    return null;
  }
}
