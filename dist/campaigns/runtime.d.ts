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
export declare const hasDoubleSpecialAtLevel: (level: number) => boolean;
/** Cooldown given to once-per-game specials under the L6 "Special ×2" perk. */
export declare const DOUBLE_SPECIAL_COOLDOWN = 7;
export interface CampaignUnitChoice {
    passiveSlug?: string;
    specialSlug?: string;
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
}
/**
 * Builds the full MatchState for a campaign encounter. Placements are
 * ABSOLUTE (unlike buildInitialState, which mirrors p2 across the board).
 * The human always moves first (same deadlock rationale as local PvE).
 */
export declare function buildEncounterState(campaign: CampaignDefinition, encounterId: string, partySlugs: string[], partyChoices: (CampaignUnitChoice | undefined)[], level: number, difficulty: CampaignDifficulty, humanId: string, enemyOwnerId: string, mainName?: string): EncounterBuild;
//# sourceMappingURL=runtime.d.ts.map