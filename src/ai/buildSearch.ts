/**
 * buildSearch.ts — DIRECTED search for the strongest builds in a campaign.
 *
 * WHY THIS EXISTS (owner directive 2026-08-31). buildBattery samples the build
 * space and measures the DISTRIBUTION — walls, spread, medians. It never finds
 * the OPTIMUM: its "solvable" check is the max of K random draws at G=25, which
 * is both noisy and nowhere near the true top (a directed search beat the
 * sampled max by 30+ points on unlitbeacon nightmare). But nightmare's design
 * target is "very challenging but winnable for TOP OPTIMIZED BUILDS played
 * well" — a target you cannot verify without knowing what the top builds ARE.
 * This tool finds them.
 *
 * Method: coordinate ascent from curated archetype seeds.
 *   1. SCREEN  every seed on every encounter (cheap games).
 *   2. ASCEND  the best seeds: try every alternative for one lever at a time
 *      (each unit's special, passive, gift; each boon fork), evaluated on that
 *      build's current WORST encounters; keep a change only if the worst-cell
 *      win rate improves. Repeat until a full pass changes nothing.
 *   3. VERIFY  finalists on all encounters at high games. Only verified
 *      numbers leave this tool.
 *
 * The objective is MAXIMIN (worst encounter first, mean as tiebreak) because a
 * campaign is a gauntlet: a build that breezes eleven fights and bricks on the
 * twelfth does not clear the campaign.
 *
 * Boons are gated per encounter via boonsFor() — a build's chosen fork rewards
 * exist only for encounters after that fork (the buildBattery 2026-08-21
 * inflation bug, prevented structurally).
 *
 * Usage:
 *   npx tsx src/ai/buildSearch.ts <campaign> [--difficulty nightmare]
 *       [--screen 40] [--climb 80] [--verify 200] [--top 3] [--json out.json]
 */
import { simEncounterCell } from './campaignSim.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { DEFAULT_UNITS } from './defaultData.js';
import { DEEP_GIFTS, DeepGiftSlug } from '../campaigns/runtime.js';
import type { CampaignDifficulty, CampaignDefinition } from '../campaigns/types.js';
import { ARCHETYPE_SEEDS, Build, UnitBuild, choicesAt, boonsFor, PANEL_VERSION } from './balancePanels.js';
import { boonChoicesBefore } from './buildBattery.js';
import * as fs from 'node:fs';

const args = process.argv.slice(2);
const slug = args[0];
if (!slug || !CAMPAIGNS[slug]) { console.error('Usage: npx tsx src/ai/buildSearch.ts <campaign> [--difficulty d] ...'); process.exit(1); }
const campaign: CampaignDefinition = CAMPAIGNS[slug];
const get = (f: string, d: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : d; };
const DIFF = get('--difficulty', 'nightmare') as CampaignDifficulty;
const G_SCREEN = parseInt(get('--screen', '40'), 10);
const G_CLIMB = parseInt(get('--climb', '80'), 10);
const G_VERIFY = parseInt(get('--verify', '200'), 10);
const TOP = parseInt(get('--top', '3'), 10);
const encIds = Object.keys(campaign.encounters);

/** Every boon fork in the campaign, in graph order (union over encounters). */
function allForks(): string[][] {
  const seen = new Map<string, string[]>();
  for (const e of encIds) for (const f of boonChoicesBefore(campaign, e)) seen.set(f.join('|'), f);
  return [...seen.values()];
}
const FORKS = allForks();

/** Default boon choice: first option at every fork (overridden by ascent). */
const seedBoons = () => FORKS.map((f) => f[0]);

interface Evald { build: Build; rows: { enc: string; wr: number }[]; worst: number; worstEnc: string; mean: number }

function evalBuild(b: Build, encs: string[], games: number): Evald {
  const rows = encs.map((enc) => {
    const r = simEncounterCell(slug, enc, DIFF, b.name, b.units.map((u) => u.slug), {
      games,
      choicesOverride: choicesAt((campaign.encounters as any)[enc].level, b.units),
      boonKeys: boonsFor(campaign, enc, b.boons),
    });
    return { enc, wr: r.winRate };
  });
  const worst = rows.reduce((a, r) => Math.min(a, r.wr), 1);
  const worstEnc = rows.find((r) => r.wr === worst)!.enc;
  const mean = rows.reduce((a, r) => a + r.wr, 0) / rows.length;
  return { build: b, rows, worst, worstEnc, mean };
}

const better = (a: Evald, b: Evald) => a.worst > b.worst + 0.02 || (Math.abs(a.worst - b.worst) <= 0.02 && a.mean > b.mean + 0.03);

