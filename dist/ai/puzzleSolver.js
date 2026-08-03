"use strict";
/**
 * puzzleSolver.ts — Authoring/verification tool for daily puzzles.
 *
 * Exhaustively searches the player's legal turn sequences (with OptimalBrain
 * playing every enemy reply) and reports whether a puzzle meets the
 * "tricky but fair" acceptance bar from PUZZLES_AND_INVITES.md:
 *
 *   1. Solvable: at least one line achieves the goal in maxPlayerTurns.
 *   2. Winning first moves ≤ 2 (ideally 1 — "only move" puzzles feel best).
 *   3. The greedy line (OptimalBrain playing the player side) does NOT win.
 *   4. Random lines win < 5% (the enemy can't simply be out-statted).
 *
 * Everything is deterministic (pinned fortune meters), so this is a plain
 * game-tree walk — no sampling needed except for the random-line check.
 *
 * Legality: candidates are enumerated generously and validated by running
 * them through the real processTurn (which throws TurnValidationError on
 * illegal input). The engine is the single legality oracle — this file
 * contains no movement/targeting rules of its own.
 *
 * CLI:  npx tsx src/ai/puzzleSolver.ts            (solves all registered puzzles)
 *       npx tsx src/ai/puzzleSolver.ts puzzle-001 (one puzzle)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enumeratePlayerTurns = enumeratePlayerTurns;
exports.solvePuzzle = solvePuzzle;
const turnProcessor_js_1 = require("../game/turnProcessor.js");
const aiBrain_js_1 = require("./aiBrain.js");
const defaultData_js_1 = require("./defaultData.js");
const geometry_js_1 = require("./geometry.js");
const buildPuzzleState_js_1 = require("../puzzles/buildPuzzleState.js");
const index_js_1 = require("../puzzles/index.js");
const abilityMap = (0, defaultData_js_1.buildAbilityMap)();
const brain = new aiBrain_js_1.OptimalBrain();
const cdist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
// ---------------------------------------------------------------------------
// Candidate enumeration (generous — engine validates)
// ---------------------------------------------------------------------------
/** All boards tiles within Chebyshev range of a position (corners excluded). */
function tilesWithin(pos, range) {
    const out = [];
    for (let x = pos.x - range; x <= pos.x + range; x++) {
        for (let y = pos.y - range; y <= pos.y + range; y++) {
            const p = { x, y };
            if ((0, geometry_js_1.isInBounds)(p) && !(0, geometry_js_1.isCorner)(x, y))
                out.push(p);
        }
    }
    return out;
}
/** Enumerate ability actions for `unit` casting from `fromPos`. */
function abilityActionsFrom(state, unit, fromPos) {
    const out = [];
    for (const slug of unit.abilities) {
        if ((unit.cooldowns[slug] ?? 0) > 0)
            continue;
        const def = abilityMap.get(slug);
        if (!def)
            continue;
        let targets;
        if (def.targetingType === 'self' || (def.targetingType === 'aoe' && def.range === 0)) {
            targets = [fromPos];
        }
        else if (def.targetingType === 'single') {
            // Only tiles holding a living unit can be single-targets.
            targets = state.units
                .filter((u) => u.isAlive && cdist(fromPos, u.position) <= def.range)
                .map((u) => u.position);
        }
        else {
            // aoe with range > 0, line: any tile in range (engine rejects bad rays).
            targets = tilesWithin(fromPos, def.range);
        }
        const hasChoosablePush = def.effects.some((e) => e.type === 'push') && def.targetingType === 'single';
        for (const target of targets) {
            const base = { type: 'USE_ABILITY', unitInstanceId: unit.instanceId, abilitySlug: slug, target };
            out.push(base);
            if (hasChoosablePush) {
                // Branch on the landing tile too (Fear-style two-tap abilities).
                const pushDist = def.effects.find((e) => e.type === 'push')?.distance ?? 0;
                for (const dest of tilesWithin(target, pushDist)) {
                    if (dest.x === target.x && dest.y === target.y)
                        continue;
                    out.push({ ...base, pushDestination: dest });
                }
            }
        }
    }
    return out;
}
/** Enumerate all candidate turns (action lists) for the active player unit. */
function enumeratePlayerTurns(state) {
    const unit = state.units.find((u) => u.instanceId === state.initiative.activeUnitId);
    if (!unit || !unit.isAlive)
        return [[{ type: 'END_TURN' }]];
    const END = { type: 'END_TURN' };
    const plans = [[END]];
    const moveTiles = (0, geometry_js_1.reachableFrom)(unit.position, unit, state.units, unit.movementRange);
    // Move only / charge only.
    for (const d of moveTiles) {
        plans.push([{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: d }, END]);
        plans.push([{ type: 'CHARGE', unitInstanceId: unit.instanceId, destination: d }, END]);
    }
    // Act from here (optionally retreat after).
    for (const act of abilityActionsFrom(state, unit, unit.position)) {
        plans.push([act, END]);
        for (const d of moveTiles) {
            plans.push([act, { type: 'MOVE', unitInstanceId: unit.instanceId, destination: d }, END]);
        }
    }
    // Move then act.
    for (const d of moveTiles) {
        for (const act of abilityActionsFrom(state, unit, d)) {
            plans.push([{ type: 'MOVE', unitInstanceId: unit.instanceId, destination: d }, act, END]);
        }
    }
    return plans;
}
/** Apply one player turn then all enemy replies. null = illegal turn. */
function applyPlayerTurn(def, ids, state, actions) {
    let result;
    try {
        result = (0, turnProcessor_js_1.processTurn)(state, actions, buildPuzzleState_js_1.PUZZLE_PLAYER_ID, buildPuzzleState_js_1.PUZZLE_PLAYER_ID, buildPuzzleState_js_1.PUZZLE_ENEMY_ID, abilityMap);
    }
    catch {
        return null; // illegal candidate — engine rejected it
    }
    let cur = result.updatedState;
    // Goal met during the player's own turn = immediate win.
    if ((0, buildPuzzleState_js_1.checkPuzzleGoal)(def, cur, ids) === 'won')
        return { state: cur, outcome: 'won' };
    if (result.matchOver) {
        return { state: cur, outcome: result.winnerId === buildPuzzleState_js_1.PUZZLE_PLAYER_ID ? 'won' : 'lost' };
    }
    // Enemy replies until it's the player's turn again.
    while (cur.activePlayerId === buildPuzzleState_js_1.PUZZLE_ENEMY_ID) {
        const enemyActions = brain.selectActions(cur, buildPuzzleState_js_1.PUZZLE_ENEMY_ID, abilityMap);
        const r = (0, turnProcessor_js_1.processTurn)(cur, enemyActions, buildPuzzleState_js_1.PUZZLE_ENEMY_ID, buildPuzzleState_js_1.PUZZLE_PLAYER_ID, buildPuzzleState_js_1.PUZZLE_ENEMY_ID, abilityMap);
        cur = r.updatedState;
        if ((0, buildPuzzleState_js_1.checkPuzzleGoal)(def, cur, ids) === 'won')
            return { state: cur, outcome: 'won' }; // e.g. burning tick kills the target
        if (r.matchOver)
            return { state: cur, outcome: r.winnerId === buildPuzzleState_js_1.PUZZLE_PLAYER_ID ? 'won' : 'lost' };
    }
    if ((0, buildPuzzleState_js_1.checkPuzzleGoal)(def, cur, ids) === 'lost')
        return { state: cur, outcome: 'lost' };
    return { state: cur, outcome: 'ongoing' };
}
/** Does ANY line win from this state with `turnsLeft` player turns? */
function subtreeWins(def, ids, state, turnsLeft) {
    if (turnsLeft <= 0)
        return false;
    for (const plan of enumeratePlayerTurns(state)) {
        const step = applyPlayerTurn(def, ids, state, plan);
        if (!step)
            continue;
        if (step.outcome === 'won')
            return true;
        if (step.outcome === 'lost')
            continue;
        if (subtreeWins(def, ids, step.state, turnsLeft - 1))
            return true;
    }
    return false;
}
function describePlan(plan) {
    return plan
        .filter((a) => a.type !== 'END_TURN')
        .map((a) => {
        if (a.type === 'MOVE')
            return `move→(${a.destination.x},${a.destination.y})`;
        if (a.type === 'CHARGE')
            return `charge→(${a.destination.x},${a.destination.y})`;
        const push = a.pushDestination ? ` push→(${a.pushDestination.x},${a.pushDestination.y})` : '';
        return `${a.abilitySlug}@(${a.target.x},${a.target.y})${push}`;
    })
        .join(' + ') || 'pass';
}
/** Core-idea key: the ability action if any (positioning around the same
 *  blow is one idea), else the move/charge destination, else 'pass'. */
