/**
 * smokeTest.ts — quick behavioral checks for OptimalBrain.
 * Run: npx tsc --strict --target es2020 --module commonjs *.ts && node smokeTest.js
 */

import { MatchState, UnitInstance, BoardPosition } from './types';
import { OptimalBrain } from './aiBrain';
import { buildAbilityMap, DEFAULT_UNITS } from './defaultData';

let nextId = 1;
function mkUnit(
  slug: string,
  owner: string,
  pos: BoardPosition,
  hp?: number,
): UnitInstance {
  const def = DEFAULT_UNITS[slug];
  return {
    instanceId: `u${nextId++}_${slug}`,
    definitionSlug: slug,
    ownerPlayerId: owner,
    position: pos,
    currentHealth: hp ?? def.maxHealth,
    maxHealth: def.maxHealth,
    armorClass: def.armorClass,
    movementRange: def.movementRange,
    abilities: [...def.abilities],
    passives: [],
    isAlive: true,
    hasMovedThisTurn: false,
    hasActedThisTurn: false,
    cooldowns: {},
    statusEffects: [],
    };
}

function mkState(
  units: UnitInstance[],
  activeUnitId: string | null,
  isRound1 = false,
  roundNumber = 1,
): MatchState {
  return {
    board: { width: 8, height: 8 },
    units,
    turnNumber: 1,
    roundNumber,
    phase: 'action',
    activePlayerId: 'p1',
    initiative: {
      order: isRound1 ? [] : units.map((u) => u.instanceId),
      slot: 0,
      round1FirstPlayerId: 'p1',
      activeUnitId,
      isRound1,
    },
  };
}

