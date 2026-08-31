#!/bin/zsh
# POST re-baseline battery, 2026-08-31. New brain (BR2/BR2b/BR3/DOOR2),
# repaired ladders (LADDER1), scaled specials (A3), tier levers (B4-B7).
set -e
cd ~/Claude/backend
OUT=balance_runs
# SCOPED TO UNLIT BEACON (owner, 2026-08-31): balance this one well first,
# the others follow more efficiently from a proven process.
echo "=== SMOKE ==="
npx tsx src/ai/campaignSim.ts unlitbeacon --smoke 2>&1 | tail -1
echo "=== FULL GRID unlitbeacon, 150 games ==="
npx tsx src/ai/campaignSim.ts unlitbeacon --games 150 --json $OUT/battery_unlitbeacon_POST.json 2>&1 | tail -60
echo "=== CASUAL GRID unlitbeacon (easy-tier shape gate), 100 games ==="
cat > /tmp/casual_grid.mts <<'TS'
import { simEncounterCell } from './src/ai/campaignSim.js';
import { CAMPAIGNS } from './src/campaigns/index.js';
import { writeFileSync } from 'fs';
const P = ['barbarian','sorcerer','warlock','rogue'];
const rows: unknown[] = [];
for (const enc of Object.keys(CAMPAIGNS.unlitbeacon.encounters)) {
  for (const d of ['easy','medium','hard','nightmare'] as const) {
    const c = simEncounterCell('unlitbeacon', enc, d, 'custom', P, { games: 100, playerBrain: 'casual' });
    const o = simEncounterCell('unlitbeacon', enc, d, 'custom', P, { games: 100 });
    rows.push({ enc, d, casual: c.winRate, optimal: o.winRate, marginOpt: o.marginHpPct });
    console.log(`${enc} ${d}: casual ${(c.winRate*100).toFixed(0)}% optimal ${(o.winRate*100).toFixed(0)}%`);
  }
}
writeFileSync('balance_runs/skillgrid_unlitbeacon_POST.json', JSON.stringify(rows, null, 2));
TS
cp /tmp/casual_grid.mts ./casual_grid.tmp.mts
npx tsx casual_grid.tmp.mts
rm -f casual_grid.tmp.mts
echo "=== PLACEMENT SEARCH unlitbeacon medium, 80 games ==="
npx tsx src/ai/placementSearch.ts unlitbeacon --difficulty medium --party barbarian,sorcerer,warlock,rogue --games 80 --json $OUT/placement_medium_POST.json 2>&1 | tail -22
echo "=== GIFT HARNESS per-class, 60 games ==="
npx tsx src/ai/giftHarness.ts --per-class --games 60 --json $OUT/gifts_POST.json 2>&1 | tail -20
echo "=== BATTERY COMPLETE ==="
