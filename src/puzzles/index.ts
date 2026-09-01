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
 * puzzle-901 (camouflage special-picker) is also in rotation; puzzle-902 is an
 * expert puzzle — registered/shareable but excluded from the daily rotation.
 */
import type { PuzzleDefinition } from './types.js';
import { PUZZLE_901 } from './puzzles/puzzle-901.js';
import { PUZZLE_902 } from './puzzles/puzzle-902.js';
import { PUZZLE_903 } from './puzzles/puzzle-903.js';
import { PUZZLE_904 } from './puzzles/puzzle-904.js';
import { PUZZLE_905 } from './puzzles/puzzle-905.js';
import { PUZZLE_906 } from './puzzles/puzzle-906.js';
import { PUZZLE_035 } from './puzzles/puzzle-035.js';
import { PUZZLE_908 } from './puzzles/puzzle-908.js';
import { PUZZLE_049 } from './puzzles/puzzle-049.js';
import { PUZZLE_910 } from './puzzles/puzzle-910.js';
import { PUZZLE_911 } from './puzzles/puzzle-911.js';
import { PUZZLE_024 } from './puzzles/puzzle-024.js';
import { PUZZLE_043 } from './puzzles/puzzle-043.js';
import { PUZZLE_914 } from './puzzles/puzzle-914.js';
import { PUZZLE_016 } from './puzzles/puzzle-016.js';
import { PUZZLE_021 } from './puzzles/puzzle-021.js';
import { PUZZLE_033 } from './puzzles/puzzle-033.js';
import { PUZZLE_005 } from './puzzles/puzzle-005.js';
import { PUZZLE_041 } from './puzzles/puzzle-041.js';
import { PUZZLE_047 } from './puzzles/puzzle-047.js';
import { PUZZLE_029 } from './puzzles/puzzle-029.js';
import { PUZZLE_007 } from './puzzles/puzzle-007.js';
import { PUZZLE_022 } from './puzzles/puzzle-022.js';
import { PUZZLE_019 } from './puzzles/puzzle-019.js';
import { PUZZLE_039 } from './puzzles/puzzle-039.js';
import { PUZZLE_008 } from './puzzles/puzzle-008.js';
import { PUZZLE_010 } from './puzzles/puzzle-010.js';
import { PUZZLE_012 } from './puzzles/puzzle-012.js';
import { PUZZLE_003 } from './puzzles/puzzle-003.js';
import { PUZZLE_027 } from './puzzles/puzzle-027.js';
import { PUZZLE_023 } from './puzzles/puzzle-023.js';
import { PUZZLE_040 } from './puzzles/puzzle-040.js';
import { PUZZLE_045 } from './puzzles/puzzle-045.js';
import { PUZZLE_006 } from './puzzles/puzzle-006.js';
import { PUZZLE_001 } from './puzzles/puzzle-001.js';
import { PUZZLE_017 } from './puzzles/puzzle-017.js';
import { PUZZLE_026 } from './puzzles/puzzle-026.js';
import { PUZZLE_014 } from './puzzles/puzzle-014.js';
import { PUZZLE_046 } from './puzzles/puzzle-046.js';
import { PUZZLE_020 } from './puzzles/puzzle-020.js';
import { PUZZLE_028 } from './puzzles/puzzle-028.js';
import { PUZZLE_042 } from './puzzles/puzzle-042.js';
import { PUZZLE_002 } from './puzzles/puzzle-002.js';
import { PUZZLE_013 } from './puzzles/puzzle-013.js';
import { PUZZLE_004 } from './puzzles/puzzle-004.js';
import { PUZZLE_044 } from './puzzles/puzzle-044.js';
import { PUZZLE_048 } from './puzzles/puzzle-048.js';
import { PUZZLE_025 } from './puzzles/puzzle-025.js';
import { PUZZLE_050 } from './puzzles/puzzle-050.js';
import { PUZZLE_038 } from './puzzles/puzzle-038.js';
import { PUZZLE_957 } from './puzzles/puzzle-957.js';
import { PUZZLE_036 } from './puzzles/puzzle-036.js';
import { PUZZLE_030 } from './puzzles/puzzle-030.js';
import { PUZZLE_009 } from './puzzles/puzzle-009.js';
import { PUZZLE_032 } from './puzzles/puzzle-032.js';
import { PUZZLE_962 } from './puzzles/puzzle-962.js';
import { PUZZLE_034 } from './puzzles/puzzle-034.js';
import { PUZZLE_018 } from './puzzles/puzzle-018.js';
import { PUZZLE_031 } from './puzzles/puzzle-031.js';
import { PUZZLE_011 } from './puzzles/puzzle-011.js';
import { PUZZLE_015 } from './puzzles/puzzle-015.js';
import { PUZZLE_037 } from './puzzles/puzzle-037.js';

