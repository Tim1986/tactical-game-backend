/**
 * giftHarness.ts — [E0.4] Measures what a Deep Gift is actually WORTH.
 *
 * WHY THIS EXISTS
 * The Deep Gift menu (+1 damage / +1 movement / +2 AC, DEEP_GIFTS in
 * campaigns/runtime.ts) is a CHOICE, and a choice is only real if different
 * parties want different things. A gift every party always takes, or one no
 * party ever takes, is a non-choice — the exact failure that killed the boon
 * menu in E1. This harness measures each gift's win-rate delta against a
 * giftless baseline, per representative party, so the values can be revised
 * on evidence instead of taste.
 *
 * Usage:
 *   npx tsx src/ai/giftHarness.ts --pilot            # find mid-band cells first
 *   npx tsx src/ai/giftHarness.ts --games 200        # the measurement
 *   npx tsx src/ai/giftHarness.ts --json out.json
 *
 * ⚠ THE CEILING TRAP. Every shipped encounter is tuned for L1–L5, but gifts
 * only exist at L7+. Run a gifted party against L3 content and it wins ~100%
 * of the time, where NO gift can show any value — the measurement would read
 * "all gifts are worthless" and be pure artifact. So the harness runs a PILOT
 * first and measures only in cells whose giftless baseline lands mid-band
 * (BAND_LO..BAND_HI), where a delta in either direction is actually visible.
 * Campaign 2's own content will be tuned at L7+, so re-run this against it
 * once E2 exists rather than trusting these proxy cells forever.
 */
import { simEncounterCell, REPRESENTATIVE_PARTIES } from './campaignSim.js';
import { CAMPAIGNS } from '../campaigns/index.js';
import { DEEP_GIFTS, DeepGiftSlug } from '../campaigns/runtime.js';
import { CampaignDifficulty } from '../campaigns/types.js';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';

/** Cells outside this baseline range are dropped: too easy and every gift
 *  reads as worthless, too hard and every gift reads as worthless. */
const BAND_LO = 0.25;
const BAND_HI = 0.80;

const GIFTS = Object.keys(DEEP_GIFTS) as DeepGiftSlug[];

type Cell = { campaign: string; encounter: string; difficulty: CampaignDifficulty };

/** Every (campaign, encounter, difficulty) worth piloting. Level is forced to
 *  8 so all four party members carry a gift. */
function allCells(): Cell[] {
  const out: Cell[] = [];
  for (const [slug, camp] of Object.entries(CAMPAIGNS)) {
    for (const encounter of Object.keys(camp.encounters)) {
      for (const difficulty of ['hard', 'nightmare'] as CampaignDifficulty[]) {
        out.push({ campaign: slug, encounter, difficulty });
      }
    }
  }
  return out;
}

const LEVEL = 8;
const NONE = ['none', 'none', 'none', 'none'] as const;

function baselineOf(cell: Cell, party: string, slugs: string[], games: number): number {
  return simEncounterCell(cell.campaign, cell.encounter, cell.difficulty, party, slugs, {
    games, level: LEVEL, gifts: [...NONE],
  }).winRate;
}

const args = process.argv.slice(2);
const getArg = (f: string) => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : undefined; };
const pilotOnly = args.includes('--pilot');
const games = parseInt(getArg('--games') ?? '200', 10);
const pilotGames = parseInt(getArg('--pilot-games') ?? '60', 10);

if (process.platform === 'darwin') {
  try { spawn('caffeinate', ['-i', '-w', String(process.pid)], { detached: true, stdio: 'ignore' }).unref(); }
  catch { /* proceed uncaffeinated */ }
}

// ── PILOT: which cells can actually show a delta? ────────────────────────────
console.log(`PILOT (${pilotGames} games/cell, L${LEVEL}, giftless) — finding cells with a visible band\n`);
const usable: { cell: Cell; party: string; slugs: string[]; baseline: number }[] = [];
for (const cell of allCells()) {
  for (const [party, slugs] of Object.entries(REPRESENTATIVE_PARTIES)) {
    const baseline = baselineOf(cell, party, slugs, pilotGames);
    const ok = baseline >= BAND_LO && baseline <= BAND_HI;
    if (ok) usable.push({ cell, party, slugs, baseline });
    console.log(`  ${cell.campaign.padEnd(13)} ${cell.encounter} ${cell.difficulty.padEnd(10)} ${party.padEnd(9)} ${(baseline * 100).toFixed(0).padStart(3)}%  ${ok ? 'USABLE' : 'ceiling/floor — dropped'}`);
  }
}
console.log(`\n${usable.length} usable (cell, party) pairs of ${allCells().length * 3}.`);
if (pilotOnly) process.exit(0);
if (usable.length === 0) {
  console.error('✗ No usable cells — every baseline hit a ceiling or floor. Widen BAND_LO/BAND_HI or add harder content.');
  process.exit(2);
}

