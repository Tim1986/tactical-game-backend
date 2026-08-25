/**
 * classValueSweep.ts — [E0.5c] De-confounded class value: the SAME cell swept
 * across enemy-HP multipliers, inside a PILOTED window.
 *
 * ── WHY THIS EXISTS (run 2's flaw) ───────────────────────────────────────
 * Runs 1–2 regressed class delta against each cell's AUTHORED hpScale. But
 * scale is not randomly assigned: the lever doctrine has us crank it high
 * exactly where it is inert (survive/hold/duel) and leave it low where it
 * bites (kill-alls). So high-scale cells are systematically different KINDS
 * of fight, and those slopes conflate "handles HP inflation" with "handles
 * objective encounters". Sweeping ONE cell holds encounter, objective,
 * terrain and cast constant, so the slope means what it claims.
 *
 * ── WHY THE FIRST ATTEMPT AT THIS FAILED (the floor trap) ─────────────────
 * Run 3a swept a FIXED k ∈ {0.8,1.2,1.6,2.0} with no pilot. Three of four
 * cells were already at 0% by k=1.2 and everything was 0% by 1.6, so every
 * "slope" was just the line from ~45% to a floor — all seven mechanical
 * profiles came back within noise of each other (−35..−43) and the run had
 * no discriminating power whatsoever. It would have printed those numbers
 * whether the hypothesis was true, false, or reversed.
 *
 * This is the mirror of the CEILING trap giftHarness.ts documents ("run a
 * gifted party against L3 content and it wins ~100%, where NO gift can show
 * value"). Same lesson, opposite wall: MEASURE ONLY WHERE THE OUTCOME CAN
 * STILL MOVE. Note also that `hpScale` REPLACES a cell's authored scale
 * rather than multiplying it, so k=2.0 on a cell authored at 0.88 is 2.3×,
 * not "a bit harder".
 *
 * ── THE FIX ──────────────────────────────────────────────────────────────
 * Per (cell, template), pilot a coarse k-grid with a neutral rotator to find
 * the window where the baseline runs ~80% down to ~30%, then take the real
 * measurement at four points evenly spaced inside it. Every cell is measured
 * in its OWN competitive band, which is the only place a class difference
 * can express itself. Windows are printed so the reader can see each cell's
 * band and how it relates to the shipped range.
 *
 * ── HYPOTHESIS UNDER TEST: the DODGE TAX ─────────────────────────────────
 * What anti-scales is BLOCKABLE, REPEATED damage: fatter enemies need more
 * hits, every extra hit is another dodge roll, so the miss tax compounds
 * with k. Unblockable bursts are exempt by construction; control (worth
 * enemy turns) and sustain (worth incoming damage) never cared about k.
 * Variants are tagged with a mechanical profile so the grouping is tested
 * directly rather than read into the numbers afterwards.
 *
 * Usage: npx tsx src/ai/classValueSweep.ts [--games 200] [--pilot-games 60]
 *                                          [--json out.json]
 */
import { simEncounterCell, choicesForLevel } from './campaignSim.js';
import { CampaignDifficulty } from '../campaigns/types.js';

const arg = (flag: string, dflt: number) => {
  const i = process.argv.indexOf(flag);
  return i > 0 ? Number(process.argv[i + 1]) : dflt;
};
const GAMES = arg('--games', 200);
const PILOT_GAMES = arg('--pilot-games', 60);

type Profile = 'blockable-repeated' | 'unblockable-burst' | 'aoe' | 'dot' | 'control' | 'sustain' | 'displacement';
type Variant = { id: string; cls: string; special?: string; profile: Profile };

/** Profiles describe where the variant's DAMAGE (or value) comes from, which
 *  is what the dodge-tax hypothesis partitions on. Defaults are named because
 *  run 2 proved they hide things: sorcerer defaults to the ffh RING, warlock
 *  to FEAR, ranger to PIERCING, and fighter to SECOND_WIND — i.e. fighter has
 *  no damage special at all and is the purest blockable-basics case we have. */
const VARIANTS: Variant[] = [
  { id: 'fighter',           cls: 'fighter',   profile: 'blockable-repeated' },
  { id: 'barbarian',         cls: 'barbarian', profile: 'aoe' },
  { id: 'rogue',             cls: 'rogue',     profile: 'blockable-repeated' },
  { id: 'cleric',            cls: 'cleric',    profile: 'sustain' },
  { id: 'ranger',            cls: 'ranger',    profile: 'blockable-repeated' },
  { id: 'wizard',            cls: 'wizard',    profile: 'control' },
  { id: 'sorcerer',          cls: 'sorcerer',  profile: 'aoe' },
  { id: 'warlock',           cls: 'warlock',   profile: 'displacement' },
  { id: 'sorc:flame_jet',    cls: 'sorcerer',  special: 'flame_jet',   profile: 'unblockable-burst' },
  { id: 'sorc:ignite',       cls: 'sorcerer',  special: 'ignite',      profile: 'dot' },
  { id: 'wiz:cold_snap',     cls: 'wizard',    special: 'cold_snap',   profile: 'control' },
  { id: 'rogue:dagger_toss', cls: 'rogue',     special: 'dagger_toss', profile: 'unblockable-burst' },
  { id: 'war:grasp',         cls: 'warlock',   special: 'grasp',       profile: 'displacement' },
  { id: 'war:drain',         cls: 'warlock',   special: 'drain',       profile: 'sustain' },
  { id: 'ran:longshot',      cls: 'ranger',    special: 'longshot',    profile: 'blockable-repeated' },
];