/** Every registered puzzle, keyed by id. */
export const PUZZLES: Record<string, PuzzleDefinition> = {
  [PUZZLE_901.id]: PUZZLE_901, [PUZZLE_902.id]: PUZZLE_902,
  [PUZZLE_903.id]: PUZZLE_903, [PUZZLE_904.id]: PUZZLE_904,
  [PUZZLE_905.id]: PUZZLE_905, [PUZZLE_906.id]: PUZZLE_906,
  [PUZZLE_035.id]: PUZZLE_035, [PUZZLE_908.id]: PUZZLE_908,
  [PUZZLE_049.id]: PUZZLE_049, [PUZZLE_910.id]: PUZZLE_910,
  [PUZZLE_911.id]: PUZZLE_911, [PUZZLE_024.id]: PUZZLE_024,
  [PUZZLE_043.id]: PUZZLE_043, [PUZZLE_914.id]: PUZZLE_914,
  [PUZZLE_016.id]: PUZZLE_016, [PUZZLE_021.id]: PUZZLE_021,
  [PUZZLE_033.id]: PUZZLE_033, [PUZZLE_005.id]: PUZZLE_005,
  [PUZZLE_041.id]: PUZZLE_041, [PUZZLE_047.id]: PUZZLE_047,
  [PUZZLE_037.id]: PUZZLE_037, [PUZZLE_031.id]: PUZZLE_031, [PUZZLE_029.id]: PUZZLE_029,
  [PUZZLE_007.id]: PUZZLE_007, [PUZZLE_022.id]: PUZZLE_022,
  [PUZZLE_019.id]: PUZZLE_019, [PUZZLE_039.id]: PUZZLE_039, [PUZZLE_008.id]: PUZZLE_008, [PUZZLE_010.id]: PUZZLE_010, [PUZZLE_012.id]: PUZZLE_012,
  [PUZZLE_003.id]: PUZZLE_003, [PUZZLE_027.id]: PUZZLE_027,
  [PUZZLE_023.id]: PUZZLE_023, [PUZZLE_040.id]: PUZZLE_040,
  [PUZZLE_045.id]: PUZZLE_045, [PUZZLE_006.id]: PUZZLE_006,
  [PUZZLE_001.id]: PUZZLE_001, [PUZZLE_017.id]: PUZZLE_017,
  [PUZZLE_026.id]: PUZZLE_026, [PUZZLE_014.id]: PUZZLE_014, [PUZZLE_046.id]: PUZZLE_046, [PUZZLE_020.id]: PUZZLE_020, [PUZZLE_028.id]: PUZZLE_028, [PUZZLE_042.id]: PUZZLE_042, [PUZZLE_002.id]: PUZZLE_002, [PUZZLE_013.id]: PUZZLE_013, [PUZZLE_004.id]: PUZZLE_004, [PUZZLE_044.id]: PUZZLE_044, [PUZZLE_048.id]: PUZZLE_048, [PUZZLE_025.id]: PUZZLE_025, [PUZZLE_050.id]: PUZZLE_050, [PUZZLE_038.id]: PUZZLE_038, [PUZZLE_957.id]: PUZZLE_957, [PUZZLE_036.id]: PUZZLE_036, [PUZZLE_030.id]: PUZZLE_030, [PUZZLE_009.id]: PUZZLE_009, [PUZZLE_032.id]: PUZZLE_032, [PUZZLE_962.id]: PUZZLE_962, [PUZZLE_018.id]: PUZZLE_018, [PUZZLE_034.id]: PUZZLE_034, [PUZZLE_011.id]: PUZZLE_011, [PUZZLE_015.id]: PUZZLE_015,
};

