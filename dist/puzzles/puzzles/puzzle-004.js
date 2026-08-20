"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_004 = void 0;
/**
 * Puzzle #4 — "Don't Take the Bait" (focus-fire).
 *
 * Target: enemy Ranger (20 HP). A wounded enemy Sorcerer (9 HP) is the tempting
 * free kill that wastes a shot. Your Wizard (Ice Blast 11) + Sorcerer (Flame
 * Blast 9) = 20 exactly, both onto the Ranger.
 *
 * Tier-0 fate. Vocabulary 1. Solver: 2 ideas, greedy fails, random 0.8%.
 */
exports.PUZZLE_004 = {
    id: 'puzzle-004',
    title: 'Puzzle #4 — Don\'t Take the Bait',
    goalText: 'Defeat the enemy Ranger within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'targ',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit'],
    fateText: 'Fate is quiet: every attack in this battle will hit. Only your choices decide it.',
    units: [
        { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 1, y: 4 } },
        { id: 'p2', side: 'player', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 1, y: 3 } },
        { id: 'targ', side: 'enemy', slug: 'ranger', specialSlug: 'longshot', position: { x: 6, y: 4 }, currentHealth: 20 },
        { id: 'bait', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 3, y: 1 }, currentHealth: 9 },
    ],
    initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
//# sourceMappingURL=puzzle-004.js.map