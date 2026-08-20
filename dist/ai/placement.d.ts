/**
 * placement.ts — Opening-placement planner ("Auto-Arrange").
 *
 * Player-facing: the button on the team page calls straight into this, and
 * Fable's 12 rosters deploy with it. The bar is "a tactics player looks at the
 * formation and recognises the plan" — mutual support without feeding AoE.
 *
 * ── Why this is a set of AUTHORED FORMATIONS and not an optimizer ───────────
 * Two previous versions scored tiles with weighted sums (centre pull, span,
 * spacing penalties) and both produced the same thing: units evenly smeared
 * into lattices and picket lines. That is not a tuning failure — it is what
 * the optimum of any smooth weighted sum looks like. The strategies a human
 * actually plays ("rush the middle as a pack", "castle in a corner and make
 * them walk") are DISCRETE plans, not points on a continuum, so no weight
 * setting reaches them. The fix is to think in the same order a player does:
 * pick the strategy from the composition, then arrange the units to express
 * it, then verify AoE safety as a hard rule.
 *
 *   RUSH    all-melee            wedge on the front line, centre-forward:
 *                                the pack arrives at the same fight on the
 *                                same turn, wings fold in behind.
 *   PHALANX melee + support      melee wall centre-front; casters/healers
 *                                tucked on the back shoulders, diagonal to
 *                                the wall so no lane or blast lines up.
 *   CASTLE  no melee             staggered lattice anchored in the top
 *                                corner. A ranged/control team wants the
 *                                approach to be long and awkward; the corner
 *                                halves the angles melee can come from and
 *                                buys two turns of free shooting.
 *
 * ── The AoE geometry every shape must respect ───────────────────────────────
 * The blasts that can reach the deploy zone on turn 1 (Ring of Fire/Frost)
 * are ring-shaped: they hit the 8 tiles around a centre — a 3x3 box minus its
 * middle. All three deploy columns fit inside one box width, which gives two
 * hard rules and two derived facts:
 *
 *   R1  every pair of allies at Chebyshev >= 2 (a blast centred on either
 *       must not clip the other);
 *   R2  any 3 consecutive ROWS hold at most 2 units (no single blast may
 *       catch three).
 *
 *   F1  under R2, four units need a vertical span of AT LEAST 4 rows, and
 *       span 4 is only achievable as rows {r, r+1, r+3, r+4} with each
 *       adjacent-row pair split into columns 0 and 2 (dx=2 keeps R1). This is
 *       why no honest formation is tighter than the ones below — and why the
 *       castle is a stagger, not a block.
 *   F2  the "obvious" 2x2 square (e.g. (0,3),(2,3),(0,5),(2,5)) is the WORST
 *       formation on the board: one ring centred in its middle catches all
 *       four. Enumerated, not intuited. The eye wants to build it; never do.
 *
 * Every template below satisfies R1 and R2 exactly (worst single blast = 2,
 * zero adjacent pairs), keeps all units off distinct rows (so a line special
 * — Piercing Shot, Flame Jet, which hit allies in the lane — never has an
 * ally parked in its firing row), and avoids the removed corner tiles.
 *
 * ── Game facts this file MUST stay in step with (audited 2026-08-09) ────────
 *  Reach:      melee basic range 1, warlock 4, wizard/sorcerer 5, ranger 6.
 *              Movement 3 (rogue 4).
 *  Geometry:   front lines start 3 columns apart (P1 x=2 vs P2 x=5), so melee
 *              from x=2 reach contact on turn 1.
 *  Support:    Heal range 2; Ward and Purify range 3. Healers do NOT need to
 *              deploy inside heal range — everyone is at full HP on turn 1 and
 *              movement 3 closes any gap in these shapes before it matters.
 *  AoE shapes: Whirlwind / Ground Slam are `orthogonal` r1 (Manhattan == 1 —
 *              diagonal neighbours are safe) and self-centred; they threaten
 *              the contact fight, not the deployment. Ring of Fire/Frost and
 *              Leaping Slam are `ring` r1; the first two reach the deploy zone
 *              turn 1, which is what R1/R2 defend against.
 *  Friendly fire: line and AoE specials have excludeAllies=false.
 *  Coverage:   range is MANHATTAN, so row offset spends the same budget as
 *              column distance — another reason the phalanx sits centred.
 *
 * ── Do not re-tune this against a win-rate number ───────────────────────────
 * placementSearch.ts optimised placements directly against a fixed field and
 * "won" +8 points — which measured +0.0 against opponents placed randomly.
 * Placement swings individual matchups enormously (sd ~22) but no fixed
 * formation dominates a varied field, so win-rate cannot arbitrate between
 * reasonable formations. Legibility can, and does.
 */
import { BoardPosition } from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';
/**
 * Plan starting tiles for a team, in the P1 frame (x 0–2, parallel to
 * `slugs`). Mirror with x -> BOARD_WIDTH-1-x for the P2 side. Deterministic
 * (the sims and the UI both rely on that) and memoised per comp+loadout.
 */
export declare function planPlacement(slugs: string[], abilityMap: Map<string, AbilityDefinition>, customizations?: (UnitCustomization | undefined)[]): BoardPosition[];
export declare function mirrorPlacement(placement: BoardPosition[]): BoardPosition[];
//# sourceMappingURL=placement.d.ts.map