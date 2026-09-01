import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #46 — "Cold Feet" (THREE TURNS: a free kill that costs you the ground
 * you needed).
 *
 * Built to trap #23's rule — a scheduled death early keeps the three-turn
 * search cheap — and to trap #22's law: the turn-one trap here is an entire
 * enemy, handed over for free.
 *
 * The Ember is on 7 and burning. Its slot arrives before your last turn and the
 * fire takes exactly 7, so it dies whether you touch it or not. Killing it is
 * worth 10000 to a scorer that counts kills, and it is worth nothing at all.
 *
 * What it actually costs is DISTANCE. The Bulwark is rooted at the far wall,
 * six steps from the Barbarian — EXACTLY two full moves, with nothing spare.
 * The Ember stands two steps off that road; to swing at it he must step aside,
 * and a turn holds one move. Spend turn one that way and the second move is
 * three tiles short of the swing.
 *
 * The line is to ignore the free kill entirely: walk the full three tiles on
 * turn one, let the Wizard chip 10, let the fire do its work, and arrive on
 * turn three with 13 for a 23-health Bulwark. 10 + 13, exactly.
 *
 * Cost channel (trap #15 / #22): the trap deals real, scoring, VISIBLE progress
 * — a whole enemy removed — while the correct move is a Barbarian walking
 * across an empty board doing nothing at all. Goal-greedy takes the kill every
 * time; a human is tempted by it for the same reason.
 *
 * ⚠ THE GOAL MUST BE `eliminate_all`, NOT `eliminate_target`. Under
 * eliminate_target the scorer counts damage to the GOAL only, so killing the
 * Ember scores zero, greedy ignores the bait and simply advances — which is
 * also the answer, and the puzzle measures depth 0 with four winning ideas.
 * Under eliminate_all a kill is worth 10000 and the bait finally bites. Same
 * board, same numbers; the goal TYPE is what makes the trap a trap.
 *
 * ⚠ THE EMBER IS TWO STEPS AWAY, NOT ADJACENT. Adjacent, the Barbarian could
 * swing and THEN move (TRN-4 allows both in a turn, in either order) and the
 * kill would be free. At two steps he must move-then-act, and a turn holds only
 * one move — so the detour is the whole turn. This is the trap that has killed
 * more candidates in this file than any other, used deliberately for once.
 *
 * ⚠ THE BULWARK IS ROOTED. Unrooted it advances on its own slot, closes the gap
 * the puzzle is made of, and the greedy line reaches it after all. It carries a
 * bow so a rooted enemy still has something to do.
 *
 * ⚠ 23 = 10 + 13 EXACTLY (trap #23's corollary: slack is what multiplies
 * winning ideas). And ONE burn stack with ONE turn left: two stacks would kill
 * the Ember before its slot and remove the temptation.
 *
 * Vocabulary 2 (burning kills on its victim's own slot; a turn holds one move).
 * Tier-0 fate.
 */
export const PUZZLE_046: PuzzleDefinition = {
  id: 'puzzle-046',
  title: 'Puzzle #46 — Cold Feet',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Two moves from the Bulwark, and one step in FRONT of the free kill.
    {
      id: 'p1', side: 'player', slug: 'barbarian', specialSlug: 'shockwave',
      position: { x: 0, y: 4 },
      // ⚠ SPENT. Ground Slam hits nobody from anywhere on this board, but it is
      // still a LEGAL cast, and the solver counted "slam then walk" and "walk
      // then slam" as two more winning ideas on top of the walk itself — four
      // against a bar of two. A special that cannot matter should not be
      // castable; on cooldown it stops generating cosmetic variations.
      cooldowns: { shockwave: 99 },
    },
    { id: 'p2', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 4, y: 6 } },
    // 23 = 10 + 13. Rooted, so the gap cannot close itself.
    {
      id: 'bulwark', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 7, y: 4 }, currentHealth: 23,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // Already dead: 7 health, 7 of fire, and its slot comes before your last turn.
    {
      id: 'ember', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite',
      position: { x: 0, y: 6 }, currentHealth: 7,
      statusEffects: [{ slug: 'burning', turnsRemaining: 1, stacks: 1 }],
    },
  ],
  initiativeOrder: ['p1', 'p2', 'ember', 'bulwark'],
};
