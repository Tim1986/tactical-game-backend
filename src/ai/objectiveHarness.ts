/**
 * objectiveHarness.ts — before/after regression harness for BRAIN changes.
 *
 * WHY. The brain plays kill-everything well and objectives badly, and the gap
 * is large enough to invert difficulty ordering: the owner found unlitbeacon
 * e2 (a fight) HARDER than e3 (an objective) while the sim scored them 100%
 * and 70% (2026-08-31). Fixing that means editing the most load-bearing file
 * in the project, so nothing gets edited until "did it get better" is a
 * NUMBER rather than a vibe.
 *
 * Two panels, and the control panel is the point:
 *   OBJECTIVE cells — the ones we are trying to improve.
 *   FIGHT cells     — the control. A brain change that lifts objectives while
 *                     quietly wrecking ordinary combat is a REGRESSION, and
 *                     without this panel it would look like a win.
 *
 * Reports win rate AND margin (party HP at win), because win rate saturates —
 * a cell can go 100% -> 100% while the fight underneath changes completely.
 *
 * Usage:
 *   npx tsx src/ai/objectiveHarness.ts <campaign> [--games 100] [--json out.json]
 *   npx tsx src/ai/objectiveHarness.ts --diff before.json after.json
 */
import { simEncounterCell, REPRESENTATIVE_PARTIES } from './campaignSim.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import type { CampaignDifficulty } from '../campaigns/types.js';
import * as fs from 'node:fs';

const FIGHT_WINS = new Set(['all_enemies_dead', 'units_dead']);
const DIFFS: CampaignDifficulty[] = ['medium', 'nightmare'];

/** FIGHT vs OBJECTIVE, read off the encounter's own win conditions. Absent
 *  objective = plain kill-them-all, the arena default. */
function kindOf(campaign: any, encId: string): 'FIGHT' | 'OBJ' {
  const win = campaign.encounters[encId]?.objective?.win;
  if (!win || win.length === 0) return 'FIGHT';
  return win.every((w: any) => FIGHT_WINS.has(w.kind)) ? 'FIGHT' : 'OBJ';
}

interface Row {
  encounter: string; kind: 'FIGHT' | 'OBJ'; difficulty: string; party: string;
  winRate: number; marginHpPct?: number; winTurns?: number;
}

const args = process.argv.slice(2);

if (args[0] === '--diff') {
  const a = JSON.parse(fs.readFileSync(args[1], 'utf8')) as { rows: Row[] };
  const b = JSON.parse(fs.readFileSync(args[2], 'utf8')) as { rows: Row[] };
  const keyOf = (r: Row) => `${r.encounter}|${r.difficulty}|${r.party}`;
  const before = new Map(a.rows.map((r) => [keyOf(r), r]));
  console.log(`\n${args[1]}  ->  ${args[2]}\n`);
  console.log('%s', 'enc  kind  difficulty  party      win%    Δwin   margin%  Δmargin');
  const agg: Record<string, { n: number; dw: number; dm: number }> = {
    FIGHT: { n: 0, dw: 0, dm: 0 }, OBJ: { n: 0, dw: 0, dm: 0 },
  };
  for (const r of b.rows) {
    const p = before.get(keyOf(r));
    if (!p) continue;
    const dw = (r.winRate - p.winRate) * 100;
    const dm = ((r.marginHpPct ?? 0) - (p.marginHpPct ?? 0)) * 100;
    agg[r.kind].n++; agg[r.kind].dw += dw; agg[r.kind].dm += dm;
    const mark = Math.abs(dw) >= 5 ? (dw > 0 ? ' ↑' : ' ↓') : '  ';
    console.log(
      `${r.encounter.padEnd(4)} ${r.kind.padEnd(5)} ${r.difficulty.padEnd(11)} ${r.party.padEnd(9)}` +
      `${(r.winRate * 100).toFixed(0).padStart(4)}%  ${dw >= 0 ? '+' : ''}${dw.toFixed(0).padStart(4)}${mark}` +
      `   ${((r.marginHpPct ?? 0) * 100).toFixed(0).padStart(4)}%   ${dm >= 0 ? '+' : ''}${dm.toFixed(0).padStart(4)}`);
  }
  console.log('\n─── mean change ───');
  for (const k of ['OBJ', 'FIGHT'] as const) {
    const g = agg[k];
    if (!g.n) continue;
    console.log(`  ${k.padEnd(5)} n=${String(g.n).padStart(3)}   win ${g.dw / g.n >= 0 ? '+' : ''}${(g.dw / g.n).toFixed(1)}pts   margin ${g.dm / g.n >= 0 ? '+' : ''}${(g.dm / g.n).toFixed(1)}pts`);
  }
  console.log('\n⚠ OBJ should rise. FIGHT is the CONTROL — a big move there is a regression,\n  not a bonus, and must be explained before the change ships.');
  process.exit(0);
}

const slug = args[0];
if (!slug || !CAMPAIGNS[slug]) { console.error('Usage: npx tsx src/ai/objectiveHarness.ts <campaign> [--games N] [--json out]'); process.exit(1); }
const campaign = CAMPAIGNS[slug];
const get = (f: string, d: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : d; };
const GAMES = parseInt(get('--games', '100'), 10);
const out = get('--json', `balance_runs/objharness_${slug}.json`);

const rows: Row[] = [];
console.log(`objectiveHarness ${slug} — ${GAMES} games/cell — OBJ panel + FIGHT control\n`);
console.log('enc  kind  difficulty  party      win%   margin%  turns');
for (const encId of Object.keys(campaign.encounters)) {
  const kind = kindOf(campaign, encId);
  for (const diff of DIFFS) {
    for (const [pname, pslugs] of Object.entries(REPRESENTATIVE_PARTIES)) {
      const r = simEncounterCell(slug, encId, diff, pname, pslugs, { games: GAMES });
      rows.push({ encounter: encId, kind, difficulty: diff, party: pname,
        winRate: r.winRate, marginHpPct: r.marginHpPct, winTurns: r.winTurns });
      console.log(
        `${encId.padEnd(4)} ${kind.padEnd(5)} ${diff.padEnd(11)} ${pname.padEnd(9)}` +
        `${(r.winRate * 100).toFixed(0).padStart(4)}%   ${((r.marginHpPct ?? 0) * 100).toFixed(0).padStart(4)}%   ${(r.winTurns ?? 0).toFixed(0).padStart(3)}`);
    }
  }
}
const objRows = rows.filter((r) => r.kind === 'OBJ');
const fightRows = rows.filter((r) => r.kind === 'FIGHT');
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
console.log(`\nOBJ   mean win ${(mean(objRows.map((r) => r.winRate)) * 100).toFixed(1)}%   mean margin ${(mean(objRows.map((r) => r.marginHpPct ?? 0)) * 100).toFixed(1)}%   (n=${objRows.length})`);
console.log(`FIGHT mean win ${(mean(fightRows.map((r) => r.winRate)) * 100).toFixed(1)}%   mean margin ${(mean(fightRows.map((r) => r.marginHpPct ?? 0)) * 100).toFixed(1)}%   (n=${fightRows.length})`);
fs.writeFileSync(out, JSON.stringify({ campaign: slug, games: GAMES, when: new Date().toISOString(), rows }, null, 1));
console.log(`\nwrote ${out}`);
