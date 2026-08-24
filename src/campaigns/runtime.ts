/**
 * campaigns/runtime.ts — Pure campaign match construction, shared verbatim by
 * the backend sim harness (campaignSim.ts) and the mobile campaign runner
 * (via sync-engine). Whatever this builds is exactly what the player fights —
 * sims are only trustworthy because both sides call this one function.
 */
import { MatchState, UnitInstance, BoardPosition, InitiativeState, BOARD_WIDTH, BOARD_HEIGHT, PendingWave, PendingRoom, EncounterProgressState, TerrainState, AllyBehaviorState } from '../types/matchState.js';
import { UnitDefinition } from '../ai/types.js';
import { newInstanceId } from '../game/initialState.js';
import { isInBounds } from '../game/boardUtils.js';
import { GIFT_DAMAGE_BONUS } from '../game/abilityExecutor.js';
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from '../ai/defaultData.js';
import { BoonDef, CampaignDefinition, CampaignDifficulty, CampaignEncounter, CampaignEnemy, TerrainSpec, WaveSpec } from './types.js';

/** Enemy HP multiplier per difficulty (applied to campaign enemies only). */
export const CAMPAIGN_HP_SCALE: Record<CampaignDifficulty, number> = {
  easy: 0.75, medium: 0.9, hard: 1.05, nightmare: 1.2,
};

/**
 * Player-side max-HP delta relative to arena values, by campaign level.
 * L1 starts stripped down (-8), L2 recovers half, L4 reaches baseline.
 */
export const PLAYER_HP_DELTA: Record<number, number> = { 1: -8, 2: -4, 3: -4, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };

// Level-up schedule (E0 ladder, settled 2026-08-17). Implemented per-unit in the
// mobile level-up UI (levelUpKind) and mirrored in campaignSim's choicesForLevel:
//   L2 main + 1 companion special · L3 other two · L4/L5 passives ·
//   L6 fork #1 (boon) · L7 main + 1 Deep Gift · L8 other two · L9 fork #2 (boon) ·
//   L10 specials get a SECOND CHARGE (max level).
// The build path honors whatever specialSlug/passiveSlug/deepGiftSlug the party
// has chosen; the only level gates here are the HP delta and the L10 perk.
export const MAX_CAMPAIGN_LEVEL = 10;

/** L10 perk: every party special gets a second charge — usable twice per
 *  encounter, back to back if the player likes (owner call 2026-08-17: charges,
 *  NOT a recharge cooldown — a cooldown forces burning the first use early to
 *  earn the second, charges reward setup). Implemented via
 *  UnitInstance.extraCharges; replaces the old dormant cooldown-7 perk. */
export const hasSecondSpecialChargeAtLevel = (level: number): boolean => level >= MAX_CAMPAIGN_LEVEL;

/** Deep Gifts (L7/L8): each unit picks ONE. Values PROVISIONAL — E0.4's gift
 *  harness measures them against all three representative parties, and a gift
 *  no party ever picks (or every party always picks) gets revised (movement's
 *  suspected buff is +2; armor is suspected strongest at 40% of the roster's
 *  whole AC spread). Damage is a flag consumed by abilityExecutor's giftBonus
 *  (+GIFT_DAMAGE_BONUS per damage effect); movement/armor are build-time stat
 *  deltas. ONE source of truth — sim, UI copy, and build all read this. */
