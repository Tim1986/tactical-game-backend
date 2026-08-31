/**
 * placementSearch.ts — how much of an encounter's difficulty is the OPENING?
 *
 * WHY THIS EXISTS. Every campaign number this project has ever recorded was
 * measured from ONE opening, and nobody knew which one. On 2026-08-31 the sim
 * learned to place melee forward instead of using slot order, and e12 moved
 * from 94% to 45% — a 49-point swing from swapping two units between a front
 * tile and a back tile. No tuning lever in the campaign (HP scale, boons, deep
 * gifts) moves a cell that far. Opening placement was, and had always been, the
 * largest uncontrolled input to campaign difficulty.
 *
 * Swapping one arbitrary opening for a different arbitrary opening does not fix
 * that — it just re-rolls the unknown. The fix is to stop sampling one point and
 * measure the whole space, which for a four-unit party is 24 permutations and
 * therefore EXHAUSTIVE, not a search at all. There is no heuristic left to be
 * wrong about.
 *
 * WHAT IT REPORTS, and why each part earns its place:
 *
 *   best / worst / spread   The difficulty RANGE of the encounter. A cell with
 *                           a 50-point spread is not "72% hard", it is a
 *                           placement puzzle with a difficulty that depends on
 *                           solving it.
 *   median                  The honest single number when one is needed: what
 *                           a player who places without insight tends to get.
 *   rank of the default     Where the number we have been quoting actually sat.
 *                           This is the instrument's whole point — it converts
 *                           every historical measurement from "the difficulty"
 *                           into "the Nth-best of 24 openings", retroactively.
 *
 * ⚠ COMMON RANDOM NUMBERS. The per-cell seed deliberately does NOT include the
 * opening, so all 24 orders start from the same dice stream. They diverge the
 * moment the units stand somewhere different — but the shared start makes this
 * a matched-pairs comparison rather than 24 independent samples, which is what
 * lets a 200-game cell resolve a 5-point difference between two openings.
 *
 * ⚠ THIS MEASURES THE BRAIN'S OPENING, NOT A HUMAN'S. `best` is the ceiling a
 * perfectly-placing player reaches only if the brain then plays it as well as
 * they would. On FIGHT cells that is close to true; on OBJECTIVE cells the
 * brain is still the weak link and the whole range shifts down. Read the range,
 * not the endpoint.
 */
import { CAMPAIGNS } from '../campaigns/index.js';
import { simEncounterCell, REPRESENTATIVE_PARTIES } from './campaignSim.js';
import { frontlineOrder } from './simPlacement.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import type { BoardPosition } from '../types/matchState.js';
import { writeFileSync } from 'fs';

/** Every permutation of 0..n-1, in a fixed order so a re-run is reproducible. */
export function permutations(n: number): number[][] {
  if (n <= 0) return [[]];
  const out: number[][] = [];
  const cur: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const walk = (): void => {
    if (cur.length === n) { out.push([...cur]); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(i);
      walk();
      cur.pop(); used[i] = false;
    }
  };
  walk();
  return out;
}

/** A guard, not a limit we expect to hit: campaign parties are four units, so
 *  the sweep is 24 cells. 6! = 720 would still finish; 8! = 40320 would not. */
const MAX_EXHAUSTIVE = 720;

export interface OpeningResult {
  order: number[];
  winRate: number;
  marginHpPct: number;
  marginSurvivors: number;
}

export interface PlacementSearchResult {
  encounterId: string;
  difficulty: CampaignDifficulty;
  partyName: string;
  partySlugs: string[];
  openings: OpeningResult[];          // sorted best-first
  best: OpeningResult;
  worst: OpeningResult;
  median: number;
  spread: number;
  /** Where the openings the sims have actually been using land in the sweep.
   *  rank 1 = best of all openings. */
  frontline: { order: number[]; winRate: number; rank: number };
  slotOrder: { order: number[]; winRate: number; rank: number };
}

export function searchPlacements(
  campaignSlug: string,
  encounterId: string,
  difficulty: CampaignDifficulty,
  partyName: string,
  partySlugs: string[],
  games: number,
): PlacementSearchResult {
  const campaign = CAMPAIGNS[campaignSlug];
  if (!campaign) throw new Error(`Unknown campaign: ${campaignSlug}`);
  const enc = campaign.encounters[encounterId];
  if (!enc) throw new Error(`Unknown encounter: ${encounterId}`);

  const n = partySlugs.length;
  const orders = permutations(n);
  if (orders.length > MAX_EXHAUSTIVE) {
    throw new Error(`placementSearch: ${n}! = ${orders.length} openings exceeds the ${MAX_EXHAUSTIVE} cap`);
  }

  const openings: OpeningResult[] = orders.map((order) => {
    const r = simEncounterCell(campaignSlug, encounterId, difficulty, partyName, partySlugs, {
      games, placementOrder: order,
    });
    return {
      order,
      winRate: r.winRate,
      marginHpPct: r.marginHpPct ?? 0,
      marginSurvivors: r.marginSurvivors ?? 0,
    };
  });

  // Best-first. Win rate decides; margin breaks ties, because at the top of the
  // range win rate saturates and margin is the only signal left (the same
  // reason margin was added to the sims at all).
  const sorted = [...openings].sort((a, b) => b.winRate - a.winRate || b.marginHpPct - a.marginHpPct);
  const rankOf = (order: number[]): number =>
    sorted.findIndex((o) => o.order.join(',') === order.join(',')) + 1;
  const find = (order: number[]): OpeningResult =>
    openings.find((o) => o.order.join(',') === order.join(','))!;

  const enemyTiles = (enc as { enemyPlacement?: BoardPosition[]; rooms?: { enemyPlacement?: BoardPosition[] }[] })
    .enemyPlacement ?? enc.rooms?.[0]?.enemyPlacement ?? [];
  const fl = frontlineOrder(partySlugs, enc.playerPlacement, enemyTiles);
  const slot = partySlugs.map((_, i) => i);

  const rates = openings.map((o) => o.winRate).sort((a, b) => a - b);
  const median = rates.length % 2
    ? rates[(rates.length - 1) / 2]
    : (rates[rates.length / 2 - 1] + rates[rates.length / 2]) / 2;

  return {
    encounterId, difficulty, partyName, partySlugs,
    openings: sorted,
    best: sorted[0],
    worst: sorted[sorted.length - 1],
    median,
    spread: sorted[0].winRate - sorted[sorted.length - 1].winRate,
    frontline: { order: fl, winRate: find(fl).winRate, rank: rankOf(fl) },
    slotOrder: { order: slot, winRate: find(slot).winRate, rank: rankOf(slot) },
  };
}