const ROT = 1;
const PILOT_ROTATOR = 'fighter';   // measured near the roster mean in run 2
const TEMPLATES: Record<string, string[]> = {
  meleeCo:  ['fighter', 'ROT', 'barbarian', 'cleric'],
  rangedCo: ['ranger', 'ROT', 'wizard', 'warlock'],
};

/** KILL-RELEVANT cells only: scale must be a live lever in the fight, or
 *  sweeping it measures nothing (lever doctrine). No survive/hold/escape.
 *  unlitbeacon e11 excluded — its Adjutant deals percent-of-max damage and
 *  hunts the hero, which makes it a different experiment. */
const CELL_SETS: Record<string, Array<{ camp: string; enc: string; diff: CampaignDifficulty; level: number }>> = {
  // Set A: the original probes. Skews 3/4 sealeddeep (that is where the
  // kill-relevant candidates were) — which also means 3/4 UNDEAD cast.
  a: [
    { camp: 'sealeddeep',  enc: 'e6',  diff: 'medium', level: 5 },
    { camp: 'sealeddeep',  enc: 'e9',  diff: 'medium', level: 8 },
    { camp: 'sealeddeep',  enc: 'e12', diff: 'medium', level: 10 },
    { camp: 'unlitbeacon', enc: 'e8',  diff: 'medium', level: 7 },
  ],
  // Set B (owner call 2026-08-24: run a second probe in parallel): balances
  // the sample with unlitbeacon's dual-win finale and the trilogy rebuilds'
  // kill-relevant L6+ cells — a LIVING enemy cast (goblins/orcs/humans)
  // against set A's undead, different geometry, one non-crawl boss. The
  // trilogy's provisional authored scales are irrelevant here: the pilot
  // finds each cell's own window and hpScale REPLACES the authored value.
  b: [
    { camp: 'unlitbeacon',  enc: 'e12', diff: 'medium', level: 10 },  // dual-win finale (units_dead half)
    { camp: 'lantern',      enc: 'e12', diff: 'medium', level: 10 },  // boss, living cast
    { camp: 'goblinopolis', enc: 'e9',  diff: 'medium', level: 8 },   // mid-campaign boss, flat board
    { camp: 'moonberry',    enc: 'e8',  diff: 'medium', level: 7 },   // carve kill-all, palace
  ],
};
const SET = (() => { const i = process.argv.indexOf('--set'); return i > 0 ? process.argv[i + 1] : 'a'; })();
const CELLS = CELL_SETS[SET];
if (!CELLS) throw new Error(`Unknown cell set "${SET}" (a|b)`);

const PILOT_GRID = [0.30, 0.40, 0.50, 0.60, 0.70, 0.85, 1.00, 1.20, 1.40, 1.70, 2.00];
const WIN_HI = 0.80;   // easy end of the measurable window
const WIN_LO = 0.30;   // hard end

const runCell = (
  cell: typeof CELLS[number], tname: string, slugs: string[],
  special: string | undefined, k: number, games: number,
) => {
  const base = choicesForLevel(slugs, cell.level, undefined, ['none', 'none', 'none', 'none']);
  if (special) base[ROT] = { ...base[ROT], specialSlug: special };
  return simEncounterCell(cell.camp, cell.enc, cell.diff, tname, slugs, {
    games, level: cell.level, seed: 13, choicesOverride: base, hpScale: k,
  }).winRate;
};

/** Linear interpolation across the pilot grid for the k hitting `target`. */
function kAtWin(grid: Array<{ k: number; w: number }>, target: number): number | null {
  for (let i = 0; i < grid.length - 1; i++) {
    const a = grid[i], b = grid[i + 1];
    if ((a.w >= target && b.w <= target) || (a.w <= target && b.w >= target)) {
      if (a.w === b.w) return a.k;
      return a.k + (b.k - a.k) * ((a.w - target) / (a.w - b.w));
    }
  }
  return null;
}

type Obs = { id: string; profile: Profile; template: string; cell: string; scale: number; win: number };
const obs: Obs[] = [];
const windows: Array<{ cell: string; template: string; ks: number[] }> = [];