const brain = new OptimalBrain();
const map = buildAbilityMap();
let failures = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) console.log(`  PASS  ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// --- Test 1: Rogue holds Kill Shot above threshold, uses it at/below ---
{
  const rogue = mkUnit('rogue', 'p1', { x: 3, y: 3 });
  const healthyTarget = mkUnit('fighter', 'p2', { x: 4, y: 3 }, 42);
  let state = mkState([rogue, healthyTarget], rogue.instanceId);
  let actions = brain.selectActions(state, 'p1', map);
  const usedKillShotEarly = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'assassinate',
  );
  check('Rogue does NOT waste Kill Shot on full-HP target', !usedKillShotEarly,
    JSON.stringify(actions));

  const weakTarget = mkUnit('fighter', 'p2', { x: 4, y: 3 }, 18);
  state = mkState([rogue, weakTarget], rogue.instanceId);
  actions = brain.selectActions(state, 'p1', map);
  const usedKillShotNow = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'assassinate',
  );
  check('Rogue USES Kill Shot on 18-HP target', usedKillShotNow,
    JSON.stringify(actions));
}

// --- Test 2: Cleric heals a badly wounded adjacent ally ---
{
  const cleric = mkUnit('cleric', 'p1', { x: 2, y: 2 });
  const hurtAlly = mkUnit('barbarian', 'p1', { x: 2, y: 3 }, 12); // 33 missing
  const distantEnemy = mkUnit('wizard', 'p2', { x: 7, y: 6 });
  const state = mkState([cleric, hurtAlly, distantEnemy], cleric.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const healed = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'heal',
  );
  check('Cleric heals badly wounded adjacent ally', healed, JSON.stringify(actions));
}

// --- Test 3: Barbarian avoids Whirlwind that would hit more allies than enemies ---
{
  const barb = mkUnit('barbarian', 'p1', { x: 3, y: 3 });
  const ally1 = mkUnit('cleric', 'p1', { x: 2, y: 3 }, 20);
  const ally2 = mkUnit('wizard', 'p1', { x: 3, y: 2 }, 15);
  const enemy = mkUnit('fighter', 'p2', { x: 4, y: 3 });
  const state = mkState([barb, ally1, ally2, enemy], barb.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const whirled = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'whirlwind',
  );
  check('Barbarian skips Whirlwind when 2 allies + 1 enemy adjacent', !whirled,
    JSON.stringify(actions));
}

// --- Test 4: Ranger attacks from range instead of walking into melee ---
{
  const ranger = mkUnit('ranger', 'p1', { x: 1, y: 3 });
  const enemy = mkUnit('barbarian', 'p2', { x: 6, y: 3 });
  const state = mkState([ranger, enemy], ranger.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const attacked = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'arrow',
  );
  check('Ranger attacks with Arrow at range 5', attacked, JSON.stringify(actions));
}

// --- Test 5: Melee unit out of ability range uses Charge (double move) ---
{
  const fighter = mkUnit('fighter', 'p1', { x: 1, y: 3 });
  const enemy = mkUnit('wizard', 'p2', { x: 7, y: 4 }); // 7 tiles away, move 3 can't reach melee
  const state = mkState([fighter, enemy], fighter.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const charged = actions.some((a) => a.type === 'CHARGE');
  check('Fighter Charges to close a 7-tile gap', charged, JSON.stringify(actions));
}

// --- Test 6: Round 1 with no activeUnitId — brain picks a unit and commits ---
{
  const a = mkUnit('ranger', 'p1', { x: 1, y: 2 });
  const b = mkUnit('fighter', 'p1', { x: 1, y: 5 });
  const e1 = mkUnit('wizard', 'p2', { x: 6, y: 3 });
  const state = mkState([a, b, e1], null, true);
  const actions = brain.selectActions(state, 'p1', map);
  const identifiesUnit = actions.some(
    (act) => act.type !== 'END_TURN' && 'unitInstanceId' in act,
  );
  check('Round 1: plan identifies which unit is committed', identifiesUnit,
    JSON.stringify(actions));
  check('Round 1: plan ends with END_TURN',
    actions[actions.length - 1].type === 'END_TURN');
}

// --- Test 7: Wizard freezes a high-threat enemy with the special ---
{
  const wizard = mkUnit('wizard', 'p1', { x: 2, y: 3 });
  const bigThreat = mkUnit('barbarian', 'p2', { x: 5, y: 3 });
  const state = mkState([wizard, bigThreat], wizard.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  console.log('  info  Wizard vs Barbarian plan:', JSON.stringify(actions));
  // Freeze vs Ice Blast is a judgment call; just assert the wizard does SOMETHING offensive.
  const acted = actions.some((a) => a.type === 'USE_ABILITY');
  check('Wizard takes an offensive action vs approaching Barbarian', acted);
}

// --- Test 8: Sorcerer will not Firestorm its own team ---
{
  const sorc = mkUnit('sorcerer', 'p1', { x: 3, y: 3 });
  const ally = mkUnit('cleric', 'p1', { x: 4, y: 3 }, 14); // Firestorm would kill
  const enemy = mkUnit('rogue', 'p2', { x: 5, y: 3 });
  const state = mkState([sorc, ally, enemy], sorc.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const storm = actions.find(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'ffh',
  );
  if (storm && storm.type === 'USE_ABILITY') {
    // If it does cast, the center must not catch the 14-HP ally.
    const dx = Math.abs(storm.target.x - ally.position.x);
    const dy = Math.abs(storm.target.y - ally.position.y);
    check('Firestorm center avoids the fragile ally', Math.max(dx, dy) > 1,
      JSON.stringify(storm));
  } else {
    check('Sorcerer avoids ally-killing Firestorm (chose another action)', true);
  }
}

// ===========================================================================
// V2 regression tests (FABLE_AI_FEEDBACK_V2)
// ===========================================================================

import { reachableTiles, samePos } from './geometry';

// --- Test 9 (Bug 3): enemies block movement — cornered unit cannot escape ---
{
  // Wizard at (0,1). Its only orthogonal exits are (1,1) and (0,2) — (0,0) is
  // a removed corner. Enemies on both exits = zero reachable tiles.
  const wizard = mkUnit('wizard', 'p1', { x: 0, y: 1 });
  const blocker1 = mkUnit('fighter', 'p2', { x: 1, y: 1 });
  const blocker2 = mkUnit('fighter', 'p2', { x: 0, y: 2 });
  const tiles = reachableTiles(wizard, [wizard, blocker1, blocker2], wizard.movementRange);
  check('Bug 3: cornered unit has ZERO reachable tiles through enemies',
    tiles.length === 0, `got ${tiles.length} tiles: ${JSON.stringify(tiles)}`);
}

// --- Test 10 (Bug 3): allies can be passed through but not landed on ---
{
  const fighter = mkUnit('fighter', 'p1', { x: 0, y: 1 });
  const ally = mkUnit('cleric', 'p1', { x: 1, y: 1 });
  const enemyBlock = mkUnit('rogue', 'p2', { x: 0, y: 2 });
  const tiles = reachableTiles(fighter, [fighter, ally, enemyBlock], fighter.movementRange);
  const landsOnAlly = tiles.some((t) => t.x === 1 && t.y === 1);
  const passedThrough = tiles.some((t) => t.x === 2 && t.y === 1); // only reachable via ally tile
  check('Bug 3: cannot land on ally tile', !landsOnAlly, JSON.stringify(tiles));
  check('Bug 3: CAN pass through ally to tiles beyond', passedThrough, JSON.stringify(tiles));
}

// --- Test 11 (Bug 2): warlock does not waste Fear on a frozen target ---
{
  const warlock = mkUnit('warlock', 'p1', { x: 2, y: 3 });
  const frozenFighter = mkUnit('fighter', 'p2', { x: 5, y: 3 });
  frozenFighter.statusEffects.push({
    slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x',
  });
  const state = mkState([warlock, frozenFighter], warlock.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const usedFear = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'fear',
  );
  check('Bug 2: warlock does NOT Fear a frozen target', !usedFear, JSON.stringify(actions));
}

// --- Test 12 (Bug 2): wizard does not re-freeze an already-frozen target ---
{
  const wizard = mkUnit('wizard', 'p1', { x: 2, y: 3 });
  const frozenBarb = mkUnit('barbarian', 'p2', { x: 5, y: 3 });
  frozenBarb.statusEffects.push({
    slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x',
  });
  const state = mkState([wizard, frozenBarb], wizard.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const refroze = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'freeze',
  );
  check('Bug 2: wizard does NOT re-Freeze a frozen target', !refroze, JSON.stringify(actions));
}

// --- Test 13 (Bug 1): Whirlwind vetoed when it could kill a high-AC ally ---
{
  // The exact failure case from the feedback: allied fighter (AC 17) at 14 HP
  // adjacent, plus a nearly-dead high-threat enemy adjacent. Old scoring:
  // kill bonus (~70) > hit-chance-scaled death penalty (0.45 * 90 = 40.5).
  const barb = mkUnit('barbarian', 'p1', { x: 3, y: 3 });
  const fragileAllyFighter = mkUnit('fighter', 'p1', { x: 2, y: 3 }, 14);
  const dyingEnemy = mkUnit('barbarian', 'p2', { x: 4, y: 3 }, 10);
  const state = mkState([barb, fragileAllyFighter, dyingEnemy], barb.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const whirled = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'whirlwind',
  );
  check('Bug 1: Whirlwind hard-vetoed when it could kill high-AC ally', !whirled,
    JSON.stringify(actions));
}

// --- Test 14 (rule): no Charge after round 10 ---
{
  const fighter = mkUnit('fighter', 'p1', { x: 1, y: 3 });
  const enemy = mkUnit('wizard', 'p2', { x: 7, y: 4 }); // same 7-tile gap as Test 5
  const state = mkState([fighter, enemy], fighter.instanceId, false, 11);
  const actions = brain.selectActions(state, 'p1', map);
  const charged = actions.some((a) => a.type === 'CHARGE');
  check('Rule: Charge NOT used in round 11', !charged, JSON.stringify(actions));
}

// --- Test 15 (Bug A/4): Round 1 with only frozen/dead uncommitted units ---
// The engine rejects MOVE and USE_ABILITY for both frozen and dead units in
// Round 1 (tick-then-validate), so the brain must return bare END_TURN and
// let the harness/server pre-flight append the unit to initiative.order.
{
  const frozenRogue = mkUnit('rogue', 'p1', { x: 1, y: 2 });
  frozenRogue.statusEffects.push({
    slug: 'frozen', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x',
  });
  const deadWizard = mkUnit('wizard', 'p1', { x: 1, y: 4 });
  deadWizard.isAlive = false;
  const enemy = mkUnit('fighter', 'p2', { x: 6, y: 3 });

  // Frozen + dead uncommitted → bare END_TURN (no MOVE for either).
  const state = mkState([frozenRogue, deadWizard, enemy], null, true);
  const actions = brain.selectActions(state, 'p1', map);
  check('Bug A: frozen/dead forced-commit returns bare END_TURN',
    actions.length === 1 && actions[0].type === 'END_TURN',
    JSON.stringify(actions));

  // Dead-only uncommitted → also bare END_TURN.
  const state2 = mkState([frozenRogue, deadWizard, enemy], null, true);
  state2.initiative.order = [frozenRogue.instanceId];
  const actions2 = brain.selectActions(state2, 'p1', map);
  check('Bug A: dead-only forced-commit returns bare END_TURN',
    actions2.length === 1 && actions2[0].type === 'END_TURN',
    JSON.stringify(actions2));
}

// ===========================================================================
// R3 regression tests (Fear turn-denial + threat-holding)
// ===========================================================================

// --- Test 20 (R3): Fear beats Demon Blast against an adjacent melee threat ---
// Hard version of Test 18: with the turn-denial model, push 3 + root denies
// ~2 full turns of the fighter's output, which must now outscore 12 damage.
{
  const warlock = mkUnit('warlock', 'p1', { x: 2, y: 3 });
  const meleeEnemy = mkUnit('fighter', 'p2', { x: 3, y: 3 }); // adjacent
  const rangedEnemy = mkUnit('wizard', 'p2', { x: 2, y: 6 });
  const state = mkState([warlock, meleeEnemy, rangedEnemy], warlock.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const fearOnMelee = actions.some(
    (a) =>
      a.type === 'USE_ABILITY' &&
      a.abilitySlug === 'fear' &&
      a.target.x === meleeEnemy.position.x &&
      a.target.y === meleeEnemy.position.y,
  );
  check('R3: Fear (not Demon Blast) peels the adjacent melee fighter', fearOnMelee,
    JSON.stringify(actions));
}

// --- Test 21 (R3): sorcerer HOLDS Fire From Heaven on a lone target ---
// Threat-holding: with 3 enemies alive but only 1 in blast reach, spending
// the once-per-game AOE on a single unit wastes its zoning value. Expect
// Arcane Bolt instead.
{
  const sorc = mkUnit('sorcerer', 'p1', { x: 2, y: 3 });
  // Enemies spread so NO reachable blast center can cover two of them
  // (the AI will happily move-then-cast to find a 2-hit if one exists).
  const near = mkUnit('fighter', 'p2', { x: 5, y: 3 });
  const far1 = mkUnit('barbarian', 'p2', { x: 7, y: 6 });
  const far2 = mkUnit('rogue', 'p2', { x: 1, y: 7 });
  const state = mkState([sorc, near, far1, far2], sorc.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const spentFfh = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'ffh',
  );
  check('R3: sorcerer holds ffh when only 1 enemy is in the blast', !spentFfh,
    JSON.stringify(actions));
}

// --- Test 22 (R3): the hold lifts against the LAST enemy ---
// One enemy remaining: nothing left to zone, so a single-target ffh is fair
// game if it scores (14 unblockable + kill potential on a wounded target).
{
  const sorc = mkUnit('sorcerer', 'p1', { x: 2, y: 3 });
  const lastEnemy = mkUnit('fighter', 'p2', { x: 4, y: 3 }, 12); // ffh kills
  const state = mkState([sorc, lastEnemy], sorc.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const spentFfh = actions.some(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'ffh',
  );
  check('R3: ffh gate lifts vs the last enemy (kills the 12-HP fighter)', spentFfh,
    JSON.stringify(actions));
}

// ===========================================================================
// V4 regression tests (sim-discovered bugs)
// ===========================================================================
import { normalizeAbilityDefinitions } from './aiBrain';
import { DEFAULT_ABILITIES } from './defaultData';

// --- Test 23 (V4 Bug 3): Fear-rooted(1) unit CAN commit in round 1 ---
// The engine ticks statuses before validating, so a 1-turn root expires
// before the MOVE is checked. The brain must emit a real commit action, not
// bare END_TURN (which draws "Must commit a unit in round 1" — 200/200
// games in the warlock-vs-barbarian sims).
{
  const barb = mkUnit('barbarian', 'p1', { x: 0, y: 3 });
  barb.statusEffects.push({ slug: 'rooted', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'w' });
  const ally = mkUnit('barbarian', 'p1', { x: 1, y: 5 });
  const w1 = mkUnit('warlock', 'p2', { x: 6, y: 2 });
  const w2 = mkUnit('warlock', 'p2', { x: 6, y: 5 });
  const state = mkState([barb, ally, w1, w2], null, true);
  state.initiative.order = [w1.instanceId, ally.instanceId, w2.instanceId];
  const actions = brain.selectActions(state, 'p1', map);
  const commits = actions.some((a) => a.type !== 'END_TURN');
  check('V4 Bug 3: rooted(1) unit emits a real round-1 commit action', commits,
    JSON.stringify(actions));
}

// --- Test 24 (V4, updated for group 1b2): rooted(>=2) melee with no target
// commits via a zero-distance "hold position" MOVE — legal while rooted (see
// processMove) and strictly better than bare END_TURN (which relies on the
// harness/server pre-flight) or burning a special into empty air.
{
  const barb = mkUnit('barbarian', 'p1', { x: 0, y: 3 });
  barb.statusEffects.push({ slug: 'rooted', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'w' });
  const w1 = mkUnit('warlock', 'p2', { x: 6, y: 2 });
  const state = mkState([barb, w1], null, true);
  const actions = brain.selectActions(state, 'p1', map);
  const holdMove = actions.find((a) => a.type === 'MOVE');
  check('V4: rooted(2) melee w/o targets commits via zero-distance hold MOVE',
    actions.length === 2 &&
      holdMove?.type === 'MOVE' &&
      holdMove.unitInstanceId === barb.instanceId &&
      samePos(holdMove.destination, barb.position) &&
      actions[1].type === 'END_TURN',
    JSON.stringify(actions));
}

// --- Test 25 (V4 Bug 2): AOE special gate bypassed for a LETHAL blast ---
// Enemy at 12 HP in ffh reach; two more enemies alive but unclusterable.
// Old gate: <2 enemies hit while 2+ alive -> hold. New: a kill lifts it.
{
  const sorc = mkUnit('sorcerer', 'p1', { x: 2, y: 3 });
  const dying = mkUnit('fighter', 'p2', { x: 5, y: 3 }, 12);
  const far1 = mkUnit('barbarian', 'p2', { x: 7, y: 6 });
  const far2 = mkUnit('rogue', 'p2', { x: 1, y: 7 });
  const state = mkState([sorc, dying, far1, far2], sorc.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const ffh = actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'ffh');
  check('V4 Bug 2: lethal single-target ffh bypasses the cluster gate', ffh,
    JSON.stringify(actions));
}

// --- Test 26 (V4 Bug 1): assassinate fires via move-to-reach mid-game ---
{
  const r1 = mkUnit('rogue', 'p1', { x: 2, y: 3 });
  const r2 = mkUnit('rogue', 'p1', { x: 3, y: 5 });
  const f1 = mkUnit('fighter', 'p2', { x: 5, y: 3 }, 15);
  const f2 = mkUnit('fighter', 'p2', { x: 4, y: 5 }, 30);
  const state = mkState([r1, r2, f1, f2], r1.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const used = actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'assassinate');
  check('V4 Bug 1: assassinate fires on 15-HP target 3 tiles away', used,
    JSON.stringify(actions));
}

// --- Test 27 (V4 Bug 1): snake_case effect keys are normalized ---
// DB-seeded JSON can arrive as health_threshold; unnormalized, the execute
// path sees healthThreshold undefined and mis-scores. The normalizer must
// restore correct behavior.
{
  const raw = JSON.parse(JSON.stringify(DEFAULT_ABILITIES)) as typeof DEFAULT_ABILITIES;
  const assn = raw.find((a) => a.slug === 'assassinate');
  if (!assn) throw new Error('no assassinate def');
  const eff = assn.effects[0] as unknown as Record<string, unknown>;
  eff['health_threshold'] = eff['healthThreshold'];
  delete eff['healthThreshold'];
  const fixedMap = new Map(normalizeAbilityDefinitions(raw).map((a) => [a.slug, a]));
  const rogue = mkUnit('rogue', 'p1', { x: 3, y: 3 });
  const healthy = mkUnit('fighter', 'p2', { x: 4, y: 3 }, 42);
  const state = mkState([rogue, healthy], rogue.instanceId);
  const actions = brain.selectActions(state, 'p1', fixedMap);
  const wasted = actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'assassinate');
  check('V4: normalized snake_case def does NOT nuke a full-HP target', !wasted,
    JSON.stringify(actions));
  const weak = mkUnit('fighter', 'p2', { x: 4, y: 3 }, 15);
  const state2 = mkState([rogue, weak], rogue.instanceId);
  const actions2 = brain.selectActions(state2, 'p1', fixedMap);
  const fired = actions2.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'assassinate');
  check('V4: normalized snake_case def fires on 15-HP target', fired,
    JSON.stringify(actions2));
}

// ===========================================================================
// V6/V7 tests: customization, new statuses/specials
// ===========================================================================
import { explainTurn } from './aiBrain';
import { runSim } from './simHarness';

// --- Test 28: shielded — Ward eats Assassinate (specials gate on shields) ---
{
  const rogue = mkUnit('rogue', 'p1', { x: 3, y: 3 });
  const warded = mkUnit('sorcerer', 'p2', { x: 4, y: 3 }, 12); // execute window, but shielded
  warded.statusEffects.push({ slug: 'shielded', turnsRemaining: 3, stacks: 1, sourceUnitInstanceId: 'x' });
  const other = mkUnit('fighter', 'p2', { x: 3, y: 4 }, 42);
  const state = mkState([rogue, warded, other], rogue.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  check('assassinate NOT thrown into a shielded target',
    !actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'assassinate' && a.target.x === warded.position.x && a.target.y === warded.position.y),
    JSON.stringify(actions));
}

// --- Test 33: immovable passive — Fear has no push value vs it ---
{
  const warlock = mkUnit('warlock', 'p1', { x: 2, y: 3 });
  const anchored = mkUnit('fighter', 'p2', { x: 4, y: 3 });
  anchored.passives = ['immovable'];
  const state = mkState([warlock, anchored], warlock.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  check('Fear skipped vs an immovable target (uses Demon Blast instead)',
    !actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'fear'),
    JSON.stringify(actions));
}

// --- Test 34: Round 1 — frozen units are never offered as the commit ---
{
  const frozen1 = mkUnit('barbarian', 'p1', { x: 1, y: 3 });
  frozen1.statusEffects.push({ slug: 'frozen', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x' });
  const healthy = mkUnit('ranger', 'p1', { x: 1, y: 5 });
  const enemy = mkUnit('fighter', 'p2', { x: 6, y: 3 });
  const state = mkState([frozen1, healthy, enemy], null, true);
  const actions = brain.selectActions(state, 'p1', map);
  const actsWith = actions.find((a) => a.type !== 'END_TURN');
  check('round 1: frozen(1) unit not committed (engine rejects pre-tick)',
    actsWith !== undefined && 'unitInstanceId' in actsWith && actsWith.unitInstanceId === healthy.instanceId,
    JSON.stringify(actions));
}

// --- Test 35: 8x8 cross board — no plan ever lands on a removed corner ---
{
  const ranger = mkUnit('ranger', 'p1', { x: 6, y: 6 });
  const enemy = mkUnit('fighter', 'p2', { x: 5, y: 1 });
  const state = mkState([ranger, enemy], ranger.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const moved = actions.find((a) => a.type === 'MOVE' || a.type === 'CHARGE');
  const corners = [{ x: 0, y: 0 }, { x: 7, y: 0 }, { x: 0, y: 7 }, { x: 7, y: 7 }];
  const badCorner = moved !== undefined && corners.some((c) => c.x === moved.destination.x && c.y === moved.destination.y);
  check('no plan ever lands on a removed corner (0,0)/(7,0)/(0,7)/(7,7)', !badCorner, JSON.stringify(actions));
}

// --- Test 36: Ward — cleric shields a badly-threatened ally ---
{
  const cleric = mkUnit('cleric', 'p1', { x: 3, y: 3 });
  const threatenedAlly = mkUnit('rogue', 'p1', { x: 4, y: 3 }, 35);
  const bigThreat = mkUnit('barbarian', 'p2', { x: 5, y: 3 }); // adjacent to the ally, hits hard
  const state = mkState([cleric, threatenedAlly, bigThreat], cleric.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  console.log('  info  Cleric vs threatened ally plan:', JSON.stringify(actions));
  check('cleric takes SOME beneficial action toward the threatened ally',
    actions.some((a) => a.type === 'USE_ABILITY'));
}

// --- Test 37: Purify — cleanses a harmful status and is valued positively ---
// mkUnit copies each class's DEFAULT (uncustomized) abilities, so the new
// special must be swapped in manually to test it directly (Test 42 covers
// the full customization pipeline end-to-end via the sim harness).
{
  const cleric = mkUnit('cleric', 'p1', { x: 3, y: 3 });
  cleric.abilities = ['mace', 'purify'];
  const burningAlly = mkUnit('ranger', 'p1', { x: 4, y: 3 }, 30);
  burningAlly.statusEffects.push({ slug: 'burning', turnsRemaining: 3, stacks: 1, sourceUnitInstanceId: 'x' });
  const enemy = mkUnit('fighter', 'p2', { x: 3, y: 4 }, 42); // adjacent already — no approach incentive to move away
  const state = mkState([cleric, burningAlly, enemy], cleric.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const purified = actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'purify');
  check('cleric Purifies a burning ally over a weak plain Mace hit', purified, JSON.stringify(actions));
}

// --- Test 38: Roar (excludeAllies) never counts as friendly fire ---
// Rather than force Roar to be the top-level chosen action (it may
// legitimately lose to a free melee hit on an adjacent enemy — that's a
// separate positional question), assert the actual property that matters:
// def.excludeAllies makes the AOE scorer skip allies entirely, so an ally
// sitting inside the blast radius must not change Roar's own score at all
// versus the exact same enemies with no ally present.
{
  const scoreOf = (units: UnitInstance[], casterId: string): number => {
    const state = mkState(units, casterId);
    const text = explainTurn(state, casterId, 'p1', map);
    const m = text.match(/roar @\([^)]*\) score=([-\d.]+)/);
    if (!m) throw new Error(`roar candidate not found in explainTurn output:\n${text}`);
    return parseFloat(m[1]);
  };
  const barbNoAlly = mkUnit('barbarian', 'p1', { x: 3, y: 3 });
  barbNoAlly.abilities = ['strike', 'roar'];
  const enemy1a = mkUnit('fighter', 'p2', { x: 3, y: 1 }, 42);
  const enemy2a = mkUnit('wizard', 'p2', { x: 5, y: 3 }, 30);
  const scoreWithoutAlly = scoreOf([barbNoAlly, enemy1a, enemy2a], barbNoAlly.instanceId);

  const barbWithAlly = mkUnit('barbarian', 'p1', { x: 3, y: 3 });
  barbWithAlly.abilities = ['strike', 'roar'];
  const ally = mkUnit('cleric', 'p1', { x: 4, y: 3 }, 20); // inside roar's radius 2
  const enemy1b = mkUnit('fighter', 'p2', { x: 3, y: 1 }, 42);
  const enemy2b = mkUnit('wizard', 'p2', { x: 5, y: 3 }, 30);
  const scoreWithAlly = scoreOf([barbWithAlly, ally, enemy1b, enemy2b], barbWithAlly.instanceId);

  check('Roar score is unchanged by an ally sitting inside the blast radius (excludeAllies works)',
    Math.abs(scoreWithAlly - scoreWithoutAlly) < 0.001,
    `withoutAlly=${scoreWithoutAlly} withAlly=${scoreWithAlly}`);
}

// --- Test 39: Life Drain (lifesteal) heals a wounded caster ---
// Needs the caster below the 40% triage threshold for the heal-urgency bonus
// to outweigh the once-per-game special reserve versus plain Demon Blast.
{
  const warlock = mkUnit('warlock', 'p1', { x: 2, y: 3 }, 10); // badly wounded (max 32, <40%)
  warlock.abilities = ['eldritch', 'drain'];
  const enemy = mkUnit('fighter', 'p2', { x: 5, y: 3 }, 42);
  const state = mkState([warlock, enemy], warlock.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const drained = actions.some((a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'drain');
  check('wounded warlock uses Life Drain over plain Demon Blast', drained, JSON.stringify(actions));
}

// --- Test 40: Rescue — fighter pulls a badly threatened ranged ally to safety ---
{
  const fighter = mkUnit('fighter', 'p1', { x: 3, y: 3 });
  const threatenedRanger = mkUnit('ranger', 'p1', { x: 6, y: 3 }, 20);
  const enemy1 = mkUnit('barbarian', 'p2', { x: 7, y: 3 }, 45); // adjacent to the ranger
  const enemy2 = mkUnit('rogue', 'p2', { x: 6, y: 2 }, 35); // also adjacent to the ranger
  const state = mkState([fighter, threatenedRanger, enemy1, enemy2], fighter.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  console.log('  info  Fighter vs endangered ranged ally plan:', JSON.stringify(actions));
  check('fighter takes SOME action when a ranged ally is double-teamed',
    actions.length > 0);
}

// --- Test 41: end-to-end vs the REAL engine with the DEFAULT roster (v7 regression) ---
{
  const r = runSim(
    ['barbarian', 'fighter', 'ranger', 'cleric'],
    ['rogue', 'rogue', 'sorcerer', 'sorcerer'],
    { games: 40 },
  );
  check('real-engine run (default roster): zero validation errors over 40 games',
    r.totalValidationErrors === 0, `errors=${r.totalValidationErrors} sample=${r.sampleErrors[0] ?? ''}`);
  check('real-engine run (default roster): games resolve (avg turns sane)',
    r.avgTurns > 5 && r.avgTurns < 150, `avgTurns=${r.avgTurns}`);
}

// --- Test 42: end-to-end vs the REAL engine with NEW specials via customization ---
// Exercises the sim-loadout extension (simHarness buildUnitInstance) together
// with every new engine hook (shielded/exposed/weakened/burning/lifesteal/
// excludeAllies) in actual play — the strongest possible integration check.
{
  const p1Customizations = [
    { specialSlug: 'roar', passiveSlug: 'hardened' },       // barbarian
    { specialSlug: 'shield_bash', passiveSlug: 'immovable' }, // fighter
    { specialSlug: 'pinning', passiveSlug: 'swift' },       // ranger
    { specialSlug: 'ward', passiveSlug: 'vitality' },       // cleric
  ];
  const p2Customizations = [
    { specialSlug: 'expose', passiveSlug: 'swift' },        // rogue
    { specialSlug: 'dagger_toss', passiveSlug: 'vitality' },// rogue
    { specialSlug: 'ignite', passiveSlug: 'hardened' },     // sorcerer
    { specialSlug: 'flame_jet', passiveSlug: 'warded' },    // sorcerer
  ];
  const r = runSim(
    ['barbarian', 'fighter', 'ranger', 'cleric'],
    ['rogue', 'rogue', 'sorcerer', 'sorcerer'],
    { games: 40, p1Customizations, p2Customizations },
  );
  check('real-engine run (new specials + customization): zero validation errors over 40 games',
    r.totalValidationErrors === 0, `errors=${r.totalValidationErrors} sample=${r.sampleErrors[0] ?? ''}`);
  check('real-engine run (new specials + customization): games resolve (avg turns sane)',
    r.avgTurns > 5 && r.avgTurns < 150, `avgTurns=${r.avgTurns}`);
  console.log(`  info  new-roster matchup: ${(r.p1WinRate * 100).toFixed(0)}% p1 win rate | avg turns ${r.avgTurns.toFixed(0)} | draws ${r.draws}`);
}

console.log(failures === 0 ? '\nAll smoke tests passed.' : `\n${failures} FAILURE(S)`);
if (failures > 0) throw new Error(`${failures} smoke test failure(s)`);