function planIdeaKey(plan) {
    const act = plan.find((a) => a.type === 'USE_ABILITY');
    if (act && act.type === 'USE_ABILITY') {
        const push = act.pushDestination ? `>${act.pushDestination.x},${act.pushDestination.y}` : '';
        return `${act.abilitySlug}@${act.target.x},${act.target.y}${push}`;
    }
    const mv = plan.find((a) => a.type === 'MOVE' || a.type === 'CHARGE');
    if (mv && (mv.type === 'MOVE' || mv.type === 'CHARGE')) {
        return `${mv.type.toLowerCase()}→${mv.destination.x},${mv.destination.y}`;
    }
    return 'pass';
}
function solvePuzzle(def, randomTrials = 200, 
/** Player special selections (from specialChoices) to solve under. */
specialOverrides) {
    const { state: initial, instanceIdBySpecId: ids } = (0, buildPuzzleState_js_1.buildPuzzleState)(def, specialOverrides);
    // 1+2. Exhaustive: which first moves lead to a win?
    const firstPlans = enumeratePlayerTurns(initial);
    let legalFirstMoves = 0;
    let winningFirstMoves = 0;
    const winningIdeas = new Map(); // idea key → example description
    for (const plan of firstPlans) {
        const step = applyPlayerTurn(def, ids, initial, plan);
        if (!step)
            continue;
        legalFirstMoves++;
        const wins = step.outcome === 'won'
            || (step.outcome === 'ongoing' && subtreeWins(def, ids, step.state, def.maxPlayerTurns - 1));
        if (wins) {
            winningFirstMoves++;
            const key = planIdeaKey(plan);
            if (!winningIdeas.has(key))
                winningIdeas.set(key, describePlan(plan));
        }
    }
    const winningFirstIdeas = winningIdeas.size;
    const winningFirstMoveDescriptions = [...winningIdeas.values()];
    const solvable = winningFirstMoves > 0;
    // 3. Greedy line: OptimalBrain plays the player side.
    let greedyWins = false;
    {
        let cur = initial;
        for (let t = 0; t < def.maxPlayerTurns; t++) {
            const actions = brain.selectActions(cur, buildPuzzleState_js_1.PUZZLE_PLAYER_ID, abilityMap);
            const step = applyPlayerTurn(def, ids, cur, actions);
            if (!step)
                break;
            if (step.outcome === 'won') {
                greedyWins = true;
                break;
            }
            if (step.outcome === 'lost')
                break;
            cur = step.state;
        }
    }
    // 4. Random lines (uniform over legal candidates each turn).
    let randomWins = 0;
    for (let trial = 0; trial < randomTrials; trial++) {
        let cur = initial;
        for (let t = 0; t < def.maxPlayerTurns; t++) {
            const plans = enumeratePlayerTurns(cur);
            // Retry until a legal plan is drawn (bounded).
            let step = null;
            for (let attempts = 0; attempts < 50 && !step; attempts++) {
                step = applyPlayerTurn(def, ids, cur, plans[Math.floor(Math.random() * plans.length)]);
            }
            if (!step)
                break;
            if (step.outcome === 'won') {
                randomWins++;
                break;
            }
            if (step.outcome === 'lost')
                break;
            cur = step.state;
        }
    }
    const randomWinRate = randomWins / randomTrials;
    const failures = [];
    if (!solvable)
        failures.push('NOT SOLVABLE — no winning line exists');
    if (winningFirstIdeas > 2)
        failures.push(`too easy: ${winningFirstIdeas} distinct winning first ideas (bar: ≤ 2)`);
    if (greedyWins)
        failures.push('too obvious: the greedy/brain line wins');
    if (randomWinRate >= 0.05)
        failures.push(`degenerate: random lines win ${(randomWinRate * 100).toFixed(1)}% (bar: < 5%)`);
    return {
        puzzleId: def.id,
        solvable, legalFirstMoves, winningFirstMoves, winningFirstIdeas, winningFirstMoveDescriptions,
        greedyWins, randomWinRate, randomTrials,
        passes: failures.length === 0,
        failures,
    };
}
// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const isMain = process.argv[1]?.endsWith('puzzleSolver.ts') || process.argv[1]?.endsWith('puzzleSolver.js');
if (isMain) {
    const only = process.argv[2];
    const defs = Object.values(index_js_1.PUZZLES).filter((p) => !only || p.id === only);
    if (defs.length === 0) {
        console.error(`No puzzle matching '${only}'. Registered: ${Object.keys(index_js_1.PUZZLES).join(', ')}`);
        process.exit(1);
    }
    /** All combinations of offered specials across player units with choices. */
    function specialCombos(def) {
        const choosers = def.units.filter((u) => u.side === 'player' && (u.specialChoices?.length ?? 0) > 0);
        let combos = [{}];
        for (const u of choosers) {
            combos = combos.flatMap((c) => u.specialChoices.map((slug) => ({ ...c, [u.id]: slug })));
        }
        return combos;
    }
    for (const def of defs) {
        const combos = specialCombos(def);
        const hasChoices = combos.length > 1;
        const defaults = {};
        for (const u of def.units) {
            if (u.side === 'player' && u.specialChoices?.length)
                defaults[u.id] = u.specialSlug ?? u.specialChoices[0];
        }
        console.log(`\n═══ ${def.id} — "${def.title}" — ${combos.length} special combo(s) ═══`);
        console.log(`  fate: ${def.fateText}  script: [${def.rollScript.join(', ')}]`);
        const results = [];
        for (const combo of combos) {
            const t0 = Date.now();
            const r = solvePuzzle(def, 200, combo);
            const label = Object.keys(combo).length
                ? Object.entries(combo).map(([k, v]) => `${k}=${v}`).join(', ')
                : '(no choices)';
            const isDefault = !hasChoices || JSON.stringify(combo) === JSON.stringify(defaults);
            results.push({ combo, isDefault, r });
            console.log(`\n  ── combo: ${label}${hasChoices && isDefault ? '  ← DEFAULT' : ''} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
            console.log(`    solvable:            ${r.solvable ? '✓' : '✗'}`);
            console.log(`    winning first moves: ${r.winningFirstMoves} raw → ${r.winningFirstIdeas} distinct ideas`);
            for (const d of r.winningFirstMoveDescriptions.slice(0, 4))
                console.log(`        · ${d}`);
            console.log(`    greedy line wins:    ${r.greedyWins ? '✗' : 'no ✓'}`);
            console.log(`    random win rate:     ${(r.randomWinRate * 100).toFixed(1)}%`);
        }
        // ── Overall verdict ──
        // No-choice puzzles: the classic bar on the single combo.
        // Choice puzzles come in two sanctioned shapes:
        //   TOOL-CHOICE — at most half the combos solve; the puzzle is picking
        //     the right special. The DEFAULT combo's greedy line must not win
        //     (a non-thinking player keeping defaults fails).
        //   CAMOUFLAGE — EVERY combo solves and every combo passes the classic
        //     bar on its own (ideas ≤2, greedy fails, random <5%); the picker
        //     exists purely so the loadout stops telegraphing the solution.
        // Anything in between (most-but-not-all combos solve) is muddy — fail.
        const failures = [];
        if (!hasChoices) {
            failures.push(...results[0].r.failures);
        }
        else {
            const solvableCombos = results.filter((x) => x.r.solvable);
            const dflt = results.find((x) => x.isDefault);
            for (const x of solvableCombos) {
                if (x.r.randomWinRate >= 0.05)
                    failures.push(`degenerate combo ${JSON.stringify(x.combo)}: random wins ${(x.r.randomWinRate * 100).toFixed(1)}%`);
            }
            if (solvableCombos.length === combos.length) {
                // CAMOUFLAGE shape: every combo must independently pass the classic bar.
                for (const x of results) {
                    if (!x.r.passes)
                        failures.push(`camouflage combo ${JSON.stringify(x.combo)} fails classic bar: ${x.r.failures.join('; ')}`);
                }
            }
            else if (solvableCombos.length * 2 <= combos.length) {
                // TOOL-CHOICE shape.
                const goodCombos = solvableCombos.filter((x) => x.r.winningFirstIdeas <= 2);
                if (goodCombos.length === 0)
                    failures.push('no combo is solvable within ≤2 distinct ideas');
                if (dflt.r.solvable && dflt.r.greedyWins)
                    failures.push('too obvious: default-loadout greedy line wins');
            }
            else {
                failures.push(`muddy: ${solvableCombos.length}/${combos.length} combos solvable (must be all, or ≤ half)`);
            }
        }
        console.log(`\n  OVERALL VERDICT: ${failures.length === 0 ? 'PASS ✓' : 'FAIL — ' + failures.join('; ')}`);
    }
}
//# sourceMappingURL=puzzleSolver.js.map