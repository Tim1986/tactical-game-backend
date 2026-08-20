"use strict";
/**
 * placement.ts — Opening-placement planner ("Auto-Arrange").
 *
 * Player-facing: the button on the team page calls straight into this, and
 * Fable's 12 rosters deploy with it. The bar is "a tactics player looks at the
 * formation and recognises the plan" — mutual support without feeding AoE.
 *
 * ── Why this is a set of AUTHORED FORMATIONS and not an optimizer ───────────
 * Two previous versions scored tiles with weighted sums (centre pull, span,
 * spacing penalties) and both produced the same thing: units evenly smeared
 * into lattices and picket lines. That is not a tuning failure — it is what
 * the optimum of any smooth weighted sum looks like. The strategies a human
 * actually plays ("rush the middle as a pack", "castle in a corner and make
 * them walk") are DISCRETE plans, not points on a continuum, so no weight
 * setting reaches them. The fix is to think in the same order a player does:
 * pick the strategy from the composition, then arrange the units to express
 * it, then verify AoE safety as a hard rule.
 *
 *   RUSH    all-melee            wedge on the front line, centre-forward:
 *                                the pack arrives at the same fight on the
 *                                same turn, wings fold in behind.
 *   PHALANX melee + support      melee wall centre-front; casters/healers
 *                                tucked on the back shoulders, diagonal to
 *                                the wall so no lane or blast lines up.
 *   CASTLE  no melee             staggered lattice anchored in the top
 *                                corner. A ranged/control team wants the
 *                                approach to be long and awkward; the corner
 *                                halves the angles melee can come from and
 *                                buys two turns of free shooting.
 *
 * ── The AoE geometry every shape must respect ───────────────────────────────
 * The blasts that can reach the deploy zone on turn 1 (Ring of Fire/Frost)
 * are ring-shaped: they hit the 8 tiles around a centre — a 3x3 box minus its
 * middle. All three deploy columns fit inside one box width, which gives two
 * hard rules and two derived facts:
 *
 *   R1  every pair of allies at Chebyshev >= 2 (a blast centred on either
 *       must not clip the other);
 *   R2  any 3 consecutive ROWS hold at most 2 units (no single blast may
 *       catch three).
 *
 *   F1  under R2, four units need a vertical span of AT LEAST 4 rows, and
 *       span 4 is only achievable as rows {r, r+1, r+3, r+4} with each
 *       adjacent-row pair split into columns 0 and 2 (dx=2 keeps R1). This is
 *       why no honest formation is tighter than the ones below — and why the
 *       castle is a stagger, not a block.
 *   F2  the "obvious" 2x2 square (e.g. (0,3),(2,3),(0,5),(2,5)) is the WORST
 *       formation on the board: one ring centred in its middle catches all
 *       four. Enumerated, not intuited. The eye wants to build it; never do.
 *
 * Every template below satisfies R1 and R2 exactly (worst single blast = 2,
 * zero adjacent pairs), keeps all units off distinct rows (so a line special
 * — Piercing Shot, Flame Jet, which hit allies in the lane — never has an
 * ally parked in its firing row), and avoids the removed corner tiles.
 *
 * ── Game facts this file MUST stay in step with (audited 2026-08-09) ────────
 *  Reach:      melee basic range 1, warlock 4, wizard/sorcerer 5, ranger 6.
 *              Movement 3 (rogue 4).
 *  Geometry:   front lines start 3 columns apart (P1 x=2 vs P2 x=5), so melee
 *              from x=2 reach contact on turn 1.
 *  Support:    Heal range 2; Ward and Purify range 3. Healers do NOT need to
 *              deploy inside heal range — everyone is at full HP on turn 1 and
 *              movement 3 closes any gap in these shapes before it matters.
 *  AoE shapes: Whirlwind / Ground Slam are `orthogonal` r1 (Manhattan == 1 —
 *              diagonal neighbours are safe) and self-centred; they threaten
 *              the contact fight, not the deployment. Ring of Fire/Frost and
 *              Leaping Slam are `ring` r1; the first two reach the deploy zone
 *              turn 1, which is what R1/R2 defend against.
 *  Friendly fire: line and AoE specials have excludeAllies=false.
 *  Coverage:   range is MANHATTAN, so row offset spends the same budget as
 *              column distance — another reason the phalanx sits centred.
 *
 * ── Do not re-tune this against a win-rate number ───────────────────────────
 * placementSearch.ts optimised placements directly against a fixed field and
 * "won" +8 points — which measured +0.0 against opponents placed randomly.
 * Placement swings individual matchups enormously (sd ~22) but no fixed
 * formation dominates a varied field, so win-rate cannot arbitrate between
 * reasonable formations. Legibility can, and does.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.planPlacement = planPlacement;
exports.mirrorPlacement = mirrorPlacement;
const matchState_js_1 = require("../types/matchState.js");
const defaultData_js_1 = require("./defaultData.js");
function profile(slug, abilityMap, cust) {
    const def = defaultData_js_1.DEFAULT_UNITS[slug];
    if (!def)
        return { role: 'melee', attackRange: 1, maxHealth: 0, movement: 3 };
    const slugs = [...def.abilities];
    if (cust?.specialSlug && !slugs.includes(cust.specialSlug))
        slugs.push(cust.specialSlug);
    const abilities = slugs.map((s) => abilityMap.get(s)).filter(Boolean);
    const isHealer = abilities.some((a) => a.targetingType !== 'self' && a.effects.some((e) => e.type === 'heal'));
    const basic = abilities.find((a) => !a.isSpecial) ?? abilities[0];
    const attackRange = basic?.range ?? 1;
    const role = isHealer ? 'healer' : attackRange <= 1 ? 'melee' : 'ranged';
    return { role, attackRange, maxHealth: def.maxHealth, movement: def.movementRange };
}
/** All legal P1-zone tiles (x 0–2, the two x=0 corners excluded). */
const ZONE = [];
for (let x = 0; x <= 2; x++) {
    for (let y = 0; y < matchState_js_1.BOARD_HEIGHT; y++) {
        if ((x === 0 || x === matchState_js_1.BOARD_WIDTH - 1) && (y === 0 || y === matchState_js_1.BOARD_HEIGHT - 1))
            continue;
        ZONE.push({ x, y });
    }
}
const P = (x, y) => ({ x, y });
/* ── The formations ─────────────────────────────────────────────────────────
 * Listed per archetype and unit count. Slot ORDER within each template is the
 * assignment order used below (most important slot first).                   */
