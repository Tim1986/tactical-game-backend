/**
 * giftPerClass.ts — [E0.4b] Deep Gifts measured PER CLASS, not per party.
 *
 * WHY (owner, 2026-08-24): "I suspect that when you analyzed the balance of
 * the deep gifts against each other, you did aggregate nonsense instead of
 * analyzing them on the basis of each class." Correct — giftHarness.ts applied
 * each gift UNIFORMLY across the whole party (its own HONEST LIMIT comment
 * says so), so DEFAULT_GIFT_BY_CLASS is a party-level result projected onto
 * classes. His hypotheses: +1 movement is great on RANGED units, +3 AC is
 * great on MELEE units, and +2 damage is weak because campaign enemy HP
 * scales so high.
 *
 * METHOD — the isolation the old harness skipped: hold the party at the
 * DEFAULT gift policy, then for ONE slot at a time swap that unit's gift
 * through {none, damage, movement, armor} and measure the party win-rate
 * delta vs that unit giftless. Every other unit keeps its default gift, so
 * the delta belongs to one class's choice alone. Two parties cover all 8
 * chassis once; cells are REAL L7+ content (unlitbeacon), where the party
 * actually has gifts — no ceiling-trap proxy cells.
 *
 * Usage: npx tsx src/ai/giftPerClass.ts [--games 150] [--json out.json]
 */
import { simEncounterCell } from './campaignSim.js';
import { DeepGiftSlug } from '../campaigns/runtime.js';
import { CampaignDifficulty } from '../campaigns/types.js';

const GAMES = (() => { const i = process.argv.indexOf('--games'); return i > 0 ? Number(process.argv[i + 1]) : 150; })();

// All 8 chassis in two parties. Slot order matters only for level gating —
// at L8+ every slot has its gift, so slots are interchangeable.
const PARTIES: Record<string, string[]> = {
  melee: ['fighter', 'barbarian', 'rogue', 'cleric'],
  ranged: ['ranger', 'wizard', 'sorcerer', 'warlock'],
};

// Real L7+ cells, mixed objective kinds, mid-band at medium/hard so deltas
// are visible in both directions (not pinned at a ceiling).
const CELLS: Array<{ enc: string; diff: CampaignDifficulty; level: number }> = [
  { enc: 'e8', diff: 'medium', level: 8 },   // rooms
  { enc: 'e9', diff: 'medium', level: 8 },   // survive
  { enc: 'e10', diff: 'medium', level: 9 },  // escort
  { enc: 'e12', diff: 'medium', level: 10 }, // dual-win finale
  { enc: 'e8', diff: 'hard', level: 8 },
  { enc: 'e12', diff: 'hard', level: 10 },
];

const GIFTS: (DeepGiftSlug | 'none')[] = ['none', 'damage', 'movement', 'armor'];

type Row = { cls: string; gift: string; delta: number };
const rows: Row[] = [];

for (const [pname, slugs] of Object.entries(PARTIES)) {
  for (let slot = 0; slot < 4; slot++) {
    const cls = slugs[slot];
    // Baseline and variants share every OTHER slot's default policy.
    const winFor = (gift: DeepGiftSlug | 'none'): number => {
      let wins = 0, total = 0;
      for (const c of CELLS) {
        const gifts: (DeepGiftSlug | 'none' | undefined)[] = [undefined, undefined, undefined, undefined];
        gifts[slot] = gift;
        const r = simEncounterCell('unlitbeacon', c.enc, c.diff, pname, slugs, {
          games: GAMES, level: c.level, gifts, seed: 7,
        });
        wins += r.playerWins; total += r.games;
      }
      return wins / total;
    };
    const base = winFor('none');
    for (const g of GIFTS.slice(1)) {
      const d = winFor(g as DeepGiftSlug) - base;
      rows.push({ cls, gift: g, delta: d });
      console.log(`${cls.padEnd(10)} ${g.padEnd(9)} ${(d * 100 >= 0 ? '+' : '')}${(d * 100).toFixed(1)}  (baseline ${(base * 100).toFixed(0)}%)`);
    }
  }
}

console.log('\n=== PER-CLASS BEST (decision view) ===');
for (const cls of [...PARTIES.melee, ...PARTIES.ranged]) {
  const mine = rows.filter((r) => r.cls === cls);
  const best = mine.reduce((a, b) => (a.delta >= b.delta ? a : b));
  console.log(`${cls.padEnd(10)} ` + mine.map((r) => `${r.gift} ${(r.delta * 100 >= 0 ? '+' : '')}${(r.delta * 100).toFixed(1)}`).join('  ') + `   → ${best.gift}`);
}

const ji = process.argv.indexOf('--json');
if (ji > 0) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  import('node:fs').then(({ writeFileSync }) => writeFileSync(process.argv[ji + 1], JSON.stringify(rows, null, 2)));
}
