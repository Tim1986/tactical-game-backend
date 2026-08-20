/**
 * fableTeams.ts — Fable's own signature rosters.
 *
 * These are the teams Fable brings when a player chooses "Fable's Own Roster"
 * instead of handing Fable one of their own teams. There are 12, and this file
 * is the SINGLE SOURCE OF TRUTH for all of them:
 *
 *   - Online PvE reads the seeded rows in `teams` (migration 0023), which are
 *     inserted from these definitions and keyed by the fixed UUIDs below.
 *   - Offline PvE imports this file directly through `mobile/engine` (a synced
 *     copy of `backend/src` — run `npm run sync-engine`), because an offline
 *     match cannot query the database.
 *
 * Changing a roster here means re-running the seed (`npm run seed:fable-teams`)
 * AND `npm run sync-engine`, or online and offline will disagree.
 *
 * ---------------------------------------------------------------------------
 * Where these came from
 * ---------------------------------------------------------------------------
 * Reselected 2026-08-13 for the v1.0.81 balance overhaul, from the cand7 grid
 * (`grids/cand7/2_top_builds.csv`) — the Stage E grid on the shipped v1.0.81
 * state (passive merge + Channeler/Siphon + chassis/ability tuning). Selected
 * from the DEDUPED "real builds" view (best passive per class-pair + special
 * combo, 252 rows), so every roster runs its OPTIMAL passive — fixing the drift
 * that left the previous panel on suboptimal passives after the overhaul.
 *
 * Why a full replacement (owner call): the previous (c6r44) panel had gone stale
 * on the new game — its rosters spanned rank #1 to #1371 of 2268 in the cand7
 * grid, several in the bottom half. As before, meanWinPct here is scored against
 * the PREVIOUS panel and is provenance only: it does NOT describe performance
 * against THIS panel, and comparability to any pre-2026-08-13 grid is broken.
 * The next grid must re-baseline against these teams.
 *
 * Selection was strength-first (all top-31 of the 252 real builds, 56.0-68.3
 * mean vs the old panel), diversity a tie-break never allowed to weaken a team:
 *
 *   - all 8 classes appear (Rogue/Warlock x4, Cleric/Ranger/Sorcerer/Wizard x3,
 *     Barbarian/Fighter x2) — the lean mirrors the cand7 meta, not a quota
 *   - ALL 12 class pairs are distinct (no repeats this time)
 *   - all 9 passives appear, including the three new/reworked ones —
 *     Stalwart (Frostkeeper, Pinfire Line), Channeler (Frostkeeper, Dread
 *     Freeze), Siphon (Siphon Snare)
 *   - 14 of the game's 24 specials appear
 *
 * Every grid cell is a 2+2 composition (two of each class), so each roster is
 * `[A, A, B, B]` with one loadout shared by the pair — that is exactly the
 * shape that was simulated, and the win rates below only hold for that shape.
 *
 * `placement` is the output of `planPlacement()` for that comp, in the P1 frame
 * (x 0-2). `buildInitialState` mirrors it to the P2 side (x -> 7-x), so these
 * are stored unmirrored. The grid ran with `placementMode: 'brain'` (the
 * default), so using the planner's tiles reproduces the simulated conditions;
 * hardcoding different tiles would invalidate the win rates.
 */
import { UnitCustomization } from '../types/index.js';
import { BoardPosition } from '../types/matchState.js';
export interface FableTeam {
    /** Fixed UUID — the `teams.id` of the seeded row. Never regenerate these. */
    id: string;
    /** Descriptive name shown to players, e.g. "Burn Attrition". */
    name: string;
    /** One-line hint at what the roster does, shown under the name. */
    style: string;
    /** 4 unit-definition slugs, always [A, A, B, B]. */
    slugs: [string, string, string, string];
    /** Loadout for the A pair (slots 0-1). */
    loadoutA: UnitCustomization;
    /** Loadout for the B pair (slots 2-3). */
    loadoutB: UnitCustomization;
    /** Mean win % vs the PREVIOUS 12-roster panel in the cand7 grid. Provenance
     *  only — not performance against the current panel, and not gameplay. */
    meanWinPct: number;
}
/**
 * The rosters, strongest first. IDs are fixed and must never change — they are
 * foreign-keyed by `matches.player_two_team` for every PvE match ever played
 * against them.
 */
export declare const FABLE_TEAMS: FableTeam[];
/** Sentinel the client sends to mean "roll one of Fable's rosters for me". */
export declare const FABLE_RANDOM_TEAM_ID = "fable-random";
/** The 4 per-slot customizations for a roster, expanded from its two loadouts. */
export declare function fableCustomizations(team: FableTeam): UnitCustomization[];
/**
 * Planner placement for a roster, in the P1 frame. Computed rather than stored
 * so it can never drift from the planner the sims used.
 */
export declare function fablePlacement(team: FableTeam): BoardPosition[];
export declare function getFableTeam(id: string): FableTeam | undefined;
export declare function isFableTeamId(id: string): boolean;
/** Resolve the random sentinel to a concrete roster; pass through a real id. */
export declare function resolveFableTeam(id: string): FableTeam;
//# sourceMappingURL=fableTeams.d.ts.map