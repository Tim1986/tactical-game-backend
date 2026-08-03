"use strict";
/**
 * buildPuzzleState.ts — Deterministic MatchState builder for puzzles.
 *
 * Bypasses buildInitialState's round-1 commitment flow entirely: the
 * initiative order is fixed by the puzzle definition and the state starts
 * in round 2+ form (isRound1: false), so the first thing the player does
 * is act with the designated active unit.
 *
 * No randomness anywhere: dodge rolls are pre-scripted by the definition's
 * rollScript (consumed by the engine's rollMisses) and disclosed to the
 * player as fate text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_ENEMY_ID = exports.PUZZLE_PLAYER_ID = void 0;
exports.buildPuzzleState = buildPuzzleState;
exports.checkPuzzleGoal = checkPuzzleGoal;
const initialState_js_1 = require("../game/initialState.js");
const defaultData_js_1 = require("../ai/defaultData.js");
exports.PUZZLE_PLAYER_ID = 'puzzle-player';
exports.PUZZLE_ENEMY_ID = '00000000-0000-0000-0000-000000000001'; // Fable id — match UI treats it as the AI side
/**
 * Build the mid-battle MatchState for a puzzle. Also returns the mapping
 * from PuzzleUnitSpec ids to generated instanceIds (needed for
 * targetUnitId checks and initiative order).
 */
function buildPuzzleState(def, 
/** Player-chosen specials by spec id (from specialChoices pickers). */
specialOverrides) {
    const instanceIdBySpecId = {};
    const units = def.units.map((spec) => {
        const unitDef = defaultData_js_1.DEFAULT_UNITS[spec.slug];
        if (!unitDef)
            throw new Error(`Puzzle ${def.id}: unknown unit slug '${spec.slug}'`);
        const ownerId = spec.side === 'player' ? exports.PUZZLE_PLAYER_ID : exports.PUZZLE_ENEMY_ID;
        const override = specialOverrides?.[spec.id];
        if (override && !(spec.specialChoices ?? []).includes(override)) {
            throw new Error(`Puzzle ${def.id}: special '${override}' is not an offered choice for '${spec.id}'`);
        }
        const inst = (0, initialState_js_1.buildUnitInstance)(unitDef, ownerId, spec.position, {
            specialSlug: override ?? spec.specialSlug ?? unitDef.specialOptions[0],
            passiveSlug: spec.passiveSlug ?? null,
        });
        if (spec.currentHealth !== undefined) {
            inst.currentHealth = Math.min(spec.currentHealth, inst.maxHealth);
        }
        if (spec.cooldowns) {
            for (const [slug, cd] of Object.entries(spec.cooldowns))
                inst.cooldowns[slug] = cd;
        }
        if (spec.statusEffects) {
            inst.statusEffects = spec.statusEffects.map((se) => ({
                ...se,
                sourceUnitInstanceId: inst.instanceId,
            }));
        }
        instanceIdBySpecId[spec.id] = inst.instanceId;
        return inst;
    });
    // Validate the initiative order references every unit exactly once.
    const specIds = new Set(def.units.map((u) => u.id));
    if (def.initiativeOrder.length !== def.units.length ||
        !def.initiativeOrder.every((id) => specIds.has(id))) {
        throw new Error(`Puzzle ${def.id}: initiativeOrder must list every unit id exactly once`);
    }
    const order = def.initiativeOrder.map((specId) => instanceIdBySpecId[specId]);
    const firstUnit = units.find((u) => u.instanceId === order[0]);
    if (firstUnit.ownerPlayerId !== exports.PUZZLE_PLAYER_ID) {
        throw new Error(`Puzzle ${def.id}: initiativeOrder must start with a player unit`);
    }
    const state = {
        board: { width: 8, height: 8 },
        units,
        rollScript: def.rollScript ?? [],
        rollIndex: 0,
        turnNumber: 1,
        roundNumber: 2, // past round 1: fixed-order initiative, Charge still available
        activePlayerId: exports.PUZZLE_PLAYER_ID,
        phase: 'action',
        initiative: {
            order,
            slot: 0,
            round1FirstPlayerId: exports.PUZZLE_PLAYER_ID,
            activeUnitId: order[0],
            isRound1: false,
        },
    };
    return { state, instanceIdBySpecId };
}
/**
 * Evaluate the puzzle goal against a state.
 * Returns 'won' | 'lost' | 'ongoing'. Turn-limit enforcement is the
 * caller's job (runner / solver) — this only reads the board.
 */
function checkPuzzleGoal(def, state, instanceIdBySpecId) {
    const playerAlive = state.units.some((u) => u.isAlive && u.ownerPlayerId === exports.PUZZLE_PLAYER_ID);
    if (!playerAlive)
        return 'lost';
    if (def.goal === 'eliminate_target') {
        const targetInstanceId = instanceIdBySpecId[def.targetUnitId ?? ''];
        if (!targetInstanceId)
            throw new Error(`Puzzle ${def.id}: bad targetUnitId`);
        const target = state.units.find((u) => u.instanceId === targetInstanceId);
        return target && !target.isAlive ? 'won' : 'ongoing';
    }
    const enemyAlive = state.units.some((u) => u.isAlive && u.ownerPlayerId === exports.PUZZLE_ENEMY_ID);
    return enemyAlive ? 'ongoing' : 'won';
}
//# sourceMappingURL=buildPuzzleState.js.map