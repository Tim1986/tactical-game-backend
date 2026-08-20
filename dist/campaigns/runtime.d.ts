/**
 * campaigns/runtime.ts — Pure campaign match construction, shared verbatim by
 * the backend sim harness (campaignSim.ts) and the mobile campaign runner
 * (via sync-engine). Whatever this builds is exactly what the player fights —
 * sims are only trustworthy because both sides call this one function.
 */
import { MatchState, UnitInstance, BoardPosition } from '../types/matchState.js';
import { UnitDefinition } from '../ai/types.js';
import { CampaignDefinition, CampaignDifficulty, CampaignEnemy } from './types.js';
/** Enemy HP multiplier per difficulty (applied to campaign enemies only). */
export declare const CAMPAIGN_HP_SCALE: Record<CampaignDifficulty, number>;
/**
 * Player-side max-HP delta relative to arena values, by campaign level.
 * L1 starts stripped down (-8), L2 recovers half, L4 reaches baseline.
 */
export declare const PLAYER_HP_DELTA: Record<number, number>;
export declare const MAX_CAMPAIGN_LEVEL = 10;
/** L10 perk: every party special gets a second charge — usable twice per
 *  encounter, back to back if the player likes (owner call 2026-08-17: charges,
 *  NOT a recharge cooldown — a cooldown forces burning the first use early to
 *  earn the second, charges reward setup). Implemented via
 *  UnitInstance.extraCharges; replaces the old dormant cooldown-7 perk. */
export declare const hasSecondSpecialChargeAtLevel: (level: number) => boolean;
/** Deep Gifts (L7/L8): each unit picks ONE. Values PROVISIONAL — E0.4's gift
 *  harness measures them against all three representative parties, and a gift
 *  no party ever picks (or every party always picks) gets revised (movement's
 *  suspected buff is +2; armor is suspected strongest at 40% of the roster's
 *  whole AC spread). Damage is a flag consumed by abilityExecutor's giftBonus
 *  (+GIFT_DAMAGE_BONUS per damage effect); movement/armor are build-time stat
 *  deltas. ONE source of truth — sim, UI copy, and build all read this. */
export declare const GIFT_MOVEMENT_BONUS = 1;
export declare const GIFT_ARMOR_BONUS = 3;
export declare const DEEP_GIFTS: {
    readonly damage: {
        readonly name: "Gift of Fangs";
        readonly description: "+2 damage on every damaging effect.";
    };
    readonly movement: {
        readonly name: "Gift of Stride";
        readonly description: "+1 movement range.";
        readonly movementRange: 1;
    };
    readonly armor: {
        readonly name: "Gift of Stone";
        readonly description: "+3 armor class.";
        readonly armorClass: 3;
    };
};
export type DeepGiftSlug = keyof typeof DEEP_GIFTS;
export interface CampaignUnitChoice {
    passiveSlug?: string;
    specialSlug?: string;
    /** Deep Gift (L7/L8) — validated against DEEP_GIFTS at build. */
    deepGiftSlug?: DeepGiftSlug;
}
/**
 * Builds a player-party unit at a campaign level. Below L5 the unit has its
 * basic attack ONLY (the engine's buildUnitInstance always auto-assigns a
 * special, which is why campaigns need this fork). Passive applies from L3.
 */
export declare function buildCampaignPlayerInstance(def: UnitDefinition, ownerId: string, position: BoardPosition, level: number, choice?: CampaignUnitChoice): UnitInstance;
/** Builds a campaign enemy: base-class def + overrides + difficulty scaling. */
export declare function buildCampaignEnemyInstance(enemy: CampaignEnemy, ownerId: string, position: BoardPosition, difficulty: CampaignDifficulty, hpScale: number, noSpecials?: boolean): UnitInstance;
/** Interpolates {mainName} and flag conditionals {if flag}...{else}...{/if} (no nesting). */
export declare function renderStoryText(text: string, mainName: string, flags: Record<string, boolean>): string;
export interface EncounterBuild {
    state: MatchState;
    /** instanceId → display name (enemy reskin names + the player main's chosen name). */
    unitNames: Record<string, string>;
    /** Ability cooldown overrides for this match (L6 double-special), or null. */
    cooldownOverrides: Record<string, number> | null;
    /** [A6] Campaign-scoped ability definitions to merge into the match's
     *  ability map (applyCampaignAbilities), or null. Validated at build. */
    campaignAbilities: Record<string, import('../types/index.js').AbilityDefinition> | null;
    /** Tile-art palette for the board renderer (TerrainSpec.theme), if any. */
    theme?: string;
}
export declare function assertEncounterSupported(campaign: CampaignDefinition, encounterId: string): void;
/**
 * Builds the full MatchState for a campaign encounter. Placements are
 * ABSOLUTE (unlike buildInitialState, which mirrors p2 across the board).
 * The human always moves first (same deadlock rationale as local PvE).
 */
export declare function buildEncounterState(campaign: CampaignDefinition, encounterId: string, partySlugs: string[], partyChoices: (CampaignUnitChoice | undefined)[], level: number, difficulty: CampaignDifficulty, humanId: string, enemyOwnerId: string, mainName?: string, 
/** [A7] Boon keys the run has earned (grantBoon choices), applied to the party. */
boonKeys?: string[], 
/** [E2 balancing] Override the difficulty's enemy HP multiplier for THIS
 *  build only, without touching content. Exists so the calibration walk
 *  (buildBattery --scale) can probe a dozen rungs per minute instead of
 *  editing the campaign file and re-verifying contentHash per probe.
 *  Never set by live play — the mobile runner does not pass it. */
hpScaleOverride?: number): EncounterBuild;
//# sourceMappingURL=runtime.d.ts.map