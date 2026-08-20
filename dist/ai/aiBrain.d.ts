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
import { MatchState, UnitInstance, TurnAction, AbilityDefinition } from './types';
export interface AIBrain {
    selectActions(state: MatchState, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): TurnAction[];
}
export declare const WEIGHTS: {
    /** Value per point of expected damage dealt to an enemy. */
    damage: number;
    /** Penalty multiplier per point of expected damage dealt to an ally (friendly fire). */
    allyDamage: number;
    /** Penalty multiplier per point of expected self-damage. */
    selfDamage: number;
    /** Value per point of effective healing on an ally. */
    heal: number;
    /** Extra heal value multiplier when the ally is below 40% HP. */
    healUrgency: number;
    /** Base value of killing an enemy unit outright. */
    killBase: number;
    /** Additional kill value per point of the target's expected damage per turn. */
    killThreatFactor: number;
    /** Penalty for an ability that would kill one of our own units. */
    allyDeathPenalty: number;
    /** Fraction of max HP below which an ally counts as dangerously wounded. */
    allyNearDeathThreshold: number;
    /** Fraction of allyDeathPenalty applied when a hit would leave an ally near death. */
    allyNearDeathFactor: number;
    /** Flat value of landing a stun (movement + action denial baseline). */
    stunFlat: number;
    /** Stun value per (duration x target's expected damage per turn). */
    stunThreatFactor: number;
    /** Bonus for stunning a unit that acts within the next 2 initiative slots. */
    initiativeSoonBonus: number;
    /** Root value factor vs melee targets (denies their whole turn if nobody is adjacent). */
    /**
     * Root turn-denial: value per (denied turn x target's expected damage per
     * turn). Denied turns = root duration where the target can't reach any of
     * our units from its post-push position, PLUS the travel turns it needs to
     * re-close the pushed gap afterward. This is what makes Fear correctly
     * beat a basic attack against an adjacent melee threat: push 3 + root
     * denies ~2 full turns of that unit's damage output.
     */
    rootTurnDenialFactor: number;
    /** Flat root value per turn vs ranged targets (mobility denial only). */
    rootRangedFlat: number;
    /** Push value per tile displaced, vs a melee target. */
    pushMeleePerTile: number;
    /** Push value per tile displaced, vs a ranged target. */
    pushRangedPerTile: number;
    /** Penalty for landing a hostile status effect on an ally. */
    statusOnAllyPenalty: number;
    /** Value multiplier for re-applying a status the target already has (duration extension only). */
    redundantStatusFactor: number;
    /**
     * Weight on danger from enemies beyond the single most dangerous one.
     * Only one unit acts per initiative slot, so real per-turn risk is one
     * attacker's damage — but standing in reach of many enemies is still worse
     * than one, since consecutive slots can pile on. 0 = pure per-turn model.
     */
    dangerSecondary: number;
    /**
     * Cornered-unit fallback threshold: if our last living unit can't reduce
     * expected incoming danger by at least this much anywhere it can move,
     * there is no meaningful escape — ignore danger and fight on action value.
     */
    corneredDangerSpread: number;
    /**
     * Root exploitation: bonus fraction of the best qualifying melee ally's
     * per-turn threat, when that ally can reach the rooted target. Rooting a
     * unit our fighter can pounce on is worth far more than rooting one in an
     * empty corner.
     */
    rootExploitFactor: number;
    /**
     * Opportunity cost of spending a once-per-game special. A special must beat
     * the best basic-attack option by at least this margin to be chosen.
     */
    specialReserve: number;
    /** Round at which the special reserve starts fading (see specialReserveFor). */
    reserveDecayStartRound: number;
    /** Round at which the special reserve reaches 0. */
    reserveDecayEndRound: number;
    /**
     * THREAT-HOLDING: minimum enemies an AOE special must hit to be worth
     * spending — while more than one enemy is still alive. A held Firestorm
     * zones the whole enemy team (they must spread out or eat a multi-hit);
     * spent on one target it's just an overpriced basic attack. When only one
     * enemy remains there is nothing left to save it for, so the gate lifts.
     */
    aoeSpecialMinEnemies: number;
    /**
     * THREAT-HOLDING (defensive side): penalty factor on positions that stand
     * clustered with an ally while an enemy holds an unspent damaging AOE
     * special that could plausibly reach. This is what makes the enemy's held
     * Firestorm actually cost us tempo — we spread out, or we knowingly pay.
     */
    aoeClusterAvoidance: number;
    /** How much the brain cares about standing in enemy threat range. */
    danger: number;
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
    firstStrikeDangerMult: number;
    /** Round at which the first-strike multiplier starts fading toward 1 —
     *  someone has to blink or mirror matches stall forever. */
    firstStrikeDecayStartRound: number;
    /** Round at which the first-strike multiplier reaches 1 (base danger). */
    firstStrikeDecayEndRound: number;
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
    unsupportedDangerMult: number;
    /** Manhattan radius within which an ally counts as supporting a tile (legacy
     *  fallback, used when supportProjection is 0). */
    supportRadius: number;
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
    supportProjection: number;
    /** Danger multiplier when the incoming expected damage could kill us. */
    dangerLethalMult: number;
    /** Pull toward closing the gap to attackable targets (per tile of gap). */
    approach: number;
    /** Lean toward approaching low-HP enemies (per point of target HP). */
    approachHpBias: number;
    /** Bonus for chipping an enemy into an ally's execute (Kill Shot) threshold. */
    killShotSetup: number;
    /** Value of burning an enemy's shielded status with a cheap attack. */
    shieldBurn: number;
    /** Penalty for friendly-fire AOE consuming an ally's shield. */
    shieldWastePenalty: number;
    /** Floor value of applying shielded to an ally. */
    shieldBaseValue: number;
    /** Bonus when the shielded ally sits inside the enemy execute window. */
    shieldExecuteDenial: number;
    /** Discount on burning's total dot (target may die/heal before it ticks). */
    burningFactor: number;
    /** Base value of exposing a target (focus mark). */
    exposedBase: number;
    /** Value per tile an enemy is dragged toward us. */
    pullPerTile: number;
    /** Fraction of our reachable melee threat credited to a hostile pull. */
    pullExploitFactor: number;
    /** Fraction of removed danger credited to Rescue-style ally pulls. */
    rescueDangerFactor: number;
    /** Tiny tax per move action so the AI doesn't shuffle pointlessly on ties. */
    moveTax: number;
    /** Assumed AC when estimating a unit's generic threat output. */
    referenceAC: number;
    /**
     * ENDGAME (round 11+): ending a turn farther (Manhattan) from the nearest
     * enemy than it started costs the unit 1 HP (engine drain rule). The real
     * cost is 1, but the penalty is slightly higher because the drain is
     * deterministic while most danger the brain weighs against it is
     * probabilistic — a certain loss should outweigh an equal expected loss.
     */
    endgameDrainPenalty: number;
};
/** Long-run hit rate for a blockable ability. Complement of missChanceOf. */
export declare function hitChance(armorClass: number): number;
/** Patch 1.0.04: the freeze/immobilize status slug is 'frozen' everywhere. */
export declare function isFrozen(u: UnitInstance): boolean;
export declare function isRooted(u: UnitInstance): boolean;
/**
 * END-OF-TURN TICK SEMANTICS: the engine applies only burning DoT at the start
 * of a unit's turn and decrements status durations at the END of that turn, so
 * a debuff is in force for every turn it is present (turnsRemaining >= 1). A
 * rooted/weakened unit with any remaining duration is blocked/affected on its
 * next turn. (Was `>= 2` under the old tick-first engine, which expired a
 * 1-turn debuff before it could bite.)
 */
