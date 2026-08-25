/**
 * bossViability — per-CLASS viability on boss cells, per the owner's spec
 * (2026-08-25). Reads a merged buildBattery JSON; runs no games of its own.
 *
 * ⚠ WHY THIS EXISTS. buildBattery judges a cell with AGGREGATE statistics
 * (median, solve share, wall share). The owner's boss spec is not an aggregate
 * statement — "every class should be viable at hard" is a claim about the
 * WORST-SERVED CLASS, and a cell can pass every aggregate check while one class
 * is unplayable in it. Averaging over classes is precisely the "aggregate
 * nonsense" the Deep Gift analysis was rejected for; do not reintroduce it.
 *
 * ⚠ AND THE STATISTIC DIFFERS PER TIER, because the spec does:
 *
 *   easy   "beatable with literally the dumbest build, played semi competently"
 *          -> a claim about the BOTTOM of the distribution. p10, not the median.
 *   medium "any competent build, including any class"
 *          -> per-class MEDIAN. Half the builds containing that class must win.
 *   hard   "tough for some builds, but every CLASS viable, played well"
 *          -> per-class TOP QUARTILE. It is enough that a good party can be
 *          built AROUND the class; it need not carry bad ones. (Specials are
 *          explicitly exempt at this tier — owner: "not every special needs to
 *          be viable".)
 *   nightmare  "some builds just can't beat it, plan better next time"
 *          -> NO per-class requirement. Selectivity is the product. The only
 *          check is that boss-killers exist, which the aggregate floor covers.
 *
 * A class's numbers are computed over builds CONTAINING it. Every build holds
 * four classes, so these figures are confounded by teammates by construction —
 * which is exactly why the tier statistics are ordered bottom -> median -> top:
 * asking about the upper tail at hard is asking "does a party built around this
 * class exist", the question the spec actually poses.
 */
import fs from 'fs';
import type { CampaignDifficulty } from '../campaigns/types';

interface Row { encounter: string; difficulty: CampaignDifficulty; level: number; builds: { label: string; winRate: number }[] }

/** Per-tier: which order statistic, and the bar it must clear. */
const SPEC: Record<CampaignDifficulty, { stat: 'p10' | 'median' | 'p75'; bar: number; claim: string } | null> = {
  easy:      { stat: 'p10',    bar: 0.60, claim: 'dumbest build wins' },
  medium:    { stat: 'median', bar: 0.55, claim: 'any competent build, any class' },
  hard:      { stat: 'p75',    bar: 0.45, claim: 'every class viable if played well' },
  nightmare: null,
};

const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const pct = (n: number) => `${(n * 100).toFixed(0).padStart(3)}%`;

const file = process.argv[2];
const only = process.argv.slice(3).filter((a) => !a.startsWith('--'));
if (!file) { console.error('Usage: npx tsx src/ai/bossViability.ts merged.json [e11 e12 ...]'); process.exit(1); }
const { rows } = JSON.parse(fs.readFileSync(file, 'utf8')) as { rows: Row[] };

let failures = 0;
for (const row of rows.filter((r) => !only.length || only.includes(r.encounter)).sort((a, b) => a.encounter.localeCompare(b.encounter))) {
  const spec = SPEC[row.difficulty];
  const byClass = new Map<string, number[]>();
  for (const b of row.builds) {
    // label: "rogue(assassinate/swift/damage) + fighter(...) + ..."
    for (const cls of new Set(b.label.split(' + ').map((p) => p.split('(')[0].trim()))) {
      if (!byClass.has(cls)) byClass.set(cls, []);
      byClass.get(cls)!.push(b.winRate);
    }
  }
  const all = row.builds.map((b) => b.winRate);
  console.log(`\n${row.encounter} L${row.level} ${row.difficulty}  — ${row.builds.length} builds` +
    (spec ? `  · spec: ${spec.claim} (${spec.stat} >= ${pct(spec.bar)})` : '  · spec: NO per-class bar (selectivity is the product)'));
  console.log(`  ALL           p10 ${pct(q(all, 0.10))}  median ${pct(q(all, 0.50))}  p75 ${pct(q(all, 0.75))}`);
  const names = [...byClass.keys()].sort();
  const scored = names.map((c) => {
    const v = byClass.get(c)!;
    const stat = spec ? (spec.stat === 'p10' ? q(v, 0.10) : spec.stat === 'median' ? q(v, 0.50) : q(v, 0.75)) : q(v, 0.75);
    return { c, v, stat };
  }).sort((a, b) => a.stat - b.stat);
  for (const { c, v, stat } of scored) {
    const bad = spec && stat < spec.bar;
    if (bad) failures++;
    console.log(`  ${c.padEnd(12)}  n=${String(v.length).padStart(3)}  p10 ${pct(q(v, 0.10))}  median ${pct(q(v, 0.50))}  p75 ${pct(q(v, 0.75))}` +
      (spec ? `   ${bad ? `⚠ NOT VIABLE (${spec.stat} ${pct(stat)} < ${pct(spec.bar)})` : 'ok'}` : ''));
  }
  if (spec) {
    const worst = scored[0];
    console.log(`  -> worst-served class: ${worst.c} (${spec.stat} ${pct(worst.stat)})`);
  }
}
console.log(`\n${failures ? `⚠ ${failures} class/tier viability failure(s)` : '✓ every class clears its tier bar'}`);
process.exit(failures ? 1 : 0);
