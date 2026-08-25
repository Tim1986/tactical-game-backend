/**
 * classValue.ts — [E0.5] What is a CLASS worth, and how does that change as
 * enemy HP scales? The measurement behind BALANCE_STAGE2_PLAN.md §2a.
 *
 * THE QUESTION. The difficulty dial is an enemy-HP multiplier, and the owner's
 * report is that it taxes damage classes only: "Fighter is absorbing hits,
 * Wizard is freezing, Cleric is sustaining. But Sorcerer dishes out burst
 * damage... In this environment, Sorcerer absolutely sucks." Control is worth
 * enemy TURNS and sustain is worth incoming DAMAGE — neither moves when enemy
 * HP rises — while every flat damage number is divided by the scale.
 *
 * THE METHOD, and why it is not the mistake the gift harness made. The old
 * giftHarness applied a change UNIFORMLY to the whole party and read
 * party-level means, which cannot answer a per-class question (the owner:
 * "aggregate nonsense"). Here ONE companion slot rotates through all 8
 * chassis while the other three are held fixed, so the win-rate difference
 * belongs to that one class. Two company templates (melee-heavy and
 * ranged-heavy) so a class is not judged only by who it stands next to.
 *
 * THE TAX IS THE SLOPE. Every cell records its authored hpScaleOverride, and
 * each class's per-cell delta is regressed against it. A class whose value is
 * scale-independent (control, sustain) has slope ≈ 0; a class paying the tax
 * has a negative slope. That number — points of win rate per +1.00 of enemy
 * HP multiplier — is what sizes CAMPAIGN_GROWTH's damage curve.
 *
 * ⚠ GIFTS ARE OFF. Deep Gifts are measurably mispriced right now
 * (giftPerClass_2026-08-24.json), so leaving them on would fold a bad policy
 * into the class signal. This measures the chassis+kit alone.
 *
 * ⚠ DUPLICATES. When the rotating class matches a fixed member the party runs
 * a duplicate (e.g. fighter/fighter/barbarian/cleric). Legal, and the delta is
 * still that slot's, but such rows carry a same-class synergy the others do
 * not — 2 of 16 rows per class.
 *
 * Usage: npx tsx src/ai/classValue.ts [--games 100] [--json out.json]
 */
import { simEncounterCell } from './campaignSim.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { CampaignDifficulty } from '../campaigns/types.js';

const GAMES = (() => { const i = process.argv.indexOf('--games'); return i > 0 ? Number(process.argv[i + 1]) : 100; })();

const CLASSES = ['fighter', 'barbarian', 'rogue', 'cleric', 'ranger', 'wizard', 'sorcerer', 'warlock'];

/** Rotating slot is a COMPANION (index 1) — rotating the main would also
 *  change main_dead exposure, which is a different variable. */
const ROT = 1;
const TEMPLATES: Record<string, string[]> = {
  meleeCo:  ['fighter', 'ROT', 'barbarian', 'cleric'],
  rangedCo: ['ranger', 'ROT', 'wizard', 'warlock'],
};

/** Cells spanning the authored scale range 0.68–1.95, mixed objective kinds,
 *  all at L5+ so the party is at or above the arena anchor. */
const CELLS: Array<{ camp: string; enc: string; diff: CampaignDifficulty; level: number }> = [
  { camp: 'sealeddeep',  enc: 'e7',  diff: 'medium', level: 6 },
  { camp: 'sealeddeep',  enc: 'e9',  diff: 'medium', level: 8 },
  { camp: 'sealeddeep',  enc: 'e12', diff: 'medium', level: 10 },
  { camp: 'sealeddeep',  enc: 'e9',  diff: 'hard',   level: 8 },
  { camp: 'sealeddeep',  enc: 'e6',  diff: 'medium', level: 5 },
  { camp: 'sealeddeep',  enc: 'e12', diff: 'hard',   level: 10 },
  { camp: 'sealeddeep',  enc: 'e6',  diff: 'hard',   level: 5 },
  { camp: 'unlitbeacon', enc: 'e9',  diff: 'medium', level: 8 },
  { camp: 'sealeddeep',  enc: 'e10', diff: 'medium', level: 9 },
  { camp: 'sealeddeep',  enc: 'e10', diff: 'hard',   level: 9 },
  { camp: 'unlitbeacon', enc: 'e11', diff: 'medium', level: 10 },
  { camp: 'unlitbeacon', enc: 'e12', diff: 'hard',   level: 10 },
];

const scaleOf = (camp: string, enc: string, diff: CampaignDifficulty): number =>
  CAMPAIGNS[camp].encounters[enc].hpScaleOverride?.[diff] ?? 1;

type Obs = { cls: string; template: string; scale: number; delta: number };
const obs: Obs[] = [];

for (const cell of CELLS) {
  const scale = scaleOf(cell.camp, cell.enc, cell.diff);
  for (const [tname, tmpl] of Object.entries(TEMPLATES)) {
    const wr: Record<string, number> = {};
    for (const cls of CLASSES) {
      const slugs = tmpl.map((x) => (x === 'ROT' ? cls : x));
      const r = simEncounterCell(cell.camp, cell.enc, cell.diff, tname, slugs, {
        games: GAMES, level: cell.level, seed: 11,
        gifts: ['none', 'none', 'none', 'none'],
      });
      wr[cls] = r.winRate;
    }
    const mean = CLASSES.reduce((s, c) => s + wr[c], 0) / CLASSES.length;
    for (const cls of CLASSES) obs.push({ cls, template: tname, scale, delta: wr[cls] - mean });
    console.log(`${cell.camp}/${cell.enc}/${cell.diff} scale ${scale.toFixed(2)} [${tname}] ` +
      CLASSES.map((c) => `${c.slice(0, 3)} ${(wr[c] * 100).toFixed(0)}`).join(' '));
  }
}

// ── per-class summary: mean delta, and the SLOPE vs scale (the tax) ──
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
console.log('\n=== PER-CLASS VALUE AND SCALE SENSITIVITY ===');
console.log('class       meanΔ   slope(pts per +1.00 hpScale)   n');
const summary: Array<{ cls: string; meanDelta: number; slope: number; se: number }> = [];
for (const cls of CLASSES) {
  const mine = obs.filter((o) => o.cls === cls);
  const xs = mine.map((o) => o.scale), ys = mine.map((o) => o.delta);
  const mx = mean(xs), my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  const sd = Math.sqrt(mean(ys.map((y) => (y - my) ** 2)));
  const se = sd / Math.sqrt(mine.length);
  summary.push({ cls, meanDelta: my, slope, se });
  console.log(`${cls.padEnd(11)} ${(my * 100 >= 0 ? '+' : '')}${(my * 100).toFixed(1)}    ` +
    `${(slope * 100 >= 0 ? '+' : '')}${(slope * 100).toFixed(1)}`.padEnd(30) + `${mine.length}  (SE ±${(se * 100).toFixed(1)})`);
}
console.log('\nA slope near 0 = the class does not care how fat enemies are.');
console.log('A negative slope = the damage tax, in points of win rate per +1.00 of scale.');

const ji = process.argv.indexOf('--json');
if (ji > 0) {
  import('node:fs').then(({ writeFileSync }) =>
    writeFileSync(process.argv[ji + 1], JSON.stringify({ obs, summary }, null, 2)));
}
