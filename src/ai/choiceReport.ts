/**
 * choiceReport.ts — per-CHOICE elasticity: the no-auto-pick / no-trap detector.
 *
 * WHY (owner directive 2026-08-31). Choices must be MEANINGFUL: an option may
 * be the clear favorite for one archetype only if a sibling is the best pick
 * for a different, itself-viable archetype. buildBattery samples choices but
 * never aggregates BY choice, so a boon that lost in every sampled build
 * (snowshoes) stayed invisible inside distribution statistics. This tool holds
 * everything else constant and swaps ONE lever at a time, across several
 * archetype contexts, and reports who wins where.
 *
 * For every axis (each class's specials, each class's passives, each class's
 * gifts, each boon fork) × every context build that carries the class:
 *   Δ(option, context) = winRate(context with option) − winRate(best sibling in context)
 * An option's health is its BEST Δ across contexts:
 *   ≥ −3pts somewhere    → HEALTHY (it is the pick, or tied, in some archetype)
 *   < −3 and ≥ −8 pts    → WEAK (never the pick, but close enough to survive)
 *   < −8 pts everywhere  → TRAP (nobody should ever take it — a design bug)
 * And an axis has an AUTO-PICK when one option beats EVERY sibling in EVERY
 * context by ≥8pts — the size that makes the others dead on arrival.
 *
 * Thresholds: 8pts ≈ 2× the binomial SE at G=100 near 50% (±5pts, 95% CI
 * ±10) — treat single-run flags near the line as candidates, and re-run the
 * flagged axis at --games 300 before editing content on its account.
 *
 * Usage:
 *   npx tsx src/ai/choiceReport.ts <campaign> [--difficulty medium]
 *       [--games 100] [--encounters e2,e5,e8,e11] [--axis boons|gifts|passives|specials]
 */
import { simEncounterCell } from './campaignSim.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { DEFAULT_UNITS } from './defaultData.js';
import { DEEP_GIFTS, DeepGiftSlug } from '../campaigns/runtime.js';
import type { CampaignDifficulty, CampaignDefinition } from '../campaigns/types.js';
import { ARCHETYPE_SEEDS, Build, choicesAt, boonsFor, PANEL_VERSION } from './balancePanels.js';
import { boonChoicesBefore } from './buildBattery.js';
import * as fs from 'node:fs';

const args = process.argv.slice(2);
const slug = args[0];
if (!slug || !CAMPAIGNS[slug]) { console.error('Usage: npx tsx src/ai/choiceReport.ts <campaign> ...'); process.exit(1); }
const campaign: CampaignDefinition = CAMPAIGNS[slug];
const get = (f: string, d: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : d; };
const DIFF = get('--difficulty', 'medium') as CampaignDifficulty;
const GAMES = parseInt(get('--games', '100'), 10);
const AXIS = get('--axis', 'all');
const encAll = Object.keys(campaign.encounters);
// Default slate: 4 encounters spread across the level curve — enough coverage
// to catch level-dependent choices (a gift only matters L7+) at 1/3 the cost.
const defSlate = [encAll[1], encAll[Math.floor(encAll.length / 3)], encAll[Math.floor((2 * encAll.length) / 3)], encAll[encAll.length - 2]];
const SLATE = get('--encounters', defSlate.join(',')).split(',');

const forksSeen = new Map<string, string[]>();
for (const e of encAll) for (const f of boonChoicesBefore(campaign, e)) forksSeen.set(f.join('|'), f);
const FORKS = [...forksSeen.values()];

function meanWr(b: Build): number {
  let t = 0;
  for (const enc of SLATE) {
    t += simEncounterCell(slug, enc, DIFF, b.name, b.units.map((u) => u.slug), {
      games: GAMES,
      choicesOverride: choicesAt((campaign.encounters as any)[enc].level, b.units),
      boonKeys: boonsFor(campaign, enc, b.boons),
    }).winRate;
  }
  return t / SLATE.length;
}

const contexts: Build[] = ARCHETYPE_SEEDS.map((s) => ({ ...s, boons: FORKS.map((f) => f[0]) }));
interface AxisRow { axis: string; option: string; byContext: Record<string, number>; bestDelta: number; verdict: string }
const report: AxisRow[] = [];

