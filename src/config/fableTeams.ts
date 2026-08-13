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
 * Reselected 2026-08-12 from `grids/c6r44/merged.xlsx` — the Stage E grid on the
 * shipped v1.0.80 chassis (C6 + Rogue 44): 28 class pairs x 81 loadout combos =
 * 2268 cells, each played 40 games against Fable's THEN-current 12 rosters
 * (`--refs fable`). The score is **Mean Win %** — column G, not the median.
 *
 * This panel REPLACED the previous one wholesale (owner call): the old refs had
 * gone stale — several were mediocre on the new chassis (e.g. the old "Pull and
 * Stun", barbarian/warlock whirlwind+grasp, sat rank ~892 of 2268). Because the
 * new refs were themselves scored against the OLD panel, meanWinPct here is
 * provenance only and does NOT carry over: it does not describe performance
 * against THIS panel. Comparability to any pre-2026-08-12 grid is deliberately
 * broken, and the next grid must be re-baselined against these teams.
 *
 * Selection was strength-first: every roster scores 55.2-69.6 mean win % vs the
 * old panel (grid mean 36.3), i.e. all sit in the top ~3% of cells. Diversity
 * was a tie-break on top, never allowed to weaken a team, so coverage is looser
 * than the old set:
 *
 *   - all 8 classes appear (Fighter/Rogue x4, Cleric/Sorcerer/Warlock/Wizard x3,
 *     Barbarian/Ranger x2) — the lean mirrors the meta, not a quota
 *   - 17 of the game's 24 specials appear (the omitted 7 are the genuinely weak
 *     ones — grasp, whirlwind, shockwave, pinning, freeze, ignite, heal)
 *   - 7 of 8 passives appear (only stalwart is absent)
 *   - one class pair recurs (Barbarian/Rogue: Warcry Volley vs Bloodrush) —
 *     Barbarian's only strong non-Blizzard partner is Rogue, and Blizzard is
 *     capped at 2 rosters on purpose (it is the mechanic under active review)
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
  /** Mean win % vs the PREVIOUS 12-roster panel in the c6r44 grid. Provenance
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
    name: 'Sanctum Artillery',
    style: 'shielded clerics feed a fire-artillery sorcerer line',
    slugs: ['cleric', 'cleric', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'ward', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'flame_jet', passiveSlug: 'undying' },
    meanWinPct: 69.6,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000002',
    name: 'Ironclad Pyre',
    style: 'an undying wall behind a Ring-of-Fire nuke',
    slugs: ['fighter', 'fighter', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'shield_bash', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'ffh', passiveSlug: 'undying' },
    meanWinPct: 65.6,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000003',
    name: 'Warded Leech',
    style: 'shields up front, lifesteal grinds you down',
    slugs: ['cleric', 'cleric', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'ward', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'drain', passiveSlug: 'opportunist' },
    meanWinPct: 65.4,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000004',
    name: 'Exposed Frost',
    style: 'expose your guard, then bury you in a blizzard',
    slugs: ['rogue', 'rogue', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'expose', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'opportunist' },
    meanWinPct: 64.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000005',
    name: 'Dread Freeze',
    style: 'fear scatters your line, blizzard freezes the pieces',
    slugs: ['warlock', 'warlock', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'fear', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'opportunist' },
    meanWinPct: 64.8,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000006',
    name: 'Concussive Mark',
    style: 'an anchored bruiser sets up guaranteed-hit focus fire',
    slugs: ['fighter', 'fighter', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'concussive', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'expose', passiveSlug: 'opportunist' },
    meanWinPct: 64.2,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000007',
    name: 'Warcry Volley',
    style: 'a warcry buff behind a hail of thrown daggers',
    slugs: ['barbarian', 'barbarian', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'roar', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'dagger_toss', passiveSlug: 'opportunist' },
    meanWinPct: 63.5,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000008',
    name: 'Thorn Bulwark',
    style: 'a self-healing thorn wall screens a piercing volley',
    slugs: ['fighter', 'fighter', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'second_wind', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'piercing', passiveSlug: 'thorns' },
    meanWinPct: 62.9,
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000009',
    name: 'Bloodrush',
    style: 'the more they bleed, the harder they execute you',
    slugs: ['barbarian', 'barbarian', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'roar', passiveSlug: 'vengeful' },
    loadoutB: { specialSlug: 'assassinate', passiveSlug: 'swift' },
    meanWinPct: 62.1,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000a',
    name: 'Draining Wall',
    style: 'stalls behind an undying line and drains you out',
    slugs: ['fighter', 'fighter', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'concussive', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'drain', passiveSlug: 'opportunist' },
    meanWinPct: 62.1,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000b',
    name: 'Longfire Line',
    style: 'max-range snipers and a fire cone, all backline',
    slugs: ['ranger', 'ranger', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'longshot', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'flame_jet', passiveSlug: 'undying' },
    meanWinPct: 55.4,
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000c',
    name: 'Frostward Cleanse',
    style: 'cleanses your control, then freezes you solid',
    slugs: ['cleric', 'cleric', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'purify', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'cold_snap', passiveSlug: 'opportunist' },
    meanWinPct: 55.2,
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
