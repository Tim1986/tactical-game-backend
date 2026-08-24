/**
 * campaigns/types.ts — Pure types for campaign content and the campaign
 * runtime. Lives in backend/src so campaignSim.ts (backend) and the mobile
 * campaign runner (via sync-engine → mobile/engine/campaigns) share ONE
 * definition of every campaign. No server or RN dependencies.
 */
import { BoardPosition } from '../types/matchState.js';
import { AbilityDefinition } from '../ai/types.js';

export type CampaignDifficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

// ═══════════════════════════════════════════════════════════════════════════
// ENCOUNTER GRAMMAR (CAMPAIGN_ROADMAP.md Phase A; full semantics in
// backend/ENCOUNTER_SPEC.md). Every field is OPTIONAL and campaign-only —
// arena is untouched (owner-locked). Fields are tagged with the roadmap step
// that implements them; until that step lands, runtime's feature guard
// REJECTS content that uses the field (loud, never a silent no-op).
// ═══════════════════════════════════════════════════════════════════════════

/** [A2] Hazard tile types. Extend here as new hazards are implemented. */
export type HazardType = 'fire';

/** [A2] Static board carve for an encounter/room. */
export interface TerrainSpec {
  /** Impassable tiles (walls/pillars): block movement, LoS, push/pull paths.
   *  Units with the 'phasing' flag (Wraith/Specter) may MOVE through, not stop on. */
  blocked?: BoardPosition[];
  /** Entering (or being displaced onto) a hazard applies its effect. */
  hazards?: { pos: BoardPosition; type: HazardType }[];
  /** Tile-art palette key ('crypt' | 'cave' | 'forest' | ...). Renderer-only. */
  theme?: string;
}

/** [A3] Which player-side units a condition inspects. */
export type UnitScope = 'any' | 'main' | 'all';

/** [A3] Win conditions — the encounter is WON when ANY listed condition holds. */
export type WinCondition =
  | { kind: 'all_enemies_dead' }
  /** Kill the named enemies (boss); other enemies don't need to die. */
  | { kind: 'units_dead'; enemyKeys: string[] }
  /** Survive: the round counter reaches `round` with the party alive.
   *
   *  `roundByDifficulty` overrides `round` per tier, and is THE lever for a
   *  `survive` objective. Those encounters are nearly scale-INERT up high —
   *  tankier enemies live longer but do not kill faster — so their difficulty
   *  lives in round count x wave size, and a flat clock leaves only an inert
   *  dial to separate the tiers. Resolved at BUILD time, exactly like
   *  WaveSpec.difficulties: the runtime state carries one plain number.
   *  (owner call 2026-08-24, unlitbeacon e9: "6 rounds for easy, 7 for
   *  medium, 8 for hard and nightmare"). */
  | { kind: 'round_reached'; round: number; roundByDifficulty?: Partial<Record<CampaignDifficulty, number>> }
  /** Party units on the marked tiles (escape / stand-on-the-buttons).
   *  `simultaneous` requires all tiles covered at once. */
  | { kind: 'units_at_tiles'; scope: UnitScope; tiles: BoardPosition[]; simultaneous?: boolean }
  /** An ally (escort) has reached one of the tiles. */
  | { kind: 'ally_at_tiles'; allyKey: string; tiles: BoardPosition[] };

/** [A3] Loss conditions — the encounter is LOST when ANY holds.
 *  Party wipe is ALWAYS an implicit loss and never needs listing. */
export type LossCondition =
  | { kind: 'ally_dead'; allyKey: string }
  /** Deadline: reaching this round without having won = loss (race the clock).
   *  `roundByDifficulty` overrides per tier — see the win-side note. */
  | { kind: 'round_reached'; round: number; roundByDifficulty?: Partial<Record<CampaignDifficulty, number>> }
  | { kind: 'main_dead' };

/** [A3] Per-encounter objective. Omitted = classic kill-all. */
export interface ObjectiveSpec {
  win: WinCondition[];
  loss?: LossCondition[];
  /** Player-facing objective line shown in the banner ("Survive 8 rounds"). */
  text: string;
}

/** [A4] What causes a wave to spawn. */
export type WaveTrigger =
  | { on: 'room_cleared' }
  | { on: 'round'; round: number }
  /** A party unit ends a move on the door tile: the door opens. */
  | { on: 'door'; tile: BoardPosition };