console.log('=== PILOT: finding each cell\'s measurable window ===');
for (const cell of CELLS) {
  const cellId = `${cell.camp}/${cell.enc}`;
  for (const [tname, tmpl] of Object.entries(TEMPLATES)) {
    const slugs = tmpl.map((x) => (x === 'ROT' ? PILOT_ROTATOR : x));
    const grid: Array<{ k: number; w: number }> = [];
    for (const k of PILOT_GRID) {
      grid.push({ k, w: runCell(cell, tname, slugs, undefined, k, PILOT_GAMES) });
      // Stop early once we are clearly under the hard end — no need to
      // confirm the floor we already know is there.
      if (grid[grid.length - 1].w <= WIN_LO - 0.15) break;
    }
    const kHi = kAtWin(grid, WIN_HI) ?? grid[0].k;
    const kLo = kAtWin(grid, WIN_LO) ?? grid[grid.length - 1].k;
    if (!(kLo > kHi) || kLo - kHi < 0.05) {
      console.log(`  ${cellId}/${tname}: UNUSABLE window (kHi ${kHi.toFixed(2)}, kLo ${kLo.toFixed(2)}) — skipped`);
      continue;
    }
    const ks = [0, 1, 2, 3].map((i) => +(kHi + ((kLo - kHi) * i) / 3).toFixed(3));
    windows.push({ cell: cellId, template: tname, ks });
    console.log(`  ${cellId}/${tname}: window k ${ks[0].toFixed(2)}→${ks[3].toFixed(2)}  ` +
      `(pilot ${grid.map((g) => `${g.k}:${(g.w * 100).toFixed(0)}%`).join(' ')})`);
  }
}

console.log('\n=== MEASURE ===');
for (const cell of CELLS) {
  const cellId = `${cell.camp}/${cell.enc}`;
  for (const [tname, tmpl] of Object.entries(TEMPLATES)) {
    const win = windows.find((w) => w.cell === cellId && w.template === tname);
    if (!win) continue;
    for (const k of win.ks) {
      const line: string[] = [];
      for (const v of VARIANTS) {
        const slugs = tmpl.map((x) => (x === 'ROT' ? v.cls : x));
        const w = runCell(cell, tname, slugs, v.special, k, GAMES);
        obs.push({ id: v.id, profile: v.profile, template: tname, cell: cellId, scale: k, win: w });
        line.push(`${v.id.slice(0, 6)} ${(w * 100).toFixed(0)}`);
      }
      console.log(`${cellId}/${tname} k=${k.toFixed(2)}  ${line.join(' ')}`);
    }
  }
}

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
function fitSlope(xs: number[], ys: number[]): number {
  const mx = mean(xs), my = mean(ys);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
}

console.log('\n=== WITHIN-CELL SCALE SENSITIVITY (confound-free, piloted window) ===');
console.log('variant             slope/+1.00k   ±SE     n    profile');
const summary: Array<{ id: string; profile: Profile; slope: number; se: number; n: number }> = [];
for (const v of VARIANTS) {
  const slopes: number[] = [];
  for (const w of windows) {
    const mine = obs.filter((o) => o.id === v.id && o.cell === w.cell && o.template === w.template);
    if (mine.length >= 3) slopes.push(fitSlope(mine.map((o) => o.scale), mine.map((o) => o.win)));
  }
  const m = mean(slopes);
  const se = slopes.length > 1
    ? Math.sqrt(mean(slopes.map((x) => (x - m) ** 2)) / (slopes.length - 1)) : 0;
  summary.push({ id: v.id, profile: v.profile, slope: m, se, n: slopes.length });
  console.log(`${v.id.padEnd(19)} ${(m * 100 >= 0 ? '+' : '')}${(m * 100).toFixed(1).padStart(7)}   ` +
    `±${(se * 100).toFixed(1).padStart(5)}  ${String(slopes.length).padStart(2)}   ${v.profile}`);
}

console.log('\n=== BY MECHANICAL PROFILE (the dodge-tax test) ===');
console.log('⚠ Read the SPREAD between profiles, not the absolute values: every');
console.log('  variant loses ground as k rises, so what matters is whether the');
console.log('  blockable-repeated group falls FASTER than unblockable/control.');
for (const p of [...new Set(VARIANTS.map((v) => v.profile))]) {
  const rows = summary.filter((s) => s.profile === p);
  const m = mean(rows.map((r) => r.slope));
  console.log(`${p.padEnd(20)} ${(m * 100 >= 0 ? '+' : '')}${(m * 100).toFixed(1).padStart(7)}   (${rows.map((r) => r.id).join(', ')})`);
}

const ji = process.argv.indexOf('--json');
if (ji > 0) {
  import('node:fs').then(({ writeFileSync }) =>
    writeFileSync(process.argv[ji + 1], JSON.stringify({ windows, obs, summary }, null, 2)));
}
