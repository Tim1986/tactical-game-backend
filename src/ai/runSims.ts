/**
 * Balance sim — run with: npx tsx src/ai/runSims.ts
 */

import { runSim, SimResult } from './simHarness.js';
import { buildAbilityMap } from './defaultData.js';
import { OptimalBrain } from './aiBrain.js';

const abilityMap = buildAbilityMap();
const brain = new OptimalBrain();
const opts = { games: 200, brain1: brain, brain2: brain, abilityMap };
const fast = { ...opts, games: 100 };

const pct = (n: number, total: number) => ((n / total) * 100).toFixed(1).padStart(5) + '%';
const fx = (n: number) => n.toFixed(2);

function print(r: SimResult) {
  const label = `${r.p1Slugs.join('+')} vs ${r.p2Slugs.join('+')}`;
  console.log(
    `${label.padEnd(52)} ` +
    `P1:${pct(r.p1Wins, r.games)}  P2:${pct(r.p2Wins, r.games)}  ` +
    `draws:${r.draws}  turns:${fx(r.avgTurns)}  surv:${fx(r.avgSurvivors.p1)}v${fx(r.avgSurvivors.p2)}`
  );
}

console.log('\n=== PHYSICAL vs CASTER ===');
print(runSim(['fighter','barbarian','ranger','rogue'], ['wizard','cleric','sorcerer','warlock'], opts));
print(runSim(['wizard','cleric','sorcerer','warlock'], ['fighter','barbarian','ranger','rogue'], opts));

console.log('\n=== MIRROR (RNG / first-mover check) ===');
print(runSim(['fighter','barbarian','ranger','rogue'], ['fighter','barbarian','ranger','rogue'], opts));
print(runSim(['wizard','cleric','sorcerer','warlock'], ['wizard','cleric','sorcerer','warlock'], opts));

console.log('\n=== CASTER VALUE: swap one melee slot ===');
const meleeBase = ['fighter','barbarian','ranger'];
const casters = ['cleric','wizard','sorcerer','warlock'];
for (const c of casters) {
  print(runSim([...meleeBase, c], [...meleeBase, 'rogue'], opts));
}

console.log('\n=== MELEE VALUE: swap one caster slot ===');
const casterBase = ['wizard','cleric','sorcerer'];
const melees = ['fighter','barbarian','ranger','rogue'];
for (const m of melees) {
  print(runSim([...casterBase, m], [...casterBase, 'warlock'], opts));
}

console.log('\n=== UNIT DUELS (2×unitA+neutral vs 2×unitB+neutral) ===');
const all = ['fighter','barbarian','ranger','rogue','cleric','wizard','sorcerer','warlock'];
for (let i = 0; i < all.length; i++) {
  for (let j = i + 1; j < all.length; j++) {
    const a = all[i], b = all[j];
    const neutral = all.filter(u => u !== a && u !== b).slice(0, 2);
    print(runSim([a, a, ...neutral] as string[], [b, b, ...neutral] as string[], fast));
  }
}

console.log('\n=== INTERESTING MIXED COMPS ===');
print(runSim(['fighter','cleric','wizard','rogue'], ['barbarian','warlock','ranger','sorcerer'], opts));
print(runSim(['fighter','cleric','ranger','wizard'], ['barbarian','sorcerer','rogue','warlock'], opts));
print(runSim(['barbarian','barbarian','cleric','cleric'], ['rogue','rogue','wizard','wizard'], opts));
print(runSim(['fighter','fighter','cleric','wizard'], ['rogue','ranger','sorcerer','warlock'], opts));
print(runSim(['fighter','barbarian','cleric','wizard'], ['rogue','ranger','sorcerer','warlock'], opts));
