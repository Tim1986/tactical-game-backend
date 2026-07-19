/**
 * campaigns/types.ts — Pure types for campaign content and the campaign
 * runtime. Lives in backend/src so campaignSim.ts (backend) and the mobile
 * campaign runner (via sync-engine → mobile/engine/campaigns) share ONE
 * definition of every campaign. No server or RN dependencies.
 */
import { BoardPosition } from '../types/matchState.js';

export type CampaignDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

/**
 * A campaign enemy is a reskinned base class: `baseClass` must be an engine
 * unit slug (drives sprites, abilities, and AI reasoning — the match screen
 * resolves art by definitionSlug, so campaign enemies keep the base slug and
 * get their display name via per-instance name overrides).
 */
export interface CampaignEnemy {
  /** Engine unit def slug (fighter, rogue, ...). */
  baseClass: string;
  /** Display name shown in labels/log ("Goblin Scrapper"). */
  name: string;
  /** Absolute stat overrides (pre-difficulty scaling). Omit to inherit the base class. */
  maxHealth?: number;
  armorClass?: number;
  movementRange?: number;
  /** Which special the enemy fights with (default: base class's first specialOption). */
  specialSlug?: string;
  /** Behavioral passive flags always applied ('immovable', 'warded'). */
  passiveFlags?: string[];
  /** Nightmare-only buffs, applied after difficulty HP scaling. */
  nightmare?: { hpBonus?: number; acBonus?: number; passiveFlags?: string[] };
}

export interface CampaignEncounter {
  /** Player level when this encounter is normally reached (drives sims and party stats). */
  level: number;
  /** Keys into CampaignDefinition.enemies, 1–4 entries. */
  enemies: string[];
  /** ABSOLUTE board coordinates (8×8) — no mirroring is applied, unlike buildInitialState. */
  enemyPlacement: BoardPosition[];
  /** ABSOLUTE coordinates for the player's 4 units, in party order (main first). */
  playerPlacement: BoardPosition[];
  /** Per-difficulty enemy HP multiplier override (default CAMPAIGN_HP_SCALE). */
  hpScaleOverride?: Partial<Record<CampaignDifficulty, number>>;
  /** If true, enemies in this encounter fight with basic abilities only (no specials). */
  noSpecials?: boolean;
}

export interface CampaignChoiceOption {
  label: string;
  setFlags?: Record<string, boolean>;
  /** Campaign-local achievement granted when this choice is taken. */
  grantAchievement?: string;
  next: string;
}

/**
 * Story text supports `{mainName}` interpolation and flag conditionals:
 * `{if flagName}...{else}...{/if}` (else optional, no nesting).
 */
export type CampaignNode =
  | { kind: 'story'; text: string; next: string }
  | { kind: 'choice'; text: string; choices: CampaignChoiceOption[] }
  | { kind: 'encounter'; encounter: string; preText: string; next: string }
  /** Presents the level award; `level` indexes the standard ladder (see runtime.ts). */
  | { kind: 'levelup'; level: number; next: string }
  | { kind: 'end'; text: string };

export interface CampaignAchievementDef {
  slug: string;
  name: string;
  description: string;
}

export interface CampaignDefinition {
  slug: string;
  title: string;
  blurb: string;
  /** Free campaigns are playable without purchase (the teaser). */
  free: boolean;
  startNode: string;
  /** null until a skin system exists — see TODO(skins) in CAMPAIGNS.md. */
  rewardSkin: { classSlug: string; skinId: string; name: string } | null;
  achievements: CampaignAchievementDef[];
  enemies: Record<string, CampaignEnemy>;
  encounters: Record<string, CampaignEncounter>;
  nodes: Record<string, CampaignNode>;
}
