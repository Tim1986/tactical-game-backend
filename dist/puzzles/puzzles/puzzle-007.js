"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_007 = void 0;
/**
 * Puzzle #7 — "Reel It In" (PULL COMBO — a distinct lesson).
 *
 * The target Sorcerer (18 HP) sits too far for your Barbarian to reach in one
 * move (5 tiles). Shadow Grasp yanks it 3 tiles closer AND deals 4 — then the
 * Barbarian steps in and finishes with the Axe (14). 4 + 14 = 18. The near-dead
 * Rogue is the free kill the AI grabs instead, so the greedy line fails.
 *
 * Tier-0 fate. Vocabulary 2 (pull + focus). Solver: 1 winning idea, greedy
 * fails, random 0.0%.
 */
exports.PUZZLE_007 = {
    id: 'puzzle-007',
    title: 'Puzzle #7 — Reel It In',
    goalText: 'Defeat the enemy Sorcerer within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'targ',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit'],
    fateText: 'No luck today — every blow lands true. This one is pure tactics.',
    units: [
        { id: 'p1', side: 'player', slug: 'warlock', specialSlug: 'grasp', position: { x: 3, y: 4 } },
        { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 2, y: 4 } },
        { id: 'targ', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 7, y: 4 }, currentHealth: 18 },
        { id: 'bait', side: 'enemy', slug: 'rogue', specialSlug: 'assassinate', position: { x: 3, y: 1 }, currentHealth: 9 },
    ],
    initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
//# sourceMappingURL=puzzle-007.js.map