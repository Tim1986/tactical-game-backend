/**
 * fullBalanceReport.ts — One-shot balance battery for the current gameData.
 *
 * Stages:
 *   A. Class matrix     — 4×C vs 4×D for all class pairs (class power).
 *   B. Comp battery     — archetype comps round-robin (comp power).
 *   C. Loadout duels    — per class, all 9×9 loadout pairs in 4-stack
 *                         mirrors (intra-class special/passive marginals).
 *   D. Reference runs   — per class, each loadout's 4-stack vs the classic
 *                         party (cross-class special/passive marginals).
 *
 * Findings printed at the end map to the balance questions:
 *   1/2  unplayable / too-strong classes  → stage A (+ D context)
 *   3    too-strong comps                 → stage B
 *   4/5  dominant / unplayable specials   → C+D marginals per special
 *   6/7  dominant / unplayable passives   → C+D marginals per passive
 *
 * Run: npx tsx src/ai/fullBalanceReport.ts [--fast]
 * (--fast quarters the game counts for a smoke-level pass.)
 */

import { runSim } from './simHarness.js';
import { ALL_CLASSES, loadoutsFor, runDuelMatrix, runReferenceMatrix, REFERENCE_PARTY } from './loadoutMatrix.js';

const FAST = process.argv.includes('--fast');
const N = (n: number) => (FAST ? Math.max(8, Math.floor(n / 4)) : n);

const pct = (x: number) => (x * 100).toFixed(0).padStart(3) + '%';
let grandErrors = 0;

// ───────────────────────────── Stage A: class matrix ─────────────────────────
console.log('\n════════ STAGE A — class vs class (4-stacks) ════════');
const classWins: Record<string, { w: number; g: number }> = {};
for (const c of ALL_CLASSES) classWins[c] = { w: 0, g: 0 };
const classCell: Record<string, Record<string, number>> = {};
{
  const games = N(60);
  for (let i = 0; i < ALL_CLASSES.length; i++) {
    for (let j = i + 1; j < ALL_CLASSES.length; j++) {
      const a = ALL_CLASSES[i], b = ALL_CLASSES[j];
      const r = runSim([a, a, a, a], [b, b, b, b], { games, seed: i * 31 + j });
      grandErrors += r.totalValidationErrors;
      classWins[a].w += r.p1Wins; classWins[a].g += r.games;
      classWins[b].w += r.p2Wins; classWins[b].g += r.games;
      (classCell[a] ??= {})[b] = r.p1WinRate;
      (classCell[b] ??= {})[a] = 1 - r.p1WinRate - r.draws / r.games;
      console.log(`  ${a.padEnd(10)} vs ${b.padEnd(10)} ${pct(r.p1WinRate)}  turns ${r.avgTurns.toFixed(0)}  err ${r.totalValidationErrors}`);
    }
  }
}
const classRank = ALL_CLASSES
  .map((c) => ({ c, wr: classWins[c].w / classWins[c].g }))
  .sort((x, y) => y.wr - x.wr);
console.log('\n  CLASS RANKING (aggregate mirror-stack win rate):');
for (const { c, wr } of classRank) console.log(`    ${c.padEnd(10)} ${pct(wr)}`);

// ───────────────────────────── Stage B: comp battery ─────────────────────────
console.log('\n════════ STAGE B — archetype comps round-robin ════════');
const COMPS: [string, string[]][] = [
  ['classic',        ['barbarian', 'fighter', 'ranger', 'cleric']],
  ['double-rogue',   ['rogue', 'rogue', 'sorcerer', 'sorcerer']],
  ['bruiser-wall',   ['fighter', 'fighter', 'barbarian', 'barbarian']],
  ['full-caster',    ['wizard', 'sorcerer', 'warlock', 'cleric']],
  ['skirmish',       ['rogue', 'rogue', 'ranger', 'ranger']],
  ['heal-tank',      ['fighter', 'fighter', 'cleric', 'cleric']],
  ['control',        ['wizard', 'wizard', 'warlock', 'warlock']],
  ['snipe',          ['ranger', 'ranger', 'wizard', 'wizard']],
  ['rogue-heal',     ['rogue', 'rogue', 'cleric', 'cleric']],
];
const compWins: Record<string, { w: number; g: number }> = {};
for (const [name] of COMPS) compWins[name] = { w: 0, g: 0 };
{
  const games = N(60);
  for (let i = 0; i < COMPS.length; i++) {
    for (let j = i + 1; j < COMPS.length; j++) {
      const [an, a] = COMPS[i], [bn, b] = COMPS[j];
      const r = runSim(a, b, { games, seed: 500 + i * 31 + j });
      grandErrors += r.totalValidationErrors;
      compWins[an].w += r.p1Wins; compWins[an].g += r.games;
      compWins[bn].w += r.p2Wins; compWins[bn].g += r.games;
      console.log(`  ${an.padEnd(13)} vs ${bn.padEnd(13)} ${pct(r.p1WinRate)}  err ${r.totalValidationErrors}`);
    }
  }
}
const compRank = COMPS
  .map(([name]) => ({ name, wr: compWins[name].w / compWins[name].g }))
  .sort((x, y) => y.wr - x.wr);
