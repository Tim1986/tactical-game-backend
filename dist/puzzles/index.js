"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_PUZZLE = exports.PUZZLE_ROTATION = exports.PUZZLES = void 0;
exports.getDailyPuzzle = getDailyPuzzle;
const puzzle_001_js_1 = require("./puzzles/puzzle-001.js");
const puzzle_002_js_1 = require("./puzzles/puzzle-002.js");
const puzzle_003_js_1 = require("./puzzles/puzzle-003.js");
const puzzle_004_js_1 = require("./puzzles/puzzle-004.js");
const puzzle_005_js_1 = require("./puzzles/puzzle-005.js");
const puzzle_006_js_1 = require("./puzzles/puzzle-006.js");
const puzzle_007_js_1 = require("./puzzles/puzzle-007.js");
const puzzle_008_js_1 = require("./puzzles/puzzle-008.js");
const puzzle_009_js_1 = require("./puzzles/puzzle-009.js");
const puzzle_010_js_1 = require("./puzzles/puzzle-010.js");
const puzzle_011_js_1 = require("./puzzles/puzzle-011.js");
const puzzle_012_js_1 = require("./puzzles/puzzle-012.js");
const puzzle_013_js_1 = require("./puzzles/puzzle-013.js");
const puzzle_014_js_1 = require("./puzzles/puzzle-014.js");
const puzzle_015_js_1 = require("./puzzles/puzzle-015.js");
const puzzle_016_js_1 = require("./puzzles/puzzle-016.js");
/** Every registered puzzle, keyed by id. */
exports.PUZZLES = {
    [puzzle_001_js_1.PUZZLE_001.id]: puzzle_001_js_1.PUZZLE_001, [puzzle_002_js_1.PUZZLE_002.id]: puzzle_002_js_1.PUZZLE_002,
    [puzzle_003_js_1.PUZZLE_003.id]: puzzle_003_js_1.PUZZLE_003, [puzzle_004_js_1.PUZZLE_004.id]: puzzle_004_js_1.PUZZLE_004,
    [puzzle_005_js_1.PUZZLE_005.id]: puzzle_005_js_1.PUZZLE_005, [puzzle_006_js_1.PUZZLE_006.id]: puzzle_006_js_1.PUZZLE_006,
    [puzzle_007_js_1.PUZZLE_007.id]: puzzle_007_js_1.PUZZLE_007, [puzzle_008_js_1.PUZZLE_008.id]: puzzle_008_js_1.PUZZLE_008,
    [puzzle_009_js_1.PUZZLE_009.id]: puzzle_009_js_1.PUZZLE_009, [puzzle_010_js_1.PUZZLE_010.id]: puzzle_010_js_1.PUZZLE_010,
    [puzzle_011_js_1.PUZZLE_011.id]: puzzle_011_js_1.PUZZLE_011, [puzzle_012_js_1.PUZZLE_012.id]: puzzle_012_js_1.PUZZLE_012,
    [puzzle_013_js_1.PUZZLE_013.id]: puzzle_013_js_1.PUZZLE_013, [puzzle_014_js_1.PUZZLE_014.id]: puzzle_014_js_1.PUZZLE_014,
    [puzzle_015_js_1.PUZZLE_015.id]: puzzle_015_js_1.PUZZLE_015, [puzzle_016_js_1.PUZZLE_016.id]: puzzle_016_js_1.PUZZLE_016,
};
/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 * Interleaved focus / pull / reach so consecutive days feel different.
 */
exports.PUZZLE_ROTATION = [
    puzzle_007_js_1.PUZZLE_007, // pull  (sorcerer) — v2 PASS, depth 1
    puzzle_015_js_1.PUZZLE_015, // tempo (ranger)   — v2 PASS, depth 1
    puzzle_009_js_1.PUZZLE_009, // pull  (ranger)   — v2 PASS, depth 1
    puzzle_012_js_1.PUZZLE_012, // pull  (sorcerer) — v2 PASS, depth 1
    puzzle_013_js_1.PUZZLE_013, // pull  (wizard)   — v2 PASS, depth 1
    puzzle_016_js_1.PUZZLE_016, // free-the-finisher (sorcerer) — v2 PASS, depth 1
];
/**
 * ROTATION SHORTENED TO THE v2-PASSING SET (owner ruling 2026-08-19): a short
 * rotation of good puzzles beats a long one padded with arithmetic. Every entry
 * above passes the v2 bar — goal-greedy fails, min win depth >= 1.
 *
 * OFF the rotation, still REGISTERED (the solver keeps scoring them and old
 * share links still resolve):
 *
 *   UNSOLVABLE — never re-add without a solver re-run:
 *     PUZZLE_005 ("Concentrate Fire", target 21 HP)
 *     PUZZLE_010 ("One Step Closer",  target 22 HP) Both were authored 2026-07-27 with the target's HP set to the
 * exact sum of available player damage; pass21 balance values shipped into
 * gameData 2026-08-05 (a4c2bed), damage numbers moved, and an exact-sum puzzle
 * dies the moment any value shifts by one.
 *   ARITHMETIC (v2 depth 0 — the goal-greedy player solves them by counting):
 *     PUZZLE_003, PUZZLE_004, PUZZLE_006, PUZZLE_008, PUZZLE_011, PUZZLE_014
 *   MUDDY special-combo shapes:
 *     PUZZLE_001, PUZZLE_002
 *
 * PZ3 replaces the arithmetic six; as each replacement passes the bar it joins
 * the array above. See GAMEPLAN PZ3/PZ-BROKEN and PUZZLES_AND_INVITES.md.
 *
 * Standing rule this established: re-run `npx tsx src/ai/puzzleSolver.ts`
 * after ANY gameData balance change.
 */
const MS_PER_DAY = 86_400_000;
/**
 * The puzzle featured on a given UTC calendar day. Deterministic worldwide:
 * the index is the UTC day number modulo the rotation length, so every player
 * sees the same puzzle on the same date.
 */
function getDailyPuzzle(date = new Date()) {
    const dayIndex = Math.floor(date.getTime() / MS_PER_DAY);
    const n = exports.PUZZLE_ROTATION.length;
    return exports.PUZZLE_ROTATION[((dayIndex % n) + n) % n];
}
/** The puzzle currently featured (today's daily). */
exports.CURRENT_PUZZLE = getDailyPuzzle();
//# sourceMappingURL=index.js.map