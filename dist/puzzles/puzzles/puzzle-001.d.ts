import type { PuzzleDefinition } from '../types.js';
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
export declare const PUZZLE_001: PuzzleDefinition;
//# sourceMappingURL=puzzle-001.d.ts.map