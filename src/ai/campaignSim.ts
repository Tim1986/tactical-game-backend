/**
 * campaignSim.ts — Balance harness for campaign encounters.
 *
 * Builds each encounter EXACTLY as the mobile campaign runner does (shared
 * campaigns/runtime.ts), then runs brain-vs-brain games via runMatch.
 *
 * Usage (see CAMPAIGN_BALANCING.md — the Opus 5 operator manual):
 *   npx tsx src/ai/campaignSim.ts lantern --smoke               # ALWAYS FIRST: 2 games/cell sanity pass
 *   npx tsx src/ai/campaignSim.ts lantern                       # full battery (requires a fresh smoke pass)
 *   npx tsx src/ai/campaignSim.ts lantern --encounter e3        # one encounter
 *   npx tsx src/ai/campaignSim.ts lantern --difficulty nightmare --party fighter,barbarian,rogue,cleric
 *   ... --games 200 --level 4 --json results.json
 *
 * Win-rate targets (player side): easy 80–95, medium 65–80, hard 45–65,
 * nightmare 25–45. Full batteries refuse to run until a smoke pass has seen
 * the CURRENT campaign content (pitfall-as-code: never burn 2h on a run that
 * measures nothing); they also self-caffeinate on macOS (App Nap pitfall).
 */
import { runMatch, makeRng } from './simHarness.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap } from './defaultData.js';
import { applyCooldownOverrides, applyCampaignAbilities } from '../game/abilityOverrides.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { buildEncounterState, CampaignUnitChoice, DEEP_GIFTS, DeepGiftSlug } from '../campaigns/runtime.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { DEFAULT_UNITS } from './defaultData.js';
import { MatchState, ResolvedWinCondition, ResolvedLossCondition } from '../types/matchState.js';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const HUMAN = 'p1';
const ENEMY = 'p2';

export const REPRESENTATIVE_PARTIES: Record<string, string[]> = {
  melee:    ['fighter', 'barbarian', 'rogue', 'cleric'],
  ranged:   ['ranger', 'wizard', 'sorcerer', 'warlock'],
  balanced: ['fighter', 'ranger', 'cleric', 'wizard'],
};

const DIFFICULTIES: CampaignDifficulty[] = ['easy', 'medium', 'hard', 'nightmare'];

const TARGET_BANDS: Record<CampaignDifficulty, [number, number]> = {
  // Nightmare's mean band is wide ON PURPOSE: with real comp differentiation
  // the mean can legitimately sit low while the right comp wins plenty — the
  // NIGHTMARE_BEST_MIN solvability check is the binding constraint there.
  easy: [0.80, 0.95], medium: [0.65, 0.80], hard: [0.45, 0.65], nightmare: [0.15, 0.45],
};

/**
 * DIFFICULTY PHILOSOPHY (owner, 2026-08-17 — the Gloomhaven bar):
 * easy is beatable with basic strategy by ANY reasonable comp; from there,
 * comp tolerance NARROWS with difficulty until nightmare is only beatable
 * with the right strategies. A comp having a rough encounter is IDENTITY
 * (the campaign's comp-building metagame); a comp hitting a retry WALL is a
 * bug, because the party is locked for the whole campaign and cannot
 * re-comp around it. Floors encode "no walls", NOT "comp-neutral".
 */
const PARTY_FLOOR: Record<CampaignDifficulty, number> = {
  easy: 0.60, medium: 0.35, hard: 0.10, nightmare: 0.0,
};

/** Nightmare is judged on SOLVABILITY, not comp-neutral means: at least one
 *  representative party must genuinely crack the encounter. */
const NIGHTMARE_BEST_MIN = 0.40;

/**
 * [E0.4] Which Deep Gift each chassis takes by default in the sim.
 *
 * This is the sim's model of a COMPETENT player's pick — it decides what the
 * back half of a campaign is balanced against, so a bad policy means balancing
 * against a strawman. Derived from giftHarness.ts measurements (per-party mean
 * win-rate delta per gift); re-derive by re-running the harness whenever
 * DEEP_GIFTS values change. Classes absent here fall back to 'damage'.
 */
export const DEFAULT_GIFT_BY_CLASS: Record<string, DeepGiftSlug> = {
  // MEASURED 2026-08-18 (giftHarness, 42 cell/party pairs x 200 games at L8),
  // at the TUNED values damage +2 / movement +1 / armor +3.
  //
  // At those values the melee party prefers armor (+26.8 vs damage +18.9) and
  // the ranged party prefers damage (+25.3 vs armor +21.5), so the split below
  // is melee-chassis → armor, ranged/caster-chassis → damage.
  //
  // ⚠ HONEST LIMIT: the harness applied each gift UNIFORMLY across the whole
  // party, so this is a party-level result projected onto classes — per-class
  // preference was never isolated, and mixed-gift parties were never simmed.
  // The balanced party (fighter/ranger/cleric/wizard) preferring damage
  // slightly contradicts the melee half of this split. Re-measure per-class
  // against campaign 2's own encounters in E2 before trusting it further.
  fighter: 'armor', barbarian: 'armor', rogue: 'armor', cleric: 'armor',
  ranger: 'damage', wizard: 'damage', sorcerer: 'damage', warlock: 'damage',
};

