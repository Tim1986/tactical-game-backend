"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_005 = void 0;
/**
 * Puzzle #5 — "Concentrate Fire" (focus-fire).
 *
 * Target: enemy Barbarian (21 HP). Twin Wizards (Ice Blast 11 each = 22) must
 * both hit it; the wounded Sorcerer (9 HP) is bait.
 *
 * Tier-0 fate. Vocabulary 1. Solver: 2 ideas, greedy fails, random 0.8%.
 */
exports.PUZZLE_005 = {
    id: 'puzzle-005',
    title: 'Puzzle #5 — Concentrate Fire',
    goalText: 'Defeat the enemy Barbarian within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'targ',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit'],
    fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
    units: [
        { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'cold_snap', position: { x: 1, y: 4 } },
        { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 1, y: 5 } },
        { id: 'targ', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 6, y: 4 }, currentHealth: 21 },
        { id: 'bait', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 3, y: 2 }, currentHealth: 9 },
    ],
    initiativeOrder: ['p1', 'p2', 'targ', 'bait'],
};
//# sourceMappingURL=puzzle-005.js.map