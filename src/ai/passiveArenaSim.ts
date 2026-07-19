/**
 * passiveArenaSim.ts — Arena balance harness for the behavioral passive roster.
 *
 * Isolates ONE variable per duel: mirrored 4v4 comps, identical specials and
 * passives on every slot EXCEPT the subject class, which runs passive X on one
 * side and passive Y on the other. Every unordered pair of a class's three
 * options is dueled both first-player orders with fortune-phase variance.
 *
 * A passive is "balanced" when its pairwise duels sit near 50%. Sustained
 * >60% or <40% against BOTH siblings flags an outlier.
 *
 * Usage: npx tsx src/ai/passiveArenaSim.ts [--games 100]
 */
import { runMatch, makeRng } from './simHarness.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap, DEFAULT_UNITS } from './defaultData.js';
import { UnitCustomization } from './types.js';

const COMPS: Record<string, string[]> = {
  melee:  ['fighter', 'barbarian', 'rogue', 'cleric'],
  ranged: ['ranger', 'wizard', 'sorcerer', 'warlock'],
};

const P1 = 'p1'; const P2 = 'p2';

function defaultLoadout(slugs: string[]): UnitCustomization[] {
  return slugs.map((slug) => {
    const def = DEFAULT_UNITS[slug];
    return { specialSlug: def.specialOptions[0], passiveSlug: def.passiveOptions[0]?.slug ?? null };
  });
}

function duel(
  comp: string[], slot: number, passiveA: string, passiveB: string, games: number,
): { aWins: number; bWins: number; draws: number } {
  const abilityMap = buildAbilityMap();
  const b1 = new OptimalBrain(); const b2 = new OptimalBrain();
  const rng = makeRng(7);
  let aWins = 0; let bWins = 0; let draws = 0;
  for (let g = 0; g < games; g++) {
    const cA = defaultLoadout(comp); cA[slot] = { ...cA[slot], passiveSlug: passiveA };
    const cB = defaultLoadout(comp); cB[slot] = { ...cB[slot], passiveSlug: passiveB };
    const r = runMatch(comp, comp, abilityMap, b1, b2, {
      p1Id: P1, p2Id: P2,
      forceFirstPlayerId: g % 2 === 0 ? P1 : P2,
      p1Customizations: cA, p2Customizations: cB,
      rng,
    });
    if (r.winnerSide === 'p1') aWins++;
    else if (r.winnerSide === 'p2') bWins++;
    else draws++;
  }
  return { aWins, bWins, draws };
}

const isMain = process.argv[1]?.includes('passiveArenaSim');
if (isMain) {
  const gi = process.argv.indexOf('--games');
  const games = gi !== -1 ? parseInt(process.argv[gi + 1], 10) : 100;
  const pct = (n: number, d: number) => ((100 * n) / d).toFixed(0).padStart(3) + '%';

  // Per-passive aggregate across all duels it appears in.
  const agg: Record<string, { w: number; t: number }> = {};
  const bump = (slug: string, wins: number, total: number) => {
    agg[slug] = agg[slug] ?? { w: 0, t: 0 };
    agg[slug].w += wins; agg[slug].t += total;
  };

  console.log(`Arena passive duels — ${games} games/pair, mirrored comps, subject class isolated\n`);
  for (const [compName, comp] of Object.entries(COMPS)) {
    for (let slot = 0; slot < comp.length; slot++) {
      const slug = comp[slot];
      const options = DEFAULT_UNITS[slug].passiveOptions.map((p) => p.slug);
      console.log(`${slug} (${compName} comp): options ${options.join(', ')}`);
      for (let i = 0; i < options.length; i++) {
        for (let j = i + 1; j < options.length; j++) {
          const r = duel(comp, slot, options[i], options[j], games);
          const decisive = r.aWins + r.bWins;
          bump(options[i], r.aWins, decisive);
          bump(options[j], r.bWins, decisive);
          console.log(
            `  ${options[i].padEnd(12)} vs ${options[j].padEnd(12)} ` +
            `${pct(r.aWins, Math.max(1, decisive))} - ${pct(r.bWins, Math.max(1, decisive))}` +
            (r.draws > 0 ? `  (${r.draws} draws)` : ''),
          );
        }
      }
    }
    console.log('');
  }

  console.log('── Aggregate win share per passive (50% = balanced) ──');
  for (const [slug, { w, t }] of Object.entries(agg).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    const share = (100 * w) / t;
    const flag = share > 60 || share < 40 ? '  ⚠' : '';
    console.log(`  ${slug.padEnd(12)} ${share.toFixed(0).padStart(3)}%  (${w}/${t})${flag}`);
  }
}
