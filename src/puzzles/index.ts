/**
 * puzzles/index.ts — Registry of shipped puzzles + daily rotation.
 *
 * Every puzzle here MUST pass the solver's acceptance bar before shipping:
 *   cd backend && npx tsx src/ai/puzzleSolver.ts <id>
 *
 * The 12 daily puzzles (003–014) span THREE distinct tactical lessons so the
 * rotation doesn't feel samey (owner ruling, 2026-07-27):
 *   - FOCUS-FIRE   — kill the right enemy, ignore the bait the AI grabs.
 *   - REACH        — step into range first, then fire.
 *   - PULL COMBO   — Shadow Grasp yanks a far target into your melee's reach.
 * The rotation interleaves them so consecutive days alternate archetype.
 * puzzle-001 (camouflage special-picker) is also in rotation; puzzle-002 is an
 * expert puzzle — registered/shareable but excluded from the daily rotation.
 */
import type { PuzzleDefinition } from './types.js';
import { PUZZLE_001 } from './puzzles/puzzle-001.js';
import { PUZZLE_002 } from './puzzles/puzzle-002.js';
import { PUZZLE_003 } from './puzzles/puzzle-003.js';
import { PUZZLE_004 } from './puzzles/puzzle-004.js';
import { PUZZLE_005 } from './puzzles/puzzle-005.js';
import { PUZZLE_006 } from './puzzles/puzzle-006.js';
import { PUZZLE_007 } from './puzzles/puzzle-007.js';
import { PUZZLE_008 } from './puzzles/puzzle-008.js';
import { PUZZLE_009 } from './puzzles/puzzle-009.js';
import { PUZZLE_010 } from './puzzles/puzzle-010.js';
import { PUZZLE_011 } from './puzzles/puzzle-011.js';
import { PUZZLE_012 } from './puzzles/puzzle-012.js';
import { PUZZLE_013 } from './puzzles/puzzle-013.js';
import { PUZZLE_014 } from './puzzles/puzzle-014.js';
import { PUZZLE_015 } from './puzzles/puzzle-015.js';
import { PUZZLE_016 } from './puzzles/puzzle-016.js';
import { PUZZLE_017 } from './puzzles/puzzle-017.js';
import { PUZZLE_018 } from './puzzles/puzzle-018.js';
import { PUZZLE_019 } from './puzzles/puzzle-019.js';
import { PUZZLE_020 } from './puzzles/puzzle-020.js';
import { PUZZLE_023 } from './puzzles/puzzle-023.js';
import { PUZZLE_024 } from './puzzles/puzzle-024.js';
import { PUZZLE_025 } from './puzzles/puzzle-025.js';
import { PUZZLE_026 } from './puzzles/puzzle-026.js';
import { PUZZLE_027 } from './puzzles/puzzle-027.js';
import { PUZZLE_028 } from './puzzles/puzzle-028.js';
import { PUZZLE_029 } from './puzzles/puzzle-029.js';
import { PUZZLE_030 } from './puzzles/puzzle-030.js';
import { PUZZLE_031 } from './puzzles/puzzle-031.js';
import { PUZZLE_032 } from './puzzles/puzzle-032.js';
import { PUZZLE_033 } from './puzzles/puzzle-033.js';
import { PUZZLE_034 } from './puzzles/puzzle-034.js';
import { PUZZLE_035 } from './puzzles/puzzle-035.js';
import { PUZZLE_036 } from './puzzles/puzzle-036.js';
import { PUZZLE_039 } from './puzzles/puzzle-039.js';
import { PUZZLE_040 } from './puzzles/puzzle-040.js';
import { PUZZLE_041 } from './puzzles/puzzle-041.js';
import { PUZZLE_042 } from './puzzles/puzzle-042.js';
import { PUZZLE_045 } from './puzzles/puzzle-045.js';
import { PUZZLE_046 } from './puzzles/puzzle-046.js';
import { PUZZLE_047 } from './puzzles/puzzle-047.js';
import { PUZZLE_048 } from './puzzles/puzzle-048.js';
import { PUZZLE_049 } from './puzzles/puzzle-049.js';
import { PUZZLE_050 } from './puzzles/puzzle-050.js';
import { PUZZLE_051 } from './puzzles/puzzle-051.js';
import { PUZZLE_052 } from './puzzles/puzzle-052.js';
import { PUZZLE_053 } from './puzzles/puzzle-053.js';
import { PUZZLE_054 } from './puzzles/puzzle-054.js';
import { PUZZLE_055 } from './puzzles/puzzle-055.js';
import { PUZZLE_056 } from './puzzles/puzzle-056.js';
import { PUZZLE_057 } from './puzzles/puzzle-057.js';
import { PUZZLE_058 } from './puzzles/puzzle-058.js';
import { PUZZLE_059 } from './puzzles/puzzle-059.js';
import { PUZZLE_060 } from './puzzles/puzzle-060.js';
import { PUZZLE_061 } from './puzzles/puzzle-061.js';
import { PUZZLE_062 } from './puzzles/puzzle-062.js';
import { PUZZLE_063 } from './puzzles/puzzle-063.js';
import { PUZZLE_022 } from './puzzles/puzzle-022.js';
import { PUZZLE_021 } from './puzzles/puzzle-021.js';

