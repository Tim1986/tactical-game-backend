/**
 * buildGridXlsx.mjs — turn a Stage-E grid CSV into the owner's analysis
 * workbook. Three tabs:
 *   1. Grid          — every cell + analysis columns (sort by MEAN, col G)
 *   2. Class Ceiling — per-class top-10 mean / best / top-50 / top-100 counts.
 *                      This is the class-balance lens; all-cell averages are
 *                      deprecated (they flatter classes that need no synergy).
 *   3. References    — exactly what each reference party fields.
 * Usage: node scripts/buildGridXlsx.mjs <grid.csv> <out.xlsx>
 */
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';

const [, , csvPath, outPath] = process.argv;
if (!csvPath || !outPath) { console.error('usage: buildGridXlsx.mjs <csv> <xlsx>'); process.exit(1); }

const lines = readFileSync(csvPath, 'utf8').trim().split('\n');
const header = lines[0].split(',');
const data = lines.slice(1).map((l) => l.split(','));
const refCols = header.filter((h) => h.startsWith('Win % vs')).map((h) => h.replace('Win % vs ', ''));
const meanIdx = header.findIndex((h) => h.startsWith('Mean'));

const wb = new ExcelJS.Workbook();

// ── Tab 1: Grid ────────────────────────────────────────────────────────────
const g = wb.addWorksheet('Grid');
g.addRow(header);
for (const row of data) g.addRow(row.map((v, i) => (i >= 5 ? Number(v) : v)));
g.views = [{ state: 'frozen', ySplit: 1 }];
g.autoFilter = { from: { row: 1, column: 1 }, to: { row: data.length + 1, column: header.length } };
header.forEach((h, i) => { g.getColumn(i + 1).width = i < 5 ? 18 : Math.max(12, h.length + 2); });

// ── Tab 2: Class Ceiling ───────────────────────────────────────────────────
const withMean = data.map((r) => ({ r, m: Number(r[meanIdx]) })).sort((a, b) => b.m - a.m);
withMean.forEach((x, i) => { x.rank = i + 1; });
const classes = [...new Set(data.flatMap((r) => r[0].split('/')))].sort();
const c = wb.addWorksheet('Class Ceiling');
c.addRow(['Class', 'Top-10 Mean', 'Best Cell', 'In Global Top 50', 'In Global Top 100', 'Cells']);
c.addRow([]);
const stats = classes.map((cls) => {
  const mine = withMean.filter((x) => x.r[0].split('/').includes(cls));
  const top10 = mine.slice(0, 10);
  return {
    cls,
    top10: top10.reduce((a, b) => a + b.m, 0) / (top10.length || 1),
    best: mine.length ? mine[0].m : 0,
    t50: mine.filter((x) => x.rank <= 50).length,
    t100: mine.filter((x) => x.rank <= 100).length,
    n: mine.length,
  };
}).sort((a, b) => b.top10 - a.top10);
c.spliceRows(2, 1);
for (const s of stats) c.addRow([s.cls, Number(s.top10.toFixed(1)), s.best, s.t50, s.t100, s.n]);
c.addRow([]);
c.addRow(['NOTE: judge classes by CEILING (top-10 mean, top-50/100 counts), not by averaging']);
c.addRow(['all their cells — the grid runs every permutation, so most cells are builds nobody']);
c.addRow(['would field. All-cell means flatter classes that need no synergy (Fighter) and']);
c.addRow(['punish synergy-dependent ones (Barbarian, Warlock).']);
c.views = [{ state: 'frozen', ySplit: 1 }];
[16, 13, 11, 18, 19, 9].forEach((w, i) => { c.getColumn(i + 1).width = w; });

// ── Tab 3: References ──────────────────────────────────────────────────────
const REF_DEFS = JSON.parse(readFileSync(new URL('./referenceParties.json', import.meta.url), 'utf8'));
const rs = wb.addWorksheet('References');
rs.addRow(['Reference', 'Style', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4']);
for (const name of refCols) {
  const d = REF_DEFS[name];
  rs.addRow(d ? [name, d.style, ...d.units] : [name, '(undocumented)', '', '', '', '']);
}
rs.views = [{ state: 'frozen', ySplit: 1 }];
[14, 30, 30, 30, 30, 30].forEach((w, i) => { rs.getColumn(i + 1).width = w; });

await wb.xlsx.writeFile(outPath);
console.log(`wrote ${outPath}: ${data.length} cells, ${classes.length} classes, ${refCols.length} references`);