console.log('\n  COMP RANKING:');
for (const { name, wr } of compRank) console.log(`    ${name.padEnd(13)} ${pct(wr)}`);

// ─────────────────────── Stage C+D: loadout marginals ────────────────────────
console.log('\n════════ STAGE C — intra-class loadout duels ════════');
interface Marginal { w: number; g: number }
const specialDuel: Record<string, Marginal> = {};
const passiveDuel: Record<string, Marginal> = {};
const specialRef: Record<string, Marginal> = {};
const passiveRef: Record<string, Marginal> = {};
const add = (m: Record<string, Marginal>, k: string, w: number, g: number) => {
  m[k] = m[k] ?? { w: 0, g: 0 }; m[k].w += w; m[k].g += g;
};

for (const c of ALL_CLASSES) {
  const r = runDuelMatrix(c, N(24), () => {});
  grandErrors += r.totalValidationErrors;
  console.log(`  ${c}: duels done (err ${r.totalValidationErrors})`);
  for (const s of r.scores) {
    add(specialDuel, `${c}/${s.loadout.specialSlug}`, s.wins, s.games);
    add(passiveDuel, `${c}/${s.loadout.passiveSlug}`, s.wins, s.games);
  }
}

console.log('\n════════ STAGE D — loadouts vs classic party ════════');
for (const c of ALL_CLASSES) {
  const r = runReferenceMatrix(c, N(60), () => {});
  grandErrors += r.totalValidationErrors;
  console.log(`  ${c}: reference done (err ${r.totalValidationErrors})`);
  for (const s of r.scores) {
    add(specialRef, `${c}/${s.loadout.specialSlug}`, s.wins, s.games);
    add(passiveRef, `${c}/${s.loadout.passiveSlug}`, s.wins, s.games);
  }
}

// ───────────────────────────── Findings ──────────────────────────────────────
const wr = (m: Marginal) => (m.g > 0 ? m.w / m.g : NaN);

console.log('\n════════ SPECIAL MARGINALS (duel win% | vs-classic win%) ════════');
for (const c of ALL_CLASSES) {
  const rows = loadoutsFor(c)
    .map((l) => l.specialSlug)
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((s) => ({ s, duel: wr(specialDuel[`${c}/${s}`]), ref: wr(specialRef[`${c}/${s}`]) }))
    .sort((a, b) => b.duel - a.duel);
  console.log(`  ${c}:`);
  for (const row of rows) console.log(`    ${row.s.padEnd(14)} duel ${pct(row.duel)}   ref ${pct(row.ref)}`);
}

console.log('\n════════ PASSIVE MARGINALS (duel win% | vs-classic win%) ════════');
for (const c of ALL_CLASSES) {
  const rows = loadoutsFor(c)
    .map((l) => l.passiveSlug ?? 'none')
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((p) => ({ p, duel: wr(passiveDuel[`${c}/${p}`]), ref: wr(passiveRef[`${c}/${p}`]) }))
    .sort((a, b) => b.duel - a.duel);
  console.log(`  ${c}:`);
  for (const row of rows) console.log(`    ${row.p.padEnd(14)} duel ${pct(row.duel)}   ref ${pct(row.ref)}`);
}

// Automated flags
console.log('\n════════ AUTOMATED FINDINGS ════════');
console.log(`reference party = ${REFERENCE_PARTY.join('/')}`);
for (const { c, wr: w } of classRank) {
  if (w >= 0.62) console.log(`  [CLASS TOO STRONG]   ${c} — ${pct(w)} aggregate vs other classes`);
  if (w <= 0.38) console.log(`  [CLASS UNPLAYABLE?]  ${c} — ${pct(w)} aggregate vs other classes`);
}
for (const { name, wr: w } of compRank) {
  if (w >= 0.68) console.log(`  [COMP TOO STRONG]    ${name} — ${pct(w)} across battery`);
}
for (const c of ALL_CLASSES) {
  const specials = loadoutsFor(c).map((l) => l.specialSlug).filter((v, i, a) => a.indexOf(v) === i);
  for (const s of specials) {
    const d = wr(specialDuel[`${c}/${s}`]);
    if (d >= 0.62) console.log(`  [SPECIAL DOMINANT]   ${c}/${s} — ${pct(d)} intra-class`);
    if (d <= 0.38) console.log(`  [SPECIAL TOO WEAK]   ${c}/${s} — ${pct(d)} intra-class`);
  }
  const passives = loadoutsFor(c).map((l) => l.passiveSlug ?? 'none').filter((v, i, a) => a.indexOf(v) === i);
  for (const p of passives) {
    const d = wr(passiveDuel[`${c}/${p}`]);
    if (d >= 0.62) console.log(`  [PASSIVE DOMINANT]   ${c}/${p} — ${pct(d)} intra-class`);
    if (d <= 0.38) console.log(`  [PASSIVE TOO WEAK]   ${c}/${p} — ${pct(d)} intra-class`);
  }
}
console.log(`\nTotal validation errors: ${grandErrors}${grandErrors === 0 ? ' ✓' : '  ⚠ INVESTIGATE'}`);