/** Every registered puzzle, keyed by id. */
export const PUZZLES: Record<string, PuzzleDefinition> = {
  [PUZZLE_001.id]: PUZZLE_001, [PUZZLE_002.id]: PUZZLE_002,
  [PUZZLE_003.id]: PUZZLE_003, [PUZZLE_004.id]: PUZZLE_004,
  [PUZZLE_005.id]: PUZZLE_005, [PUZZLE_006.id]: PUZZLE_006,
  [PUZZLE_007.id]: PUZZLE_007, [PUZZLE_008.id]: PUZZLE_008,
  [PUZZLE_009.id]: PUZZLE_009, [PUZZLE_010.id]: PUZZLE_010,
  [PUZZLE_011.id]: PUZZLE_011, [PUZZLE_012.id]: PUZZLE_012,
  [PUZZLE_013.id]: PUZZLE_013, [PUZZLE_014.id]: PUZZLE_014,
  [PUZZLE_015.id]: PUZZLE_015, [PUZZLE_016.id]: PUZZLE_016,
  [PUZZLE_017.id]: PUZZLE_017, [PUZZLE_018.id]: PUZZLE_018,
  [PUZZLE_019.id]: PUZZLE_019, [PUZZLE_020.id]: PUZZLE_020,
  [PUZZLE_021.id]: PUZZLE_021, [PUZZLE_022.id]: PUZZLE_022, [PUZZLE_023.id]: PUZZLE_023,
  [PUZZLE_024.id]: PUZZLE_024, [PUZZLE_025.id]: PUZZLE_025,
  [PUZZLE_026.id]: PUZZLE_026, [PUZZLE_027.id]: PUZZLE_027, [PUZZLE_028.id]: PUZZLE_028, [PUZZLE_029.id]: PUZZLE_029, [PUZZLE_030.id]: PUZZLE_030,
  [PUZZLE_031.id]: PUZZLE_031, [PUZZLE_032.id]: PUZZLE_032,
  [PUZZLE_033.id]: PUZZLE_033, [PUZZLE_034.id]: PUZZLE_034,
  [PUZZLE_035.id]: PUZZLE_035, [PUZZLE_036.id]: PUZZLE_036,
  [PUZZLE_039.id]: PUZZLE_039, [PUZZLE_040.id]: PUZZLE_040,
  [PUZZLE_041.id]: PUZZLE_041, [PUZZLE_042.id]: PUZZLE_042, [PUZZLE_045.id]: PUZZLE_045, [PUZZLE_046.id]: PUZZLE_046, [PUZZLE_047.id]: PUZZLE_047, [PUZZLE_048.id]: PUZZLE_048, [PUZZLE_049.id]: PUZZLE_049, [PUZZLE_050.id]: PUZZLE_050, [PUZZLE_051.id]: PUZZLE_051, [PUZZLE_052.id]: PUZZLE_052, [PUZZLE_053.id]: PUZZLE_053, [PUZZLE_054.id]: PUZZLE_054, [PUZZLE_055.id]: PUZZLE_055, [PUZZLE_056.id]: PUZZLE_056, [PUZZLE_057.id]: PUZZLE_057, [PUZZLE_058.id]: PUZZLE_058, [PUZZLE_059.id]: PUZZLE_059, [PUZZLE_060.id]: PUZZLE_060, [PUZZLE_061.id]: PUZZLE_061, [PUZZLE_062.id]: PUZZLE_062, [PUZZLE_063.id]: PUZZLE_063,
};

