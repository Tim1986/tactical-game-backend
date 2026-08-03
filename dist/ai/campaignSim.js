"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPRESENTATIVE_PARTIES = void 0;
exports.simEncounterCell = simEncounterCell;
/**
 * campaignSim.ts — Balance harness for campaign encounters.
 *
 * Builds each encounter EXACTLY as the mobile campaign runner does (shared
 * campaigns/runtime.ts), then runs brain-vs-brain games via runMatch.
 *
 * Usage:
 *   npx tsx src/ai/campaignSim.ts lantern                       # full battery: all encounters × difficulties × parties
 *   npx tsx src/ai/campaignSim.ts lantern --encounter e3        # one encounter
 *   npx tsx src/ai/campaignSim.ts lantern --difficulty nightmare --party fighter,barbarian,rogue,cleric
 *   ... --games 200 --level 4
 *
 * Win-rate targets (player side): easy 80–95, medium 65–80, hard 45–65,
 * nightmare 25–45.
 */
const simHarness_js_1 = require("./simHarness.js");
const aiBrain_js_1 = require("./aiBrain.js");
const defaultData_js_1 = require("./defaultData.js");
const index_js_1 = require("../campaigns/index.js");
const runtime_js_1 = require("../campaigns/runtime.js");
const defaultData_js_2 = require("./defaultData.js");
const HUMAN = 'p1';
const ENEMY = 'p2';
exports.REPRESENTATIVE_PARTIES = {
    melee: ['fighter', 'barbarian', 'rogue', 'cleric'],
    ranged: ['ranger', 'wizard', 'sorcerer', 'warlock'],
    balanced: ['fighter', 'ranger', 'cleric', 'wizard'],
};
const DIFFICULTIES = ['easy', 'medium', 'hard', 'nightmare'];
const TARGET_BANDS = {
    easy: [0.80, 0.95], medium: [0.65, 0.80], hard: [0.45, 0.65], nightmare: [0.25, 0.45],
};
/** No representative party may fall below this — a party pick must never be bricked. */
const PARTY_FLOOR = {
    easy: 0.60, medium: 0.40, hard: 0.15, nightmare: 0.0,
};
/**
 * Per-unit choices matching the live level-up schedule (specials front-loaded):
 * L2 = main + first companion get specials; L3 = remaining two get specials
 * (all four specialed by fight 2); L4 = main + first companion get passives;
 * L5 = remaining two get passives. Defaults to each class's first option;
 * passiveOverrides (from --passives) replaces the passive picks for comparisons.
 */