export const GIFT_MOVEMENT_BONUS = 1;
export const GIFT_ARMOR_BONUS = 3;
export const DEEP_GIFTS = {
  // Descriptions are BUILT from the constants, not typed alongside them — the
  // player-facing text and the engine's behaviour cannot drift apart.
  damage: { name: 'Gift of Fangs', description: `+${GIFT_DAMAGE_BONUS} damage on every damaging effect.` },
  movement: { name: 'Gift of Stride', description: `+${GIFT_MOVEMENT_BONUS} movement range.`, movementRange: GIFT_MOVEMENT_BONUS },
  armor: { name: 'Gift of Stone', description: `+${GIFT_ARMOR_BONUS} armor class.`, armorClass: GIFT_ARMOR_BONUS },
} as const;
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
export function buildCampaignPlayerInstance(
  def: UnitDefinition,
  ownerId: string,
  position: BoardPosition,
  level: number,
  choice?: CampaignUnitChoice,
): UnitInstance {
  const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
  const specialSlug = choice?.specialSlug;
  const abilities = specialSlug ? [basicSlug, specialSlug] : [basicSlug];

  const passive = choice?.passiveSlug
    ? def.passiveOptions.find((p) => p.slug === choice.passiveSlug)
    : undefined;
  // Deep Gift (E0, L7/L8): one per unit. Unknown slugs throw — a silent no-op
  // gift would be the passiveFlags-typo bug all over again.
  const gift = choice?.deepGiftSlug !== undefined
    ? DEEP_GIFTS[choice.deepGiftSlug] : undefined;
  if (choice?.deepGiftSlug !== undefined && !gift) {
    throw new Error(`Unknown Deep Gift "${choice.deepGiftSlug}" for ${def.slug}`);
  }
  const maxHealth = Math.max(1, def.maxHealth + (PLAYER_HP_DELTA[level] ?? 0) + (passive?.stat === 'maxHealth' ? (passive.value ?? 0) : 0));
  const armorClass = def.armorClass + (passive?.stat === 'armorClass' ? (passive.value ?? 0) : 0)
    + ((gift as { armorClass?: number } | undefined)?.armorClass ?? 0);
  const movementRange = def.movementRange + (passive?.stat === 'movementRange' ? (passive.value ?? 0) : 0)
    + ((gift as { movementRange?: number } | undefined)?.movementRange ?? 0);
  const passives = passive?.passiveFlag ? [...def.passives, passive.passiveFlag] : [...def.passives];
  if (choice?.deepGiftSlug === 'damage') passives.push('gift_damage');

  const cooldowns: Record<string, number> = {};
  for (const s of abilities) cooldowns[s] = 0;
  // L10 (E0): the special gets a second charge. Lives on the unit, so it
  // serializes with match state through every transport untouched.
  const extraCharges = hasSecondSpecialChargeAtLevel(level) && specialSlug
    ? { [specialSlug]: 1 } : undefined;
  const instanceId = newInstanceId();
  const initialStatuses = passives.includes('warded')
    ? [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: instanceId }]
    : [];
  return {
    instanceId, definitionSlug: def.slug, ownerPlayerId: ownerId,
    position, currentHealth: maxHealth, maxHealth,
    armorClass, movementRange, abilities, passives,
    isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
    cooldowns, statusEffects: initialStatuses,
    ...(extraCharges ? { extraCharges } : {}),
  };
}

/** Builds a campaign enemy: base-class def + overrides + difficulty scaling. */
export function buildCampaignEnemyInstance(
  enemy: CampaignEnemy,
  ownerId: string,
  position: BoardPosition,
  difficulty: CampaignDifficulty,
  hpScale: number,
  noSpecials = false,
): UnitInstance {
  const def = DEFAULT_UNITS[enemy.baseClass];
  if (!def) throw new Error(`Campaign enemy baseClass not found: ${enemy.baseClass}`);

  const BANNED_ENEMY_SPECIALS = new Set(['kill_shot', 'assassinate']);
  // A6: a custom kit (possibly campaign-scoped slugs) replaces the class kit
  // verbatim — it is balanced per-encounter, so noSpecials does not apply.
  let abilities: string[];
  if (enemy.abilities?.length) {
    abilities = [...enemy.abilities];
  } else {
    const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
    const rawSpecialSlug = enemy.specialSlug ?? def.specialOptions[0];
    const specialSlug = (noSpecials || BANNED_ENEMY_SPECIALS.has(rawSpecialSlug)) ? undefined : rawSpecialSlug;
    abilities = specialSlug ? [basicSlug, specialSlug] : [basicSlug];
  }

  const isNightmare = difficulty === 'nightmare';
  const baseHp = enemy.maxHealth ?? def.maxHealth;
  const maxHealth = Math.max(1, Math.floor(baseHp * hpScale) + (isNightmare ? (enemy.nightmare?.hpBonus ?? 0) : 0));
  const armorClass = (enemy.armorClass ?? def.armorClass) + (isNightmare ? (enemy.nightmare?.acBonus ?? 0) : 0);
  const movementRange = enemy.movementRange ?? def.movementRange;
  const passives = [
    ...def.passives,
    ...(enemy.passiveFlags ?? []),
    ...(isNightmare ? (enemy.nightmare?.passiveFlags ?? []) : []),
  ];

  const cooldowns: Record<string, number> = {};
  for (const s of abilities) cooldowns[s] = 0;
  const instanceId = newInstanceId();
  const initialStatuses = passives.includes('warded')
    ? [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: instanceId }]
    : [];
  return {
    instanceId, definitionSlug: def.slug, ownerPlayerId: ownerId,
    position, currentHealth: maxHealth, maxHealth,
    armorClass, movementRange, abilities, passives,
    isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
    cooldowns, statusEffects: initialStatuses,
    ...(enemy.moveFlags?.length ? { moveFlags: [...enemy.moveFlags] } : {}),
    ...(enemy.aiHints ? { aiHints: { ...enemy.aiHints } } : {}),
    ...(enemy.artKey ? { artKey: enemy.artKey } : {}),
    // Explicit, so PLAYER-class thorns tuning cannot leak in through the shared
    // chassis slug (see THORNS_DAMAGE_BY_CLASS in abilityExecutor).
    ...(passives.includes('thorns') && enemy.thornsDamage != null
      ? { thornsDamage: enemy.thornsDamage } : {}),
    ...(enemy.damagePercentOfTargetMax != null
      ? { damagePercentOfTargetMax: enemy.damagePercentOfTargetMax } : {}),
  };
}

