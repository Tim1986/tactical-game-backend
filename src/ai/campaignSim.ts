/**
 * campaignSim.ts — Balance harness for campaign encounters.
 *
 * Builds each encounter EXACTLY as the mobile campaign runner does (shared
 * campaigns/runtime.ts), then runs brain-vs-brain games via runMatch.
 *
 * Usage:
 *   npx tsx src/ai/campaignSim.ts lantern                       # full battery: all encounters × difficulties × parties
 *   npx tsx src/ai/campaignSim.ts lantern --encounter e3        # one encounter
 *   npx tsx src/ai/campaignSim.ts lantern --difficulty nightmare --party fighter,barbarian,rogue,cleric
 *   ... --games 200 --level 4
 *
 * Variance note: live campaign matches start every fortune meter at 0 (the
 * displayed "current dodge" = base dodge from turn one), which makes the
 * engine fully deterministic. Sims would collapse to ONE distinct game per
 * cell, so the sim (and only the sim) seeds fortune phases from the run's
 * RNG — a stand-in for the timing variance real humans introduce.
 *
 * Win-rate targets (player side): easy 80–95, medium 65–80, hard 45–65,
 * nightmare 25–45.
 */
import { runMatch, makeRng } from './simHarness.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap } from './defaultData.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { buildEncounterState, CampaignUnitChoice } from '../campaigns/runtime.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { DEFAULT_UNITS } from './defaultData.js';
import { MatchState } from '../types/matchState.js';

const HUMAN = 'p1';
const ENEMY = 'p2';

export const REPRESENTATIVE_PARTIES: Record<string, string[]> = {
  melee:    ['fighter', 'barbarian', 'rogue', 'cleric'],
  ranged:   ['ranger', 'wizard', 'sorcerer', 'warlock'],
  balanced: ['fighter', 'ranger', 'cleric', 'wizard'],
};

const DIFFICULTIES: CampaignDifficulty[] = ['easy', 'medium', 'hard', 'nightmare'];

const TARGET_BANDS: Record<CampaignDifficulty, [number, number]> = {
  easy: [0.80, 0.95], medium: [0.65, 0.80], hard: [0.45, 0.65], nightmare: [0.25, 0.45],
};

/** No representative party may fall below this — a party pick must never be bricked. */
const PARTY_FLOOR: Record<CampaignDifficulty, number> = {
  easy: 0.60, medium: 0.40, hard: 0.15, nightmare: 0.0,
};

/**
 * Per-unit choices matching the live level-up schedule: L2 = main + first
 * companion get specials, L3 = those two get passives, L4 = remaining two get
 * specials, L5 = remaining two get passives. Defaults to each class's first
 * option; passiveOverrides (from --passives) replaces the passive picks for
 * balance comparisons.
 */
function choicesForLevel(partySlugs: string[], level: number, passiveOverrides?: (string | undefined)[]): CampaignUnitChoice[] {
  return partySlugs.map((slug, i) => {
    const def = DEFAULT_UNITS[slug];
    const early = i <= 1; // main + first companion level up first
    const specialSlug = level >= (early ? 2 : 4) ? def?.specialOptions[0] : undefined;
    const passiveSlug = level >= (early ? 3 : 5)
      ? (passiveOverrides?.[i] ?? def?.passiveOptions[0]?.slug)
      : undefined;
    return { specialSlug, passiveSlug };
  });
}

export interface CampaignCellResult {
  encounter: string;
  difficulty: CampaignDifficulty;
  party: string;
  level: number;
  games: number;
  playerWins: number;
  winRate: number;
  draws: number;
  avgTurns: number;
  inBand: boolean;
  validationErrors: number;
}

export function simEncounterCell(
  campaignSlug: string,
  encounterId: string,
  difficulty: CampaignDifficulty,
  partyName: string,
  partySlugs: string[],
  options: { games?: number; level?: number; seed?: number; passives?: (string | undefined)[] } = {},
): CampaignCellResult {
  const campaign = CAMPAIGNS[campaignSlug];
  if (!campaign) throw new Error(`Unknown campaign: ${campaignSlug}`);
  const enc = campaign.encounters[encounterId];
  if (!enc) throw new Error(`Unknown encounter: ${encounterId}`);
  const games = options.games ?? 100;
  const level = options.level ?? enc.level;
  const rng = makeRng(options.seed ?? 1);
  const choices = choicesForLevel(partySlugs, level, options.passives);
  const abilityMap = buildAbilityMap();
  const brain1 = new OptimalBrain();
  const brain2 = new OptimalBrain();

  let playerWins = 0;
  let draws = 0;
  let totalTurns = 0;
  let validationErrors = 0;

  for (let i = 0; i < games; i++) {
    const stateFactory = (): MatchState => {
      const { state } = buildEncounterState(
        campaign, encounterId, partySlugs, choices, level, difficulty, HUMAN, ENEMY,
      );
      // Sim-only fortune phase variance (see file header).
      for (const u of state.units) u.fortuneMeter = rng();
      return state;
    };
    const r = runMatch(partySlugs, enc.enemies, abilityMap, brain1, brain2, {
      p1Id: HUMAN, p2Id: ENEMY,
      forceFirstPlayerId: HUMAN, // campaign matches are always human-first
      stateFactory,
    });
    if (r.winnerSide === 'p1') playerWins++;
    else if (r.winnerSide === 'draw') draws++;
    totalTurns += r.turns;
    validationErrors += r.validationErrors;
  }

  const winRate = playerWins / games;
  const [lo, hi] = TARGET_BANDS[difficulty];
  return {
    encounter: encounterId, difficulty, party: partyName, level, games,
    playerWins, winRate, draws, avgTurns: totalTurns / games,
    inBand: winRate >= lo && winRate <= hi,
    validationErrors,
  };
}