function judge(axis: string, options: string[], evalOpt: (opt: string, ctx: Build) => Build, ctxFilter: (b: Build) => boolean) {
  const usable = contexts.filter(ctxFilter);
  if (!usable.length) return;
  // wr[option][context]
  const wr = new Map<string, Map<string, number>>();
  for (const ctx of usable) {
    for (const opt of options) {
      const b = evalOpt(opt, ctx);
      (wr.get(opt) ?? wr.set(opt, new Map()).get(opt)!).set(ctx.name, meanWr(b));
    }
  }
  const rows: AxisRow[] = options.map((opt) => {
    const byContext: Record<string, number> = {};
    let bestDelta = -1;
    for (const ctx of usable) {
      const mine = wr.get(opt)!.get(ctx.name)!;
      const bestSib = Math.max(...options.filter((o) => o !== opt).map((o) => wr.get(o)!.get(ctx.name)!));
      const d = mine - bestSib;
      byContext[ctx.name] = d;
      bestDelta = Math.max(bestDelta, d);
    }
    const verdict = bestDelta >= -0.03 ? 'HEALTHY' : bestDelta >= -0.08 ? 'WEAK' : 'TRAP';
    return { axis, option: opt, byContext, bestDelta, verdict };
  });
  const auto = rows.find((r) => options.filter((o) => o !== r.option)
    .every((o) => usable.every((c) => (wr.get(r.option)!.get(c.name)! - wr.get(o)!.get(c.name)!) >= 0.08)));
  for (const r of rows) {
    if (auto && r.option === auto.option) r.verdict = 'AUTO-PICK';
    report.push(r);
    const ctxBits = Object.entries(r.byContext).map(([c, d]) => `${c}:${(d * 100).toFixed(0)}`).join(' ');
    console.log(`  ${axis.padEnd(26)} ${r.option.padEnd(16)} ${r.verdict.padEnd(9)} bestΔ ${(r.bestDelta * 100).toFixed(0).padStart(4)}  [${ctxBits}]`);
  }
}

console.log(`choiceReport ${slug}/${DIFF} — slate ${SLATE.join(',')} — ${GAMES}g — panels v${PANEL_VERSION}\n`);
if (AXIS === 'all' || AXIS === 'boons') {
  for (let f = 0; f < FORKS.length; f++) {
    judge(`boon-fork#${f}`, FORKS[f], (opt, ctx) => {
      const boons = [...ctx.boons]; boons[f] = opt;
      return { ...ctx, boons, name: ctx.name };
    }, () => true);
  }
}
for (const cls of Object.keys(DEFAULT_UNITS)) {
  const def = DEFAULT_UNITS[cls];
  const has = (b: Build) => b.units.some((u) => u.slug === cls);
  if (AXIS === 'all' || AXIS === 'specials')
    judge(`${cls}.special`, def.specialOptions, (opt, ctx) => ({ ...ctx, units: ctx.units.map((u) => u.slug === cls ? { ...u, special: opt } : u) }), has);
  if (AXIS === 'all' || AXIS === 'passives')
    judge(`${cls}.passive`, def.passiveOptions.map((p: any) => p.slug), (opt, ctx) => ({ ...ctx, units: ctx.units.map((u) => u.slug === cls ? { ...u, passive: opt } : u) }), has);
  if (AXIS === 'all' || AXIS === 'gifts')
    judge(`${cls}.gift`, Object.keys(DEEP_GIFTS), (opt, ctx) => ({ ...ctx, units: ctx.units.map((u) => u.slug === cls ? { ...u, gift: opt as DeepGiftSlug } : u) }), has);
}
const out = `balance_runs/choices_${slug}_${DIFF}.json`;
fs.writeFileSync(out, JSON.stringify({ campaign: slug, difficulty: DIFF, slate: SLATE, games: GAMES, panelVersion: PANEL_VERSION, when: new Date().toISOString(), report }, null, 1));
console.log(`\nTRAPS: ${report.filter((r) => r.verdict === 'TRAP').map((r) => `${r.axis}:${r.option}`).join(', ') || 'none'}`);
console.log(`AUTO-PICKS: ${report.filter((r) => r.verdict === 'AUTO-PICK').map((r) => `${r.axis}:${r.option}`).join(', ') || 'none'}`);
console.log(`wrote ${out}`);
