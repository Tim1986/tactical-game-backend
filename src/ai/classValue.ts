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
import { simEncounterCell, choicesForLevel } from './campaignSim.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { CampaignDifficulty } from '../campaigns/types.js';

const GAMES = (() => { const i = process.argv.indexOf('--games'); return i > 0 ? Number(process.argv[i + 1]) : 100; })();

/**
 * VARIANTS, not classes — because run 1 measured every class holding only
 * `specialOptions[0]`, and for the sorcerer that is `ffh`, the AoE RING. So
 * "sorcerer" scored its single best-case tool and nothing else, which is
 * exactly the inflation the owner flagged: "we can't count on aoe to make the
 * damage worth it, the ai brain is too good at playing around aoe, much of
 * the time you don't get good aoe targets."
 *
 * The eight defaults are kept for continuity with run 1; the alternates below
 * separate a class's AoE case from its single-target case, which is the
 * distinction that decides whether the sorcerer's problem is real.
 */
type Variant = { id: string; cls: string; special?: string };
const VARIANTS: Variant[] = [
  { id: 'fighter', cls: 'fighter' },
  { id: 'barbarian', cls: 'barbarian' },
  { id: 'rogue', cls: 'rogue' },
  { id: 'cleric', cls: 'cleric' },
  { id: 'ranger', cls: 'ranger' },
  { id: 'wizard', cls: 'wizard' },
  { id: 'sorcerer', cls: 'sorcerer' },              // ffh (AoE) — the default
  { id: 'warlock', cls: 'warlock' },
  { id: 'sorc:flame_jet', cls: 'sorcerer', special: 'flame_jet' },  // single-target
  { id: 'sorc:ignite', cls: 'sorcerer', special: 'ignite' },        // DoT
  { id: 'wiz:cold_snap', cls: 'wizard', special: 'cold_snap' },     // is wizard's edge freeze-specific?
  { id: 'rogue:dagger_toss', cls: 'rogue', special: 'dagger_toss' },// rogue's worst slope, ranged variant
];
const CLASSES = VARIANTS.map((v) => v.id);

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
  // 20 cells, both difficulties of each encounter so every objective kind
  // appears at two scales. Kinds covered: units_dead(boss) ×3, kill-all,
  // escape, escort, rooms, survive, dual-win.
  { camp: 'sealeddeep',  enc: 'e6',  diff: 'medium', level: 5 },
  { camp: 'sealeddeep',  enc: 'e6',  diff: 'hard',   level: 5 },
  { camp: 'sealeddeep',  enc: 'e7',  diff: 'medium', level: 6 },
  { camp: 'sealeddeep',  enc: 'e7',  diff: 'hard',   level: 6 },
  { camp: 'sealeddeep',  enc: 'e8',  diff: 'medium', level: 7 },
  { camp: 'sealeddeep',  enc: 'e8',  diff: 'hard',   level: 7 },
  { camp: 'sealeddeep',  enc: 'e9',  diff: 'medium', level: 8 },
  { camp: 'sealeddeep',  enc: 'e9',  diff: 'hard',   level: 8 },
  { camp: 'sealeddeep',  enc: 'e10', diff: 'medium', level: 9 },
  { camp: 'sealeddeep',  enc: 'e10', diff: 'hard',   level: 9 },
  { camp: 'sealeddeep',  enc: 'e12', diff: 'medium', level: 10 },
  { camp: 'sealeddeep',  enc: 'e12', diff: 'hard',   level: 10 },
  { camp: 'unlitbeacon', enc: 'e8',  diff: 'medium', level: 7 },
  { camp: 'unlitbeacon', enc: 'e8',  diff: 'hard',   level: 7 },
  { camp: 'unlitbeacon', enc: 'e9',  diff: 'medium', level: 8 },
  { camp: 'unlitbeacon', enc: 'e9',  diff: 'hard',   level: 8 },
  { camp: 'unlitbeacon', enc: 'e11', diff: 'medium', level: 10 },
  { camp: 'unlitbeacon', enc: 'e11', diff: 'hard',   level: 10 },
  { camp: 'unlitbeacon', enc: 'e12', diff: 'medium', level: 10 },
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
    for (const v of VARIANTS) {
      const slugs = tmpl.map((x) => (x === 'ROT' ? v.cls : x));
      // Default policy for every slot, then FORCE the rotating slot's special
      // when the variant names one — so "sorcerer with flame_jet" is a real,
      // separately-measured build rather than an average over choices.
      const base = choicesForLevel(slugs, cell.level, undefined, ['none', 'none', 'none', 'none']);
      if (v.special) base[ROT] = { ...base[ROT], specialSlug: v.special };
      const r = simEncounterCell(cell.camp, cell.enc, cell.diff, tname, slugs, {
        games: GAMES, level: cell.level, seed: 11, choicesOverride: base,
      });
      wr[v.id] = r.winRate;
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
console.log('variant           meanΔ           slope/+1.00 scale      significance');
const summary: Array<{ cls: string; meanDelta: number; slope: number; se: number; slopeSe: number; t: number }> = [];
for (const cls of CLASSES) {
  const mine = obs.filter((o) => o.cls === cls);
  const xs = mine.map((o) => o.scale), ys = mine.map((o) => o.delta);
  const mx = mean(xs), my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  // ⚠ SE of the SLOPE (run 1 printed the SE of the MEAN next to the slope,
  // which invited reading noise as signal — only 2 of 8 slopes were real).
  const inter = my - slope * mx;
  const resid = ys.map((y, i) => y - (inter + slope * xs[i]));
  const s2 = resid.reduce((s, r) => s + r * r, 0) / Math.max(1, mine.length - 2);
  const slopeSe = den === 0 ? 0 : Math.sqrt(s2 / den);
  const t = slopeSe ? slope / slopeSe : 0;
  const sd = Math.sqrt(mean(ys.map((y) => (y - my) ** 2)));
  const se = sd / Math.sqrt(mine.length);
  summary.push({ cls, meanDelta: my, slope, se, slopeSe, t });
  const verdict = Math.abs(t) >= 2 ? 'SIGNIFICANT' : Math.abs(t) >= 1.3 ? 'marginal' : 'noise';
  console.log(`${cls.padEnd(16)} ${(my * 100 >= 0 ? '+' : '')}${(my * 100).toFixed(1).padStart(5)} (±${(se * 100).toFixed(1)})  ` +
    `${(slope * 100 >= 0 ? '+' : '')}${(slope * 100).toFixed(1).padStart(6)} (±${(slopeSe * 100).toFixed(1)})  t=${t.toFixed(1).padStart(5)}  ${verdict}`);
}
console.log('\nA slope near 0 = the class does not care how fat enemies are.');
console.log('A negative slope = the damage tax, in points of win rate per +1.00 of scale.');

const ji = process.argv.indexOf('--json');
if (ji > 0) {
  import('node:fs').then(({ writeFileSync }) =>
    writeFileSync(process.argv[ji + 1], JSON.stringify({ obs, summary }, null, 2)));
}
