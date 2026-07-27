import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #2 — "Fight Around Fate" (the scripted MISS is the obstacle).
 *
 * Board story: your Wizard froze the enemy Barbarian solid last turn — he's
 * a statue for the rest of the fight. The Warlock behind him sits at 21 HP.
 * Two of your units get one turn each. Fate has decreed the first blockable
 * strike in this battle goes wide.
 *
 * The trap: every "obvious" damage line spends a roll and dies to the miss.
 *   - Twin Strike (9+8, two rolls): first hit is the scripted miss → only 8
 *     lands → 13 left; Ice Blast 11 → 2 HP alive. Fail.
 *   - Dagger Toss (16, unblockable, no roll) → 5 left; but the Ice Blast is
 *     now the first BLOCKABLE strike → it takes the miss. Fail.
 *   - Kill Shot: 21 HP > 18 execute threshold. Chaff choice.
 *
 * The solution: Expose Weakness (10, unblockable) → 11 left, and the Warlock
 * is EXPOSED — exposed targets can't dodge, so the Ice Blast needs no roll
 * at all. The scripted miss never fires. 11 − 11 = 0. Win.
 *
 * The special picker (expose / dagger_toss / assassinate, defaulting to the
 * WRONG one) hides the answer in plain sight.
 *
 * Verified by puzzleSolver — re-run after ANY numeric/position change.
 */
export const PUZZLE_002: PuzzleDefinition = {
  id: 'puzzle-002',
  title: 'Puzzle #2 — Fight Around Fate',
  goalText: 'Slay the Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'vex',
  maxPlayerTurns: 2,
  expert: true,
  rollScript: ['miss'],
  fateText: 'Fate is sealed: the first blockable strike in this battle will go wide. Unblockable arts ignore fate entirely.',
  units: [
    { id: 'blade', side: 'player', slug: 'rogue',  specialSlug: 'dagger_toss', specialChoices: ['dagger_toss', 'expose', 'assassinate'], position: { x: 5, y: 3 } },
    { id: 'frost', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 1, y: 3 } },
    { id: 'brute', side: 'enemy',  slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 4, y: 4 },
      statusEffects: [{ slug: 'frozen', turnsRemaining: 2, stacks: 1 }] },
    { id: 'vex',   side: 'enemy',  slug: 'warlock', specialSlug: 'drain', position: { x: 6, y: 3 }, currentHealth: 21 },
  ],
  initiativeOrder: ['blade', 'brute', 'frost', 'vex'],
};