// ── MEASUREMENT: each gift vs the giftless baseline, in usable cells only ────
console.log(`\nMEASURING (${games} games/cell) — ${usable.length} pairs x ${GIFTS.length + 1} conditions\n`);
type Row = { cell: Cell; party: string; baseline: number; deltas: Record<string, number> };
const rows: Row[] = [];
for (const u of usable) {
  const baseline = baselineOf(u.cell, u.party, u.slugs, games);
  const deltas: Record<string, number> = {};
  for (const g of GIFTS) {
    const wr = simEncounterCell(u.cell.campaign, u.cell.encounter, u.cell.difficulty, u.party, u.slugs, {
      games, level: LEVEL, gifts: [g, g, g, g],
    }).winRate;
    deltas[g] = wr - baseline;
  }
  rows.push({ cell: u.cell, party: u.party, baseline, deltas });
  const d = GIFTS.map((g) => `${g} ${(deltas[g] * 100 >= 0 ? '+' : '')}${(deltas[g] * 100).toFixed(1)}`).join('  ');
  console.log(`  ${u.cell.campaign.padEnd(13)} ${u.cell.encounter} ${u.cell.difficulty.padEnd(10)} ${u.party.padEnd(9)} base ${(baseline * 100).toFixed(0).padStart(3)}%  ${d}`);
}

// ── VERDICT ─────────────────────────────────────────────────────────────────
// ⚠ Individual rows above are INSIDE NOISE: at 200 games a cell's win rate has
// a ~3.5pt binomial SE, so a row's delta carries ~5pt. Only the aggregated
// means below are decision-grade (~1.4pt SE over ~13 cells per party).
console.log('\n── PER-PARTY MEAN DELTA (win-rate points) ──');
console.log('   (rows above are inside noise; only these means are decision-grade)');
const byParty: Record<string, Record<string, number[]>> = {};
for (const r of rows) {
  byParty[r.party] ??= {};
  for (const g of GIFTS) (byParty[r.party][g] ??= []).push(r.deltas[g]);
}
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const winners: Record<string, string> = {};
for (const [party, gs] of Object.entries(byParty)) {
  const line = GIFTS.map((g) => `${g} ${(mean(gs[g]) * 100 >= 0 ? '+' : '')}${(mean(gs[g]) * 100).toFixed(1)}`).join('  ');
  const best = GIFTS.reduce((a, b) => (mean(gs[a]) >= mean(gs[b]) ? a : b));
  winners[party] = best;
  console.log(`  ${party.padEnd(9)} ${line}   → prefers ${best}`);
}

// ── The axis that actually matters: OBJECTIVE SHAPE ─────────────────────────
// Party archetype turned out NOT to be the differentiating axis (E0.4: all
// three parties rank the gifts the same way). What differentiates is whether
// the encounter asks you to REACH somewhere. Derived from the content's own
// win conditions rather than hardcoded encounter names, so it keeps working
// for campaign 2.
const POSITIONAL_KINDS = new Set(['units_at_tiles', 'ally_at_tiles']);
type Enc = {
  objective?: { win?: { kind: string; simultaneous?: boolean }[]; loss?: { kind: string }[] };
  rooms?: unknown[]; waves?: unknown[]; allies?: unknown; terrain?: { hazards?: unknown[] };
};
function encOf(cell: Cell): Enc | undefined {
  return CAMPAIGNS[cell.campaign]?.encounters[cell.encounter] as Enc | undefined;
}
function isPositional(cell: Cell): boolean {
  return (encOf(cell)?.objective?.win ?? []).some((w) => POSITIONAL_KINDS.has(w.kind));
}
/**
 * Fine-grained objective SHAPE, derived from the content itself (there is no
 * `type` field in the schema — palette names are doc labels only).
 *
 * ⚠ Why this is finer than the positional/non-positional split: a binary bucket
 * lumps `escape` (movement +41) together with `escort` (movement +0.4), and the
 * average erases exactly the inversion that makes the menu a real choice. Always
 * read the per-shape table before concluding a gift is an auto-pick.
 */
