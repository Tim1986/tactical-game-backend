"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * e3Variants.ts — scratch harness for closing the party-spread on a single
 * encounter (lantern e3, "Runners at Dusk").
 *
 * hpScaleOverride cannot fix a SPREAD: it lifts or lowers every party equally.
 * e3 tuned to a mean inside band while melee sat at 25% and ranged at 100% — a
 * 75-point gap against the +/-30 CAMPAIGNS.md calls inherent, with melee under
 * the 40% floor. Four fast runners crossing an open board is a free-shot
 * gallery for a ranged party and a four-on-four dogpile for a melee one.
 *
 * So the lever has to be composition or placement. This sims candidate variants
 * and reports MEAN and SPREAD so the choice is measured rather than argued.
 * Delete once e3 is settled.
 */
const index_js_1 = require("../campaigns/index.js");
const campaignSim_js_1 = require("./campaignSim.js");
const BASE_ENEMY_PLACEMENT = [{ x: 7, y: 1 }, { x: 7, y: 3 }, { x: 7, y: 6 }, { x: 4, y: 0 }];
const VARIANTS = [
    { name: 'baseline 4 runners' },
    { name: '3 runners', enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner'],
        enemyPlacement: [{ x: 7, y: 1 }, { x: 7, y: 3 }, { x: 7, y: 6 }] },
    // A slinger shoots back, so a ranged party can no longer stand off and farm
    // the approach — and it is one fewer body in the melee dogpile.
    { name: '3 runners + 1 slinger', enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner', 'goblin_slinger'] },
    { name: '2 runners + 2 slingers', enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'goblin_slinger', 'goblin_slinger'] },
    // Shorter approach: fewer free shots for ranged, melee engages sooner.
    { name: '4 runners, closer start',
        enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }, { x: 4, y: 1 }] },
    { name: '3 runners + 1 slinger, closer',
        enemies: ['wolfpelt_runner', 'wolfpelt_runner', 'wolfpelt_runner', 'goblin_slinger'],
        enemyPlacement: [{ x: 5, y: 2 }, { x: 5, y: 4 }, { x: 5, y: 6 }, { x: 7, y: 1 }] },
];
function main() {
    const games = parseInt(process.argv[2] ?? '60', 10);
    const enc = index_js_1.CAMPAIGNS.lantern.encounters.e3;
    if (!enc.enemies || !enc.enemyPlacement) {
        throw new Error('e3Variants sweeps a single-room encounter; lantern e3 now uses rooms.');
    }
    const origEnemies = [...enc.enemies];
    const origEnemyPl = [...enc.enemyPlacement];
    const origPlayerPl = [...enc.playerPlacement];
    const diffs = ['medium', 'hard'];
    const pct = (n) => (n * 100).toFixed(0).padStart(3) + '%';
    console.log(`lantern e3 variants — ${games} games/party\n`);
    console.log(`${'variant'.padEnd(30)} ${'diff'.padEnd(8)} ${'mean'.padEnd(6)} ${'melee'.padEnd(6)} ${'ranged'.padEnd(7)} ${'balanced'.padEnd(9)} spread`);
    for (const v of VARIANTS) {
        enc.enemies = (v.enemies ?? origEnemies);
        enc.enemyPlacement = (v.enemyPlacement ?? BASE_ENEMY_PLACEMENT).slice(0, enc.enemies.length);
        enc.playerPlacement = (v.playerPlacement ?? origPlayerPl);
        for (const diff of diffs) {
            const w = {};
            for (const [pname, pslugs] of Object.entries(campaignSim_js_1.REPRESENTATIVE_PARTIES)) {
                w[pname] = (0, campaignSim_js_1.simEncounterCell)('lantern', 'e3', diff, pname, pslugs, { games }).winRate;
            }
            const vals = Object.values(w);
            const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const spread = Math.max(...vals) - Math.min(...vals);
            console.log(`${v.name.padEnd(30)} ${diff.padEnd(8)} ${pct(mean)}  ${pct(w.melee)}  ${pct(w.ranged)}   ${pct(w.balanced)}     ${(spread * 100).toFixed(0)}pts`);
        }
        console.log('');
    }
    enc.enemies = origEnemies;
    enc.enemyPlacement = origEnemyPl;
    enc.playerPlacement = origPlayerPl;
}
main();
//# sourceMappingURL=e3Variants.js.map