import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #44 — "Line Them Up" (THREE TURNS: displacement as SETUP — move an
 * enemy so that one shot can take both).
 *
 * Piercing Shot is a LINE: it runs six tiles from the archer and hits everything
 * standing on it, friend or foe (ABL-9). It is also once per battle. There are
 * two enemies and only one of them is on that line.
 *
 * The Warden is on 23 and directly ahead. The Cur is on 12, three tiles off the
 * line, and rooted — it will never wander into place by itself. The Fighter's
 * Shield Bash knocks a target two tiles straight back, which is exactly enough
 * to put the Cur where the arrow already goes.
 *
 * So the shot has to wait for turn three: fear on turn two, fire through both on
 * turn three, and let turn one be an ordinary arrow into the Warden. 11 + 12 is
 * 23 exactly — the line shot has to hit the Warden too, which it does.
 *
 * Fire it on turn one and it takes 12 off the Warden and nothing else, the Cur
 * is still standing when the puzzle ends, and the once-per-battle shot that
 * could have caught both is gone.
 *
 * Cost channel (trap #15 / #22 / #24): the trap is Piercing's 12 against the
 * arrow's 11 on turn one — one point more damage, immediately, into the goal.
 * `eliminate_all` makes every point score, so goal-greedy takes the bigger
 * number and loses the only tool that can finish the second enemy.
 *
 * ⚠ THE CUR IS ROOTED, which is what makes the bash necessary rather than
 * optional — a mobile enemy walks into the line on its own and the setup
 * evaporates (trap #25's first failure mode, measured on #13).
 *
 * ⚠ THE PUSH MUST NOT ALSO KILL. Fear deals no damage at all, so the Warlock's
 * turn buys exactly one thing: position. Its three tiles are measured away from
 * the CASTER, so where he stands decides where the Cur lands.
 *
 * ⚠ 23 = 11 + 12 and 12 = one Piercing, both exact — AND THE EXACTNESS IS
 * STRUCTURAL, not sloppiness. The audit of 2026-09-01 flagged this as the
 * hardest entry in the rotation (depth 2, near-miss 1, vocabulary 3) and tried
 * to give it slack; there is none to give. Drop the Warden to 22 and two plain
 * arrows kill it, so the line shot never has to catch both and the idea
 * evaporates. Raise the Cur above 12 and Piercing cannot finish it; drop it to
 * 11 and a plain arrow can, so the push stops needing the line at all. The
 * puzzle only exists in the one-point window where BOTH numbers are exact.
 * Leave it hard. It is not degenerate — random lines win 0.0% — and the greedy
 * player finishes one point short, which is the best failure hook in the file.
 *
 * Vocabulary 3 (a line that hits everything on it; a push of exactly two; a
 * once-per-battle shot) — at the top of the budget, and the reason this is a
 * three-turn puzzle rather than a two-turn one.
 *
 * Tier-0 fate.
 */
export const PUZZLE_044: PuzzleDefinition = {
  id: 'puzzle-044',
  title: 'Puzzle #44 — Line Them Up',
  goalText: 'Defeat BOTH enemies within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'piercing',
      position: { x: 0, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
    },
    // ⚠ FEAR, NOT SHIELD BASH. Bash pushes too — but it also deals 17, which
    // simply KILLS a 12-health enemy, and the whole setup collapses into "hit
    // it twice" (measured: seven winning first ideas). Fear moves without
    // damaging, so displacement stays the only thing the Fighter's slot buys.
    // Standing north of the Cur, three tiles "away from the caster" is exactly
    // the archer's row.
    { id: 'p2', side: 'player', slug: 'warlock', specialSlug: 'fear', position: { x: 3, y: 0 } },
    // 24 = 11 + 12: one arrow and the line shot.
    {
      id: 'warden', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 5, y: 4 }, currentHealth: 23,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { longshot: 99 },
    },
    // 12 = one Piercing, and it is one tile off the line until it is bashed.
    {
      id: 'cur', side: 'enemy', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 3, y: 1 }, currentHealth: 12,
      statusEffects: [{ slug: 'rooted', turnsRemaining: 9, stacks: 1 }],
      cooldowns: { longshot: 99 },
    },
  ],
  initiativeOrder: ['p1', 'p2', 'warden', 'cur'],
};
