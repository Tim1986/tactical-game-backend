/**
 * classProbe.ts — fast chassis-balance probe against Fable's 12 rosters.
 *
 *   npx tsx src/ai/classProbe.ts [--games 20] [--sample diag|full]
 *                                [--hp cleric:-8,warlock:-6] [--ac barbarian:2]
 *                                [--label "cleric -8hp"]
 *
 * ── Why ─────────────────────────────────────────────────────────────────────
 * The full Stage-E grid is 2268 cells x 12 refs x 40 games ≈ 3.7 hours. That is
 * far too slow to iterate on balance numbers. This runs the same measurement on
 * a balanced SAMPLE of the loadout space so a candidate change can be judged in
 * ~10 minutes, then confirmed with a full grid run at the end.
 *
 * ── The sample ──────────────────────────────────────────────────────────────
 * `--sample diag` (default) takes 3 of each class's 9 loadouts along the
 * diagonal of the 3 specials x 3 passives square: (s0,p0), (s1,p1), (s2,p2).
 * That is a Latin square — every special appears exactly once and every passive
 * appears exactly once, so no special or passive is over-represented. Taking
 * "every 3rd loadout" instead would have picked indices 0,3,6 = all three
 * specials but ONLY passive 0, which is exactly the kind of silently-biased
 * sample that produces confident wrong answers.
 *
 * 28 pairs x 9 combos = 252 cells (vs 2268), so ~9x cheaper per game count.
 *
 * ── What it reports ─────────────────────────────────────────────────────────
 * Chassis mean per class (the number the balance work targets), the spread
 * between best and worst class (the owner's actual goal is "no giant gap"), and
 * top-quartile representation, which is what made the imbalance visible in the
 * first place — cleric and warlock held 79 of the full grid's top 100 cells.
 *
 * ── Deltas ──────────────────────────────────────────────────────────────────
 * --hp / --ac mutate DEFAULT_UNITS in place, exactly as acExperiment's
 * applyPreset does. Both the grid comps AND the Fable reference rosters are
 * built from DEFAULT_UNITS, so a nerf correctly weakens a class wherever it
 * appears — including inside the reference panel. That damping is intentional
 * and is what the shipped game will actually feel; it does mean a nerf's
 * measured effect is smaller than its effect on the class in isolation.
 */
import { runSim } from './simHarness.js';
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from './defaultData.js';
import { loadoutsFor, ALL_CLASSES, Loadout } from './loadoutMatrix.js';
import { FABLE_TEAMS, fableCustomizations } from '../config/fableTeams.js';

const argv = process.argv.slice(2);
const flag = (k: string): string | undefined => {
  const i = argv.indexOf('--' + k);
  return i >= 0 ? argv[i + 1] : undefined;
};
const GAMES = Number(flag('games') ?? 20);
const SAMPLE = flag('sample') ?? 'diag';
const LABEL = flag('label') ?? 'baseline';

/** Parse "cleric:-8,warlock:-6" into {cleric:-8, warlock:-6}. */
function parseDeltas(s: string | undefined): Record<string, number> {
  if (!s) return {};
  const out: Record<string, number> = {};
  for (const part of s.split(',')) {
    const [k, v] = part.split(':');
    if (!ALL_CLASSES.includes(k)) throw new Error(`unknown class "${k}"`);
    out[k] = Number(v);
  }
  return out;
}
const dHp = parseDeltas(flag('hp'));
const dAc = parseDeltas(flag('ac'));

/** Ability-keyed deltas, no class-name validation (slugs are abilities). */
function parseAbilityDeltas(str: string | undefined): Record<string, number> {
  if (!str) return {};
  const out: Record<string, number> = {};
  for (const part of str.split(',')) { const [k, v] = part.split(':'); out[k] = Number(v); }
  return out;
}
const dDmg = parseAbilityDeltas(flag('dmg'));         // per damage effect value
const dRange = parseAbilityDeltas(flag('range'));     // per ability range
const dDur = parseAbilityDeltas(flag('statusDur'));   // per apply_status durationTurns

// Apply chassis deltas before anything reads the units.
const before: Record<string, { hp: number; ac: number }> = {};
for (const c of ALL_CLASSES) {
  before[c] = { hp: DEFAULT_UNITS[c].maxHealth, ac: DEFAULT_UNITS[c].armorClass };
  DEFAULT_UNITS[c].maxHealth += dHp[c] ?? 0;
  DEFAULT_UNITS[c].armorClass = Math.max(7, DEFAULT_UNITS[c].armorClass + (dAc[c] ?? 0));
}

// Apply ability deltas (damage / range / status duration) in place. Mirrors
// acExperiment's applyPreset so a special buff can be tested here too.
const abilityChanges: string[] = [];
for (const a of DEFAULT_ABILITIES as unknown as Array<{ slug: string; range: number; effects: Array<Record<string, unknown>> }>) {
  if (dRange[a.slug] != null) { a.range += dRange[a.slug]; abilityChanges.push(`${a.slug} range +${dRange[a.slug]}`); }
  for (const e of a.effects) {
    if (dDmg[a.slug] != null && e.type === 'damage') { (e.value as number) += dDmg[a.slug]; abilityChanges.push(`${a.slug} dmg +${dDmg[a.slug]}`); }
    if (dDur[a.slug] != null && e.type === 'apply_status') { (e.durationTurns as number) += dDur[a.slug]; abilityChanges.push(`${a.slug} status +${dDur[a.slug]}t`); }
  }
}

