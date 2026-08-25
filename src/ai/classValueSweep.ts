/**
 * classValueSweep.ts — [E0.5c] The DE-CONFOUNDED class-value measurement:
 * the same cell swept across enemy-HP multipliers.
 *
 * WHY RUN 2'S SLOPES CANNOT BE TRUSTED (Fable review, 2026-08-24). In runs
 * 1–2 the x-axis was each cell's AUTHORED hpScaleOverride — but scale is not
 * randomly assigned. Today's own lever doctrine proves scale gets cranked
 * HIGH exactly where it is inert (survive/hold/duel) and stays LOW where it
 * bites (kill-alls). So high-scale cells are systematically different KINDS
 * of fights, and a cross-cell regression conflates "how does this class
 * handle HP inflation" with "how does this class handle objective
 * encounters". Rogue's −16.7 could be either. They need different fixes.
 *
 * THE FIX: sweep the SAME cell at k ∈ {0.8, 1.2, 1.6, 2.0} via the hpScale
 * override the calibration walks already use. Within-cell slope is true
 * scale sensitivity — encounter identity, objective kind, terrain and
 * enemy cast all held constant.
 *
 * HYPOTHESIS UNDER TEST (the dodge-tax refinement of the damage-tax): what
 * anti-scales is BLOCKABLE, REPEATED damage. Fatter enemies need more hits;
 * every extra hit is another dodge roll; the miss tax compounds with k.
 * Unblockable bursts are exempt by construction; control (turns) and sustain
 * (incoming damage) never cared about k. Each variant is tagged with its
 * mechanical profile so the analysis can test the grouping directly.
 *
 * Variant notes from run 2's defaults, all now measured explicitly:
 *  - sorcerer default is ffh (AoE ring) — its −11 slope is the AoE
 *    anti-synergy with fewer-fatter enemies, not the class.
 *  - warlock's +14.0 was measured holding FEAR; grasp/drain now separate.
 *  - ranger's −4.1 was measured holding PIERCING (a line that hits allies).
 *  - fighter's default is SECOND_WIND — no damage special at all, i.e. the
 *    purest blockable-basics profile in the roster.
 *
 * Usage: npx tsx src/ai/classValueSweep.ts [--games 200] [--json out.json]
 */
import { simEncounterCell, choicesForLevel } from './campaignSim.js';
import { CampaignDifficulty } from '../campaigns/types.js';

const GAMES = (() => { const i = process.argv.indexOf('--games'); return i > 0 ? Number(process.argv[i + 1]) : 200; })();

type Profile = 'blockable-repeated' | 'unblockable-burst' | 'aoe' | 'dot' | 'control' | 'sustain' | 'displacement';
type Variant = { id: string; cls: string; special?: string; profile: Profile };
const VARIANTS: Variant[] = [
  { id: 'fighter',           cls: 'fighter',   profile: 'blockable-repeated' },   // second_wind: basics carry all damage
  { id: 'barbarian',         cls: 'barbarian', profile: 'aoe' },                  // whirlwind
  { id: 'rogue',             cls: 'rogue',     profile: 'blockable-repeated' },   // assassinate execute + twin basics
  { id: 'cleric',            cls: 'cleric',    profile: 'sustain' },              // heal
  { id: 'ranger',            cls: 'ranger',    profile: 'blockable-repeated' },   // piercing line + arrow basics
  { id: 'wizard',            cls: 'wizard',    profile: 'control' },              // freeze
  { id: 'sorcerer',          cls: 'sorcerer',  profile: 'aoe' },                  // ffh ring
  { id: 'warlock',           cls: 'warlock',   profile: 'displacement' },         // fear
  { id: 'sorc:flame_jet',    cls: 'sorcerer',  special: 'flame_jet',  profile: 'unblockable-burst' },
  { id: 'sorc:ignite',       cls: 'sorcerer',  special: 'ignite',     profile: 'dot' },
  { id: 'wiz:cold_snap',     cls: 'wizard',    special: 'cold_snap',  profile: 'control' },
  { id: 'rogue:dagger_toss', cls: 'rogue',     special: 'dagger_toss', profile: 'unblockable-burst' },
  { id: 'war:grasp',         cls: 'warlock',   special: 'grasp',      profile: 'displacement' },
  { id: 'war:drain',         cls: 'warlock',   special: 'drain',      profile: 'sustain' },
  { id: 'ran:longshot',      cls: 'ranger',    special: 'longshot',   profile: 'blockable-repeated' },
];

const ROT = 1;
const TEMPLATES: Record<string, string[]> = {
  meleeCo:  ['fighter', 'ROT', 'barbarian', 'cleric'],
  rangedCo: ['ranger', 'ROT', 'wizard', 'warlock'],
};