function shapeOf(cell: Cell): string {
  const e = encOf(cell);
  if (!e) return 'unknown';
  const win = e.objective?.win ?? [];
  const loss = e.objective?.loss ?? [];
  if (win.some((w) => w.kind === 'ally_at_tiles')) return 'escort';
  if (win.some((w) => w.kind === 'units_at_tiles' && w.simultaneous)) return 'hold';
  if (win.some((w) => w.kind === 'units_at_tiles')) return 'escape';
  if (win.some((w) => w.kind === 'round_reached')) return 'survive';
  if (e.rooms?.length) return 'rooms';
  if (loss.some((l) => l.kind === 'round_reached')) return 'race';
  if (e.waves?.length) return 'siege';
  if (win.some((w) => w.kind === 'units_dead')) return 'boss';
  if (e.terrain?.hazards?.length) return 'hazard';
  return 'kill-all';
}
console.log('\n── BY OBJECTIVE SHAPE (the axis that actually differentiates) ──');
const byShape = new Map<string, Row[]>();
for (const r of rows) {
  const k = shapeOf(r.cell);
  byShape.set(k, [...(byShape.get(k) ?? []), r]);
}
const shapeBest = new Map<string, string>();
for (const [shape, sub] of [...byShape].sort()) {
  const line = GIFTS.map((g) => {
    const m = mean(sub.flatMap((r) => r.deltas[g])) * 100;
    return `${g} ${m >= 0 ? '+' : ''}${m.toFixed(1)}`;
  }).join('  ');
  const best = GIFTS.reduce((a, b) => (mean(sub.flatMap((r) => r.deltas[a])) >= mean(sub.flatMap((r) => r.deltas[b])) ? a : b));
  shapeBest.set(shape, best);
  // n is small per shape — flag when a "preference" rests on too little data.
  const thin = sub.length < 4 ? '  ⚠ thin (n<4, treat as suggestive)' : '';
  console.log(`  ${shape.padEnd(9)} n=${String(sub.length).padEnd(3)} ${line}   → prefers ${best}${thin}`);
}

console.log('\n── IS IT A REAL CHOICE? ──');
// A gift is DEAD only if it never wins anywhere. Winning some encounter shapes
// and losing others is the DESIGN GOAL (owner: strong in one fight, dead weight
// in the next), not a failure.
const shapes: [string, Row[]][] = [...byShape];
const shapeWinners = [...shapeBest];
const distinctShape = new Set(shapeBest.values());
const distinctParty = new Set(Object.values(winners));
if (distinctShape.size > 1) {
  console.log(`  ✓ YES — different ENCOUNTER SHAPES prefer different gifts (${shapeWinners.map(([l, g]) => `${l}:${g}`).join(', ')}).`);
  console.log('    A permanent pick made against a mixed campaign is therefore a real strategic bet.');
} else if (distinctParty.size > 1) {
  console.log(`  ✓ YES — different parties prefer different gifts (${Object.entries(winners).map(([p, g]) => `${p}:${g}`).join(', ')}).`);
} else {
  console.log(`  ~ Not on these axes: every party AND every encounter shape prefers "${[...distinctShape][0]}".`);
  console.log('    Check per-encounter-type rows before buffing — a gift that wins one TYPE decisively is still a real choice.');
}
const overallMeans = GIFTS.map((g) => ({ g, m: mean(rows.flatMap((r) => r.deltas[g])) }));
for (const { g, m } of overallMeans) {
  const bestAnywhere = shapes.some(([, sub]) => sub.length && GIFTS.reduce((a, b) => (mean(sub.flatMap((r) => r.deltas[a])) >= mean(sub.flatMap((r) => r.deltas[b])) ? a : b)) === g);
  if (m * 100 < 1.0 && !bestAnywhere) {
    console.log(`  ⚠ "${g}" is worth ${(m * 100).toFixed(1)} pts overall and wins nowhere — a DEAD option. Buff it.`);
  }
}

const jsonPath = getArg('--json');
if (jsonPath) {
  fs.writeFileSync(jsonPath, JSON.stringify({ level: LEVEL, games, rows, winners, overallMeans }, null, 2));
  console.log(`\nJSON written: ${jsonPath}`);
}