/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 *
 * 49 entries, ALL DISTINCT. ⚠ Every id appears EXACTLY ONCE: the rotation is
 * what "before it repeats" means, so a puzzle used a second time as a spacer
 * halves the real cycle. (It did: 2026-08-31 the array held 68 entries and 49
 * unique ids, so 18 puzzles came back around day 30 instead of day 49.)
 *
 * Ordered by a constraint solve, not by hand — the spacings below are all
 * CYCLIC (day 49 wraps to day 1), which hand-ordering kept getting wrong:
 *   · no two 3-turn puzzles adjacent   (22 of 49 are 3-turn)
 *   · same ANSWER >= 5 days apart      (grasp x6, freeze x6, arrow x4 ...)
 *   · pickers >= 4 apart               (8 pickers)
 *   · fate-queue puzzles >= 3 apart    (#41 #42 #53 #56 #61 — the disclosure
 *     banner is itself a tell)
 *   · deliberate near-clones >= 10 apart (16/31, 45/59, 46/60, 48/54, 53/61,
 *     57/62)
 * To insert a puzzle, re-run the solve rather than splicing it in by eye.
 *
 * 47 entries, down from 49: #57 and #62 were CUT 2026-09-01 (still registered).
 * Their skeleton — "the unit blocking your archer's line is your own, step it
 * aside" — cannot be built under this engine. A unit may act and THEN move in
 * the same turn, so clearing the line costs nothing, and `goalScore` measures
 * distance in Chebyshev, where a one-tile diagonal sidestep does not change the
 * range either. Both puzzles measured depth 0. Do not re-author this shape
 * without first making the sidestep cost something the goal can see.
 *
 * CLOSED answers (do not author more): freeze · grasp · purify.
 * Piercing is still ALWAYS a decoy and must be an ANSWER somewhere before the
 * picker returns to the ranger. Every picker keeps the #24 rule: the DEFAULT
 * loadout is the most tempting DECOY, never the answer.
 */
export const PUZZLE_ROTATION: PuzzleDefinition[] = [
  PUZZLE_042, // FATE QUEUE           → freeze to deny the enemy a DIE
  PUZZLE_034, // 3-TURN +PICKER       → ignore the free kill (longshot among decoys)
  PUZZLE_019, // blocked path         → arrow (the blocker)
  PUZZLE_023, // tempo/self-heal      → freeze
  PUZZLE_060, // 3-TURN ground        → walk past the free kill (clone of #46, spaced)
  PUZZLE_032, // passive synergy +PICKER → cold_snap (default Ring of Frost is showier)
  PUZZLE_050, // 3-TURN ALLOCATION    → the axe is for the FAR one; swing and walk
  PUZZLE_021, // blocked path         → bolt (the blocker)
  PUZZLE_035, // tempo/heal           → pinning the healer OUT OF RANGE
  PUZZLE_012, // pull                 → grasp
  PUZZLE_036, // 3-TURN eliminate_all → longshot the FAR one (assign the reach)
  PUZZLE_028, // tempo/heal           → freeze
  PUZZLE_051, // 3-TURN enemy PASSIVE → shoot SMALLER; the big shot arms Vengeful
  PUZZLE_031, // free-the-rooted      → purify (near-clone of #16, spaced from it)
  PUZZLE_056, // 3-TURN FATE/MULTIHIT → twin eats BOTH misses (trap #20 revived)
  PUZZLE_007, // pull                 → grasp
  PUZZLE_048, // 3-TURN ORDER TRAP    → kill the HEALER first, not the free kill
  PUZZLE_040, // blocked path +PICKER → longshot the blocker (1 of 3)
  PUZZLE_055, // 3-TURN BURN AS VALUE → ignite (5) beats bolt (10) because it keeps giving
  PUZZLE_015, // tempo/heal           → freeze
  PUZZLE_061, // 3-TURN FATE QUEUE    → swing to spend the miss (clone of #53, spaced)
  PUZZLE_024, // camouflage +PICKER   → grasp (default is a decoy)
  PUZZLE_045, // 3-TURN eliminate_all → LEAVE the burning one alone (restraint)
  PUZZLE_017, // overkill/knockback   → sword (the weaker attack)
  PUZZLE_027, // tempo/self-heal      → freeze
  PUZZLE_058, // 3-TURN PASSIVE ON    → pin first; Opportunist wants a status
  PUZZLE_022, // blocked path         → arrow (the REACHABLE door)
  PUZZLE_052, // 3-TURN DISPLACEMENT  → fear one enemy onto the line, then pierce both
  PUZZLE_041, // FATE QUEUE           → strike the bystander to spend the miss
  PUZZLE_016, // free-the-finisher +PICKER → purify (default Heal is the big number)
  PUZZLE_049, // 3-TURN SAVE YOUR OWN → shoot the Cur; the archer alone is not enough
  PUZZLE_013, // pull                 → grasp
  PUZZLE_059, // 3-TURN restraint     → leave the burning one (clone of #45, spaced)
  PUZZLE_039, // tempo/heal +PICKER   → pinning the healer (1 of 3)
  PUZZLE_033, // 3-TURN eliminate_all → longshot (the HEALER first)
  PUZZLE_025, // tempo/heal           → freeze
  PUZZLE_063, // 3-TURN DISPLACEMENT  → fear into the RING, then burn both
  PUZZLE_026, // blocked path         → arrow (the blocker)
  PUZZLE_030, // pull        +PICKER  → grasp (default Drain out-damages it)
  PUZZLE_053, // 3-TURN FATE QUEUE    → swing to SPEND the miss; the slam cannot pay
  PUZZLE_029, // friendly fire        → bolt (the weaker shot)
  PUZZLE_046, // 3-TURN eliminate_all → walk PAST the free kill (the cost is ground)
  PUZZLE_018, // friendly fire        → arrow (the weaker shot)
  PUZZLE_047, // 3-TURN status EXPIRY → hold the shot until Weakened wears off
  PUZZLE_020, // tempo/self-heal      → freeze
  PUZZLE_009, // pull                 → grasp
  PUZZLE_054, // 3-TURN ORDER TRAP    → the healer first (near-clone of #48, spaced)
];