/** RUSH — all melee. Wedge: centre pair leads, wings trail on the flanks.
 *  Tanks take the point; the fastest units take the wings (a rogue's movement
 *  4 folds a wing into the centre fight on turn 1). */
const RUSH = {
    1: [P(2, 4)],
    2: [P(2, 3), P(2, 5)],
    3: [P(2, 2), P(2, 4), P(2, 6)],
    4: [P(2, 3), P(2, 5), P(1, 1), P(1, 7)], // point pair, then wings
};
/** PHALANX — melee wall centre-front (by melee count), supports tucked on the
 *  back shoulders, diagonal to the wall. The shoulder tiles are the ones that
 *  are Chebyshev-2 from the wall without ever sharing its rows.
 *  Keyed by melee count; the support list must be truncated to support count.
 *  (Melee 3 forces the single support to the bottom shoulder: the top shoulder
 *  (0,2) would put three units inside rows 1–3 — one blast catches them.) */
const PHALANX_FRONT = {
    1: [P(2, 4)],
    2: [P(2, 3), P(2, 5)],
    3: [P(2, 1), P(2, 3), P(2, 5)],
};
const PHALANX_SUPPORT = {
    1: [P(0, 2), P(0, 6), P(1, 0)],
    2: [P(0, 2), P(0, 6)],
    3: [P(0, 6)],
};
/** CASTLE — no melee. The span-4 stagger from F1, anchored in the top corner:
 *  two "bastion" tiles on the front column, two "keep" tiles deep behind,
 *  each adjacent-row pair split across columns 0/2. Healers and short-reach
 *  casters take the bastion (they are the durable/close-in ones); the longest
 *  reaches shoot from the keep. */
const CASTLE = {
    1: [P(1, 2)],
    2: [P(1, 0), P(0, 2)],
    3: [P(2, 0), P(2, 3), P(0, 1)], // bastion, bastion, keep
    4: [P(2, 0), P(2, 3), P(0, 1), P(0, 4)], // bastion x2, keep x2
};
/* ── Safety verification (the R1/R2 rules as executable checks) ───────────── */
function violatesRules(tiles) {
    for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            const cheb = Math.max(Math.abs(tiles[i].x - tiles[j].x), Math.abs(tiles[i].y - tiles[j].y));
            if (cheb < 2)
                return true; // R1
        }
    }
    for (let w = 0; w <= matchState_js_1.BOARD_HEIGHT - 3; w++) {
        let n = 0;
        for (const t of tiles)
            if (t.y >= w && t.y <= w + 2)
                n++;
        if (n > 2)
            return true; // R2
    }
    return false;
}
/* ── Assignment ─────────────────────────────────────────────────────────────
 * Stable, deterministic orderings decide which unit takes which slot.        */
/** Indices sorted for RUSH/PHALANX fronts: toughest first (they take the
 *  point), original order as the tie-break. */
function byToughness(idx, profiles) {
    return [...idx].sort((a, b) => profiles[b].maxHealth - profiles[a].maxHealth || a - b);
}
/** Indices sorted for CASTLE: healers first, then shortest reach — those take
 *  the bastion; the longest reaches end up in the keep. */
function byBastionPriority(idx, profiles) {
    return [...idx].sort((a, b) => {
        const ha = profiles[a].role === 'healer' ? 0 : 1;
        const hb = profiles[b].role === 'healer' ? 0 : 1;
        return ha - hb || profiles[a].attackRange - profiles[b].attackRange || a - b;
    });
}
/**
 * Generic fallback for team sizes the templates don't cover (nothing in the
 * game today builds one, but the planner must never throw at a player).
 * Greedy fill over centre-out front-first tiles, honouring R1/R2, relaxing
 * R2 then R1 only if the board genuinely cannot satisfy them.
 */
