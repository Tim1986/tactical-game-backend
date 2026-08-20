"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_011 = void 0;
/**
 * Puzzle #11 — "Take the Shot" (REACH).
 *
 * Target Barbarian (21 HP). Your Sorcerer must step into Flame Blast range (9);
 * the Ranger's Longshot (12) reaches. 9 + 12 = 21. The wounded Wizard is bait.
 *
 * Tier-0 fate. Vocabulary 2. Solver: 2 ideas, greedy fails, random 1.3%.
 */
exports.PUZZLE_011 = {
    id: 'puzzle-011',
    title: 'Puzzle #11 — Take the Shot',
    goalText: 'Defeat the enemy Barbarian within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'targ',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit'],
    fateText: 'No luck today — every blow lands true. This one is pure tactics.',
    units: [
        { id: 'p1', side: 'player', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 1, y: 5 } },
        { id: 'p2', side: 'player', slug: 'ranger', specialSlug: 'longshot', position: { x: 1, y: 4 } },
        { id: 'targ', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 7, y: 5 }, currentHealth: 21 },
        { id: 'bait', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 3, y: 2 }, currentHealth: 9 },
    ],
    initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
//# sourceMappingURL=puzzle-011.js.map