import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #14 — "Hold Your Fire" (FATE QUEUE, second facet: the HIT is the
 * resource, and a FREE ENEMY TURN spends it).
 *
 * #26 hands the player a wide roll to throw away. This inverts it: exactly ONE
 * blow lands all fight, it is the first one thrown, and the queue does not care
 * whose it is — including the enemy's.
 *
 * The Wizard shoots first and Ice Blast is the biggest number on the board: 10
 * into a 13-health Reaver, and it LANDS. That is the trap. Take the free ten,
 * the Reaver sits on 3, and every remaining blow in the fight goes wide.
 *
 * Passing is not the answer either, and this is the part that makes the puzzle:
 * the Reaver acts BETWEEN the player's two units. Give it a turn and it swings,
 * that swing is the first blow of the fight, and it eats the one landing roll.
 * So the Wizard must spend its turn taking the Reaver's TURN away — Freeze
 * deals no damage, rolls no die, and skips the slot (TRN-6). The Barbarian's 13
 * is then the first blow struck, against exactly 13.
 *
 * ⚠ FREEZE HERE DENIES A DIE, NOT A TURN. That is the new idea. #16/#47/#29 all
 * freeze to stop a heal or a kill; this one freezes to stop the enemy CONSUMING
 * A FATE the player needs. Same button, different currency.
 *
 * Cost channel (trap #15): the correct move deals ZERO while a visible TEN is
 * on the table — and the ten is not even wasted, it genuinely lands. Goal-greedy
 * banks real damage and loses anyway, which is a cleaner trap than #26's (where
 * greedy's shot was simply thrown away).
 *
 * ⚠ THE REAVER IS A BARBARIAN, NOT A SHIELD FIGHTER. Every option it has must
 * ROLL: with Shield Bash (unblockable) it could take its free turn without
 * touching the queue, and passing became a second answer — measured, the solver
 * reported "pass" as a winning first move. Both of a Barbarian's attacks are
 * blockable, so giving it a turn always costs a die.
 *
 * ⚠ THE PLAYER BARBARIAN CARRIES WHIRLWIND, NOT GROUND SLAM, for the mirror of
 * that reason: Ground Slam is unblockable, so greedy could shoot for 10 and slam
 * the last 3 off without ever paying the fate.
 *
 * ⚠ THE WIZARD IS ROOTED so the "walk somewhere and shoot from there" family
 * cannot fan out into dozens of winning ideas (TRN-4 — the trap that killed
 * three earlier candidates).
 *
 * ⚠ EXHAUSTED SCRIPT = HIT (types.ts), so the trailing misses are not
 * decoration: the script must cover every roll the board can produce.
 *
 * Solver (2026-08-31): 1 distinct idea · goal-greedy FAILS · depth 1 ·
 * near-miss 3 · random 1.0%. PASS.
 *
 * Vocabulary 2 (a scripted hit; a frozen unit rolls no die). Tier-1 fate. 2v2.
 */
export const PUZZLE_014: PuzzleDefinition = {
  id: 'puzzle-014',
  title: 'Puzzle #14 — Hold Your Fire',
  goalText: 'Defeat the enemy Barbarian within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: ['hit', 'miss', 'miss'],
  fateText: 'Fate is sealed: the FIRST blow struck in this fight lands, whoever throws it. Every blow after it goes wide.',
  units: [
    // Rooted: it may shoot or it may Freeze, and nothing else. The shot is the
    // trap; Freeze rolls no die and is therefore free.
    {
      id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze',
      position: { x: 5, y: 2 }, statusEffects: [{ slug: 'rooted', turnsRemaining: 3, stacks: 1 }],
    },
    // ⚠ Whirlwind, NOT Ground Slam. Ground Slam is unblockable, so it rolls no
    // die — the greedy line could shoot for 10 and then slam the last 3 off
    // without ever touching the fate, and the puzzle dissolves (measured: the
    // solver called missile a winning first move). Every way this Barbarian can
    // hurt the Sentinel must go through the queue.
    // 13 damage against 13 health — but only if it is the first die of the fight.
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 2, y: 6 } },
    // ⚠ A REAVER, NOT A SENTINEL-WITH-A-SHIELD. Every option this unit has must
    // ROLL: with Shield Bash (unblockable) it could take its free turn without
    // touching the queue, and passing the Wizard's turn became a second answer.
    // Both of a Barbarian's attacks are blockable, so giving it a turn always
    // costs a die — which is the whole reason Freeze is the only line.
    { id: 'targ', side: 'enemy', slug: 'barbarian', specialSlug: 'whirlwind', position: { x: 5, y: 6 }, currentHealth: 13 },
    // In the Wizard's range and nobody else's: it exists to give the rooted
    // Wizard somewhere WRONG to point both of its abilities. Without it the
    // Wizard had three plans and one of them was the answer, so a coin-flipping
    // player won 7% of the time (bar: 5%). A decoy is cheaper than a rule.
    // Move 3 + reach 1 leaves the Barbarian a step short of it, so it can never
    // become a second way to spend a die.
    { id: 'husk', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 3, y: 2 }, currentHealth: 52 },
  ],
  initiativeOrder: ['p1', 'targ', 'p2', 'husk'],
};
