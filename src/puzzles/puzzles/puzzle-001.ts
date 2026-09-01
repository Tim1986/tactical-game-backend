import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #1 — "Hold the Line" (PICKER-FIRST on #45's root-the-healer lesson).
 *
 * #45 taught it plainly: a Mender three tiles from its charge does not need
 * silencing, it needs to be unable to take one step. This asks the same question
 * from behind a loadout.
 *
 * The Ranger chooses one bow. Only Pinning Shot roots — Longshot and Piercing
 * are bigger numbers that leave the Mender free to walk into range and return 27.
 * Longshot is the DEFAULT, because 15 is exactly what a player reaches for, is
 * one point short of the goal target, and is exactly what loses.
 *
 * The trap survives the correct pick, which is what keeps this from being a pure
 * loadout quiz: with Pinning Shot in hand the Arrow is still the bigger number
 * against the goal target, so a greedy player puts 11 into the Warlock, watches
 * the Mender stroll up, and finishes well short.
 *
 * Decoy arithmetic checked FIRST, per Fable's retrofit rule: the Warlock is on 16
 * so Longshot's 15 cannot one-shot it — a decoy that wins by accident makes the
 * whole picker meaningless, which is how #45 would fail if given this treatment.
 *
 * ⚠ THE 40% RULE, paid for by this puzzle's first draft. The brain only reaches
 * for a heal when its patient is at or below 40% of MAX health. The Warlock was
 * originally on 18 of 43 — 42%, just over the line — so the Mender never healed,
 * the entire tempo premise evaporated, and all three combos became solvable in
 * ~50 ways each (the Barbarian simply kills it). 17 of 43 is 39.5% and the heal
 * fires. Any tempo puzzle built on an enemy healer must check the patient's
 * percentage of MAX, not its raw health: #45 works at 14/43 = 33%.
 *
 * ⚠ RETUNED 2026-08-22 for the RING rebalance. Whirlwind fell 20 -> 16 and the
 * Warlock's old 17 became unreachable — every combo went unsolvable. It is now
 * 16, and like #17 that value is PINNED, not chosen: it must be ABOVE Longshot's
 * 15 (or the decoy one-shots the goal and the picker is meaningless) and AT MOST
 * Whirlwind's 16 (or nothing kills it). Those bounds meet at exactly one number,
 * so this puzzle has ZERO slack and MUST be re-solved if either moves. 16/43 =
 * 37% keeps the heal firing, so the 40%-rule premise above still holds.
 *
 * Mender at FULL health (trap #1) and off the Ranger's line (trap #2).
 *
 * Slack: none — Whirlwind's 16 against exactly 16. Vocabulary 2. Tier-0 fate. 2v2.
 */
export const PUZZLE_001: PuzzleDefinition = {
  id: 'puzzle-001',
  title: 'Puzzle #1 — Hold the Line',
  goalText: 'Defeat the enemy Warlock within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      specialChoices: ['pinning', 'longshot', 'piercing'],
      position: { x: 3, y: 3 },
    },
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 4, y: 6 } },
    { id: 'targ', side: 'enemy', slug: 'warlock', specialSlug: 'drain', position: { x: 5, y: 4 }, currentHealth: 16 },
    { id: 'mend', side: 'enemy', slug: 'cleric', specialSlug: 'heal', position: { x: 5, y: 7 } },
  ],
  initiativeOrder: ['p1', 'mend', 'p2', 'targ'],
};