/** Interpolates {mainName} and flag conditionals {if flag}...{else}...{/if} (no nesting). */
export function renderStoryText(text: string, mainName: string, flags: Record<string, boolean>): string {
  let out = text.replace(/\{mainName\}/g, mainName);
  out = out.replace(/\{if (\w+)\}([\s\S]*?)(?:\{else\}([\s\S]*?))?\{\/if\}/g, (_m, flag, ifText, elseText) =>
    flags[flag] ? ifText : (elseText ?? ''),
  );
  return out;
}

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

/**
 * ENCOUNTER-GRAMMAR FEATURE GUARD (CAMPAIGN_ROADMAP.md Phase A / A1).
 *
 * The schema in types.ts intentionally runs AHEAD of the runtime: content can
 * be authored against grammar the engine doesn't play yet. This guard makes
 * that safe — an encounter using an unimplemented feature throws at build
 * time (both here and in campaignSim, which shares this function) instead of
 * silently no-oping into a fake fight. As each roadmap step lands it deletes
 * its entry from UNIMPLEMENTED below; when the list is empty, delete the
 * guard.
 */
// A2–A7 all landed; the list is empty but the SEAM stays: A6's demand-driven
// effect kinds (summon/teleport/on-death) re-add entries here the moment their
// schema lands ahead of their executor.
const UNIMPLEMENTED: { step: string; name: string; used: (c: CampaignDefinition, e: CampaignEncounter) => boolean }[] = [];

export function assertEncounterSupported(campaign: CampaignDefinition, encounterId: string): void {
  const enc = campaign.encounters[encounterId];
  if (!enc) return; // buildEncounterState raises the proper unknown-encounter error
  const used = UNIMPLEMENTED.filter((f) => f.used(campaign, enc));
  if (used.length > 0) {
    throw new Error(
      `Encounter "${encounterId}" uses grammar not implemented yet: `
      + used.map((f) => `${f.name} (roadmap ${f.step})`).join(', ')
      + '. See CAMPAIGN_ROADMAP.md — the schema deliberately leads the runtime.',
    );
  }
}

/** [A6] Effect kinds the executor actually implements — a campaign ability
 *  using anything else must fail at build time, never silently no-op. */
const KNOWN_EFFECT_TYPES = new Set([
  'damage', 'heal', 'lifesteal', 'push', 'pull', 'apply_status',
  'remove_status', 'move_self', 'grant_max_health', 'modify_cooldown',
]);
const KNOWN_TARGETING = new Set(['single', 'aoe', 'cone', 'line', 'self']);

function validateCampaignAbilities(campaign: CampaignDefinition): void {
  for (const [slug, def] of Object.entries(campaign.abilities ?? {})) {
    if (def.slug !== slug) throw new Error(`Campaign ability "${slug}": slug field must match its key (got "${def.slug}")`);
    if (!KNOWN_TARGETING.has(def.targetingType)) throw new Error(`Campaign ability "${slug}": unknown targetingType "${def.targetingType}"`);
    if (!Array.isArray(def.effects) || def.effects.length === 0) throw new Error(`Campaign ability "${slug}": needs at least one effect`);
    for (const e of def.effects) {
      if (!KNOWN_EFFECT_TYPES.has(e.type)) throw new Error(`Campaign ability "${slug}": effect type "${e.type}" is not implemented by the executor`);
    }
    if (typeof def.range !== 'number' || typeof def.cooldownTurns !== 'number') {
      throw new Error(`Campaign ability "${slug}": range and cooldownTurns must be numbers`);
    }
  }
}

/** [A7] Goals are TEAM-level, 0-2 per encounter; boons are flavor-sized
 *  run-scoped perks. Both fail loudly on authoring mistakes. */