/**
 * ROTATION SHORTENED TO THE v2-PASSING SET (owner ruling 2026-08-19): a short
 * rotation of good puzzles beats a long one padded with arithmetic. Every entry
 * above passes the v2 bar — goal-greedy fails, min win depth >= 1.
 *
 * OFF the rotation, still REGISTERED (the solver keeps scoring them and old
 * share links still resolve):
 *
 *   UNSOLVABLE — never re-add without a solver re-run:
 *     PUZZLE_005 ("Concentrate Fire", target 21 HP)
 *     PUZZLE_010 ("One Step Closer",  target 22 HP) Both were authored 2026-07-27 with the target's HP set to the
 * exact sum of available player damage; pass21 balance values shipped into
 * gameData 2026-08-05 (a4c2bed), damage numbers moved, and an exact-sum puzzle
 * dies the moment any value shifts by one.
 *   ARITHMETIC (v2 depth 0 — the goal-greedy player solves them by counting):
 *     PUZZLE_003, PUZZLE_004, PUZZLE_006, PUZZLE_008, PUZZLE_011, PUZZLE_014
 *   MUDDY special-combo shapes:
 *     PUZZLE_001, PUZZLE_002
 *
 * PZ3 replaces the arithmetic six; as each replacement passes the bar it joins
 * the array above. See GAMEPLAN PZ3/PZ-BROKEN and PUZZLES_AND_INVITES.md.
 *
 * Standing rule this established: re-run `npx tsx src/ai/puzzleSolver.ts`
 * after ANY gameData balance change.
 */

const MS_PER_DAY = 86_400_000;

/**
 * The puzzle featured on a given UTC calendar day. Deterministic worldwide:
 * the index is the UTC day number modulo the rotation length, so every player
 * sees the same puzzle on the same date.
 */
export function getDailyPuzzle(date: Date = new Date()): PuzzleDefinition {
  const dayIndex = Math.floor(date.getTime() / MS_PER_DAY);
  const n = PUZZLE_ROTATION.length;
  return PUZZLE_ROTATION[((dayIndex % n) + n) % n];
}

/** The puzzle currently featured (today's daily). */
export const CURRENT_PUZZLE: PuzzleDefinition = getDailyPuzzle();