/**
 * Per-unit choices matching the live level-up schedule (specials front-loaded):
 * L2 = main + first companion get specials; L3 = remaining two get specials
 * (all four specialed by fight 2); L4 = main + first companion get passives;
 * L5 = remaining two get passives. Defaults to each class's first option;
 * passiveOverrides (from --passives) replaces the passive picks for comparisons.
 */
export function choicesForLevel(
  partySlugs: string[],
  level: number,
  passiveOverrides?: (string | undefined)[],
  /** [E0.4] Per-unit gift override. A DeepGiftSlug forces that gift; 'none'
   *  forces NO gift even at L7+ (the harness baseline); undefined uses the
   *  measured default policy below. */
  giftOverrides?: (DeepGiftSlug | 'none' | undefined)[],
): CampaignUnitChoice[] {
  return partySlugs.map((slug, i) => {
    const def = DEFAULT_UNITS[slug];
    const early = i <= 1; // main + first companion level up first
    const specialSlug = level >= (early ? 2 : 3) ? def?.specialOptions[0] : undefined;
    const passiveSlug = level >= (early ? 4 : 5)
      ? (passiveOverrides?.[i] ?? def?.passiveOptions[0]?.slug)
      : undefined;
    // Deep Gifts (E0, L7/L8). The default is the MEASURED policy in
    // DEFAULT_GIFT_BY_CLASS (see giftHarness.ts); an override forces a
    // specific gift, or 'none' for the harness baseline.
    const eligible = level >= (early ? 7 : 8);
    const override = giftOverrides?.[i];
    const deepGiftSlug: DeepGiftSlug | undefined = !eligible ? undefined
      : override === 'none' ? undefined
      : override ?? DEFAULT_GIFT_BY_CLASS[slug] ?? 'damage';
    return { specialSlug, passiveSlug, deepGiftSlug };
  });
}

/**
 * [A8] Objective kinds the OptimalBrain demonstrably plays (positionScore
 * pulls / scoreAbility terms / doctrine planning). BALANCE_GRID_METHODOLOGY
 * rule as code: never sim a mechanic the AI can't play — a new objective kind
 * must be taught to the brain AND added here in the same commit, or every
 * cell using it refuses to run.
 */
const BRAIN_MODELED_WIN: Set<ResolvedWinCondition['kind']> = new Set([
  'all_enemies_dead', 'units_dead', 'round_reached', 'units_at_tiles', 'ally_at_tiles',
]);
const BRAIN_MODELED_LOSS: Set<ResolvedLossCondition['kind']> = new Set([
  'ally_dead', 'round_reached', 'main_dead',
]);

function assertBrainModels(state: MatchState, encounterId: string): void {
  const obj = state.objective;
  if (!obj) return;
  for (const w of obj.win) {
    if (!BRAIN_MODELED_WIN.has(w.kind)) {
      throw new Error(`Encounter ${encounterId}: objective win kind "${w.kind}" is not modeled by the brain — teach aiBrain first, then add it to BRAIN_MODELED_WIN`);
    }
  }
  for (const l of obj.loss) {
    if (!BRAIN_MODELED_LOSS.has(l.kind)) {
      throw new Error(`Encounter ${encounterId}: objective loss kind "${l.kind}" is not modeled by the brain — teach aiBrain first, then add it to BRAIN_MODELED_LOSS`);
    }
  }
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
  /** [A8] How matches ended: "W:<reason>" / "L:<reason>" / "DRAW" → count.
   *  The mechanism check — an escort cell whose losses aren't mostly
   *  "Your charge has fallen" isn't testing the escort. */
  reasons: Record<string, number>;
  /** [A8] Draw share > 10% flags a stall (kiting/mutual-standoff signature). */
  drawFlag: boolean;
}

