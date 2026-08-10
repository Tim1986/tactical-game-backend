/**
 * mergeGridParts.mjs — stitch the per-part Stage-E grid CSVs back into one
 * grid, then hand it to buildGridXlsx.mjs.
 *
 *   node scripts/mergeGridParts.mjs grids/fable_part*.csv -o grids/fable_grid.csv
 *
 * A full grid is 2268 rows (28 class pairs x 81 loadout combos) and takes
 * hours, so it is run as 7 disjoint parts (`--part 1..7`, split by the
 * alphabetically-first class of each pair). This merges them and REFUSES to
 * produce a grid that is silently wrong:
 *
 *   - every part must carry an identical header (a part run against a
 *     different reference panel, or a different panel size, would otherwise
 *     concatenate into a file whose columns don't mean the same thing);
 *   - no class pair may appear in two parts;
 *   - it reports which of the 28 pairs are present, so a partial merge is
 *     obvious rather than looking like a complete grid with a low row count.
 *
 * Output rows are sorted by pair then loadout, so the file is stable no matter
 * what order the parts finished in.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const oi = argv.indexOf('-o');
const out = oi >= 0 ? argv[oi + 1] : null;
const inputs = (oi >= 0 ? [...argv.slice(0, oi), ...argv.slice(oi + 2)] : argv).filter(Boolean);
if (!inputs.length || !out) {
  console.error('usage: mergeGridParts.mjs <part.csv...> -o <merged.csv>');
  process.exit(1);
}

let header = null;
const rowsByPair = new Map();   // pair -> rows[]
const pairSource = new Map();   // pair -> file that supplied it
let dupes = 0;

for (const file of inputs) {
  const lines = readFileSync(file, 'utf8').trim().split('\n');
  if (lines.length < 2) { console.error(`  ! ${file} has no data rows`); continue; }
  const h = lines[0];
  if (header === null) header = h;
  else if (h !== header) {
    console.error(`\nHEADER MISMATCH — refusing to merge.\n  ${inputs[0]}\n    ${header}\n  ${file}\n    ${h}`);
    console.error('\nParts must be run with the same --refs panel. Re-run the odd one out.');
    process.exit(1);
  }
  const pairsHere = new Set();
  for (const line of lines.slice(1)) {
    const pair = line.slice(0, line.indexOf(','));
    if (!rowsByPair.has(pair)) rowsByPair.set(pair, []);
    else if (!pairsHere.has(pair)) {
      console.error(`  ! duplicate pair ${pair}: in ${pairSource.get(pair)} and ${file}`);
      dupes++;
    }
    pairsHere.add(pair);
    if (!pairSource.has(pair)) pairSource.set(pair, file);
    if (pairSource.get(pair) === file) rowsByPair.get(pair).push(line);
  }
  console.log(`  ${file}: ${lines.length - 1} rows, ${pairsHere.size} pairs`);
}

if (dupes) {
  console.error(`\n${dupes} duplicated pair(s) — kept the first file's rows. Fix the inputs and re-run.`);
  process.exit(1);
}

const pairs = [...rowsByPair.keys()].sort();
const rows = pairs.flatMap((p) => rowsByPair.get(p).slice().sort());
writeFileSync(out, [header, ...rows].join('\n') + '\n');

console.log(`\nmerged → ${out}`);
console.log(`  ${pairs.length}/28 class pairs · ${rows.length}/2268 rows`);
if (pairs.length < 28) {
  console.log(`  INCOMPLETE — still missing ${28 - pairs.length} pair(s). Present:`);
  console.log('    ' + pairs.join(', '));
} else {
  console.log('  complete grid.');
}
console.log(`\nnext: node scripts/buildGridXlsx.mjs ${out} ${out.replace(/\.csv$/, '.xlsx')}`);
