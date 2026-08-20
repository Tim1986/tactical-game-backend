"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_012 = void 0;
/**
 * Puzzle #12 — "Drag It Down" (PULL COMBO).
 *
 * Same idea as Reel It In on a different board: the target Sorcerer (18 HP) is
 * beyond the Barbarian's stride. Shadow Grasp (4 + pull) hauls it in, the Axe
 * (14) finishes. The wounded Rogue is the AI's free kill.
 *
 * Tier-0 fate. Vocabulary 2 (pull + focus). Solver: 1 winning idea, greedy
 * fails, random 0.7%.
 */
exports.PUZZLE_012 = {
    id: 'puzzle-012',
    title: 'Puzzle #12 — Drag It Down',
    goalText: 'Defeat the enemy Sorcerer within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'targ',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit'],
    fateText: 'Fate is quiet: every attack in this battle will hit. Only your choices decide it.',
    units: [
        { id: 'p1', side: 'player', slug: 'warlock', specialSlug: 'grasp', position: { x: 3, y: 2 } },
        { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 2, y: 2 } },
        { id: 'targ', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 7, y: 2 }, currentHealth: 18 },
        { id: 'bait', side: 'enemy', slug: 'rogue', specialSlug: 'assassinate', position: { x: 4, y: 5 }, currentHealth: 9 },
    ],
    initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
//# sourceMappingURL=puzzle-012.js.map