export function simEncounterCell(
  campaignSlug: string,
  encounterId: string,
  difficulty: CampaignDifficulty,
  partyName: string,
  partySlugs: string[],
  options: {
    games?: number; level?: number; seed?: number;
    passives?: (string | undefined)[];
    /** [E0.4] Per-unit Deep Gift override; 'none' = giftless baseline. */
    gifts?: (DeepGiftSlug | 'none' | undefined)[];
  } = {},
): CampaignCellResult {
  const campaign = CAMPAIGNS[campaignSlug];
  if (!campaign) throw new Error(`Unknown campaign: ${campaignSlug}`);
  const enc = campaign.encounters[encounterId];
  if (!enc) throw new Error(`Unknown encounter: ${encounterId}`);
  const games = options.games ?? 100;
  const level = options.level ?? enc.level;
  const rng = makeRng(options.seed ?? 1);
  const choices = choicesForLevel(partySlugs, level, options.passives, options.gifts);
  // A6: the sim must fight with the SAME ability map as the real match —
  // campaign-scoped abilities merged in. (The old L6 cooldown override is gone —
  // E0's L10 second charge rides UnitInstance.extraCharges inside the built
  // state, so the sim exercises it with no ability-map surgery.)
  const probe = buildEncounterState(campaign, encounterId, partySlugs, choices, level, difficulty, HUMAN, ENEMY);
  const abilityMap = applyCooldownOverrides(
    applyCampaignAbilities(buildAbilityMap(), probe.campaignAbilities),
    probe.cooldownOverrides,
  );
  const brain1 = new OptimalBrain();
  const brain2 = new OptimalBrain();

  assertBrainModels(probe.state, encounterId);

  let playerWins = 0;
  let draws = 0;
  let totalTurns = 0;
  let validationErrors = 0;
  const reasons: Record<string, number> = {};

  for (let i = 0; i < games; i++) {
    const stateFactory = (): MatchState => {
      const { state } = buildEncounterState(
        campaign, encounterId, partySlugs, choices, level, difficulty, HUMAN, ENEMY,
      );
      return state;
    };
    const r = runMatch(partySlugs, enc.enemies ?? enc.rooms?.[0]?.enemies ?? [], abilityMap, brain1, brain2, {
      p1Id: HUMAN, p2Id: ENEMY,
      forceFirstPlayerId: HUMAN, // campaign matches are always human-first
      stateFactory,
    });
    if (r.winnerSide === 'p1') playerWins++;
    else if (r.winnerSide === 'draw') draws++;
    totalTurns += r.turns;
    validationErrors += r.validationErrors;
    const key = r.winnerSide === 'draw' ? 'DRAW'
      : `${r.winnerSide === 'p1' ? 'W' : 'L'}:${r.reason ?? 'kill-all'}`;
    reasons[key] = (reasons[key] ?? 0) + 1;
  }

  const winRate = playerWins / games;
  const [lo, hi] = TARGET_BANDS[difficulty];
  return {
    encounter: encounterId, difficulty, party: partyName, level, games,
    playerWins, winRate, draws, avgTurns: totalTurns / games,
    inBand: winRate >= lo && winRate <= hi,
    validationErrors,
    reasons,
    drawFlag: draws / games > 0.1,
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

  const smoke = args.includes('--smoke');
  const jsonPath = getArg('--json');
  const effectiveGames = smoke ? 2 : games;

  // ── [A8] Smoke-first enforcement. A smoke pass records a hash of the
  // campaign content it saw; a full battery refuses to start unless that hash
  // matches the content it is about to run. Edited content → smoke again.
  const contentHash = createHash('sha1').update(JSON.stringify(campaign)).digest('hex').slice(0, 12);
  const markerPath = path.join('.sim-smoke', `${campaignSlug}.json`);
  if (!smoke) {
    let marker: { hash?: string } = {};
    try { marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')); } catch { /* no marker yet */ }
    if (marker.hash !== contentHash) {
      console.error(`✗ REFUSING full run: no smoke pass on the current "${campaignSlug}" content.`);
      console.error(`  Run first:  npx tsx src/ai/campaignSim.ts ${campaignSlug} --smoke`);
      console.error(`  (2 games/cell, ~a minute — catches authoring/validation errors before a long run.)`);
      process.exit(2);
    }
    // ── [A8] Self-caffeinate: long runs on an idling Mac get App-Napped to
    // ~26% duty cycle. -w ties the assertion to this process's lifetime.
    if (process.platform === 'darwin') {
      try { spawn('caffeinate', ['-i', '-w', String(process.pid)], { detached: true, stdio: 'ignore' }).unref(); }
      catch { /* caffeinate unavailable — proceed uncaffeinated */ }
    }
  }

  const pct = (n: number) => (n * 100).toFixed(0).padStart(3) + '%';
  console.log(`Campaign: ${campaign.title} — ${effectiveGames} games/cell${smoke ? ' (SMOKE)' : ''}\n`);
  console.log('enc  lvl  difficulty  party     winrate  band        avg-turns');
  const outOfBand: string[] = [];
  const allCells: CampaignCellResult[] = [];
  for (const encId of encounterIds) {
    for (const diff of difficulties) {
      const cells: CampaignCellResult[] = [];
      for (const [pname, pslugs] of Object.entries(parties)) {
        const r = simEncounterCell(campaignSlug, encId, diff, pname, pslugs, {
          games: effectiveGames, level: levelArg ? parseInt(levelArg, 10) : undefined,
          passives: getArg('--passives')?.split(',').map((s) => s === '' ? undefined : s),
        });
        cells.push(r);
        allCells.push(r);
        const [lo, hi] = TARGET_BANDS[diff];
        const flag = r.inBand ? '  ' : ' ⚠';
        console.log(
          `${encId.padEnd(4)} L${r.level}   ${diff.padEnd(10)} ${pname.padEnd(9)} ${pct(r.winRate)}    [${pct(lo)},${pct(hi)}]${flag}  ${r.avgTurns.toFixed(0)}`
          + (r.validationErrors > 0 ? `  ⚠ ${r.validationErrors} validation errors` : '')
          + (r.drawFlag ? `  ⚠ draws ${pct(r.draws / r.games)} (stall)` : ''),
        );
        // Mechanism line: how the matches actually ended (top 3 reasons).
        const top = Object.entries(r.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)
          .map(([k, n]) => `${k}×${n}`).join('  ');
        if (top && (smoke || !r.inBand || r.drawFlag)) console.log(`       └ ${top}`);
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
      const best = Math.max(...cells.map((c) => c.winRate));
      // Nightmare solvability: identity spread is fine, but SOME comp must
      // genuinely crack the fight (owner: nightmare may demand the right
      // strategy — it may not be unbeatable for everyone).
      const solvableOk = diff !== 'nightmare' || best >= NIGHTMARE_BEST_MIN;
      console.log(`     mean ${pct(mean)}  [${pct(lo)},${pct(hi)}]${meanOk ? ' ✓' : ' ⚠'}${floorBreak.length ? `  ⚠ WALL below floor(${pct(floor)}): ${floorBreak.map((c) => c.party).join(',')}` : ''}${solvableOk ? '' : `  ⚠ UNSOLVABLE: best party ${pct(best)} < ${pct(NIGHTMARE_BEST_MIN)}`}`);
      if (cells.length >= 3 && (!meanOk || floorBreak.length > 0 || !solvableOk)) {
        outOfBand.push(`${encId}/${diff}: mean ${pct(mean)}${meanOk ? '' : ' out of band'}${floorBreak.length ? `, WALL for: ${floorBreak.map((c) => c.party).join(',')}` : ''}${solvableOk ? '' : `, unsolvable (best ${pct(best)})`}`);
      }
    }
    console.log('');
  }
  const totalValidationErrors = allCells.reduce((n, c) => n + c.validationErrors, 0);
  const pass = outOfBand.length === 0 && totalValidationErrors === 0;

  if (smoke) {
    // A smoke pass is about ERRORS, not bands (2 games/cell is statistical noise).
    if (totalValidationErrors > 0) {
      console.log(`SMOKE: FAIL — ${totalValidationErrors} validation errors (authoring bug; fix before any full run).`);
      process.exitCode = 1;
    } else {
      fs.mkdirSync(path.dirname(markerPath), { recursive: true });
      fs.writeFileSync(markerPath, JSON.stringify({ hash: contentHash, when: new Date().toISOString() }));
      console.log('SMOKE: PASS — content plays clean. Full battery unlocked for this content.');
    }
  } else if (outOfBand.length > 0 || totalValidationErrors > 0) {
    console.log('RESULT: FAIL');
    if (totalValidationErrors > 0) console.log(`  ⚠ ${totalValidationErrors} validation errors — authoring bug, fix before tuning.`);
    if (outOfBand.length > 0) {
      console.log('  Cells needing tuning (mean in band AND floors held):');
      for (const line of outOfBand) console.log('    ' + line);
    }
    console.log('  → Pick the lever by WHICH number is wrong: mean → hpScaleOverride (campaignTune.ts); spread/floor → placement (spreadSweep.ts). See CAMPAIGN_BALANCING.md.');
    process.exitCode = 1;
  } else {
    console.log('RESULT: PASS — every encounter/difficulty mean in band, all party floors held, zero validation errors.');
  }

  if (jsonPath) {
    fs.writeFileSync(jsonPath, JSON.stringify({
      campaign: campaignSlug, contentHash, smoke, gamesPerCell: effectiveGames,
      when: new Date().toISOString(), pass: smoke ? totalValidationErrors === 0 : pass,
      outOfBand, cells: allCells,
    }, null, 2));
    console.log(`JSON written: ${jsonPath}`);
  }
}
