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
 * Selected from `pass21_balance_grid.xlsx` (the Stage E grid: 28 class pairs x
 * 81 loadout combos = 2268 cells, each played 40 games against all 9 reference
 * parties). The score is **Mean Win %** — column G, not the median. See
 * AC_REWORK.md:429-450 for why the median misreads bimodal cells.
 *
 * Selection was strength-first: every roster here scores 62.8-73.3 mean win %
 * against the reference panel, versus a grid median of 43.3. Diversity was a
 * tie-break applied on top, not a constraint allowed to weaken a team:
 *
 *   - all 8 classes appear (2-4 times each)
 *   - 20 of the game's 24 specials appear
 *   - all 8 passives appear
 *   - no class pair is used twice
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
  /** Mean win % vs the 9 reference parties in pass21. Provenance, not gameplay. */
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
    name: 'Wounded Fury',
    style: 'both pairs hit harder as they bleed',
    slugs: ['barbarian', 'barbarian', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'whirlwind', passiveSlug: 'vengeful' },
    loadoutB: { specialSlug: 'dagger_toss', passiveSlug: 'vengeful' },
    meanWinPct: 73.3,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000002',
    name: 'Warded Drain',
    style: 'shielded clerics behind unmovable life-stealers',
    slugs: ['cleric', 'cleric', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'ward', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'drain', passiveSlug: 'anchor' },
    meanWinPct: 72.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000003',
    name: 'Thorn Wall',
    style: 'melee wall that punishes every hit it takes',
    slugs: ['fighter', 'fighter', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'shield_bash', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'piercing', passiveSlug: 'thorns' },
    meanWinPct: 71.1,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000004',
    name: 'Pull and Stun',
    style: 'drags you out of position, then locks you down',
    slugs: ['fighter', 'fighter', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'concussive', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'grasp', passiveSlug: 'opportunist' },
    meanWinPct: 69.4,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000005',
    name: 'Thorn Volley',
    style: 'ranged poke behind a retaliating front line',
    slugs: ['barbarian', 'barbarian', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'roar', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'piercing', passiveSlug: 'thorns' },
    meanWinPct: 67.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000006',
    name: 'Shock and Freeze',
    style: 'knocks you back, then freezes you where you land',
    slugs: ['barbarian', 'barbarian', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'shockwave', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'anchor' },
    meanWinPct: 67.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000007',
    name: 'Elemental Storm',
    style: 'pure caster damage, fire and ice',
    slugs: ['sorcerer', 'sorcerer', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'flame_jet', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'opportunist' },
    meanWinPct: 67.2,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000008',
    name: 'Swift Skirmish',
    style: 'fast flankers that strip your defenses',
    slugs: ['ranger', 'ranger', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'piercing', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'expose', passiveSlug: 'swift' },
    meanWinPct: 66.1,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000009',
    name: 'Pin and Cleanse',
    style: 'roots you in place and shrugs off your control',
    slugs: ['cleric', 'cleric', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'purify', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'pinning', passiveSlug: 'thorns' },
    meanWinPct: 66.1,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000a',
    name: 'Burn Attrition',
    style: 'stacks burn and outlasts you',
    slugs: ['cleric', 'cleric', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'ward', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'ignite', passiveSlug: 'undying' },
    meanWinPct: 63.3,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000b',
    name: 'Frozen Line',
    style: 'a front line that heals itself while you sit frozen',
    slugs: ['fighter', 'fighter', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'second_wind', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'freeze', passiveSlug: 'opportunist' },
    meanWinPct: 62.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000c',
    name: 'Fear and Fire',
    style: 'scatters your formation, then burns the stragglers',
    slugs: ['sorcerer', 'sorcerer', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'ffh', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'fear', passiveSlug: 'opportunist' },
    meanWinPct: 62.8,
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