/** [A4] Reinforcements spawned mid-encounter onto the CURRENT board. */
export interface WaveSpec {
  enemies: string[];
  placement: BoardPosition[];
  trigger: WaveTrigger;
  /** Non-default: the spawn does NOT act the round it appears (a designed
   *  player ambush). Normal waves weave into initiative and act same-round. */
  surprise?: boolean;
  /** Restrict this wave to the listed difficulties (omit = every difficulty).
   *
   *  THE SECOND PER-TIER DIAL (owner-approved 2026-08-24). hpScaleOverride is
   *  per-difficulty but inert on objective encounters — an escape/hold is won
   *  by ARRIVING, so enemy HP buys nothing (Unlit Beacon e6 measured 100% at
   *  every scale 0.90-2.20; Sealed Deep e8 the same until its route changed).
   *  Both BAL1 campaigns hit cells where the only honest verdict was "no lever
   *  exists": every structural knob (clock, wave timing, enemy count) was
   *  GLOBAL, so raising hard/nightmare meant breaking easy/medium with no
   *  compensating dial. A difficulty-scoped wave is pressure that costs the
   *  thing objective fights actually trade in — rounds and bodies — applied
   *  only to the tiers that need it. Resolved at encounter BUILD time: a
   *  filtered-out wave never exists in the runtime state at all. */
  difficulties?: CampaignDifficulty[];
}

/** [A4] One room of a multi-room encounter. The board re-carves per room;
 *  party HP/cooldowns/statuses and the round counter carry across; party
 *  enters at entryTiles. */
export interface RoomSpec {
  terrain?: TerrainSpec;
  enemies: string[];
  enemyPlacement: BoardPosition[];
  waves?: WaveSpec[];
  /** Door tiles that transition to the NEXT room (last room: none). */
  exitDoors?: BoardPosition[];
  /** 'on_clear' (default): doors activate once this room's enemies are dead.
   *  'always': door works mid-fight; enemies left behind are lost from the
   *  encounter (see ENCOUNTER_SPEC.md A4 for the objective interaction). */
  doorMode?: 'on_clear' | 'always';
  /** Party entry tiles on arrival (room 1 uses encounter playerPlacement). */
  entryTiles?: BoardPosition[];
  /** Non-default: this room's starting enemies don't act the round the party
   *  enters (the party caught THEM off guard). */
  surprise?: boolean;
  noSpecials?: boolean;
}

/** [A5] Ally movement doctrine, played by the AI (allies are NPCs, never a
 *  5th party slot). */
export type AllyBehavior =
  | { mode: 'follow' }
  | { mode: 'hold' }
  | { mode: 'route'; waypoints: BoardPosition[] };

/** [A5] An AI-controlled ally/escort in the encounter. */
export interface CampaignAlly {
  name: string;
  /** Stat/art fallback chassis (engine slug). */
  baseClass: string;
  maxHealth?: number;
  armorClass?: number;
  movementRange?: number;
  /** Kit override; [] = defenseless VIP. Slugs may reference campaign abilities. */
  abilities?: string[];
  behavior: AllyBehavior;
  placement: BoardPosition;
}

/** [A7] Post-match optional bonus objectives (evaluated from the event log +
 *  final state; grants a campaign achievement). */
export type GoalCheck =
  | { kind: 'win_by_round'; round: number }
  | { kind: 'no_party_deaths' }
  | { kind: 'unit_survives'; scope: UnitScope }
  | { kind: 'killing_blow_by_main' }
  | { kind: 'no_damage_to_main' };

export interface BattleGoal {
  slug: string;
  name: string;
  description: string;
  check: GoalCheck;
}

/** [A7] Mechanical effects a boon can carry. Extend as boons are designed. */
export interface BoonEffect {
  /** Max-HP delta applied to every party unit for the rest of the run. */
  partyMaxHp?: number;
  /** Max-HP delta for one class in the party. */
  unitMaxHp?: { classSlug: string; amount: number };
  /** These units start every remaining encounter with a shield. */
  startShielded?: UnitScope;
  /** [E0] Movement-range delta for every party unit. Added for campaign 2's
   *  L9 fork (movement vs armor) — the three effects above could only produce
   *  ONE genuinely incomparable pairing (shield vs HP), which L6 spends. */
  partyMovement?: number;
  /** [E0] Armor-class delta for every party unit. */
  partyArmorClass?: number;
}

/** [A7] A permanent run-scoped perk granted by a choice node. */
export interface BoonDef {
  slug: string;
  name: string;
  description: string;
  effects: BoonEffect;
}

/** [A6] Encounter-scoped ability, authored in normalized (camelCase) form —
 *  the same shape normalizeAbilityDefinitions produces. May use effect kinds
 *  that are ILLEGAL in arena (summon, aura, teleport — added as A6 lands);
 *  balance is per-encounter, not global. */