function validateGoalsAndBoons(campaign: CampaignDefinition, enc: CampaignEncounter, encounterId: string): void {
  const goals = enc.goals ?? [];
  if (goals.length > 2) throw new Error(`Encounter ${encounterId}: at most 2 battle goals (got ${goals.length})`);
  const seen = new Set<string>();
  for (const g of goals) {
    if (seen.has(g.slug)) throw new Error(`Encounter ${encounterId}: duplicate goal slug "${g.slug}"`);
    seen.add(g.slug);
    if (g.check.kind === 'win_by_round' && g.check.round < 1) throw new Error(`Encounter ${encounterId}: goal "${g.slug}" round must be >= 1`);
  }
  for (const [key, b] of Object.entries(campaign.boons ?? {})) {
    if (b.slug !== key) throw new Error(`Boon "${key}": slug field must match its key (got "${b.slug}")`);
    const fx = b.effects;
    if (fx.partyMaxHp === undefined && !fx.unitMaxHp && !fx.startShielded
        && fx.partyMovement === undefined && fx.partyArmorClass === undefined) {
      throw new Error(`Boon "${key}": effects must set at least one of partyMaxHp/unitMaxHp/startShielded/partyMovement/partyArmorClass`);
    }
    if (fx.unitMaxHp && !DEFAULT_UNITS[fx.unitMaxHp.classSlug]) {
      throw new Error(`Boon "${key}": unitMaxHp.classSlug "${fx.unitMaxHp.classSlug}" is not a class`);
    }
    if (fx.startShielded === 'any') {
      throw new Error(`Boon "${key}": startShielded scope must be 'main' or 'all'`);
    }
  }
}

/** [A7] Apply a run's earned boons to the built party (rest-of-run perks). */
function applyBoons(partyUnits: UnitInstance[], boons: BoonDef[]): void {
  for (const b of boons) {
    const fx = b.effects;
    const bumpHp = (u: UnitInstance, amount: number) => {
      u.maxHealth = Math.max(1, u.maxHealth + amount);
      u.currentHealth = Math.max(1, u.currentHealth + amount);
    };
    if (fx.partyMaxHp) for (const u of partyUnits) bumpHp(u, fx.partyMaxHp);
    // Floored at 1: a negative boon must never immobilize or make a unit
    // unhittable-in-reverse. No shipped boon is negative, but the schema
    // permits it and a 0-movement unit would soft-lock its own turn.
    if (fx.partyMovement) for (const u of partyUnits) u.movementRange = Math.max(1, u.movementRange + fx.partyMovement);
    if (fx.partyArmorClass) for (const u of partyUnits) u.armorClass = Math.max(1, u.armorClass + fx.partyArmorClass);
    if (fx.unitMaxHp) {
      for (const u of partyUnits) {
        if (u.definitionSlug === fx.unitMaxHp.classSlug) bumpHp(u, fx.unitMaxHp.amount);
      }
    }
    if (fx.startShielded) {
      const targets = fx.startShielded === 'main' ? partyUnits.slice(0, 1) : partyUnits;
      for (const u of targets) {
        if (!u.statusEffects.some((e) => e.slug === 'shielded')) {
          u.statusEffects.push({ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: u.instanceId });
        }
      }
    }
  }
}

/**
 * Builds the full MatchState for a campaign encounter. Placements are
 * ABSOLUTE (unlike buildInitialState, which mirrors p2 across the board).
 * The human always moves first (same deadlock rationale as local PvE).
 */
