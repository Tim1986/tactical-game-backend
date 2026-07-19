/**
 * arenaBattery.ts — Arena-wide balance battery under the behavioral passive
 * roster. Three plates, all brain-vs-brain with fortune variance and both
 * first-player orders:
 *
 *  1. SPECIALS: mirrored comps, subject class runs special X vs special Y,
 *     everything else default (same isolation design as passiveArenaSim).
 *  2. COMPS: round-robin between representative 4-class comps — detects a
 *     dominant comp without counterplay.
 *  3. CLASSES: marginal-value swaps — baseline balanced comp vs the same comp
 *     with one slot replaced by an outside class. >50% for the variant means
 *     the swapped-in class outvalues the swapped-out one in that seat.
 *
 * Usage: npx tsx src/ai/arenaBattery.ts [--games 200] [--plate specials|comps|classes]
 */
import { runMatch, makeRng } from './simHarness.js';
import { OptimalBrain } from './aiBrain.js';
import { buildAbilityMap, DEFAULT_UNITS } from './defaultData.js';
import { UnitCustomization } from './types.js';

const COMPS: Record<string, string[]> = {
  melee:    ['fighter', 'barbarian', 'rogue', 'cleric'],
  ranged:   ['ranger', 'wizard', 'sorcerer', 'warlock'],
  balanced: ['fighter', 'ranger', 'cleric', 'wizard'],
  skirmish: ['barbarian', 'rogue', 'sorcerer', 'warlock'],
  control:  ['fighter', 'wizard', 'warlock', 'cleric'],
  burst:    ['rogue', 'ranger', 'sorcerer', 'barbarian'],
};

/** Home comp used for each class's specials duels (class must be a member). */
const HOME_COMP: Record<string, string> = {
  fighter: 'melee', barbarian: 'melee', rogue: 'melee', cleric: 'melee',
  ranger: 'ranged', wizard: 'ranged', sorcerer: 'ranged', warlock: 'ranged',
};

const abilityMap = buildAbilityMap();
const pct = (n: number, d: number) => ((100 * n) / Math.max(1, d)).toFixed(0).padStart(3) + '%';

function defaultLoadout(slugs: string[]): UnitCustomization[] {
  return slugs.map((slug) => {
    const def = DEFAULT_UNITS[slug];
    return { specialSlug: def.specialOptions[0], passiveSlug: def.passiveOptions[0]?.slug ?? null };
  });
}

function series(
  compA: string[], compB: string[],
  custA: UnitCustomization[], custB: UnitCustomization[],
  games: number,
): { aWins: number; bWins: number; draws: number } {
  const b1 = new OptimalBrain(); const b2 = new OptimalBrain();
  const rng = makeRng(7);
  let aWins = 0; let bWins = 0; let draws = 0;
  for (let g = 0; g < games; g++) {
    const r = runMatch(compA, compB, abilityMap, b1, b2, {
      p1Id: 'p1', p2Id: 'p2',
      forceFirstPlayerId: g % 2 === 0 ? 'p1' : 'p2',
      p1Customizations: custA, p2Customizations: custB,
      rng,
    });
    if (r.winnerSide === 'p1') aWins++;
    else if (r.winnerSide === 'p2') bWins++;
    else draws++;
  }
  return { aWins, bWins, draws };
}

function plateSpecials(games: number): void {
  console.log(`── PLATE 1: SPECIALS (mirrored comp, subject class isolated, ${games} games/pair) ──`);
  const agg: Record<string, { w: number; t: number }> = {};
  for (const [slug, compName] of Object.entries(HOME_COMP)) {
    const comp = COMPS[compName];
    const slot = comp.indexOf(slug);
    const options = DEFAULT_UNITS[slug].specialOptions;
    console.log(`${slug} (${compName}): options ${options.join(', ')}`);
    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const cA = defaultLoadout(comp); cA[slot] = { ...cA[slot], specialSlug: options[i] };
        const cB = defaultLoadout(comp); cB[slot] = { ...cB[slot], specialSlug: options[j] };
        const r = series(comp, comp, cA, cB, games);
        const dec = r.aWins + r.bWins;
        agg[options[i]] = agg[options[i]] ?? { w: 0, t: 0 };
        agg[options[j]] = agg[options[j]] ?? { w: 0, t: 0 };
        agg[options[i]].w += r.aWins; agg[options[i]].t += dec;
        agg[options[j]].w += r.bWins; agg[options[j]].t += dec;
        console.log(
          `  ${options[i].padEnd(12)} vs ${options[j].padEnd(12)} ${pct(r.aWins, dec)} - ${pct(r.bWins, dec)}` +
          (r.draws > 0 ? `  (${r.draws} draws)` : ''),
        );
      }
    }
  }
  console.log('\nAggregate win share per special (50% = balanced):');
  for (const [slug, { w, t }] of Object.entries(agg).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    const share = (100 * w) / t;
    const flag = share > 60 || share < 40 ? '  ⚠' : '';
    console.log(`  ${slug.padEnd(12)} ${share.toFixed(0).padStart(3)}%  (${w}/${t})${flag}`);
  }
  console.log('');
}

