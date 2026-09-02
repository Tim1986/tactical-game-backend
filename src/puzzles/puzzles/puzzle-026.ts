import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #26 — "One Goes Wide" (v2 texture: THE FATE QUEUE — the first puzzle
 * in the rotation where a MISS is the thing you play around).
 *
 * Owner question, 2026-08-31: "seems like a lot of puzzles are assuming all
 * hits land. Have we done any where some hits are gonna miss, and you need to
 * work around that?" Answer at the time: no. Every puzzle from #16 on ships
 * `rollScript: []` (deterministic hit); only the deregistered arithmetic
 * batch-puzzle-901 pair ever scripted a miss, and there the miss was a subtraction to
 * perform, not a thing to play around.
 *
 * THE DEVICE. `rollScript` is a FIFO QUEUE consumed by the whole board — one
 * entry per blockable roll, in the order the rolls happen (types.ts). A
 * scripted miss is therefore not attached to an attack, it is attached to a
 * POSITION IN TIME, and the player chooses who walks into it. The miss is a
 * resource, and it has to be spent on a blow that does not matter.
 *
 * THE TRAP. The Sentinel is on 10 and the Wizard's Ice Blast is 10 — the kill
 * is on the board from turn one. The Barbarian can reach the Sentinel too:
 * three steps to (4,5) puts Ground Slam's ring over it for 9. That is the
 * greedy play and it is the losing one, because Ground Slam is UNBLOCKABLE —
 * it rolls no die, so it does not spend the wide roll. The Sentinel drops to 1,
 * the Wizard's blast goes wide on the fate, and it survives on one health.
 *
 * THE ANSWER. Walk AWAY from the Sentinel and hit the Husk: a plain swing at a
 * 52-health bystander accomplishes nothing except rolling the die that was
 * always going to miss. The Ice Blast then lands for exactly 10.
 *
 * Cost channel (trap #15): invisible to a solver scoring damage dealt to the
 * goal. The correct first move deals ZERO to the target — the proven shape —
 * while the greedy alternative deals a visible NINE. This is the fourth proven
 * cost channel (own unit dies #5 · target leaves reach #33 · tempo #16/#47 ·
 * path stays shut #41) and the first that spends a DIE.
 *
 * ⚠ WHY GROUND SLAM AND NOT WHIRLWIND. Both reach the Husk, but Whirlwind is
 * BLOCKABLE: it would roll, eat the miss, and hand the player four extra
 * winning first moves (measured — the solver went from 1 distinct idea to 5,
 * against a bar of 2). The unblockable special is what makes the greedy line
 * genuinely unable to pay the fate.
 *
 * ⚠ FAIRNESS. The script is disclosed in full on the intro and the in-match
 * banner, per types.ts: "Never hide the script — fairness depends on it." A
 * puzzle whose trick is a miss the player could not have known about is a
 * cheat, not a puzzle.
 *
 * Both player turns resolve before either enemy slot, so no enemy roll can jump
 * the queue and eat the miss the player is planning around. That ordering is
 * load-bearing.
 *
 * Solver (2026-08-31): 1 distinct idea · goal-greedy FAILS · depth 1 ·
 * near-miss 1 (the Sentinel survives on one health — the close-call hook) ·
 * random 1.0%. PASS.
 *
 * Vocabulary 2 (a scripted miss; unblockable does not roll). Tier-1 fate —
 * the first in the rotation. 2v2, per trap #9.
 */
export const PUZZLE_026: PuzzleDefinition = {
  id: 'puzzle-026',
  title: 'Puzzle #26 — One Goes Wide',
  goalText: 'Defeat the enemy Fighter within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  // ONE entry. The first blockable roll of the fight misses; everything after
  // is a deterministic hit (an exhausted script hits — types.ts).
  rollScript: ['miss'],
  fateText: 'Fate is sealed: the FIRST blow struck in this fight goes wide, whoever throws it. Every strike after it lands.',
  units: [
    // The finisher. 10 damage against 10 health, in range from where it stands
    // — the kill is available on turn one and taking it loses the puzzle.
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 5, y: 2 } },
    // ⚠ Ground Slam, NOT Whirlwind. Both hit the Husk, but Whirlwind is
    // BLOCKABLE — it would roll, eat the miss, and hand the player four extra
    // winning first moves (solver: 5 distinct ideas, bar is 2). Ground Slam is
    // unblockable, so it rolls no die and cannot pay the fate. The only thing
    // on this board that can spend the wide roll is a plain swing.
    // The lightning rod. Move 3 from (0,6) cannot reach the Sentinel at (5,6) — the swing tile is
    // (4,6), four steps away,
    // so its only swing is at the Husk — which is exactly what the puzzle wants.
    { id: 'p2', side: 'player', slug: 'barbarian', specialSlug: 'shockwave', position: { x: 2, y: 4 } },
    { id: 'targ', side: 'enemy', slug: 'fighter', specialSlug: 'shield_bash', position: { x: 5, y: 6 }, currentHealth: 10 },
    // The bystander: adjacent to the Barbarian, far from the Sentinel, and
    // healthy enough that killing it is never on the table.
    { id: 'husk', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 1, y: 6 }, currentHealth: 52 },
  ],
  // ⚠ THE BARBARIAN ACTS FIRST, AND THAT IS THE PUZZLE. Its turn looks worthless
  // — it cannot reach the Sentinel and the Husk is at full health — so the
  // instinct is to spend it walking toward the real fight. Walking rolls no
  // die, the miss survives the turn, and the Wizard's one kill goes wide.
  // Both player turns also come first: no enemy roll may jump the queue.
  initiativeOrder: ['p2', 'p1', 'targ', 'husk'],
};
