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

import { planPlacement } from '../ai/placement.js';
import { DEFAULT_UNITS, buildAbilityMap } from '../ai/defaultData.js';
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
export const FABLE_TEAMS: FableTeam[] = [
  {
    id: 'fab1e000-0000-4000-a000-000000000001',
    name: 'Exposed Frost',
    style: 'expose your guard, then bury you in a blizzard',
    slugs: ['rogue', 'rogue', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'expose', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'opportunist' },
    meanWinPct: 68.3,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000002',
    name: 'Hallowed Dread',
    style: 'healers hold the line while fear scatters yours',
    slugs: ['cleric', 'cleric', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'heal', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'fear', passiveSlug: 'opportunist' },
    meanWinPct: 66.3,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000003',
    name: 'Frostkeeper',
    style: 'an unmovable cleric anchors a stationary ice mage',
    slugs: ['cleric', 'cleric', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'heal', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'cold_snap', passiveSlug: 'channeler' },
    meanWinPct: 62.9,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000004',
    name: 'Dread Warcry',
    style: 'a leaping bruiser behind fear that breaks your formation',
    slugs: ['barbarian', 'barbarian', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'roar', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'fear', passiveSlug: 'opportunist' },
    meanWinPct: 62.7,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000005',
    name: 'Exposed Volley',
    style: 'pierce from range, then execute what you exposed',
    slugs: ['ranger', 'ranger', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'piercing', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'expose', passiveSlug: 'vengeful' },
    meanWinPct: 62.1,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000006',
    name: 'Pinning Wall',
    style: 'an undying front line roots you for the ranger',
    slugs: ['fighter', 'fighter', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'shield_bash', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'pinning', passiveSlug: 'opportunist' },
    meanWinPct: 60.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000007',
    name: 'Bloodrush',
    style: 'the more they bleed, the harder they execute you',
    slugs: ['barbarian', 'barbarian', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'roar', passiveSlug: 'vengeful' },
    loadoutB: { specialSlug: 'assassinate', passiveSlug: 'swift' },
    meanWinPct: 60.0,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000008',
    name: 'Ironflame',
    style: 'an undying wall in front of a burning sorcerer',
    slugs: ['fighter', 'fighter', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'shield_bash', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'ignite', passiveSlug: 'undying' },
    meanWinPct: 59.0,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000009',
    name: 'Dread Freeze',
    style: 'fear scatters your line, a stationary mage freezes the pieces',
    slugs: ['warlock', 'warlock', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'fear', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'channeler' },
    meanWinPct: 58.5,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000a',
    name: 'Sanctum Pyre',
    style: 'shielded clerics feed a Ring-of-Fire sorcerer',
    slugs: ['cleric', 'cleric', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'ward', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'ffh', passiveSlug: 'undying' },
    meanWinPct: 58.5,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000b',
    name: 'Siphon Snare',
    style: 'expose your guard while a warlock drags and leeches you',
    slugs: ['rogue', 'rogue', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'expose', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'grasp', passiveSlug: 'siphon' },
    meanWinPct: 57.7,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000c',
    name: 'Pinfire Line',
    style: 'an unmovable ranger roots you under a fire ring',
    slugs: ['ranger', 'ranger', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'pinning', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'ffh', passiveSlug: 'undying' },
    meanWinPct: 56.0,
  },
];

/** Sentinel the client sends to mean "roll one of Fable's rosters for me". */
export const FABLE_RANDOM_TEAM_ID = 'fable-random';

/** The 4 per-slot customizations for a roster, expanded from its two loadouts. */
export function fableCustomizations(team: FableTeam): UnitCustomization[] {
  return [team.loadoutA, team.loadoutA, team.loadoutB, team.loadoutB];
}

/**
 * Planner placement for a roster, in the P1 frame. Computed rather than stored
 * so it can never drift from the planner the sims used.
 */
export function fablePlacement(team: FableTeam): BoardPosition[] {
  return planPlacement(team.slugs, buildAbilityMap(), fableCustomizations(team));
}

export function getFableTeam(id: string): FableTeam | undefined {
  return FABLE_TEAMS.find((t) => t.id === id);
}

export function isFableTeamId(id: string): boolean {
  return id === FABLE_RANDOM_TEAM_ID || FABLE_TEAMS.some((t) => t.id === id);
}

/** Resolve the random sentinel to a concrete roster; pass through a real id. */
export function resolveFableTeam(id: string): FableTeam {
  if (id === FABLE_RANDOM_TEAM_ID) {
    return FABLE_TEAMS[Math.floor(Math.random() * FABLE_TEAMS.length)];
  }
  const team = getFableTeam(id);
  if (!team) throw new Error(`Unknown Fable team: ${id}`);
  return team;
}

/** Guard: every roster must reference real units. Throws at import time. */
for (const t of FABLE_TEAMS) {
  const missing = t.slugs.filter((s) => !DEFAULT_UNITS[s]);
  if (missing.length) {
    throw new Error(`Fable team "${t.name}" references unknown units: ${missing.join(', ')}`);
  }
}
