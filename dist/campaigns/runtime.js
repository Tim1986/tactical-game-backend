"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOUBLE_SPECIAL_COOLDOWN = exports.hasDoubleSpecialAtLevel = exports.PLAYER_HP_DELTA = exports.CAMPAIGN_HP_SCALE = void 0;
exports.buildCampaignPlayerInstance = buildCampaignPlayerInstance;
exports.buildCampaignEnemyInstance = buildCampaignEnemyInstance;
exports.renderStoryText = renderStoryText;
exports.buildEncounterState = buildEncounterState;
/**
 * campaigns/runtime.ts — Pure campaign match construction, shared verbatim by
 * the backend sim harness (campaignSim.ts) and the mobile campaign runner
 * (via sync-engine). Whatever this builds is exactly what the player fights —
 * sims are only trustworthy because both sides call this one function.
 */
const matchState_js_1 = require("../types/matchState.js");
const initialState_js_1 = require("../game/initialState.js");
const boardUtils_js_1 = require("../game/boardUtils.js");
const defaultData_js_1 = require("../ai/defaultData.js");
/** Enemy HP multiplier per difficulty (applied to campaign enemies only). */
exports.CAMPAIGN_HP_SCALE = {
    easy: 0.75, medium: 0.9, hard: 1.05, nightmare: 1.2,
};
/**
 * Player-side max-HP delta relative to arena values, by campaign level.
 * L1 starts stripped down (-8), L2 recovers half, L4 reaches baseline.
 */
exports.PLAYER_HP_DELTA = { 1: -8, 2: -4, 3: -4, 4: 0, 5: 0, 6: 0 };
// Level-up schedule (specials front-loaded) is implemented per-unit in the mobile
// level-up UI (levelUpKind) and mirrored in campaignSim's choicesForLevel:
//   L2 main + 1 companion special · L3 other two special · L4/L5 passives · L6 recharge.
// The player build path honors whatever specialSlug/passiveSlug the party has chosen,
// so there is no level gate here beyond the double-special perk below.
const hasDoubleSpecialAtLevel = (level) => level >= 6;
exports.hasDoubleSpecialAtLevel = hasDoubleSpecialAtLevel;
/** Cooldown given to once-per-game specials under the L6 "Special ×2" perk. */
exports.DOUBLE_SPECIAL_COOLDOWN = 7;
/**
 * Builds a player-party unit at a campaign level. Below L5 the unit has its
 * basic attack ONLY (the engine's buildUnitInstance always auto-assigns a
 * special, which is why campaigns need this fork). Passive applies from L3.
 */
function buildCampaignPlayerInstance(def, ownerId, position, level, choice) {
    const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
    const specialSlug = choice?.specialSlug;
    const abilities = specialSlug ? [basicSlug, specialSlug] : [basicSlug];
    const passive = choice?.passiveSlug
        ? def.passiveOptions.find((p) => p.slug === choice.passiveSlug)
        : undefined;
    const maxHealth = Math.max(1, def.maxHealth + (exports.PLAYER_HP_DELTA[level] ?? 0) + (passive?.stat === 'maxHealth' ? (passive.value ?? 0) : 0));
    const armorClass = def.armorClass + (passive?.stat === 'armorClass' ? (passive.value ?? 0) : 0);
    const movementRange = def.movementRange + (passive?.stat === 'movementRange' ? (passive.value ?? 0) : 0);
    const passives = passive?.passiveFlag ? [...def.passives, passive.passiveFlag] : [...def.passives];
    const cooldowns = {};
    for (const s of abilities)
        cooldowns[s] = 0;
    const instanceId = (0, initialState_js_1.newInstanceId)();
    const initialStatuses = passives.includes('warded')
        ? [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: instanceId }]
        : [];
    return {
        instanceId, definitionSlug: def.slug, ownerPlayerId: ownerId,
        position, currentHealth: maxHealth, maxHealth,
        armorClass, movementRange, abilities, passives,
        isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
        cooldowns, statusEffects: initialStatuses,
    };
}
/** Builds a campaign enemy: base-class def + overrides + difficulty scaling. */
function buildCampaignEnemyInstance(enemy, ownerId, position, difficulty, hpScale, noSpecials = false) {
    const def = defaultData_js_1.DEFAULT_UNITS[enemy.baseClass];
    if (!def)
        throw new Error(`Campaign enemy baseClass not found: ${enemy.baseClass}`);
    const BANNED_ENEMY_SPECIALS = new Set(['kill_shot', 'assassinate']);
    const basicSlug = def.abilities.find((s) => !def.specialOptions.includes(s)) ?? def.abilities[0];
    const rawSpecialSlug = enemy.specialSlug ?? def.specialOptions[0];
    const specialSlug = (noSpecials || BANNED_ENEMY_SPECIALS.has(rawSpecialSlug)) ? undefined : rawSpecialSlug;
    const abilities = specialSlug ? [basicSlug, specialSlug] : [basicSlug];
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
    const cooldowns = {};
    for (const s of abilities)
        cooldowns[s] = 0;
    const instanceId = (0, initialState_js_1.newInstanceId)();
    const initialStatuses = passives.includes('warded')
        ? [{ slug: 'shielded', turnsRemaining: 99, stacks: 1, sourceUnitInstanceId: instanceId }]
        : [];
    return {
        instanceId, definitionSlug: def.slug, ownerPlayerId: ownerId,
        position, currentHealth: maxHealth, maxHealth,
        armorClass, movementRange, abilities, passives,
        isAlive: true, hasMovedThisTurn: false, hasActedThisTurn: false,
        cooldowns, statusEffects: initialStatuses,
    };
}
/** Interpolates {mainName} and flag conditionals {if flag}...{else}...{/if} (no nesting). */
function renderStoryText(text, mainName, flags) {
    let out = text.replace(/\{mainName\}/g, mainName);
    out = out.replace(/\{if (\w+)\}([\s\S]*?)(?:\{else\}([\s\S]*?))?\{\/if\}/g, (_m, flag, ifText, elseText) => flags[flag] ? ifText : (elseText ?? ''));
    return out;
}
/**
 * Builds the full MatchState for a campaign encounter. Placements are
 * ABSOLUTE (unlike buildInitialState, which mirrors p2 across the board).
 * The human always moves first (same deadlock rationale as local PvE).
 */
