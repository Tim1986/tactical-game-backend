import type { PuzzleDefinition } from '../types.js';

/**
 * Puzzle #6 — "The Right Tool" (NEW LESSON: assign the reach, don't spend it).
 *
 * A third distinct `eliminate_all` order trap, and different from both existing
 * ones: #23 is "kill the healer before it heals", #40 is "ignore the one already
 * dying". This one is "do not spend your only long arm on the target your knife
 * could reach".
 *
 * Both must die. The Skirmisher stands beside your Rogue on 12 — a free kill for
 * the Ranger, worth 10000 to any scoring function and the first thing a player
 * reaches for. Take it and the Rogue has nothing left to walk to: the Warden is
 * six tiles away, past what four movement and a one-tile reach can cover, and
 * the Ranger alone cannot finish it after spending Longshot on a body the Rogue
 * was standing next to.
 *
 * Shoot the enemy you cannot reach; let the knife take the one it is already
 * touching.
 *
 * The trap is fair because everything is legible before the first move: both
 * healths, the Rogue's adjacency to the Skirmisher, and the plain fact that the
 * Warden is out of its reach.
 *
 * Slack: Longshot 15 + Arrow 11 = 26 against the Warden's 24, and the Rogue's 16
 * against the Skirmisher's 12. Cooldowns are in the budget (#23's lesson): the
 * third shot is an Arrow, because Longshot is once per match.
 *
 * Ranger ROOTED as a search-cost device only (#23's rule) — range 8, no reason
 * to move. Neither enemy carries a freeze or a root, so nothing can eat the
 * third turn (#23's other rule).
 *
 * Vocabulary 1 (enemies out of reach cannot be attacked). Tier-0 fate. 2v2,
 * three turns.
 *
 * Retune 2026-08-24: Fighter HP 24 -> 26 (= Longshot 15 + Arrow 11 exact, the
 * concussive stun caps the Ranger at two shots) and the Rogue starts at (0,6)
 * [was (3,6)] so the free kill takes an aimed walk, not a reflex. Random
 * 10% -> ~1% (<5% bar). The skirmisher must stay one-shot-able (<=16 HP) or it
 * simply outruns the party.
 */
export const PUZZLE_006: PuzzleDefinition = {
  id: 'puzzle-006',
  title: 'Puzzle #6 — The Right Tool',
  goalText: 'Defeat the enemy Fighter and the enemy Rogue within 3 turns',
  goal: 'eliminate_all',
  maxPlayerTurns: 3,
  rollScript: [],
  fateText: 'The dice sleep. Every strike lands — no dodges, no misses.',
  units: [
    {
      id: 'p1', side: 'player', slug: 'ranger', specialSlug: 'longshot',
      position: { x: 1, y: 4 },
      statusEffects: [{ slug: 'rooted', turnsRemaining: 5, stacks: 1 }],
    },
    { id: 'p2', side: 'player', slug: 'rogue', specialSlug: 'expose', position: { x: 0, y: 6 } },
    // Out of the Rogue's reach: six tiles against four movement and a one-tile
    // swing. Only the Ranger can touch it, and only if it still has Longshot.
    { id: 'ward', side: 'enemy', slug: 'fighter', specialSlug: 'concussive', position: { x: 6, y: 3 }, currentHealth: 26 },
    // The free kill — four tiles from your knife; walk to it.
    { id: 'skir', side: 'enemy', slug: 'rogue', specialSlug: 'expose', position: { x: 4, y: 6 }, currentHealth: 12 },
  ],
  initiativeOrder: ['p1', 'p2', 'ward', 'skir'],
};
