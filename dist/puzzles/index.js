"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_PUZZLE = exports.PUZZLES = void 0;
const puzzle_001_js_1 = require("./puzzles/puzzle-001.js");
const puzzle_002_js_1 = require("./puzzles/puzzle-002.js");
exports.PUZZLES = {
    [puzzle_001_js_1.PUZZLE_001.id]: puzzle_001_js_1.PUZZLE_001,
    [puzzle_002_js_1.PUZZLE_002.id]: puzzle_002_js_1.PUZZLE_002,
};
/** The puzzle currently featured on the home page (daily rotation later). */
exports.CURRENT_PUZZLE = puzzle_002_js_1.PUZZLE_002;
//# sourceMappingURL=index.js.map