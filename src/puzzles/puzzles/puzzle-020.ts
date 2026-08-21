import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #20 — "Second Wind" (v2 texture: TEMPO / the target patches itself up
 * between your two turns).
 *
 * Rulebook source: TRN-6, "a frozen unit's initiative slot is skipped entirely
 * — it neither moves nor acts." The enemy Fighter is on 12 and carries First
 * Aid, a self-heal for 18. Read the initiative strip: it acts BETWEEN your two
 * units. Whatever the Wizard does, the Fighter's slot comes next, and on 12
 * health it will patch itself back above anything the Rogue can finish.
 *
 * The Wizard's Ice Blast for 10 is the biggest number on the board and it is a
 * trap: whatever it takes off, First Aid's 18 puts back and more, and the
 * Rogue's 16 is then not enough. The winning move deals no damage at all — Freeze
 * skips the Fighter's slot outright, so the heal never happens and the Rogue's
 * 16 is enough against 12.
 *
 * Cost channel (trap #15): the price of the greedy shot is not that it deals
 * less, it deals more — it is that it hands the Fighter a turn. Tempo is paid by
 * the ENEMY's action, which is invisible to a solver scoring damage dealt on the
 * player's own move.
 *
 * Why this is not a re-run of #15. That puzzle freezes a SUPPORT unit to stop it
 * healing someone else; here the target heals ITSELF, so the thing you must
 * disable and the thing you must kill are the same unit — and the player has to
 * work out that spending the turn dealing zero to it is what kills it. Trap #1's
 * warning cuts the other way for once: a wounded unit prioritising its own heal
 * is exactly the behaviour this puzzle needs.
 *
 * No rooting, no geometry. Three of the last four candidates died to TRN-4 (a
 * unit may move AND use an ability in the same turn), which lets almost any
 * positional trap be sidestepped for free unless someone is rooted — #17 and
 * #18 both had to root a unit for that reason. A tempo puzzle needs none of it:
 * there is no tile to step to that stops the Fighter taking its turn.
 *
 * Slack, not arithmetic: the Rogue's 16 against 12 health, so it cannot be
 * solved by counting.
 *
 * On near-miss: the solver reports 12 here, where the geometry puzzles report
 * 2–3. That is the TEMPO CHANNEL's signature, not a flaw — #15, the other tempo
 * puzzle, reports 11 on the same measure and is a keeper. A failing line ends
 * AFTER the enemy has healed, so the "closest miss" is measured against a
 * restored health bar; a geometry puzzle's failing line ends on whatever damage
 * actually landed. Read near-miss within a channel, never across channels.
 * (Measured across the full 10-puzzle rotation, 2026-08-21.)
 *
 * Vocabulary 2 (First Aid heals the user; a frozen unit's turn is skipped).
 * Tier-0 fate. 2v1, per trap #9.
 */
export const PUZZLE_020: PuzzleDefinition = {
  id: 'puzzle-020',
  title: 'Puzzle #20 — Second Wind',
  goalText: 'Defeat the enemy Fighter within 2 turns',
  goal: 'eliminate_target',
  targetUnitId: 'targ',
  maxPlayerTurns: 2,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    // Freeze is the only disable on the board: the Wizard's other options were
    // deliberately not given to it, so there is exactly one way to skip the slot.
    { id: 'p1', side: 'player', slug: 'wizard', specialSlug: 'freeze', position: { x: 2, y: 4 } },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 5, y: 7 } },
    // 12 of 52 — deep enough into the red that it will reach for First Aid the
    // moment it is given a turn.
    { id: 'targ', side: 'enemy', slug: 'fighter', specialSlug: 'second_wind', position: { x: 5, y: 4 }, currentHealth: 12 },
  ],
  // The Fighter acts BETWEEN your two units. That is the whole puzzle, and it is
  // visible on the initiative strip before a single move is made.
  initiativeOrder: ['p1', 'targ', 'p2'],
};