export function buildEncounterState(
  campaign: CampaignDefinition,
  encounterId: string,
  partySlugs: string[],
  partyChoices: (CampaignUnitChoice | undefined)[],
  level: number,
  difficulty: CampaignDifficulty,
  humanId: string,
  enemyOwnerId: string,
  mainName?: string,
  /** [A7] Boon keys the run has earned (grantBoon choices), applied to the party. */
  boonKeys?: string[],
  /** [E2 balancing] Override the difficulty's enemy HP multiplier for THIS
   *  build only, without touching content. Exists so the calibration walk
   *  (buildBattery --scale) can probe a dozen rungs per minute instead of
   *  editing the campaign file and re-verifying contentHash per probe.
   *  Never set by live play — the mobile runner does not pass it. */
  hpScaleOverride?: number,
): EncounterBuild {
  const enc = campaign.encounters[encounterId];
  if (!enc) throw new Error(`Unknown encounter: ${encounterId}`);
  assertEncounterSupported(campaign, encounterId);
  validateCampaignAbilities(campaign);
  validateGoalsAndBoons(campaign, enc, encounterId);
  const runBoons = (boonKeys ?? []).map((k) => {
    const b = campaign.boons?.[k];
    if (!b) throw new Error(`Encounter ${encounterId}: run carries unknown boon "${k}"`);
    return b;
  });
  // A6: every kit slug (enemy overrides, ally kits) must resolve in the merged
  // ability pool — engine abilities plus this campaign's own definitions.
  const abilityPool = new Set([
    ...DEFAULT_ABILITIES.map((a) => a.slug),
    ...Object.keys(campaign.abilities ?? {}),
  ]);
  const checkKit = (slugs: string[] | undefined, who: string) => {
    for (const slug of slugs ?? []) {
      if (!abilityPool.has(slug)) throw new Error(`Encounter ${encounterId}: ${who} references unknown ability "${slug}"`);
    }
  };
  for (const [key, enemy] of Object.entries(campaign.enemies)) checkKit(enemy.abilities, `enemy "${key}"`);
  for (const [key, ally] of Object.entries(enc.allies ?? {})) checkKit(ally.abilities, `ally "${key}"`);
  // A4: `rooms` REPLACES the top-level board fields — rooms[0] is the opening
  // board and the encounter playerPlacement is its entry.
  if (enc.rooms && enc.rooms.length === 0) throw new Error(`Encounter ${encounterId}: rooms must not be empty`);
  const room0 = enc.rooms?.[0];
  const effTerrainSpec: TerrainSpec | undefined = room0 ? room0.terrain : enc.terrain;
  if (!room0 && !enc.enemies) {
    throw new Error(`Encounter ${encounterId}: needs either enemies+enemyPlacement or rooms`);
  }
  const effEnemies = room0 ? room0.enemies : enc.enemies!;
  const effEnemyPlacement = room0 ? room0.enemyPlacement : enc.enemyPlacement!;
  const effNoSpecials = room0 ? !!room0.noSpecials : !!enc.noSpecials;
  // The four extreme corners are removed from the board (60-tile cross) —
  // fail fast on authoring mistakes instead of erroring mid-match.
  for (const p of [...enc.playerPlacement, ...effEnemyPlacement]) {
    if (!isInBounds(p)) {
      throw new Error(`Encounter ${encounterId}: placement (${p.x},${p.y}) is out of bounds (corners are removed tiles)`);
    }
  }
  const hpScale = hpScaleOverride ?? enc.hpScaleOverride?.[difficulty] ?? CAMPAIGN_HP_SCALE[difficulty];

  // Terrain content validation (A2): walls/hazards in bounds, hazards never on
  // walls, and no unit placed on a wall or hazard — authoring mistakes fail at
  // build time, not mid-match.
  const terrainBlocked = effTerrainSpec?.blocked ?? [];
  const terrainHazards = effTerrainSpec?.hazards ?? [];
  for (const b of terrainBlocked) {
    if (!isInBounds(b)) throw new Error(`Encounter ${encounterId}: wall (${b.x},${b.y}) is out of bounds`);
  }
  for (const h of terrainHazards) {
    if (!isInBounds(h.pos)) throw new Error(`Encounter ${encounterId}: hazard (${h.pos.x},${h.pos.y}) is out of bounds`);
    if (terrainBlocked.some((b) => b.x === h.pos.x && b.y === h.pos.y)) {
      throw new Error(`Encounter ${encounterId}: hazard (${h.pos.x},${h.pos.y}) sits on a wall`);
    }
  }
  for (const p of [...enc.playerPlacement, ...effEnemyPlacement]) {
    if (terrainBlocked.some((b) => b.x === p.x && b.y === p.y)) {
      throw new Error(`Encounter ${encounterId}: placement (${p.x},${p.y}) is on a wall`);
    }
    if (terrainHazards.some((h) => h.pos.x === p.x && h.pos.y === p.y)) {
      throw new Error(`Encounter ${encounterId}: placement (${p.x},${p.y}) is on a hazard`);
    }
  }

  const unitNames: Record<string, string> = {};
  const playerUnits = partySlugs.map((slug, i) => {
    const def = DEFAULT_UNITS[slug];
    if (!def) throw new Error(`Unknown party slug: ${slug}`);
    const inst = buildCampaignPlayerInstance(def, humanId, enc.playerPlacement[i], level, partyChoices[i]);
    if (i === 0 && mainName) unitNames[inst.instanceId] = mainName;
    return inst;
  });
  applyBoons(playerUnits, runBoons);
  // ── A5: AI allies — party-owned NPCs with a doctrine, never controllable.
  // Built before enemies so ally objective conditions and enemy aiHints can
  // resolve against their ids. No difficulty scaling (they ride the player's
  // side of the fight).
  const allyIdsByKey = new Map<string, string>();
  const allyBehaviors: Record<string, AllyBehaviorState> = {};
  const allyUnits: UnitInstance[] = Object.entries(enc.allies ?? {}).map(([key, ally]) => {
    const def = DEFAULT_UNITS[ally.baseClass];
    if (!def) throw new Error(`Encounter ${encounterId}: ally "${key}" has unknown baseClass ${ally.baseClass}`);
    const pl = ally.placement;
    if (!isInBounds(pl)) throw new Error(`Encounter ${encounterId}: ally "${key}" placement out of bounds`);
    if (terrainBlocked.some((b) => b.x === pl.x && b.y === pl.y)) throw new Error(`Encounter ${encounterId}: ally "${key}" placed on a wall`);
    if (terrainHazards.some((h) => h.pos.x === pl.x && h.pos.y === pl.y)) throw new Error(`Encounter ${encounterId}: ally "${key}" placed on a hazard`);
    if (ally.behavior.mode === 'route') {
      if (!ally.behavior.waypoints.length) throw new Error(`Encounter ${encounterId}: ally "${key}" route needs waypoints`);
      for (const w of ally.behavior.waypoints) {
        if (!isInBounds(w) || terrainBlocked.some((b) => b.x === w.x && b.y === w.y)) {
          throw new Error(`Encounter ${encounterId}: ally "${key}" waypoint (${w.x},${w.y}) is invalid`);
        }
      }
    }
    const abilities = ally.abilities ?? [def.abilities.find((a) => !def.specialOptions.includes(a)) ?? def.abilities[0]];
    const instanceId = newInstanceId();
    const inst: UnitInstance = {
      instanceId, definitionSlug: def.slug, ownerPlayerId: humanId,
      position: { ...pl },
      currentHealth: ally.maxHealth ?? def.maxHealth, maxHealth: ally.maxHealth ?? def.maxHealth,
      armorClass: ally.armorClass ?? def.armorClass,
      movementRange: ally.movementRange ?? def.movementRange,
      abilities, passives: [],
      isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
      cooldowns: Object.fromEntries(abilities.map((a) => [a, 0])), statusEffects: [],
    };
    unitNames[instanceId] = ally.name;
    allyIdsByKey.set(key, instanceId);
    allyBehaviors[instanceId] = ally.behavior.mode === 'route'
      ? { mode: 'route', waypoints: ally.behavior.waypoints.map((w) => ({ ...w })), routeIndex: 0 }
      : { mode: ally.behavior.mode };
    return inst;
  });
  const allyIds = allyUnits.map((u) => u.instanceId);

  const enemyIdsByKey = new Map<string, string[]>();
  const enemyUnits = effEnemies.map((key, i) => {
    const enemy = campaign.enemies[key];
    if (!enemy) throw new Error(`Unknown enemy key: ${key}`);
    const inst = buildCampaignEnemyInstance(enemy, enemyOwnerId, effEnemyPlacement[i], difficulty, hpScale, effNoSpecials);
    unitNames[inst.instanceId] = enemy.name;
    enemyIdsByKey.set(key, [...(enemyIdsByKey.get(key) ?? []), inst.instanceId]);
    return inst;
  });

  // ── A4: prebuild every wave/room unit (stable ids; names available to the
  // client from turn one) and assemble encounterProgress. Runs BEFORE
  // objective resolution so units_dead can name wave/room enemies. ──
  const wallOf = (t: TerrainSpec | undefined) => t?.blocked ?? [];
  const buildSpawnGroup = (keys: string[], noSpec: boolean): UnitInstance[] => keys.map((key) => {
    const enemy = campaign.enemies[key];
    if (!enemy) throw new Error(`Encounter ${encounterId}: unknown enemy key "${key}" in wave/room`);
    const inst = buildCampaignEnemyInstance(enemy, enemyOwnerId, { x: 0, y: 0 }, difficulty, hpScale, noSpec);
    unitNames[inst.instanceId] = enemy.name;
    enemyIdsByKey.set(key, [...(enemyIdsByKey.get(key) ?? []), inst.instanceId]);
    return inst;
  });
  const resolveWaves = (waves: WaveSpec[] | undefined, roomTerrain: TerrainSpec | undefined, noSpec: boolean, where: string): PendingWave[] =>
    // Difficulty-scoped waves (types.ts): filtered BEFORE any instance is
    // built, so on the other difficulties the wave has no runtime footprint —
    // no units, no pending trigger, nothing for the mercy rule to count.
    (waves ?? []).filter((w) => !w.difficulties || w.difficulties.includes(difficulty)).map((w, wi) => {
      if (w.enemies.length === 0) throw new Error(`Encounter ${encounterId}: ${where} wave ${wi} has no enemies`);
      for (const pl of w.placement) {
        if (!isInBounds(pl)) throw new Error(`Encounter ${encounterId}: ${where} wave ${wi} spawn (${pl.x},${pl.y}) is out of bounds`);
        if (wallOf(roomTerrain).some((b) => b.x === pl.x && b.y === pl.y)) {
          throw new Error(`Encounter ${encounterId}: ${where} wave ${wi} spawn (${pl.x},${pl.y}) is on a wall`);
        }
      }
      if (w.trigger.on === 'door') {
        const t = w.trigger.tile;
        if (!isInBounds(t) || wallOf(roomTerrain).some((b) => b.x === t.x && b.y === t.y)) {
          throw new Error(`Encounter ${encounterId}: ${where} wave ${wi} door tile (${t.x},${t.y}) is invalid`);
        }
      }
      return { units: buildSpawnGroup(w.enemies, noSpec), placement: w.placement, trigger: w.trigger, ...(w.surprise ? { surprise: true } : {}) };
    });

  let encounterProgress: EncounterProgressState | undefined;
  const partyIds = playerUnits.map((u) => u.instanceId);
  if (room0) {
    const later: PendingRoom[] = enc.rooms!.slice(1).map((r, i) => {
      const idx = i + 1;
      const rWalls = wallOf(r.terrain);
      const rHaz = r.terrain?.hazards ?? [];
      for (const b of rWalls) if (!isInBounds(b)) throw new Error(`Encounter ${encounterId}: room ${idx} wall out of bounds`);
      for (const h of rHaz) {
        if (!isInBounds(h.pos)) throw new Error(`Encounter ${encounterId}: room ${idx} hazard out of bounds`);
        if (rWalls.some((b) => b.x === h.pos.x && b.y === h.pos.y)) throw new Error(`Encounter ${encounterId}: room ${idx} hazard on a wall`);
      }
      if (!r.entryTiles?.length) throw new Error(`Encounter ${encounterId}: room ${idx} needs entryTiles`);
      for (const t of [...r.entryTiles, ...r.enemyPlacement, ...(r.exitDoors ?? [])]) {
        if (!isInBounds(t)) throw new Error(`Encounter ${encounterId}: room ${idx} tile (${t.x},${t.y}) out of bounds`);
        if (rWalls.some((b) => b.x === t.x && b.y === t.y)) throw new Error(`Encounter ${encounterId}: room ${idx} tile (${t.x},${t.y}) is on a wall`);
      }
      for (const t of r.entryTiles) {
        if (rHaz.some((h) => h.pos.x === t.x && h.pos.y === t.y)) throw new Error(`Encounter ${encounterId}: room ${idx} entry tile (${t.x},${t.y}) is on a hazard`);
      }
      const isLast = idx === enc.rooms!.length - 1;
      if (!isLast && !(r.exitDoors?.length)) throw new Error(`Encounter ${encounterId}: room ${idx} needs exitDoors (not the last room)`);
      return {
        ...(r.terrain ? { terrain: { blocked: r.terrain.blocked ?? [], hazards: r.terrain.hazards ?? [] } } : {}),
        units: buildSpawnGroup(r.enemies, !!r.noSpecials),
        placement: r.enemyPlacement,
        waves: resolveWaves(r.waves, r.terrain, !!r.noSpecials, `room ${idx}`),
        exitDoors: r.exitDoors ?? [],
        doorMode: r.doorMode ?? 'on_clear',
        entryTiles: r.entryTiles,
        ...(r.surprise ? { surprise: true } : {}),
      };
    });
    if (!(room0.exitDoors?.length)) throw new Error(`Encounter ${encounterId}: room 0 needs exitDoors`);
    for (const d of room0.exitDoors) {
      if (!isInBounds(d) || terrainBlocked.some((b) => b.x === d.x && b.y === d.y)) {
        throw new Error(`Encounter ${encounterId}: room 0 exit door (${d.x},${d.y}) is invalid`);
      }
    }
    encounterProgress = {
      waves: resolveWaves(room0.waves, room0.terrain, effNoSpecials, 'room 0'),
      rooms: later,
      exitDoors: room0.exitDoors,
      doorMode: room0.doorMode ?? 'on_clear',
      partyIds, roomIndex: 0,
    };
  } else if (enc.waves?.length) {
    encounterProgress = {
      waves: resolveWaves(enc.waves, enc.terrain, effNoSpecials, 'encounter'),
      rooms: [], exitDoors: [], doorMode: 'on_clear', partyIds, roomIndex: 0,
    };
  }

  // Resolve the authored objective (A3): enemy keys -> instance ids, main ->
  // party slot 0; tiles validated against bounds and walls. Ally-referencing
  // conditions are still guarded until A5.
  let objective: import('../types/matchState.js').ObjectiveState | undefined;
  if (enc.objective) {
    const spec = enc.objective;
    const checkTiles = (tiles: BoardPosition[], what: string) => {
      for (const t of tiles) {
        if (!isInBounds(t)) throw new Error(`Encounter ${encounterId}: ${what} tile (${t.x},${t.y}) is out of bounds`);
        if (terrainBlocked.some((b) => b.x === t.x && b.y === t.y)) {
          throw new Error(`Encounter ${encounterId}: ${what} tile (${t.x},${t.y}) is on a wall`);
        }
      }
    };
    const win = spec.win.map((w): import('../types/matchState.js').ResolvedWinCondition => {
      switch (w.kind) {
        case 'units_dead': {
          const unitIds = w.enemyKeys.flatMap((k) => {
            const ids = enemyIdsByKey.get(k);
            if (!ids) throw new Error(`Encounter ${encounterId}: objective names unknown enemy key "${k}"`);
            return ids;
          });
          return { kind: 'units_dead', unitIds };
        }
        case 'units_at_tiles':
          checkTiles(w.tiles, 'objective');
          return { kind: 'units_at_tiles', scope: w.scope, tiles: w.tiles, ...(w.simultaneous ? { simultaneous: true } : {}) };
        case 'ally_at_tiles': {
          const id = allyIdsByKey.get(w.allyKey);
          if (!id) throw new Error(`Encounter ${encounterId}: objective names unknown ally "${w.allyKey}"`);
          checkTiles(w.tiles, 'objective');
          return { kind: 'ally_at_tiles', unitIds: [id], tiles: w.tiles };
        }
        default:
          return w;
      }
    });
    const loss = (spec.loss ?? []).map((l): import('../types/matchState.js').ResolvedLossCondition => {
      if (l.kind === 'ally_dead') {
        const id = allyIdsByKey.get(l.allyKey);
        if (!id) throw new Error(`Encounter ${encounterId}: objective names unknown ally "${l.allyKey}"`);
        return { kind: 'ally_dead', unitIds: [id] };
      }
      return l;
    });
    objective = {
      partyId: humanId, enemyId: enemyOwnerId,
      mainId: playerUnits[0].instanceId,
      ...(allyIds.length ? { allyIds } : {}),
      text: spec.text, win, loss,
    };
  } else if (encounterProgress || allyUnits.length > 0 || enc.goals?.length) {
    // A4: waves/rooms with no authored objective get the default kill-all as
    // an EXPLICIT objective, because the legacy kill-all check would end the
    // match on a clear board with content still pending. all_enemies_dead is
    // pending-aware; the banner reads sensibly.
    objective = {
      partyId: humanId, enemyId: enemyOwnerId,
      mainId: playerUnits[0].instanceId,
      ...(allyIds.length ? { allyIds } : {}),
      text: 'Defeat every enemy', win: [{ kind: 'all_enemies_dead' }], loss: [],
    };
  }

  // E0: the L10 "second charge" perk replaced the old cooldown-7 override —
  // charges live on UnitInstance.extraCharges (set in the player build above),
  // so nothing here needs the ability map touched. cooldownOverrides stays in
  // the EncounterBuild shape as an always-null legacy field because the whole
  // client stack (bridge, offline store, match screen) plumbs it; prune later.
  const cooldownOverrides: Record<string, number> | null = null;

  const initiative: InitiativeState = {
    order: [], slot: 0, round1FirstPlayerId: humanId, activeUnitId: null, isRound1: true,
  };
  const state: MatchState = {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    units: [...playerUnits, ...allyUnits, ...enemyUnits],
    turnNumber: 1, roundNumber: 1,
    activePlayerId: humanId, phase: 'action', initiative,
    // CAMPAIGN-ONLY terrain (A2). Theme is renderer-only and travels on
    // EncounterBuild, not MatchState.
    ...(effTerrainSpec && (terrainBlocked.length || terrainHazards.length)
      ? { terrain: { blocked: terrainBlocked, hazards: terrainHazards } } : {}),
    // CAMPAIGN-ONLY objective (A3).
    ...(objective ? { objective } : {}),
    // CAMPAIGN-ONLY waves/rooms (A4).
    ...(encounterProgress ? { encounterProgress } : {}),
    // CAMPAIGN-ONLY ally doctrines (A5).
    ...(allyIds.length ? { allies: allyBehaviors } : {}),
    // CAMPAIGN-ONLY battle-goal facts (A7) — only when the encounter has goals.
    ...(enc.goals?.length ? { goalStats: { mainTookDamage: false, partyDeaths: 0 } } : {}),
  };
  const campaignAbilities = campaign.abilities && Object.keys(campaign.abilities).length > 0
    ? campaign.abilities : null;
  return { state, unitNames, cooldownOverrides, campaignAbilities, ...(effTerrainSpec?.theme ? { theme: effTerrainSpec.theme } : {}) };
}