/** KILL-RELEVANT cells only — scale must be a live lever in the fight itself,
 *  or a sweep of it measures nothing. All four are units_dead / kill-all /
 *  rooms; no survive/hold/escape (scale is decorative there, per the lever
 *  doctrine). unlitbeacon e11 is EXCLUDED: its Adjutant deals percent-of-max
 *  damage and hunts the hero, which makes it its own experiment. */
const CELLS: Array<{ camp: string; enc: string; diff: CampaignDifficulty; level: number }> = [
  { camp: 'sealeddeep',  enc: 'e6',  diff: 'medium', level: 5 },   // boss (units_dead)
  { camp: 'sealeddeep',  enc: 'e9',  diff: 'medium', level: 8 },   // kill-all
  { camp: 'sealeddeep',  enc: 'e12', diff: 'medium', level: 10 },  // 3-room crawl, boss finish
  { camp: 'unlitbeacon', enc: 'e8',  diff: 'medium', level: 7 },   // rooms
];
const SCALES = [0.8, 1.2, 1.6, 2.0];

type Obs = { id: string; profile: Profile; template: string; cell: string; scale: number; win: number };
const obs: Obs[] = [];

for (const cell of CELLS) {
  const cellId = `${cell.camp}/${cell.enc}`;
  for (const [tname, tmpl] of Object.entries(TEMPLATES)) {
    for (const k of SCALES) {
      const line: string[] = [];
      for (const v of VARIANTS) {
        const slugs = tmpl.map((x) => (x === 'ROT' ? v.cls : x));
        const base = choicesForLevel(slugs, cell.level, undefined, ['none', 'none', 'none', 'none']);
        if (v.special) base[ROT] = { ...base[ROT], specialSlug: v.special };
        const r = simEncounterCell(cell.camp, cell.enc, cell.diff, tname, slugs, {
          games: GAMES, level: cell.level, seed: 13, choicesOverride: base, hpScale: k,
        });
        obs.push({ id: v.id, profile: v.profile, template: tname, cell: cellId, scale: k, win: r.winRate });
        line.push(`${v.id.slice(0, 6)} ${(r.winRate * 100).toFixed(0)}`);
      }
      console.log(`${cellId}/${tname} k=${k.toFixed(1)}  ${line.join(' ')}`);
    }
  }
}

// ── WITHIN-CELL slopes: fit per (variant, cell, template), then average ──
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
function fitSlope(xs: number[], ys: number[]): number {
  const mx = mean(xs), my = mean(ys);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return den === 0 ? 0 : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / den;
}
console.log('\n=== WITHIN-CELL SCALE SENSITIVITY (confound-free) ===');
console.log('variant            meanWin@0.8  meanWin@2.0   slope/+1.00k (±SE across cells)  profile');
const summary: Array<{ id: string; profile: Profile; lo: number; hi: number; slope: number; se: number }> = [];
for (const v of VARIANTS) {
  const slopes: number[] = [];
  for (const cell of CELLS) {
    for (const tname of Object.keys(TEMPLATES)) {
      const mine = obs.filter((o) => o.id === v.id && o.cell === `${cell.camp}/${cell.enc}` && o.template === tname);
      if (mine.length >= 3) slopes.push(fitSlope(mine.map((o) => o.scale), mine.map((o) => o.win)));
    }
  }
  const lo = mean(obs.filter((o) => o.id === v.id && o.scale === 0.8).map((o) => o.win));
  const hi = mean(obs.filter((o) => o.id === v.id && o.scale === 2.0).map((o) => o.win));
  const m = mean(slopes);
  const se = Math.sqrt(mean(slopes.map((x) => (x - m) ** 2)) / Math.max(1, slopes.length - 1));
  summary.push({ id: v.id, profile: v.profile, lo, hi, slope: m, se });
  console.log(`${v.id.padEnd(18)} ${(lo * 100).toFixed(0).padStart(8)}% ${(hi * 100).toFixed(0).padStart(11)}%   ` +
    `${(m * 100 >= 0 ? '+' : '')}${(m * 100).toFixed(1).padStart(6)} (±${(se * 100).toFixed(1)})  ${v.profile}`);
}

console.log('\n=== BY MECHANICAL PROFILE (the dodge-tax test) ===');
const profiles = [...new Set(VARIANTS.map((v) => v.profile))];
for (const p of profiles) {
  const rows = summary.filter((s) => s.profile === p);
  console.log(`${p.padEnd(20)} mean slope ${(mean(rows.map((r) => r.slope)) * 100).toFixed(1)}  (${rows.map((r) => r.id).join(', ')})`);
}

const ji = process.argv.indexOf('--json');
if (ji > 0) {
  import('node:fs').then(({ writeFileSync }) =>
    writeFileSync(process.argv[ji + 1], JSON.stringify({ obs, summary }, null, 2)));
}