/** Tiles, front-to-back, as a human-readable opening: "barbarian>rogue>sorcerer>warlock". */
export function describeOpening(
  partySlugs: string[],
  order: number[],
  playerPlacement: readonly BoardPosition[],
  enemyTiles: readonly BoardPosition[],
): string {
  const dist = (t: BoardPosition): number => enemyTiles.length
    ? Math.min(...enemyTiles.map((e) => Math.abs(t.x - e.x) + Math.abs(t.y - e.y)))
    : -t.x;
  return partySlugs
    .map((slug, i) => ({ slug, d: dist(playerPlacement[order[i]]) }))
    .sort((a, b) => a.d - b.d)
    .map((u) => u.slug)
    .join('>');
}

// ───────────────────────────── CLI ─────────────────────────────
const isMain = process.argv[1]?.endsWith('placementSearch.ts') || process.argv[1]?.endsWith('placementSearch.js');
if (isMain) {
  const args = process.argv.slice(2);
  const campaignSlug = args[0];
  if (!campaignSlug || !CAMPAIGNS[campaignSlug]) {
    console.error('Usage: npx tsx src/ai/placementSearch.ts <campaign> [--encounter eN] [--difficulty d] [--party a,b,c,d] [--games N] [--json path]');
    console.error(`Known campaigns: ${Object.keys(CAMPAIGNS).join(', ')}`);
    process.exit(1);
  }
  const campaign = CAMPAIGNS[campaignSlug];
  const getArg = (f: string): string | undefined => {
    const i = args.indexOf(f);
    return i !== -1 ? args[i + 1] : undefined;
  };
  const games = parseInt(getArg('--games') ?? '80', 10);
  const difficulty = (getArg('--difficulty') ?? 'medium') as CampaignDifficulty;
  const encounterIds = getArg('--encounter') ? [getArg('--encounter')!] : Object.keys(campaign.encounters);
  const customParty = getArg('--party');
  const [partyName, partySlugs] = customParty
    ? ['custom', customParty.split(',')]
    : ['melee', REPRESENTATIVE_PARTIES.melee] as [string, string[]];
  const jsonPath = getArg('--json');

  console.log(`\nPLACEMENT SEARCH — ${campaignSlug} / ${difficulty} / ${partyName} [${(partySlugs as string[]).join(', ')}]`);
  console.log(`${permutations((partySlugs as string[]).length).length} openings x ${games} games per encounter\n`);
  console.log('enc   best  worst  spread  median | frontline (rank)  slot-order (rank) | best opening (front->back)');
  console.log('─'.repeat(122));

  const all: PlacementSearchResult[] = [];
  for (const encId of encounterIds) {
    const enc = campaign.encounters[encId];
    const r = searchPlacements(campaignSlug, encId, difficulty, partyName as string, partySlugs as string[], games);
    all.push(r);
    const enemyTiles = (enc as { enemyPlacement?: BoardPosition[]; rooms?: { enemyPlacement?: BoardPosition[] }[] })
      .enemyPlacement ?? enc.rooms?.[0]?.enemyPlacement ?? [];
    const pct = (v: number): string => `${Math.round(v * 100)}%`;
    const flag = r.spread >= 0.25 ? ' ⚠' : '';
    console.log(
      `${encId.padEnd(5)} ${pct(r.best.winRate).padStart(4)}  ${pct(r.worst.winRate).padStart(5)}  ${pct(r.spread).padStart(6)}${flag.padEnd(2)} ${pct(r.median).padStart(6)} |` +
      ` ${pct(r.frontline.winRate).padStart(4)} (#${String(r.frontline.rank).padStart(2)})     ` +
      ` ${pct(r.slotOrder.winRate).padStart(4)} (#${String(r.slotOrder.rank).padStart(2)})    |` +
      ` ${describeOpening(partySlugs as string[], r.best.order, enc.playerPlacement, enemyTiles)}`,
    );
  }

  const spreads = all.map((r) => r.spread).sort((a, b) => b - a);
  console.log('─'.repeat(122));
  console.log(`\nWidest placement spreads: ${all.slice().sort((a, b) => b.spread - a.spread).slice(0, 3)
    .map((r) => `${r.encounterId} ${Math.round(r.spread * 100)}pts`).join(' · ')}`);
  console.log(`Mean spread across ${all.length} encounters: ${Math.round(spreads.reduce((t, v) => t + v, 0) / spreads.length * 100)} points`);
  console.log(`\n⚠ A cell whose spread exceeds its target band is not a difficulty — it is a placement puzzle.`);

  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ campaignSlug, difficulty, partyName, partySlugs, games, results: all }, null, 2));
    console.log(`\nWrote ${jsonPath}`);
  }
}
