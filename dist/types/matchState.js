"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARD_HEIGHT = exports.BOARD_WIDTH = void 0;
// The board is an 8x8 grid with the four extreme corners removed (a 60-tile
// cross), so it fits better on a phone screen at the diagonal perspective.
// BOARD_WIDTH was incorrectly 10 for a long time (a leftover from an
// abandoned wider-board idea) — this must stay 8 and stay in lockstep with
// backend/src/ai/geometry.ts's BOARD_SIZE, which is the canonical source
// for corner exclusion.
exports.BOARD_WIDTH = 8;
exports.BOARD_HEIGHT = 8;
//# sourceMappingURL=matchState.js.map