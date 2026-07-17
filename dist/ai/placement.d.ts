/**
 * placement.ts — Opening-placement planner for the AI brain.
 *
 * Placement is a real strategic layer, so the sim harness (and eventually
 * Fable's PvE team setup) should not place randomly. The heuristic here is
 * deliberately "moderately intelligent":
 *
 *  - Melee units go forward (x=2) near the vertical center; ranged units sit
 *    in the middle column; healers/support hide in the back column.
 *  - A defensive comp (no melee) naturally ends up hugging the backline.
 *  - AoE denial: allies never start adjacent (Chebyshev 1 — a radius-1 blast
 *    centered on either would clip both), and being within Chebyshev 2 is
 *    mildly penalized (one blast placed between them can still hit both).
 *
 * The plan is deterministic for a given comp — game-to-game variance comes
 * from the fortune meter's random phase, not from placement dice.
 */
import { BoardPosition } from '../types/matchState.js';
import { AbilityDefinition, UnitCustomization } from '../types/index.js';
/**
 * Plan starting tiles for a team, in the P1 frame (x 0–2, parallel to
 * `slugs`). Mirror with x → BOARD_WIDTH-1-x for the P2 side.
 * `customizations` currently doesn't change roles (specials don't alter the
 * basic attack) but is accepted so loadout-aware placement can evolve.
 */
export declare function planPlacement(slugs: string[], abilityMap: Map<string, AbilityDefinition>, _customizations?: (UnitCustomization | undefined)[]): BoardPosition[];
export declare function mirrorPlacement(placement: BoardPosition[]): BoardPosition[];
//# sourceMappingURL=placement.d.ts.map