"use strict";
/**
 * Balance sim — run with: npx tsx src/ai/runSims.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const simHarness_js_1 = require("./simHarness.js");
const defaultData_js_1 = require("./defaultData.js");
const aiBrain_js_1 = require("./aiBrain.js");
const abilityMap = (0, defaultData_js_1.buildAbilityMap)();
const brain = new aiBrain_js_1.OptimalBrain();
const opts = { games: 200, brain1: brain, brain2: brain, abilityMap };
const fast = { ...opts, games: 100 };
const pct = (n, total) => ((n / total) * 100).toFixed(1).padStart(5) + '%';
const fx = (n) => n.toFixed(2);
function print(r) {
    const label = `${r.p1Slugs.join('+')} vs ${r.p2Slugs.join('+')}`;
    console.log(`${label.padEnd(52)} ` +
        `P1:${pct(r.p1Wins, r.games)}  P2:${pct(r.p2Wins, r.games)}  ` +
        `draws:${r.draws}  turns:${fx(r.avgTurns)}  surv:${fx(r.avgSurvivors.p1)}v${fx(r.avgSurvivors.p2)}`);
}
console.log('\n=== PHYSICAL vs CASTER ===');
print((0, simHarness_js_1.runSim)(['fighter', 'barbarian', 'ranger', 'rogue'], ['wizard', 'cleric', 'sorcerer', 'warlock'], opts));
print((0, simHarness_js_1.runSim)(['wizard', 'cleric', 'sorcerer', 'warlock'], ['fighter', 'barbarian', 'ranger', 'rogue'], opts));
console.log('\n=== MIRROR (RNG / first-mover check) ===');
print((0, simHarness_js_1.runSim)(['fighter', 'barbarian', 'ranger', 'rogue'], ['fighter', 'barbarian', 'ranger', 'rogue'], opts));
print((0, simHarness_js_1.runSim)(['wizard', 'cleric', 'sorcerer', 'warlock'], ['wizard', 'cleric', 'sorcerer', 'warlock'], opts));
console.log('\n=== CASTER VALUE: swap one melee slot ===');
const meleeBase = ['fighter', 'barbarian', 'ranger'];
const casters = ['cleric', 'wizard', 'sorcerer', 'warlock'];
for (const c of casters) {
    print((0, simHarness_js_1.runSim)([...meleeBase, c], [...meleeBase, 'rogue'], opts));
}
console.log('\n=== MELEE VALUE: swap one caster slot ===');
const casterBase = ['wizard', 'cleric', 'sorcerer'];
const melees = ['fighter', 'barbarian', 'ranger', 'rogue'];
for (const m of melees) {
    print((0, simHarness_js_1.runSim)([...casterBase, m], [...casterBase, 'warlock'], opts));
}
console.log('\n=== UNIT DUELS (2×unitA+neutral vs 2×unitB+neutral) ===');
const all = ['fighter', 'barbarian', 'ranger', 'rogue', 'cleric', 'wizard', 'sorcerer', 'warlock'];
for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const neutral = all.filter(u => u !== a && u !== b).slice(0, 2);
        print((0, simHarness_js_1.runSim)([a, a, ...neutral], [b, b, ...neutral], fast));
    }
}
console.log('\n=== INTERESTING MIXED COMPS ===');
print((0, simHarness_js_1.runSim)(['fighter', 'cleric', 'wizard', 'rogue'], ['barbarian', 'warlock', 'ranger', 'sorcerer'], opts));
print((0, simHarness_js_1.runSim)(['fighter', 'cleric', 'ranger', 'wizard'], ['barbarian', 'sorcerer', 'rogue', 'warlock'], opts));
print((0, simHarness_js_1.runSim)(['barbarian', 'barbarian', 'cleric', 'cleric'], ['rogue', 'rogue', 'wizard', 'wizard'], opts));
print((0, simHarness_js_1.runSim)(['fighter', 'fighter', 'cleric', 'wizard'], ['rogue', 'ranger', 'sorcerer', 'warlock'], opts));
print((0, simHarness_js_1.runSim)(['fighter', 'barbarian', 'cleric', 'wizard'], ['rogue', 'ranger', 'sorcerer', 'warlock'], opts));
//# sourceMappingURL=runSims.js.map