function plateComps(games: number): void {
  console.log(`── PLATE 2: COMP ROUND-ROBIN (${games} games/pairing) ──`);
  const names = Object.keys(COMPS);
  const score: Record<string, { w: number; t: number }> = {};
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]; const b = names[j];
      const r = series(COMPS[a], COMPS[b], defaultLoadout(COMPS[a]), defaultLoadout(COMPS[b]), games);
      const dec = r.aWins + r.bWins;
      score[a] = score[a] ?? { w: 0, t: 0 }; score[b] = score[b] ?? { w: 0, t: 0 };
      score[a].w += r.aWins; score[a].t += dec;
      score[b].w += r.bWins; score[b].t += dec;
      console.log(
        `  ${a.padEnd(9)} vs ${b.padEnd(9)} ${pct(r.aWins, dec)} - ${pct(r.bWins, dec)}` +
        (r.draws > 0 ? `  (${r.draws} draws)` : ''),
      );
    }
  }
  console.log('\nComp standings (win share across round-robin):');
  for (const [name, { w, t }] of Object.entries(score).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    const share = (100 * w) / t;
    const flag = share > 65 || share < 35 ? '  ⚠' : '';
    console.log(`  ${name.padEnd(9)} ${share.toFixed(0).padStart(3)}%  (${w}/${t})${flag}`);
  }
  console.log('');
}

function plateClasses(games: number): void {
  const base = COMPS.balanced; // fighter, ranger, cleric, wizard
  const outside = ['barbarian', 'rogue', 'sorcerer', 'warlock'];
  console.log(`── PLATE 3: CLASS MARGINAL VALUE (baseline ${base.join(',')} — ${games} games/swap) ──`);
  console.log('  >50% = the swapped-IN class outvalues the swapped-out one in that seat\n');
  const classScore: Record<string, { w: number; t: number }> = {};
  for (let slot = 0; slot < base.length; slot++) {
    for (const sub of outside) {
      const variant = [...base]; variant[slot] = sub;
      const r = series(variant, base, defaultLoadout(variant), defaultLoadout(base), games);
      const dec = r.aWins + r.bWins;
      classScore[sub] = classScore[sub] ?? { w: 0, t: 0 };
      classScore[sub].w += r.aWins; classScore[sub].t += dec;
      classScore[base[slot]] = classScore[base[slot]] ?? { w: 0, t: 0 };
      classScore[base[slot]].w += r.bWins; classScore[base[slot]].t += dec;
      console.log(
        `  ${sub.padEnd(9)} in for ${base[slot].padEnd(8)} ${pct(r.aWins, dec)} - ${pct(r.bWins, dec)}` +
        (r.draws > 0 ? `  (${r.draws} draws)` : ''),
      );
    }
  }
  console.log('\nClass strength signal (aggregate across swaps; baseline classes measured as defenders):');
  for (const [name, { w, t }] of Object.entries(classScore).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    console.log(`  ${name.padEnd(9)} ${((100 * w) / t).toFixed(0).padStart(3)}%  (${w}/${t})`);
  }
  console.log('');
}

const gi = process.argv.indexOf('--games');
const games = gi !== -1 ? parseInt(process.argv[gi + 1], 10) : 200;
const pi = process.argv.indexOf('--plate');
const plate = pi !== -1 ? process.argv[pi + 1] : 'all';

if (plate === 'all' || plate === 'specials') plateSpecials(games);
if (plate === 'all' || plate === 'comps') plateComps(games);
if (plate === 'all' || plate === 'classes') plateClasses(games);