/**
 * Daily rotation, in order — the featured puzzle cycles by UTC-day index.
 *
 * 50 entries, RENUMBERED 1-50 on 2026-09-01: DAY N IS PUZZLE N, so this array
 * is just PUZZLE_001..PUZZLE_050 in order and the spacing solve below is baked
 * into the numbering itself. Consequence: A NEW PUZZLE CANNOT BE APPENDED. To
 * add one, re-run the solve and renumber, or accept where its number puts it.
 * Retired-but-registered puzzles live at puzzle-9NN, where NN is their original
 * authoring number (puzzle-957 is the old #57). PZ3 is CLOSED at this count;
 * more can be added later — the format is not exhausted.
 *
 * ⚠ EVERY ID APPEARS EXACTLY ONCE. The rotation is what "before it repeats"
 * MEANS, and a puzzle re-used as a spacer does not space anything: on
 * 2026-08-31 this array held 68 entries and 49 unique ids, so 18 puzzles came
 * back around day 30 instead of day 49.
 *
 * Ordered by a constraint solve, not by hand — every spacing is CYCLIC (day 50
 * wraps to day 1), which hand-ordering kept getting wrong:
 *   · no two 3-turn puzzles adjacent   (23 of 50 are 3-turn)
 *   · same ANSWER >= 5 days apart      (grasp x6, freeze x6, arrow x4 ...)
 *   · pickers >= 4 apart               (8 pickers)
 *   · fate-queue puzzles >= 3 apart    (#14 #26 #32 #38 #48 — the disclosure
 *     banner is itself a tell)
 *   · deliberate near-clones >= 10 apart (3/21, 9/20, 15/34, 25/42, 30/46,
 *     32/48)
 *
 * TWO PUZZLES WERE CUT on 2026-09-01 (now puzzle-957 and puzzle-962). Their
 * skeleton — "the unit blocking your archer's line is your own, step it aside"
 * — cannot be built under this engine: a unit may act and THEN move in the same
 * turn, so clearing the line costs nothing, and `goalScore` measures distance in
 * Chebyshev, where a one-tile diagonal sidestep does not change the range
 * either. Both measured depth 0. Do not re-author this shape without first
 * making the sidestep cost something the goal function can see. #34, #15 and
 * #11 replaced them.
 *
 * CLOSED answers (do not author more): freeze · grasp · purify.
 * Piercing is still ALWAYS a decoy and must be an ANSWER somewhere before the
 * picker returns to the ranger. Every picker keeps the #7 rule: the DEFAULT
 * loadout is the most tempting DECOY, never the answer.
 */