function buildEncounterState(campaign, encounterId, partySlugs, partyChoices, level, difficulty, humanId, enemyOwnerId, mainName) {
    const enc = campaign.encounters[encounterId];
    if (!enc)
        throw new Error(`Unknown encounter: ${encounterId}`);
    // The four extreme corners are removed from the board (60-tile cross) —
    // fail fast on authoring mistakes instead of erroring mid-match.
    for (const p of [...enc.playerPlacement, ...enc.enemyPlacement]) {
        if (!(0, boardUtils_js_1.isInBounds)(p)) {
            throw new Error(`Encounter ${encounterId}: placement (${p.x},${p.y}) is out of bounds (corners are removed tiles)`);
        }
    }
    const hpScale = enc.hpScaleOverride?.[difficulty] ?? exports.CAMPAIGN_HP_SCALE[difficulty];
    const unitNames = {};
    const playerUnits = partySlugs.map((slug, i) => {
        const def = defaultData_js_1.DEFAULT_UNITS[slug];
        if (!def)
            throw new Error(`Unknown party slug: ${slug}`);
        const inst = buildCampaignPlayerInstance(def, humanId, enc.playerPlacement[i], level, partyChoices[i]);
        if (i === 0 && mainName)
            unitNames[inst.instanceId] = mainName;
        return inst;
    });
    const enemyUnits = enc.enemies.map((key, i) => {
        const enemy = campaign.enemies[key];
        if (!enemy)
            throw new Error(`Unknown enemy key: ${key}`);
        const inst = buildCampaignEnemyInstance(enemy, enemyOwnerId, enc.enemyPlacement[i], difficulty, hpScale, enc.noSpecials);
        unitNames[inst.instanceId] = enemy.name;
        return inst;
    });
    // L6 double-special: override every party special's cooldown in this match's
    // ability map (never mutate shared engine data).
    let cooldownOverrides = null;
    if ((0, exports.hasDoubleSpecialAtLevel)(level)) {
        cooldownOverrides = {};
        for (const slug of partySlugs) {
            for (const sp of defaultData_js_1.DEFAULT_UNITS[slug]?.specialOptions ?? []) {
                cooldownOverrides[sp] = exports.DOUBLE_SPECIAL_COOLDOWN;
            }
        }
    }
    const initiative = {
        order: [], slot: 0, round1FirstPlayerId: humanId, activeUnitId: null, isRound1: true,
    };
    const state = {
        board: { width: matchState_js_1.BOARD_WIDTH, height: matchState_js_1.BOARD_HEIGHT },
        units: [...playerUnits, ...enemyUnits],
        turnNumber: 1, roundNumber: 1,
        activePlayerId: humanId, phase: 'action', initiative,
    };
    return { state, unitNames, cooldownOverrides };
}
//# sourceMappingURL=runtime.js.map