export type CampaignAbilityDef = AbilityDefinition;

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
  /** Thorns retaliation for this enemy, when it carries the `thorns` flag.
   *  ALWAYS set it explicitly rather than letting the chassis decide: the
   *  class-keyed default follows PLAYER balance and will drift under you. */
  thornsDamage?: number;
  /** This enemy's damaging effects deal this fraction of the TARGET's max
   *  health (min 1) instead of their flat values.
   *
   *  Built (2026-08-24, owner idea) for the Adjutant duel: an enemy whose job
   *  is hunting THE HERO deals flat damage into hero pools that differ 2x by
   *  class (wizard 32 vs barbarian 55), so time-to-kill-the-hero — and with
   *  loss = main_dead, the whole encounter — split bimodally on hero class.
   *  No scale rung could close it: e11 walled 18-22% of builds at easy/medium
   *  while the median walked it. Percent damage makes the hunt last the same
   *  number of turns for every hero. Applies to ALL the enemy's damage
   *  effects, every target; multi-hit abilities apply it per strike. */
  damagePercentOfTargetMax?: number;
  /** Nightmare-only buffs, applied after difficulty HP scaling. */
  nightmare?: { hpBonus?: number; acBonus?: number; passiveFlags?: string[] };
  /** [A6/B1] Enemy art asset key, decoupled from baseClass (Skeleton art on a
   *  fighter chassis). Omit to keep the baseClass's art. */
  artKey?: string;
  /** [A6] Full kit override (basic + specials); slugs may reference the
   *  campaign's own `abilities` record. Overrides specialSlug when present. */
  abilities?: string[];
  /** [A2] Movement flags: 'phasing' walks through blocked tiles (Wraith). */
  moveFlags?: ('phasing')[];
  /** [A5] Brain hints, e.g. hunt the escort before anything else. */
  aiHints?: { priorityTarget?: 'ally' | 'main' };
}

export interface CampaignEncounter {
  /** Player level when this encounter is normally reached (drives sims and party stats). */
  level: number;
  /** Keys into CampaignDefinition.enemies, 1–4 entries.
   *  OPTIONAL only when `rooms` is present — rooms[0] supplies the opening
   *  board and these are ignored entirely (ENCOUNTER_SPEC.md A4). Exactly one
   *  of (enemies+enemyPlacement) or rooms must be given; the build throws
   *  otherwise. */
  enemies?: string[];
  /** ABSOLUTE board coordinates (8×8) — no mirroring is applied, unlike
   *  buildInitialState. Optional under the same rule as `enemies`. */
  enemyPlacement?: BoardPosition[];
  /** ABSOLUTE coordinates for the player's 4 units, in party order (main first). */
  playerPlacement: BoardPosition[];
  /** Per-difficulty enemy HP multiplier override (default CAMPAIGN_HP_SCALE). */
  hpScaleOverride?: Partial<Record<CampaignDifficulty, number>>;
  /** If true, enemies in this encounter fight with basic abilities only (no specials). */
  noSpecials?: boolean;
  /** [A2] Board carve for the (single-room) encounter. */
  terrain?: TerrainSpec;
  /** [A3] Win/loss spec. Omitted = kill-all. */
  objective?: ObjectiveSpec;
  /** [A4] Same-board reinforcement waves. */
  waves?: WaveSpec[];
  /** [A4] Multi-room encounter. When present, `rooms` REPLACES the top-level
   *  enemies/enemyPlacement/terrain/waves entirely: rooms[0] is room 1 and
   *  the encounter-level playerPlacement is its entry (ENCOUNTER_SPEC.md A4). */
  rooms?: RoomSpec[];
  /** [A5] AI-controlled allies/escorts, keyed for objective references. */
  allies?: Record<string, CampaignAlly>;
  /** [A7] Optional bonus objectives (0–2). */
  goals?: BattleGoal[];
}

export interface CampaignChoiceOption {
  label: string;
  setFlags?: Record<string, boolean>;
  /** Campaign-local achievement granted when this choice is taken. */
  grantAchievement?: string;
  /** [A7] Boon (key into CampaignDefinition.boons) granted for the rest of the run. */
  grantBoon?: string;
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
  /**
   * Player-facing name for the opposing side ("Goblins"), shown wherever a
   * campaign match needs an opponent NAME — combat log actor lines, turn
   * headers, the versus label. Without it those fall back to a truncated
   * player id, which rendered as "00000000".
   */
  enemyFactionName: string;
  /** Free campaigns are playable without purchase (the teaser). */
  free: boolean;
  startNode: string;
  /** null until a skin system exists — see TODO(skins) in CAMPAIGNS.md. */
  rewardSkin: { classSlug: string; skinId: string; name: string } | null;
  achievements: CampaignAchievementDef[];
  enemies: Record<string, CampaignEnemy>;
  encounters: Record<string, CampaignEncounter>;
  nodes: Record<string, CampaignNode>;
  /** [A6] Campaign-scoped abilities (normalized camelCase form), referenced by
   *  enemy/ally kits. May be arena-illegal; balanced per-encounter. */
  abilities?: Record<string, CampaignAbilityDef>;
  /** [A7] Boons grantable by choice nodes. */
  boons?: Record<string, BoonDef>;
}