/** Balanced 3-of-9 sample: the diagonal of the specials x passives square. */
function sampleLoadouts(cls: string): Loadout[] {
  const all = loadoutsFor(cls);
  if (SAMPLE === 'full' || all.length < 9) return all;
  return [all[0], all[4], all[8]];
}

const REFS = FABLE_TEAMS.map((t) => ({
  name: t.name, slugs: [...t.slugs], custs: fableCustomizations(t),
}));

interface Cell { pair: string; wr: number }
const cells: Cell[] = [];
const t0 = Date.now();
let errors = 0;

for (let i = 0; i < ALL_CLASSES.length; i++) {
  for (let j = i + 1; j < ALL_CLASSES.length; j++) {
    const X = ALL_CLASSES[i], Y = ALL_CLASSES[j];
    const pair = [X, Y].sort().join('/');
    for (const lx of sampleLoadouts(X)) {
      for (const ly of sampleLoadouts(Y)) {
        const custs = [lx, lx, ly, ly].map((l) => ({
          specialSlug: l.specialSlug, passiveSlug: l.passiveSlug,
        }));
        let w = 0, g = 0;
        for (let k = 0; k < REFS.length; k++) {
          const r = runSim([X, X, Y, Y], REFS[k].slugs, {
            games: GAMES,
            seed: 70000 + i * 3131 + j * 97 + k * 51341,
            p1Customizations: custs,
            p2Customizations: REFS[k].custs,
          });
          errors += r.totalValidationErrors;
          w += r.p1Wins; g += r.games;
        }
        cells.push({ pair, wr: (w / g) * 100 });
      }
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const chassis: Record<string, number[]> = {};
for (const c of ALL_CLASSES) chassis[c] = [];
for (const cell of cells) for (const c of cell.pair.split('/')) chassis[c].push(cell.wr);

const ranked = ALL_CLASSES.map((c) => ({ c, m: mean(chassis[c]) })).sort((a, b) => b.m - a.m);
const sorted = [...cells].sort((a, b) => b.wr - a.wr);
// Representation is the statistic the imbalance actually showed up in (cleric
// and warlock held 79 of the full grid's top 100), so report it at two depths.
// The shallow one matches top-100-of-2268 by fraction but is only ~11 cells —
// far too few to trust per class. The 10% cut is ~25 cells and steadier; even
// that is a PROXY, and a representation claim should be confirmed on the full
// grid before it drives a decision.
const topN = Math.max(1, Math.round(cells.length * 0.044));
const topWide = Math.max(1, Math.round(cells.length * 0.10));
const countTop = (k: number) => {
  const t: Record<string, number> = {};
  for (const c of ALL_CLASSES) t[c] = 0;
  for (const cell of sorted.slice(0, k)) for (const c of cell.pair.split('/')) t[c]++;
  return t;
};
const topCount = countTop(topN);
const topWideCount = countTop(topWide);

const changed = ALL_CLASSES.filter((c) => dHp[c] || dAc[c])
  .map((c) => `${c} ${before[c].hp}→${DEFAULT_UNITS[c].maxHealth}hp ${before[c].ac}→${DEFAULT_UNITS[c].armorClass}ac`);

console.log(`\n═══ classProbe: ${LABEL} ═══`);
console.log(`${cells.length} cells x ${REFS.length} refs x ${GAMES} games = ${(cells.length * REFS.length * GAMES).toLocaleString()} games`
  + `  ·  ${((Date.now() - t0) / 60000).toFixed(1)} min  ·  ${errors} validation errors`);
if (changed.length) console.log(`chassis: ${changed.join('  |  ')}`);
if (abilityChanges.length) console.log(`abilities: ${[...new Set(abilityChanges)].join('  |  ')}`);
console.log(`\nCHASSIS                mean    top-${topN}   top-${topWide} (of ${topWide * 2} slots)`);
for (const { c, m } of ranked) {
  console.log(`  ${c.padEnd(12)} ${m.toFixed(1).padStart(8)}    ${String(topCount[c]).padStart(3)}   ${String(topWideCount[c]).padStart(4)}`);
}
const spread = ranked[0].m - ranked[ranked.length - 1].m;
console.log(`\nSPREAD (best-worst): ${spread.toFixed(1)} points   [${ranked[0].c} → ${ranked[ranked.length - 1].c}]`);
console.log(`grid mean: ${mean(cells.map((c) => c.wr)).toFixed(1)}`);

// Machine-readable line so runs can be diffed / collected.
console.log(`\nJSON ${JSON.stringify({
  label: LABEL, spread: Number(spread.toFixed(2)),
  chassis: Object.fromEntries(ranked.map((r) => [r.c, Number(r.m.toFixed(2))])),
  top10pct: Object.fromEntries(ranked.map((r) => [r.c, topWideCount[r.c]])),
})}`);
