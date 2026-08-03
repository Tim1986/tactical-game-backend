"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUZZLE_001 = void 0;
/**
 * Puzzle #1 — "Pin the Wretch" (root-before-it-flees + bait + exact breakpoints).
 *
 * Board story: an enemy Sorcerer sits at 8 HP right next to your Ranger — a
 * guaranteed free kill. The real target, a Warlock at 22 HP, lurks across
 * the board and acts BETWEEN your two units (initiative: Ranger → Warlock →
 * Wizard).
 *
 * The trap: take the free kill (or just arrow the Warlock) and the Warlock
 * gets a free turn — it flees and/or Essence-Drains someone (+6 HP), and
 * 22 HP is exactly two clean hits (11 + 11): any healing or lost range
 * breaks the line.
 *
 * The solution: Pinning Shot the Warlock (11 dmg → 11 HP, rooted 2 turns).
 * Rooted units can't move — and from its tile the Warlock's drain (range 4)
 * reaches nobody, so it stays at 11. The Wizard's Ice Blast (11) finishes
 * it exactly.
 *
 * Determinism: the fortune meter is gone from live combat (per-attack random
 * rolls now) — puzzles pin outcomes via rollScript, disclosed as fate text.
 * Script [hit, hit, miss]: the winning line spends exactly two rolls
 * (Pinning Shot, Ice Blast — the Warlock's drain is unblockable and rolls
 * nothing); waste a roll elsewhere and the third strike goes wide.
 *
 * The Ranger offers a special CHOICE (pinning/longshot/piercing) so the
 * solution isn't read off the loadout. Solver-verified: only pinning solves.
 *
 * Verified by puzzleSolver — re-run after ANY numeric/position change.
 */
exports.PUZZLE_001 = {
    id: 'puzzle-001',
    title: 'Puzzle #1 — Pin the Wretch',
    goalText: 'Slay the Warlock within 2 turns',
    goal: 'eliminate_target',
    targetUnitId: 'warlock',
    maxPlayerTurns: 2,
    rollScript: ['hit', 'hit', 'miss'],
    fateText: 'Fate is sealed: the first two blockable strikes in this battle will land — the third will go wide.',
    units: [
        { id: 'ranger', side: 'player', slug: 'ranger', specialSlug: 'pinning', specialChoices: ['pinning', 'longshot', 'piercing'], position: { x: 2, y: 4 } },
        { id: 'wizard', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 1, y: 2 } },
        { id: 'bait', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 3, y: 6 }, currentHealth: 8 },
        { id: 'warlock', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 7, y: 4 }, currentHealth: 22 },
    ],
    initiativeOrder: ['ranger', 'warlock', 'wizard', 'bait'],
};
//# sourceMappingURL=puzzle-001.js.map