export const PUZZLE_ROTATION: PuzzleDefinition[] = [
  PUZZLE_001, // tempo/heal +PICKER   → pinning the healer (1 of 3)
  PUZZLE_002, // 3-TURN SAVE YOUR OWN → shoot the Cur; the archer alone is not enough
  PUZZLE_003, // free-the-rooted      → purify (near-clone of #21, spaced from it)
  PUZZLE_004, // 3-TURN enemy PASSIVE → shoot SMALLER; the big shot arms Vengeful
  PUZZLE_005, // friendly fire        → arrow (the weaker shot)
  PUZZLE_006, // 3-TURN eliminate_all → longshot the FAR one (assign the reach)
  PUZZLE_007, // camouflage +PICKER   → grasp (default is a decoy)
  PUZZLE_008, // tempo/heal           → freeze
  PUZZLE_009, // 3-TURN ground        → walk past the free kill (clone of #20, spaced)
  PUZZLE_010, // friendly fire        → bolt (the weaker shot)
  PUZZLE_011, // 3-TURN UNDYING     → ignite turn one; the burn has to kill it twice
  PUZZLE_012, // pull        +PICKER  → grasp (default Drain out-damages it)
  PUZZLE_013, // 3-TURN ALLOCATION    → the axe is for the FAR one; swing and walk
  PUZZLE_014, // FATE QUEUE           → freeze to deny the enemy a DIE
  PUZZLE_015, // 3-TURN SHIELD      → the ward eats an UNBLOCKABLE too (clone of #34, spaced)
  PUZZLE_016, // tempo/heal           → freeze
  PUZZLE_017, // blocked path +PICKER → longshot the blocker (1 of 3)
  PUZZLE_018, // 3-TURN DISPLACEMENT  → fear into the RING, then burn both
  PUZZLE_019, // blocked path         → arrow (the blocker)
  PUZZLE_020, // 3-TURN eliminate_all → walk PAST the free kill (the cost is ground)
  PUZZLE_021, // free-the-finisher +PICKER → purify (default Heal is the big number)
  PUZZLE_022, // tempo/heal           → freeze
  PUZZLE_023, // 3-TURN eliminate_all → longshot (the HEALER first)
  PUZZLE_024, // pull                 → grasp
  PUZZLE_025, // 3-TURN ORDER TRAP    → the healer first (near-clone of #42, spaced)
  PUZZLE_026, // FATE QUEUE           → strike the bystander to spend the miss
  PUZZLE_027, // passive synergy +PICKER → cold_snap (default Ring of Frost is showier)
  PUZZLE_028, // 3-TURN status EXPIRY → hold the shot until Weakened wears off
  PUZZLE_029, // tempo/self-heal      → freeze
  PUZZLE_030, // 3-TURN restraint     → leave the burning one (clone of #46, spaced)
  PUZZLE_031, // blocked path         → arrow (the REACHABLE door)
  PUZZLE_032, // 3-TURN FATE QUEUE    → swing to spend the miss (clone of #48, spaced)
  PUZZLE_033, // overkill/knockback   → sword (the weaker attack)
  PUZZLE_034, // 3-TURN SHIELD      → feed the ward the CHEAP shot; Longshot is the answer
  PUZZLE_035, // pull                 → grasp
  PUZZLE_036, // 3-TURN PASSIVE ON    → pin first; Opportunist wants a status
  PUZZLE_037, // blocked path         → bolt (the blocker)
  PUZZLE_038, // 3-TURN FATE/MULTIHIT → twin eats BOTH misses (trap #20 revived)
  PUZZLE_039, // tempo/self-heal      → freeze
  PUZZLE_040, // 3-TURN +PICKER       → ignore the free kill (longshot among decoys)
  PUZZLE_041, // blocked path         → arrow (the blocker)
  PUZZLE_042, // 3-TURN ORDER TRAP    → kill the HEALER first, not the free kill
  PUZZLE_043, // pull                 → grasp
  PUZZLE_044, // 3-TURN DISPLACEMENT  → fear one enemy onto the line, then pierce both
  PUZZLE_045, // tempo/heal           → pinning the healer OUT OF RANGE
  PUZZLE_046, // 3-TURN eliminate_all → LEAVE the burning one alone (restraint)
  PUZZLE_047, // tempo/self-heal      → freeze
  PUZZLE_048, // 3-TURN FATE QUEUE    → swing to SPEND the miss; the slam cannot pay
  PUZZLE_049, // pull                 → grasp
  PUZZLE_050, // 3-TURN BURN AS VALUE → ignite (5) beats bolt (10) because it keeps giving
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
 *     PUZZLE_905 ("Concentrate Fire", target 21 HP)
 *     PUZZLE_910 ("One Step Closer",  target 22 HP) Both were authored 2026-07-27 with the target's HP set to the
 * exact sum of available player damage; pass21 balance values shipped into
 * gameData 2026-08-05 (a4c2bed), damage numbers moved, and an exact-sum puzzle
 * dies the moment any value shifts by one.
 *   ARITHMETIC (v2 depth 0 — the goal-greedy player solves them by counting):
 *     PUZZLE_903, PUZZLE_904, PUZZLE_906, PUZZLE_908, PUZZLE_911, PUZZLE_914
 *   MUDDY special-combo shapes:
 *     PUZZLE_901, PUZZLE_902
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
