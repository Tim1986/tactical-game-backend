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
    activePlayerId: 'p1',
    phase: 'action' as const,
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

import { reachableTiles } from './geometry';

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

// --- Test 15 (Bug 4): Round 1 with only frozen/dead uncommitted units ---
{
  const frozenRogue = mkUnit('rogue', 'p1', { x: 1, y: 2 });
  frozenRogue.statusEffects.push({
    slug: 'frozen', turnsRemaining: 1, stacks: 1, sourceUnitInstanceId: 'x',
  });
  const deadWizard = mkUnit('wizard', 'p1', { x: 1, y: 4 });
  deadWizard.isAlive = false;
  const enemy = mkUnit('fighter', 'p2', { x: 6, y: 3 });
  const state = mkState([frozenRogue, deadWizard, enemy], null, true);
  const actions = brain.selectActions(state, 'p1', map);
  // Frozen units cannot be committed via MOVE — engine ticks freeze first and
  // then rejects the MOVE. Brain returns bare END_TURN so the harness's
  // Round 1 recovery force-commits the unit directly into initiative.order.
  const bareEndTurnForFrozen =
    actions.length === 1 && actions[0].type === 'END_TURN';
  check('Bug 4: frozen forced commit returns bare END_TURN (harness handles)',
    bareEndTurnForFrozen, JSON.stringify(actions));

  const state2 = mkState([frozenRogue, deadWizard, enemy], null, true);
  state2.initiative.order = [frozenRogue.instanceId];
  const actions2 = brain.selectActions(state2, 'p1', map);
  const bareEndTurn =
    actions2.length === 1 && actions2[0].type === 'END_TURN';
  check('Bug 4b: dead-only commit also returns bare END_TURN',
    bareEndTurn, JSON.stringify(actions2));
}

// ===========================================================================
// Round 2 regression tests (FABLE_AI_FEEDBACK round 2)
// ===========================================================================

// --- Test 16: Firestorm avoids clipping a near-death (but not lethal) ally ---
{
  const sorc = mkUnit('sorcerer', 'p1', { x: 3, y: 3 });
  const woundedAlly = mkUnit('cleric', 'p1', { x: 4, y: 3 }, 18);
  const enemy1 = mkUnit('rogue', 'p2', { x: 6, y: 3 }, 25);
  const enemy2 = mkUnit('rogue', 'p2', { x: 6, y: 4 }, 25);
  const state = mkState([sorc, woundedAlly, enemy1, enemy2], sorc.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const storm = actions.find(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'ffh',
  );
  if (storm && storm.type === 'USE_ABILITY') {
    const clipsAlly =
      Math.max(
        Math.abs(storm.target.x - woundedAlly.position.x),
        Math.abs(storm.target.y - woundedAlly.position.y),
      ) <= 1;
    check('R2: Firestorm center does not clip the near-death ally', !clipsAlly,
      JSON.stringify(storm));
  } else {
    check('R2: sorcerer avoided ally-clipping Firestorm (chose another action)', true);
  }
}

// --- Test 17: cornered last survivor fights instead of retreating ---
{
  const wiz = mkUnit('wizard', 'p1', { x: 4, y: 4 });
  const b1 = mkUnit('barbarian', 'p2', { x: 2, y: 4 });
  const b2 = mkUnit('barbarian', 'p2', { x: 6, y: 4 });
  const b3 = mkUnit('barbarian', 'p2', { x: 4, y: 2 });
  const b4 = mkUnit('barbarian', 'p2', { x: 4, y: 6 });
  const state = mkState([wiz, b1, b2, b3, b4], wiz.instanceId, false, 12);
  wiz.cooldowns['freeze'] = 99;
  const actions = brain.selectActions(state, 'p1', map);
  const fought = actions.some((a) => a.type === 'USE_ABILITY');
  const charged = actions.some((a) => a.type === 'CHARGE');
  check('R2: cornered lone wizard FIGHTS (uses an ability)', fought,
    JSON.stringify(actions));
  check('R2: no Charge in round 12', !charged, JSON.stringify(actions));
}

// --- Test 18: Fear peels an adjacent melee threat ---
// Soft warning only — see FABLE_AI_FEEDBACK_V2.md. This is now covered by
// the hard Test 20 below with the turn-denial model fix.
{
  const warlock = mkUnit('warlock', 'p1', { x: 2, y: 3 });
  const meleeEnemy = mkUnit('fighter', 'p2', { x: 3, y: 3 }); // adjacent!
  const rangedEnemy = mkUnit('wizard', 'p2', { x: 2, y: 6 });
  const state = mkState([warlock, meleeEnemy, rangedEnemy], warlock.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const fear = actions.find(
    (a) => a.type === 'USE_ABILITY' && a.abilitySlug === 'fear',
  );
  if (fear && fear.type === 'USE_ABILITY') {
    const targetedMelee =
      fear.target.x === meleeEnemy.position.x &&
      fear.target.y === meleeEnemy.position.y;
    check('R2: Fear targets the adjacent melee enemy over the ranged one',
      targetedMelee, JSON.stringify(fear));
  } else {
    console.log('  warn  R2: Fear not used to peel adjacent melee — known issue, pending Fable fix:', JSON.stringify(actions));
  }
}

// --- Test 19: fully blocked push scores no displacement value ---
{
  const warlock = mkUnit('warlock', 'p1', { x: 3, y: 3 });
  const pinned = mkUnit('fighter', 'p2', { x: 6, y: 3 });
  const wallUnit = mkUnit('rogue', 'p2', { x: 7, y: 3 }); // blocks the push line
  const state = mkState([warlock, pinned, wallUnit], warlock.instanceId);
  const actions = brain.selectActions(state, 'p1', map);
  const fearOnPinned = actions.some(
    (a) =>
      a.type === 'USE_ABILITY' &&
      a.abilitySlug === 'fear' &&
      a.target.x === pinned.position.x &&
      a.target.y === pinned.position.y,
  );
  check('R2: warlock does not burn Fear on a zero-displacement push', !fearOnPinned,
    JSON.stringify(actions));
}

// ===========================================================================
// R3 regression tests (Fear turn-denial + threat-holding)
// ===========================================================================

// --- Test 20 (R3): Fear beats Demon Blast against an adjacent melee threat ---
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

// --- Test 21 (R3): sorcerer HOLDS Firestorm on a lone target ---
{
  const sorc = mkUnit('sorcerer', 'p1', { x: 2, y: 3 });
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

console.log(failures === 0 ? '\nAll smoke tests passed.' : `\n${failures} FAILURE(S)`);
if (failures > 0) throw new Error(`${failures} smoke test failure(s)`);