function genericFill(n, preferFront) {
    const ordered = [...ZONE].sort((a, b) => {
        const ax = preferFront ? -a.x : a.x;
        const bx = preferFront ? -b.x : b.x;
        return ax - bx || Math.abs(a.y - 3.5) - Math.abs(b.y - 3.5) || a.y - b.y;
    });
    for (const relax of [0, 1, 2]) {
        const placed = [];
        for (const t of ordered) {
            if (placed.length === n)
                break;
            const trial = [...placed, t];
            const pairOk = relax >= 2 || !trial.some((p, i) => trial.some((q, j) => j > i && Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) < 2));
            let windowOk = true;
            if (relax < 1) {
                for (let w = 0; w <= matchState_js_1.BOARD_HEIGHT - 3 && windowOk; w++) {
                    if (trial.filter((p) => p.y >= w && p.y <= w + 2).length > 2)
                        windowOk = false;
                }
            }
            if (pairOk && windowOk)
                placed.push(t);
        }
        if (placed.length === n)
            return placed;
    }
    return ZONE.slice(0, n); // 22 tiles; a team can never exceed that
}
const planCache = new Map();
/**
 * Plan starting tiles for a team, in the P1 frame (x 0–2, parallel to
 * `slugs`). Mirror with x -> BOARD_WIDTH-1-x for the P2 side. Deterministic
 * (the sims and the UI both rely on that) and memoised per comp+loadout.
 */
function planPlacement(slugs, abilityMap, customizations) {
    const custKey = (customizations ?? []).map((c) => c?.specialSlug ?? '-').join(',');
    const cacheKey = `${slugs.join(',')}|${custKey}`;
    const cached = planCache.get(cacheKey);
    if (cached)
        return cached.map((p) => ({ ...p }));
    const profiles = slugs.map((s, i) => profile(s, abilityMap, customizations?.[i]));
    const meleeIdx = profiles.map((_, i) => i).filter((i) => profiles[i].role === 'melee');
    const supportIdx = profiles.map((_, i) => i).filter((i) => profiles[i].role !== 'melee');
    const n = slugs.length;
    const result = new Array(n);
    const assign = (order, slots) => order.forEach((unitIndex, k) => { result[unitIndex] = { ...slots[k] }; });
    if (meleeIdx.length === n && RUSH[n]) {
        // RUSH — wings go to the fastest, point to the toughest. Sorting the
        // remainder by movement puts rogues on the wings, where movement 4 folds
        // them into the centre fight on turn 1.
        const tough = byToughness(meleeIdx, profiles);
        const point = tough.slice(0, Math.min(2, n));
        const wings = tough.slice(point.length)
            .sort((a, b) => profiles[b].movement - profiles[a].movement || a - b);
        assign([...point, ...wings], RUSH[n]);
    }
    else if (meleeIdx.length > 0 &&
        PHALANX_FRONT[meleeIdx.length] &&
        supportIdx.length <= PHALANX_SUPPORT[meleeIdx.length].length) {
        // PHALANX — wall by toughness; healers claim shoulder slots first so a
        // team with one healer and one striker always tucks the healer in.
        assign(byToughness(meleeIdx, profiles), PHALANX_FRONT[meleeIdx.length]);
        const supports = [...supportIdx].sort((a, b) => {
            const ha = profiles[a].role === 'healer' ? 0 : 1;
            const hb = profiles[b].role === 'healer' ? 0 : 1;
            return ha - hb || a - b;
        });
        assign(supports, PHALANX_SUPPORT[meleeIdx.length]);
    }
    else if (meleeIdx.length === 0 && CASTLE[n]) {
        assign(byBastionPriority(supportIdx, profiles), CASTLE[n]);
    }
    else {
        // No template fits (oversized or odd team) — generic doctrine-flavoured
        // fill, melee-heavy teams toward the front, others toward the back.
        const tiles = genericFill(n, meleeIdx.length * 2 >= n);
        const order = [...byToughness(meleeIdx, profiles), ...byBastionPriority(supportIdx, profiles)];
        assign(order, tiles);
    }
    // The templates are constructed to satisfy R1/R2; this guards against a
    // future edit quietly breaking one. Fall back rather than ship a violation.
    if (violatesRules(result)) {
        const tiles = genericFill(n, meleeIdx.length * 2 >= n);
        result.forEach((_, i) => { result[i] = tiles[i]; });
    }
    planCache.set(cacheKey, result.map((p) => ({ ...p })));
    return result.map((p) => ({ ...p }));
}
function mirrorPlacement(placement) {
    return placement.map((p) => ({ x: matchState_js_1.BOARD_WIDTH - 1 - p.x, y: p.y }));
}
//# sourceMappingURL=placement.js.map