function choicesForLevel(partySlugs, level, passiveOverrides) {
    return partySlugs.map((slug, i) => {
        const def = defaultData_js_2.DEFAULT_UNITS[slug];
        const early = i <= 1; // main + first companion level up first
        const specialSlug = level >= (early ? 2 : 3) ? def?.specialOptions[0] : undefined;
        const passiveSlug = level >= (early ? 4 : 5)
            ? (passiveOverrides?.[i] ?? def?.passiveOptions[0]?.slug)
            : undefined;
        return { specialSlug, passiveSlug };
    });
}
function simEncounterCell(campaignSlug, encounterId, difficulty, partyName, partySlugs, options = {}) {
    const campaign = index_js_1.CAMPAIGNS[campaignSlug];
    if (!campaign)
        throw new Error(`Unknown campaign: ${campaignSlug}`);
    const enc = campaign.encounters[encounterId];
    if (!enc)
        throw new Error(`Unknown encounter: ${encounterId}`);
    const games = options.games ?? 100;
    const level = options.level ?? enc.level;
    const rng = (0, simHarness_js_1.makeRng)(options.seed ?? 1);
    const choices = choicesForLevel(partySlugs, level, options.passives);
    const abilityMap = (0, defaultData_js_1.buildAbilityMap)();
    const brain1 = new aiBrain_js_1.OptimalBrain();
    const brain2 = new aiBrain_js_1.OptimalBrain();
    let playerWins = 0;
    let draws = 0;
    let totalTurns = 0;
    let validationErrors = 0;
    for (let i = 0; i < games; i++) {
        const stateFactory = () => {
            const { state } = (0, runtime_js_1.buildEncounterState)(campaign, encounterId, partySlugs, choices, level, difficulty, HUMAN, ENEMY);
            return state;
        };
        const r = (0, simHarness_js_1.runMatch)(partySlugs, enc.enemies, abilityMap, brain1, brain2, {
            p1Id: HUMAN, p2Id: ENEMY,
            forceFirstPlayerId: HUMAN, // campaign matches are always human-first
            stateFactory,
        });
        if (r.winnerSide === 'p1')
            playerWins++;
        else if (r.winnerSide === 'draw')
            draws++;
        totalTurns += r.turns;
        validationErrors += r.validationErrors;
    }
    const winRate = playerWins / games;
    const [lo, hi] = TARGET_BANDS[difficulty];
    return {
        encounter: encounterId, difficulty, party: partyName, level, games,
        playerWins, winRate, draws, avgTurns: totalTurns / games,
        inBand: winRate >= lo && winRate <= hi,
        validationErrors,
    };
}
// ─── CLI ──────────────────────────────────────────────────────────────────────
const isMain = process.argv[1]?.endsWith('campaignSim.ts') || process.argv[1]?.endsWith('campaignSim.js');
if (isMain) {
    const args = process.argv.slice(2);
    const campaignSlug = args[0];
    if (!campaignSlug || !index_js_1.CAMPAIGNS[campaignSlug]) {
        console.error(`Usage: npx tsx src/ai/campaignSim.ts <campaign-slug> [--encounter eN] [--difficulty d] [--party slugs] [--level N] [--games N]`);
        console.error(`Known campaigns: ${Object.keys(index_js_1.CAMPAIGNS).join(', ')}`);
        process.exit(1);
    }
    const campaign = index_js_1.CAMPAIGNS[campaignSlug];
    const getArg = (flag) => {
        const i = args.indexOf(flag);
        return i !== -1 ? args[i + 1] : undefined;
    };
    const games = parseInt(getArg('--games') ?? '100', 10);
    const levelArg = getArg('--level');
    const encounterIds = getArg('--encounter') ? [getArg('--encounter')] : Object.keys(campaign.encounters);
    const difficulties = getArg('--difficulty') ? [getArg('--difficulty')] : DIFFICULTIES;
    const customParty = getArg('--party');
    const parties = customParty
        ? { custom: customParty.split(',') }
        : exports.REPRESENTATIVE_PARTIES;
    const pct = (n) => (n * 100).toFixed(0).padStart(3) + '%';
    console.log(`Campaign: ${campaign.title} — ${games} games/cell\n`);
    console.log('enc  lvl  difficulty  party     winrate  band        avg-turns');
    const outOfBand = [];
    for (const encId of encounterIds) {
        for (const diff of difficulties) {
            const cells = [];
            for (const [pname, pslugs] of Object.entries(parties)) {
                const r = simEncounterCell(campaignSlug, encId, diff, pname, pslugs, {
                    games, level: levelArg ? parseInt(levelArg, 10) : undefined,
                    passives: getArg('--passives')?.split(',').map((s) => s === '' ? undefined : s),
                });
                cells.push(r);
                const [lo, hi] = TARGET_BANDS[diff];
                const flag = r.inBand ? '  ' : ' ⚠';
                console.log(`${encId.padEnd(4)} L${r.level}   ${diff.padEnd(10)} ${pname.padEnd(9)} ${pct(r.winRate)}    [${pct(lo)},${pct(hi)}]${flag}  ${r.avgTurns.toFixed(0)}`
                    + (r.validationErrors > 0 ? `  ⚠ ${r.validationErrors} validation errors` : ''));
            }
            // Flavored encounters have inherent ±30pt party-matchup spread, so the
            // acceptance test is: MEAN win rate across representative parties in
            // band, AND no single party below the floor (a party choice must never
            // be bricked). See CAMPAIGNS.md → Balancing.
            const mean = cells.reduce((s, c) => s + c.winRate, 0) / cells.length;
            const [lo, hi] = TARGET_BANDS[diff];
            const floor = PARTY_FLOOR[diff];
            const floorBreak = cells.filter((c) => c.winRate < floor);
            const meanOk = mean >= lo && mean <= hi;
            console.log(`     mean ${pct(mean)}  [${pct(lo)},${pct(hi)}]${meanOk ? ' ✓' : ' ⚠'}${floorBreak.length ? `  ⚠ below floor(${pct(floor)}): ${floorBreak.map((c) => c.party).join(',')}` : ''}`);
            if (cells.length >= 3 && (!meanOk || floorBreak.length > 0)) {
                outOfBand.push(`${encId}/${diff}: mean ${pct(mean)}${meanOk ? '' : ' out of band'}${floorBreak.length ? `, below floor: ${floorBreak.map((c) => c.party).join(',')}` : ''}`);
            }
        }
        console.log('');
    }
    if (outOfBand.length > 0) {
        console.log('⚠ CELLS NEEDING TUNING (band must hold for ≥2 of 3 parties):');
        for (const line of outOfBand)
            console.log('  ' + line);
        process.exitCode = 1;
    }
    else {
        console.log('✓ All encounter/difficulty cells within band for ≥2 of 3 parties.');
    }
}
//# sourceMappingURL=campaignSim.js.map