// ─── CLI ──────────────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith('campaignSim.ts') || process.argv[1]?.endsWith('campaignSim.js');
if (isMain) {
  const args = process.argv.slice(2);
  const campaignSlug = args[0];
  if (!campaignSlug || !CAMPAIGNS[campaignSlug]) {
    console.error(`Usage: npx tsx src/ai/campaignSim.ts <campaign-slug> [--encounter eN] [--difficulty d] [--party slugs] [--level N] [--games N]`);
    console.error(`Known campaigns: ${Object.keys(CAMPAIGNS).join(', ')}`);
    process.exit(1);
  }
  const campaign = CAMPAIGNS[campaignSlug];
  const getArg = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const games = parseInt(getArg('--games') ?? '100', 10);
  const levelArg = getArg('--level');
  const encounterIds = getArg('--encounter') ? [getArg('--encounter')!] : Object.keys(campaign.encounters);
  const difficulties = getArg('--difficulty') ? [getArg('--difficulty') as CampaignDifficulty] : DIFFICULTIES;
  const customParty = getArg('--party');
  const parties: Record<string, string[]> = customParty
    ? { custom: customParty.split(',') }
    : REPRESENTATIVE_PARTIES;

  const pct = (n: number) => (n * 100).toFixed(0).padStart(3) + '%';
  console.log(`Campaign: ${campaign.title} — ${games} games/cell\n`);
  console.log('enc  lvl  difficulty  party     winrate  band        avg-turns');
  const outOfBand: string[] = [];
  for (const encId of encounterIds) {
    for (const diff of difficulties) {
      const cells: CampaignCellResult[] = [];
      for (const [pname, pslugs] of Object.entries(parties)) {
        const r = simEncounterCell(campaignSlug, encId, diff, pname, pslugs, {
          games, level: levelArg ? parseInt(levelArg, 10) : undefined,
          passives: getArg('--passives')?.split(',').map((s) => s === '' ? undefined : s),
        });
        cells.push(r);
        const [lo, hi] = TARGET_BANDS[diff];
        const flag = r.inBand ? '  ' : ' ⚠';
        console.log(
          `${encId.padEnd(4)} L${r.level}   ${diff.padEnd(10)} ${pname.padEnd(9)} ${pct(r.winRate)}    [${pct(lo)},${pct(hi)}]${flag}  ${r.avgTurns.toFixed(0)}`
          + (r.validationErrors > 0 ? `  ⚠ ${r.validationErrors} validation errors` : ''),
        );
      }
      // Flavored encounters have inherent ±30pt party-matchup spread, so the
      // acceptance test is: MEAN win rate across representative parties in
      // band, AND no single party below the floor (a party choice must never
      // be bricked). See CAMPAIGNS.md → Balancing.
      const mean = cells.reduce((s, c) => s + c.winRate, 0) / cells.length;
      const [lo, hi] = TARGET_BANDS[diff];
      const floor = PARTY_FLOOR[diff];
      const floorBreak = cells.filter((c) => c.winRate < floor);
      const meanOk = mean >= lo && mean <= hi;
      console.log(`     mean ${pct(mean)}  [${pct(lo)},${pct(hi)}]${meanOk ? ' ✓' : ' ⚠'}${floorBreak.length ? `  ⚠ below floor(${pct(floor)}): ${floorBreak.map((c) => c.party).join(',')}` : ''}`);
      if (cells.length >= 3 && (!meanOk || floorBreak.length > 0)) {
        outOfBand.push(`${encId}/${diff}: mean ${pct(mean)}${meanOk ? '' : ' out of band'}${floorBreak.length ? `, below floor: ${floorBreak.map((c) => c.party).join(',')}` : ''}`);
      }
    }
    console.log('');
  }
  if (outOfBand.length > 0) {
    console.log('⚠ CELLS NEEDING TUNING (band must hold for ≥2 of 3 parties):');
    for (const line of outOfBand) console.log('  ' + line);
    process.exitCode = 1;
  } else {
    console.log('✓ All encounter/difficulty cells within band for ≥2 of 3 parties.');
  }
}
