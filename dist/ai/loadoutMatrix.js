"use strict";
/**
 * loadoutMatrix.ts — Full-matrix balance sims over the specials × passives
 * comp space (3 specials × 3 passives = 9 loadouts per class).
 *
 * The brain is loadout-transparent (specials/passives are baked into unit
 * instances at match build), so this is purely a driver over runSim's
 * p1Customizations/p2Customizations plumbing.
 *
 * Modes:
 *   duel      — intra-class round-robin: 4×C(Li) vs 4×C(Lj) for all loadout
 *               pairs of one class. Ranks loadouts within a class.
 *   reference — 4×C(L) vs a fixed classic party (default loadouts) for each
 *               of C's 9 loadouts. Measures loadout strength in a realistic
 *               cross-class matchup.
 *
 * Usage:
 *   npx tsx src/ai/loadoutMatrix.ts --mode duel      --class rogue  [--games 50]
 *   npx tsx src/ai/loadoutMatrix.ts --mode reference --class rogue  [--games 100]
 *   npx tsx src/ai/loadoutMatrix.ts --mode duel      --all          [--games 50]
 *   npx tsx src/ai/loadoutMatrix.ts --mode reference --all          [--games 100]
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFERENCE_PARTY = exports.ALL_CLASSES = void 0;
exports.loadoutsFor = loadoutsFor;
exports.defaultLoadout = defaultLoadout;
exports.runDuelMatrix = runDuelMatrix;
exports.escortsFor = escortsFor;
exports.runEscortMatrix = runEscortMatrix;
exports.runReferenceMatrix = runReferenceMatrix;
exports.printScores = printScores;
exports.printDuelCells = printDuelCells;
const simHarness_js_1 = require("./simHarness.js");
const defaultData_js_1 = require("./defaultData.js");
function loadoutsFor(classSlug) {
    const def = defaultData_js_1.DEFAULT_UNITS[classSlug];
    if (!def)
        throw new Error(`Unknown class: ${classSlug}`);
    const specials = def.specialOptions.length > 0 ? def.specialOptions : [def.abilities[1]];
    const passives = def.passiveOptions.length > 0 ? def.passiveOptions.map((p) => p.slug) : [null];
    const out = [];
    for (const s of specials) {
        for (const p of passives) {
            out.push({ specialSlug: s, passiveSlug: p, label: `${s}+${p ?? 'none'}` });
        }
    }
    return out;
}
/** Default loadout = first special option + first passive option (matches teamService defaults). */
function defaultLoadout(classSlug) {
    return loadoutsFor(classSlug)[0];
}
exports.ALL_CLASSES = Object.keys(defaultData_js_1.DEFAULT_UNITS);
/** Classic reference party used by `reference` mode (default loadouts). */
exports.REFERENCE_PARTY = ['barbarian', 'fighter', 'ranger', 'cleric'];
function wilson(wins, games) {
    if (games === 0)
        return [0, 1];
    const z = 1.96;
    const p = wins / games;
    const d = 1 + (z * z) / games;
    const c = p + (z * z) / (2 * games);
    const m = z * Math.sqrt((p * (1 - p)) / games + (z * z) / (4 * games * games));
    return [(c - m) / d, (c + m) / d];
}
function runDuelMatrix(classSlug, gamesPerPair = 50, log = console.log) {
    const loadouts = loadoutsFor(classSlug);
    const n = loadouts.length;
    const cell = Array.from({ length: n }, () => Array(n).fill(NaN));
    const wins = Array(n).fill(0);
    const games = Array(n).fill(0);
    const specialSpent = Array(n).fill(0);
    const specialSeen = Array(n).fill(0);
    let totalValidationErrors = 0;
    // Legal comp: 2x subject + 2 fixed escorts (max 2 per class, like the
    // real game). Both subject copies carry the loadout under test.
    const escorts = escortsFor(classSlug).slice(0, 2);
    const team = [classSlug, classSlug, ...escorts];
    const escortCustomizations = escorts.map((c) => defaultLoadout(c));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const r = (0, simHarness_js_1.runSim)(team, team, {
                games: gamesPerPair,
                p1Customizations: [loadouts[i], loadouts[i], ...escortCustomizations],
                p2Customizations: [loadouts[j], loadouts[j], ...escortCustomizations],
                // Brain-planned placement (default); variance comes from the
                // fortune meters' seeded random phase.
                seed: i * 100 + j,
            });
            totalValidationErrors += r.totalValidationErrors;
            cell[i][j] = r.p1WinRate;
            cell[j][i] = 1 - r.p1WinRate - r.draws / r.games; // j's win rate vs i
            wins[i] += r.p1Wins;
            wins[j] += r.p2Wins;
            games[i] += r.games;
            games[j] += r.games;
            // specialUsageRates is keyed by class slug — same slug both sides here,
            // so attribute the pooled rate to both loadouts equally (best available).
            const usage = r.specialUsageRates[classSlug] ?? 0;
            specialSpent[i] += usage * 4 * r.games;
            specialSeen[i] += 4 * r.games;
            specialSpent[j] += usage * 4 * r.games;
            specialSeen[j] += 4 * r.games;
            log(`  ${loadouts[i].label.padEnd(24)} vs ${loadouts[j].label.padEnd(24)} P1 ${(r.p1WinRate * 100).toFixed(0)}%  (err ${r.totalValidationErrors})`);
        }
    }
    const scores = loadouts.map((lo, i) => ({
        loadout: lo,
        games: games[i],
        wins: wins[i],
        winRate: games[i] ? wins[i] / games[i] : 0,
        ci: wilson(wins[i], games[i]),
        specialUsage: specialSeen[i] ? specialSpent[i] / specialSeen[i] : 0,
        validationErrors: totalValidationErrors,
    })).sort((a, b) => b.winRate - a.winRate);
    return { classSlug, gamesPerPair, loadouts, cell, scores, totalValidationErrors };
}
// ---------------------------------------------------------------------------
// Mode: escort duel — subject + 3 fixed standard escorts per side; only the
// subject's loadout differs between the teams. Measures a loadout in a
// realistic mixed-team role instead of a degenerate 4-stack mirror (4×cleric
// heal-wars value utility at zero; 4×wizard mirrors make freeze deny an
// 8-damage missile).
// ---------------------------------------------------------------------------
const ESCORT_POOL = ['barbarian', 'fighter', 'ranger', 'cleric'];
function escortsFor(classSlug) {
    return ESCORT_POOL.filter((c) => c !== classSlug).slice(0, 3);
}
function runEscortMatrix(classSlug, gamesPerPair = 24, log = console.log) {
    const loadouts = loadoutsFor(classSlug);
    const n = loadouts.length;
    const cell = Array.from({ length: n }, () => Array(n).fill(NaN));
    const wins = Array(n).fill(0);
    const games = Array(n).fill(0);
    let totalValidationErrors = 0;
    const escorts = escortsFor(classSlug);
    const team = [classSlug, ...escorts];
    const escortCustomizations = escorts.map((c) => defaultLoadout(c));
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const r = (0, simHarness_js_1.runSim)(team, team, {
                games: gamesPerPair,
                p1Customizations: [loadouts[i], ...escortCustomizations],
                p2Customizations: [loadouts[j], ...escortCustomizations],
                seed: 9000 + i * 100 + j,
            });
            totalValidationErrors += r.totalValidationErrors;
            cell[i][j] = r.p1WinRate;
            cell[j][i] = 1 - r.p1WinRate - r.draws / r.games;
            wins[i] += r.p1Wins;
            wins[j] += r.p2Wins;
            games[i] += r.games;
            games[j] += r.games;
            log(`  ${loadouts[i].label.padEnd(24)} vs ${loadouts[j].label.padEnd(24)} P1 ${(r.p1WinRate * 100).toFixed(0)}%  (err ${r.totalValidationErrors})`);
        }
    }
    const scores = loadouts.map((lo, i) => ({
        loadout: lo,
        games: games[i],
        wins: wins[i],
        winRate: games[i] ? wins[i] / games[i] : 0,
        ci: wilson(wins[i], games[i]),
        specialUsage: 0, // per-loadout usage not separable here (escorts share slugs)
        validationErrors: totalValidationErrors,
    })).sort((a, b) => b.winRate - a.winRate);
    return { classSlug, gamesPerPair, loadouts, cell, scores, totalValidationErrors };
}
function runReferenceMatrix(classSlug, gamesPerLoadout = 100, log = console.log) {
    const loadouts = loadoutsFor(classSlug);
    // If the tested class appears in the reference party, swap that member out
    // (for a wizard) so specialUsageRates[classSlug] measures ONLY the subject
    // team — the harness pools usage by class slug.
    const refParty = exports.REFERENCE_PARTY.map((c) => (c === classSlug ? 'wizard' : c));
    const refCustomizations = refParty.map((c) => defaultLoadout(c));
    // Legal comp: 2x subject + 2 escorts. Escorts must also avoid the
    // reference party's usage-measurement caveat only for the subject slug,
    // which they can't collide with by construction.
    const subjEscorts = escortsFor(classSlug).slice(0, 2);
    const team = [classSlug, classSlug, ...subjEscorts];
    const subjEscortCustomizations = subjEscorts.map((c) => defaultLoadout(c));
    let totalValidationErrors = 0;
    const scores = loadouts.map((lo) => {
        const r = (0, simHarness_js_1.runSim)(team, refParty, {
            games: gamesPerLoadout,
            p1Customizations: [lo, lo, ...subjEscortCustomizations],
            p2Customizations: refCustomizations,
            seed: 7,
        });
        totalValidationErrors += r.totalValidationErrors;
        log(`  ${lo.label.padEnd(24)} vs reference party  ${(r.p1WinRate * 100).toFixed(0)}%  special ${(100 * (r.specialUsageRates[classSlug] ?? 0)).toFixed(0)}%  (err ${r.totalValidationErrors})`);
        return {
            loadout: lo,
            games: r.games,
            wins: r.p1Wins,
            winRate: r.p1WinRate,
            ci: r.p1WinRateCI,
            specialUsage: r.specialUsageRates[classSlug] ?? 0,
            validationErrors: r.totalValidationErrors,
        };
    }).sort((a, b) => b.winRate - a.winRate);
    return { classSlug, gamesPerLoadout, scores, totalValidationErrors };
}
// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function pct(x) { return (x * 100).toFixed(0).padStart(3) + '%'; }
function printScores(title, scores) {
    console.log(`\n${title}`);
    console.log('  loadout                    win%   95% CI      special%');
    for (const s of scores) {
        console.log(`  ${s.loadout.label.padEnd(26)} ${pct(s.winRate)}  [${pct(s.ci[0])},${pct(s.ci[1])}]  ${pct(s.specialUsage)}`);
    }
}
function printDuelCells(r) {
    const labels = r.loadouts.map((l) => l.label);
    const short = labels.map((l) => l.replace(/\+/, '/').slice(0, 12).padStart(13));
    console.log('\n  row = P1 loadout, col = opponent loadout, cell = row win rate');
    console.log('  ' + ' '.repeat(13) + short.join(''));
    r.cell.forEach((row, i) => {
        console.log('  ' + short[i] + row.map((v) => (Number.isNaN(v) ? '    —' : pct(v).padStart(5)).padStart(13)).join(''));
    });
}
// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 ? process.argv[i + 1] : undefined;
}
function flag(name) { return process.argv.includes(`--${name}`); }
const isMain = process.argv[1]?.endsWith('loadoutMatrix.ts') || process.argv[1]?.endsWith('loadoutMatrix.js');
if (isMain) {
    const mode = arg('mode') ?? 'reference';
    const games = parseInt(arg('games') ?? (mode === 'duel' ? '50' : '100'), 10);
    const classes = flag('all') ? exports.ALL_CLASSES : [arg('class') ?? 'rogue'];
    let grandErrors = 0;
    for (const c of classes) {
        console.log(`\n═══ ${c.toUpperCase()} — ${mode} mode, ${games} games/${mode === 'duel' ? 'pair' : 'loadout'} ═══`);
        if (mode === 'duel') {
            const r = runDuelMatrix(c, games);
            printDuelCells(r);
            printScores(`${c} loadout ranking (round-robin aggregate):`, r.scores);
            grandErrors += r.totalValidationErrors;
        }
        else if (mode === 'escort') {
            const r = runEscortMatrix(c, games);
            printScores(`${c} loadout ranking (escort duels, escorts: ${escortsFor(c).join('/')}):`, r.scores);
            grandErrors += r.totalValidationErrors;
        }
        else {
            const r = runReferenceMatrix(c, games);
            printScores(`${c} loadout ranking (vs reference party):`, r.scores);
            grandErrors += r.totalValidationErrors;
        }
    }
    console.log(`\nTotal validation errors across all runs: ${grandErrors}${grandErrors === 0 ? ' ✓' : '  ⚠ INVESTIGATE'}`);
}
//# sourceMappingURL=loadoutMatrix.js.map