export declare function willBlockOwnAction(u: UnitInstance, slug: string): boolean;
/**
 * True if this unit's own start-of-turn status tick will kill it. The engine
 * ticks the acting unit's statuses BEFORE processing its actions (burning:
 * 5 dmg/stack), so a doomed unit's queued actions would all throw
 * "Unit is dead" — it must submit bare END_TURN (round 2+) and cannot be
 * chosen for a round-1 commitment.
 */
export declare function willDieToOwnTick(u: UnitInstance): boolean;
export interface TurnPlan {
    score: number;
    actions: TurnAction[];
}
export declare function planBestTurn(state: MatchState, unit: UnitInstance, myPlayerId: string, map: Map<string, AbilityDefinition>, mustAct?: boolean): TurnPlan;
/**
 * Defensive normalization for DB-seeded ability definitions. Effect JSON
 * coming out of Postgres sometimes carries snake_case keys
 * (health_threshold, status_slug, duration_turns) — if healthThreshold
 * arrives undefined, execute abilities like assassinate mis-score silently.
 * Apply this once wherever the ability map is built. Camel-cased input
 * passes through untouched.
 */
export declare function normalizeAbilityDefinitions(defs: AbilityDefinition[]): AbilityDefinition[];
/** Map-level convenience wrapper for normalizeAbilityDefinitions. */
export declare function normalizeAbilityMap(map: Map<string, AbilityDefinition>): Map<string, AbilityDefinition>;
/**
 * Human-readable dump of everything the brain considered for one unit:
 * statuses (with tick-aware blocking), reserve, every positive-scoring
 * ability candidate from the current tile AND from the best move tile, and
 * the chosen plan. Purpose: when a special "never fires" in sims (V4 Bug 1),
 * run this on a saved state and read exactly where it drops out.
 *
 *   console.log(explainTurn(state, unitId, playerId, abilityMap));
 */
export declare function explainTurn(state: MatchState, unitInstanceId: string, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): string;
export declare class OptimalBrain implements AIBrain {
    selectActions(state: MatchState, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): TurnAction[];
}
export declare class BaselineBrain implements AIBrain {
    selectActions(state: MatchState, myPlayerId: string, abilityMap: Map<string, AbilityDefinition>): TurnAction[];
    private resolveUnit;
}
//# sourceMappingURL=aiBrain.d.ts.map