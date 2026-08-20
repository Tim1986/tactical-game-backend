"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_013 = void 0;
/**
 * Puzzle #13 — "Hook and Finish" (PULL COMBO).
 *
 * The target Wizard (15 HP) hangs back out of reach. Shadow Grasp yanks it in
 * (4 + pull + root), and the Fighter steps up to finish. The wounded Sorcerer
 * is the AI's free kill, so greedy fails.
 *
 * Tier-0 fate. Vocabulary 2. Solver: 1 winning idea, greedy fails, random 2.7%.
 */
exports.PUZZLE_013 = {
    id: 'puzzle-013',
    title: 'Puzzle #13 — Hook and Finish',
    goalText: 'Defeat the enemy Wizard within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'targ',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit'],
    fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
    units: [
        { id: 'p1', side: 'player', slug: 'warlock', specialSlug: 'grasp', position: { x: 3, y: 6 } },
        { id: 'p2', side: 'player', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 2, y: 6 } },
        { id: 'targ', side: 'enemy', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 7, y: 6 }, currentHealth: 15 },
        { id: 'bait', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 4, y: 3 }, currentHealth: 9 },
    ],
    initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
//# sourceMappingURL=puzzle-013.js.map