/** All single-lever mutations of a build. */
function* mutations(b: Build): Generator<Build> {
  for (let i = 0; i < b.units.length; i++) {
    const u = b.units[i];
    const def = DEFAULT_UNITS[u.slug];
    for (const sp of def.specialOptions) if (sp !== u.special) yield withUnit(b, i, { ...u, special: sp }, `u${i}.special=${sp}`);
    for (const pa of def.passiveOptions.map((p: any) => p.slug)) if (pa !== u.passive) yield withUnit(b, i, { ...u, passive: pa }, `u${i}.passive=${pa}`);
    for (const gi of Object.keys(DEEP_GIFTS) as DeepGiftSlug[]) if (gi !== u.gift) yield withUnit(b, i, { ...u, gift: gi }, `u${i}.gift=${gi}`);
  }
  for (let f = 0; f < FORKS.length; f++) {
    for (const opt of FORKS[f]) if (opt !== b.boons[f]) {
      const boons = [...b.boons]; boons[f] = opt;
      yield { ...b, boons, name: `${b.name}~boon=${opt}` };
    }
  }
}
const withUnit = (b: Build, i: number, u: UnitBuild, tag: string): Build => {
  const units = [...b.units]; units[i] = u;
  return { ...b, units, name: `${b.name}~${tag}` };
};

// ── 1. SCREEN ────────────────────────────────────────────────────────────────
console.log(`buildSearch ${slug}/${DIFF} — panels v${PANEL_VERSION} — screen ${G_SCREEN}g, climb ${G_CLIMB}g, verify ${G_VERIFY}g`);
const seeds: Build[] = ARCHETYPE_SEEDS.map((s) => ({ ...s, boons: seedBoons() }));
const screened = seeds.map((b) => evalBuild(b, encIds, G_SCREEN))
  .sort((x, y) => y.worst - x.worst || y.mean - x.mean);
for (const e of screened) console.log(`  screen ${e.build.name.padEnd(12)} worst ${(e.worst * 100).toFixed(0).padStart(3)}% (${e.worstEnc})  mean ${(e.mean * 100).toFixed(0)}%`);

// ── 2. ASCEND ────────────────────────────────────────────────────────────────
const finalists: Evald[] = [];
for (const start of screened.slice(0, TOP)) {
  // Climb on the build's 4 worst encounters — cheap, and they are the maximin
  // constraint. Re-verified on ALL encounters afterwards, so a lever that
  // helps the worst but wrecks an easy cell cannot sneak through.
  let cur = start;
  for (let pass = 0; pass < 3; pass++) {
    let improved = false;
    const focus = [...cur.rows].sort((a, b) => a.wr - b.wr).slice(0, 4).map((r) => r.enc);
    let curFocus = evalBuild(cur.build, focus, G_CLIMB);
    for (const m of mutations(cur.build)) {
      const cand = evalBuild(m, focus, G_CLIMB);
      if (better(cand, curFocus)) {
        curFocus = cand;
        cur = evalBuild(m, encIds, G_SCREEN);
        console.log(`    ${start.build.name}: keep ${m.name.split('~').pop()} → focus-worst ${(cand.worst * 100).toFixed(0)}%`);
        improved = true;
      }
    }
    if (!improved) break;
  }
  finalists.push(cur);
}

// ── 3. VERIFY ────────────────────────────────────────────────────────────────
console.log('\n─── VERIFY (full battery, high games) ───');
const verified = finalists.map((f) => evalBuild(f.build, encIds, G_VERIFY))
  .sort((x, y) => y.worst - x.worst || y.mean - x.mean);
for (const v of verified) {
  console.log(`\n${v.build.name}`);
  console.log(`  worst ${(v.worst * 100).toFixed(0)}% (${v.worstEnc})   mean ${(v.mean * 100).toFixed(0)}%`);
  console.log('  ' + v.rows.map((r) => `${r.enc}:${(r.wr * 100).toFixed(0)}`).join(' '));
  for (const u of v.build.units) console.log(`    ${u.slug}: ${u.special} + ${u.passive} + gift:${u.gift}`);
  console.log(`    boons: ${v.build.boons.join(', ')}`);
}
const out = get('--json', `balance_runs/search_${slug}_${DIFF}.json`);
fs.writeFileSync(out, JSON.stringify({ campaign: slug, difficulty: DIFF, panelVersion: PANEL_VERSION, when: new Date().toISOString(), games: { screen: G_SCREEN, climb: G_CLIMB, verify: G_VERIFY }, verified }, null, 1));
console.log(`\nwrote ${out}`);
