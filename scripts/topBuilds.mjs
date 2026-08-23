#!/usr/bin/env node
/**
 * topBuilds.mjs — collapse a raw grid CSV into the TOP BUILDS view.
 *
 * ⛔ OWNER STANDING RULE (2026-08-22): every grid is delivered in this form.
 * The raw 2,268-row CSV is NOT what the owner wants — it is noise. Each real
 * archetype appears NINE times there (one row per passive combination), so the
 * top of the raw list is the same handful of builds repeated with different
 * passives. Deliver the deduped view, always, unasked.
 *
 * WHAT IT DOES
 *   Groups by (pair, special 1, special 2) — 252 distinct pairings from 2,268
 *   rows — and keeps the single best row of each group by Mean Win %. Adds
 *   three columns describing the whole group:
 *     Variant Mean   — mean across all 9 passive loadouts
 *     Variant Min    — worst passive loadout
 *     Variant Spread — max-min; how passive-dependent the pairing is
 *
 * ⚠ READ VARIANT SPREAD BEFORE TRUSTING A RANK. Cells carry ~±2 points of
 * run-to-run noise (measured: re-running an identical preset on one pair gave
 * 4/81 exact cell matches, mean |delta| 1.95, max 6.4 — while the 81-cell pair
 * mean reproduced to 0.1). Taking the max of 9 noisy draws biases the Best
 * column upward, worst for high-spread pairings. Live example from contain2:
 *   Barbarian/Warlock roar+fear   best 68.8, variant mean 52.9, spread 38.4
 *   Sorcerer/Wizard ignite+blizzard best 66.9, variant mean 59.4, spread 16.1
 * The first is one lucky passive combination; the second holds up under every
 * passive. Variant Mean and Variant Spread stay as COLUMNS for that sanity
 * check — sort by them in Excel if you want — but the file ships sorted by
 * Best Mean, which is the view the owner asked for.
 *
 * ALSO EMITS a class-representation table (top 10/25/50/100).
 * Baseline is 25%: each class appears in 63 of the 252 pairings. Percentages
 * are share of ROWS containing that class, so they sum to 200% (2 classes per
 * row) — do not divide by 2N.
 *
 * Usage:
 *   node scripts/topBuilds.mjs grids/<dir>/merged.csv
 *     -> writes <dir>/top_builds.csv                (sorted by Best Mean)
 *              <dir>/class_representation_topbuilds.csv
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/topBuilds.mjs <merged.csv>'); process.exit(1); }
const dir = dirname(src);

const parse = (t) => t.trim().split('\n').map((l) => {
  const out = []; let cur = '', q = false;
  for (const ch of l) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
});
const rows = parse(readFileSync(src, 'utf8'));
const head = rows[0], data = rows.slice(1);
const ix = (n) => { const i = head.indexOf(n); if (i < 0) throw new Error(`missing column: ${n}`); return i; };
const MEAN = ix('Mean Win % (vs 12 refs)'), MED = ix('Median Win % (vs 12 refs)');
const WORST = ix('Worst Ref %'), BEST = ix('Best Ref %'), BEAT = ix('Refs Beaten (of 12)'), TURNS = ix('Avg Turns');

const groups = new Map();
for (const r of data) {
  const k = `${r[0]}|${r[1]}|${r[3]}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
const builds = [...groups.values()].map((g) => {
  const means = g.map((r) => parseFloat(r[MEAN]));
  const best = g.reduce((a, b) => (parseFloat(b[MEAN]) > parseFloat(a[MEAN]) ? b : a));
  const vm = means.reduce((a, b) => a + b, 0) / means.length;
  return {
    pair: best[0], s1: best[1], s2: best[3], p1: best[2], p2: best[4],
    best: parseFloat(best[MEAN]), vmean: vm, vmin: Math.min(...means),
    vspread: Math.max(...means) - Math.min(...means), n: g.length,
    med: best[MED], worst: best[WORST], bestref: best[BEST], beat: best[BEAT], turns: best[TURNS],
  };
});

const HEAD = ['Rank','Team Combination','Special 1','Special 2','Best Passive 1','Best Passive 2',
  'Best Mean %','Variant Mean %','Variant Min %','Variant Spread','Passive Variants',
  'Median %','Worst Ref %','Best Ref %','Refs Beaten','Avg Turns'];
const line = (b, i) => [i + 1, b.pair, b.s1, b.s2, b.p1, b.p2,
  b.best.toFixed(1), b.vmean.toFixed(1), b.vmin.toFixed(1), b.vspread.toFixed(1), b.n,
  b.med, b.worst, b.bestref, b.beat, b.turns].join(',');

const byBest = [...builds].sort((a, b) => b.best - a.best);
writeFileSync(join(dir, 'top_builds.csv'), [HEAD.join(','), ...byBest.map(line)].join('\n') + '\n');

const CLASSES = ['Barbarian','Cleric','Fighter','Ranger','Rogue','Sorcerer','Warlock','Wizard'];
const count = (list, n) => {
  const c = Object.fromEntries(CLASSES.map((x) => [x, 0]));
  for (const b of list.slice(0, n)) for (const cl of b.pair.split('/')) c[cl]++;
  return c;
};
const DEPTHS = [10, 25, 50, 100];
const rep = [['Class',
  ...DEPTHS.flatMap((n) => [`Top${n}`, `Top${n} %`]),
  'All','All %','Baseline %'].join(',')];
const cb = Object.fromEntries(DEPTHS.map((n) => [n, count(byBest, n)]));
const all = count(byBest, byBest.length);
for (const cl of CLASSES) {
  rep.push([cl,
    ...DEPTHS.flatMap((n) => [cb[n][cl], (100 * cb[n][cl] / n).toFixed(1)]),
    all[cl], (100 * all[cl] / builds.length).toFixed(1), '25.0'].join(','));
}
writeFileSync(join(dir, 'class_representation_topbuilds.csv'), rep.join('\n') + '\n');

console.log(`${builds.length} distinct pairings from ${data.length} rows -> ${dir}/`);
console.log('  top_builds.csv · class_representation_topbuilds.csv\n');
console.log('rank  best  vmean  spread  build');
byBest.slice(0, 10).forEach((b, i) =>
  console.log(`${String(i + 1).padStart(4)} ${b.best.toFixed(1).padStart(5)} ${b.vmean.toFixed(1).padStart(6)} ${b.vspread.toFixed(1).padStart(6)}  ${b.pair.padEnd(20)} ${b.s1}+${b.s2}`));
console.log('\nclass representation (share of rows; baseline 25%):');
console.log(`  ${'class'.padEnd(11)}${DEPTHS.map((n) => `top${n}`.padStart(7)).join('')}`);
for (const cl of CLASSES) console.log(`  ${cl.padEnd(11)}${DEPTHS.map((n) => String(cb[n][cl]).padStart(7)).join('')}`);
