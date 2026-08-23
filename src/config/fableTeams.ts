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
 * Reselected 2026-08-23 ("Slate A") for the contain6 balance, from
 * `grids/contain6/merged.csv` — the Stage E grid on the shipped ring rebalance
 * (Whirlwind/Ground Slam as 8-tile rings, Shield Bash 17, Concussive 7,
 * Fighter Thorns 5, Barbarian AC 9, Wizard HP 32).
 *
 * Why a full replacement (owner call): the 2026-08-13 panel had drifted badly
 * on the new numbers, spanning rank #6 to #1737 of 2268 builds — Siphon Snare
 * won 31% and Exposed Frost 38%, so a third of the panel lost to most of the
 * field. The owner's brief: "all strong teams, while representing as much class
 * and archetype diversity as possible while still having strong teams."
 *
 * The selection is a constrained optimum, not a hand-pick:
 *
 *   - EVERY class appears exactly 3 times (24 roster slots / 8 classes). This
 *     is a 3-regular graph on the 8 classes, which is why all 12 pairs are
 *     distinct and no class is over- or under-represented.
 *   - EVERY class runs all THREE of its specials across its three teams, so no
 *     ability in the game goes unrepresented by the opposition. This is the
 *     binding constraint — it costs ~3 points of floor versus a pure
 *     strength pick, and it is why e.g. the Cleric appears with purify, ward
 *     AND heal rather than three copies of the best one.
 *   - Every roster runs the best passive pairing for its specials, and 8 of
 *     the 9 passives appear.
 *   - Floor 55.4%, average 59.5% mean win rate (vs the OLD panel). The old
 *     panel's floor was 31%.
 *
 * ⚠ NO WIN RATES ARE STORED HERE (owner, 2026-08-23: percentages must not be
 * displayed to players). The `meanWinPct` field is gone rather than merely
 * unused — a stored number invites a UI to render it, and it was wrong by up
 * to 30 points for months before anyone noticed, precisely because nothing
 * read it. Provenance lives in this comment, where it cannot rot into a lie on
 * a screen. The measured figures above are scored against the PREVIOUS panel;
 * they do NOT describe performance against THIS one, and the next grid must
 * re-baseline against these teams.
 *
 * Every grid cell is a 2+2 composition (two of each class), so each roster is
 * `[A, A, B, B]` with one loadout shared by the pair — that is exactly the
 * shape that was simulated.
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
}

/**
 * The rosters, strongest first. IDs are fixed and must never change — they are
 * foreign-keyed by `matches.player_two_team` for every PvE match ever played
 * against them.
 */
export const FABLE_TEAMS: FableTeam[] = [
  {
    id: 'fab1e000-0000-4000-a000-000000000001',
    name: 'Dread Warcry',
    style: 'a leaping bruiser behind fear that breaks your formation',
    slugs: ['barbarian', 'barbarian', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'roar', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'fear', passiveSlug: 'opportunist' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000002',
    name: 'Siphoned Storm',
    style: 'a life-draining warlock under a howling blizzard',
    slugs: ['warlock', 'warlock', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'drain', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'blizzard', passiveSlug: 'stalwart' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000003',
    name: 'Shock and Flame',
    style: 'a shockwave opens the line, a jet of fire pours through it',
    slugs: ['barbarian', 'barbarian', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'shockwave', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'flame_jet', passiveSlug: 'stalwart' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000004',
    name: 'Cleansing Frost',
    style: 'nothing sticks to them, and the cold never lets up',
    slugs: ['cleric', 'cleric', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'purify', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'cold_snap', passiveSlug: 'channeler' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000005',
    name: 'Second Winter',
    style: 'a fighter who will not go down, in front of a mage who freezes you',
    slugs: ['fighter', 'fighter', 'wizard', 'wizard'],
    loadoutA: { specialSlug: 'second_wind', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'freeze', passiveSlug: 'channeler' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000006',
    name: 'Pinning Wall',
    style: 'an undying front line roots you for the ranger',
    slugs: ['fighter', 'fighter', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'concussive', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'pinning', passiveSlug: 'opportunist' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000007',
    name: 'Exposed Volley',
    style: 'shoot from far off, then execute what you exposed',
    slugs: ['ranger', 'ranger', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'longshot', passiveSlug: 'opportunist' },
    loadoutB: { specialSlug: 'expose', passiveSlug: 'swift' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000008',
    name: 'Bloodrush',
    style: 'the more they bleed, the harder they execute you',
    slugs: ['barbarian', 'barbarian', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'whirlwind', passiveSlug: 'thorns' },
    loadoutB: { specialSlug: 'assassinate', passiveSlug: 'swift' },
  },
  {
    id: 'fab1e000-0000-4000-a000-000000000009',
    name: 'Warded Volley',
    style: 'shielded clerics behind a ranger who never stops shooting',
    slugs: ['cleric', 'cleric', 'ranger', 'ranger'],
    loadoutA: { specialSlug: 'ward', passiveSlug: 'warded' },
    loadoutB: { specialSlug: 'piercing', passiveSlug: 'thorns' },
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000a',
    name: 'Bash and Blade',
    style: 'a shield in your face while the knives find your back',
    slugs: ['fighter', 'fighter', 'rogue', 'rogue'],
    loadoutA: { specialSlug: 'shield_bash', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'dagger_toss', passiveSlug: 'swift' },
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000b',
    name: 'Snarefire',
    style: 'dragged into a ring of fire and bled dry',
    slugs: ['sorcerer', 'sorcerer', 'warlock', 'warlock'],
    loadoutA: { specialSlug: 'ffh', passiveSlug: 'undying' },
    loadoutB: { specialSlug: 'grasp', passiveSlug: 'siphon' },
  },
  {
    id: 'fab1e000-0000-4000-a000-00000000000c',
    name: 'Sanctum Pyre',
    style: 'healers hold the line while the sorcerer sets the field alight',
    slugs: ['cleric', 'cleric', 'sorcerer', 'sorcerer'],
    loadoutA: { specialSlug: 'heal', passiveSlug: 'stalwart' },
    loadoutB: { specialSlug: 'ignite', passiveSlug: 'stalwart' },
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
