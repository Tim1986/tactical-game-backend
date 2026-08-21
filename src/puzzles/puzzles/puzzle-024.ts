import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #24 — "Three Hands of the Warlock" (CAMOUFLAGE — the loadout is the
 * puzzle, and only one of three specials solves it).
 *
 * The second puzzle ever to use `specialChoices`, and the first since #1. The
 * Warlock offers Fear, Shadow Grasp and Essence Drain, and the player commits
 * before a piece moves. Only Shadow Grasp wins — it is the one that PULLS
 * (ABL-13), dragging the Sorcerer two tiles into the Barbarian's reach. Fear
 * roots without moving anything; Essence Drain is the biggest number and does
 * nothing about the distance.
 *
 * Why this matters beyond one puzzle (two-poles doc): a unit carrying ONE
 * special telegraphs the solution — "the Warlock has Grasp, so this is the pull
 * puzzle." Every puzzle from #2 to #23 reads that way. Burying the answer among
 * two live decoys puts the deduction back on the intro screen where the player
 * has to weigh three tools against a board.
 *
 * The trap survives even after the right pick, which is what stops this being a
 * pure loadout quiz: Demon Blast is the Warlock's BASIC and hits for 11, more
 * than Grasp's 9, so the greedy player who chose correctly still throws the
 * bigger number, leaves the Sorcerer at range, and strands the Barbarian.
 *
 * Slack: 9 + 16 against 20. Vocabulary 2 (a pull drags toward the caster; enemies
 * out of reach cannot be attacked). Tier-0 fate. 2v1, per trap #9.
 */
export const PUZZLE_024: PuzzleDefinition = {
  id: 'puzzle-024',
  title: 'Puzzle #24 — Three Hands of the Warlock',
  goalText: 'Defeat the enemy Sorcerer within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      // DEFAULT IS A DECOY, deliberately. If the pre-selected special were the
      // answer, a player who never opens the picker wins by accident and the
      // camouflage does nothing. The solver enforces this directly: a
      // TOOL-CHOICE puzzle whose default loadout is the solvable one is
      // rejected as "too obvious". Essence Drain is the right decoy to leave on
      // top — it is the biggest number, so it is what a player reaches for.
      id: 'p1', side: 'player', slug: 'warlock', specialSlug: 'drain',
      specialChoices: ['fear', 'grasp', 'drain'],
      position: { x: 2, y: 4 },
    },
    // Three movement: cannot reach the Sorcerer where it stands, can reach it
    // two tiles closer.
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 2, y: 6 } },
    { id: 'targ', side: 'enemy', slug: 'sorcerer', specialSlug: 'ignite', position: { x: 6, y: 4 }, currentHealth: 20 },
  ],
  initiativeOrder: ['p1', 'p2', 'targ'],
};
