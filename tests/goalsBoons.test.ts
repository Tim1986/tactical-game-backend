/**
 * A7 — battle goals & boons (ENCOUNTER_SPEC.md). Team-level goals evaluated
 * on won encounters from engine-maintained goalStats; boons as run-scoped
 * party perks applied at build; loud-fail validation; arena inertness.
 */
import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { evaluateBattleGoals } from '../src/campaigns/goals.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { processTurn } from '../src/game/turnProcessor.js';
import { lanternCampaign } from '../src/campaigns/lantern.js';
import type { MatchState } from '../src/types/matchState.js';
import type { BattleGoal } from '../src/campaigns/types.js';

const party = ['fighter', 'cleric', 'ranger', 'rogue'];
const choices = [undefined, undefined, undefined, undefined];
const encKey = () => Object.keys(lanternCampaign.encounters)[0];
const clone = () => JSON.parse(JSON.stringify(lanternCampaign));
const map = buildAbilityMap();

const GOALS: BattleGoal[] = [
  { slug: 'untouched', name: 'Untouched', description: 'x', check: { kind: 'no_damage_to_main' } },
  { slug: 'no_deaths', name: 'No One Falls', description: 'x', check: { kind: 'no_party_deaths' } },
];

function builtWithGoals(goals: BattleGoal[] = GOALS) {
  const c = clone();
  c.encounters[encKey()].goals = goals;
  return buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E');
}

describe('A7 — goal stats tracked by the engine', () => {
  it('build seeds goalStats (and synthesizes an objective when none is authored)', () => {
    const b = builtWithGoals();
    expect(b.state.goalStats).toEqual({ mainTookDamage: false, partyDeaths: 0 });
    expect(b.state.objective).toBeTruthy();
  });

  it('damage to the main flips mainTookDamage; an enemy kill records the killer', () => {
    const b = builtWithGoals();
    const st = b.state as MatchState;
    const main = st.units.find((u) => u.instanceId === st.objective!.mainId)!;
    const enemy = st.units.find((u) => u.ownerPlayerId === 'E')!;
    enemy.position = { x: main.position.x + 1, y: main.position.y };
    st.rollScript = ['hit', 'hit']; st.rollIndex = 0;
    const basic = enemy.abilities[0];
    // Human commits (hold), enemy strikes the main.
    const r1 = processTurn(st, [
      { type: 'MOVE', unitInstanceId: main.instanceId, destination: main.position },
      { type: 'END_TURN' },
    ] as never, 'H', 'H', 'E', map);
    const r2 = processTurn(r1.updatedState, [
      { type: 'USE_ABILITY', unitInstanceId: enemy.instanceId, abilitySlug: basic, target: main.position },
      { type: 'END_TURN' },
    ] as never, 'E', 'H', 'E', map);
    expect(r2.updatedState.goalStats!.mainTookDamage).toBe(true);

    // Now another (uncommitted) party unit kills that enemy — killer recorded.
    const st2 = r2.updatedState;
    const e2 = st2.units.find((u) => u.instanceId === enemy.instanceId)!;
    e2.currentHealth = 1;
    st2.rollScript = ['hit']; st2.rollIndex = 0;
    const striker = st2.units.find(
      (u) => u.ownerPlayerId === 'H' && !st2.initiative.order.includes(u.instanceId),
    )!;
    striker.position = { x: e2.position.x, y: e2.position.y + 1 };
    const r3 = processTurn(st2, [
      { type: 'USE_ABILITY', unitInstanceId: striker.instanceId, abilitySlug: striker.abilities[0], target: e2.position },
      { type: 'END_TURN' },
    ] as never, 'H', 'H', 'E', map);
    expect(r3.updatedState.goalStats!.lastEnemyKillerId).toBe(striker.instanceId);
    expect(r3.updatedState.goalStats!.partyDeaths).toBe(0);
  });
});

describe('A7 — goal evaluation', () => {
  it('evaluates every check kind against a final state', () => {
    const b = builtWithGoals();
    const st = b.state as MatchState;
    st.roundNumber = 4;
    st.goalStats = { mainTookDamage: true, partyDeaths: 1, lastEnemyKillerId: st.objective!.mainId };
    const dead = st.units.find((u) => u.ownerPlayerId === 'H' && u.instanceId !== st.objective!.mainId)!;
    dead.isAlive = false;
    const all: BattleGoal[] = [
      { slug: 'fast', name: 'x', description: 'x', check: { kind: 'win_by_round', round: 5 } },
      { slug: 'slow', name: 'x', description: 'x', check: { kind: 'win_by_round', round: 3 } },
      { slug: 'nodeaths', name: 'x', description: 'x', check: { kind: 'no_party_deaths' } },
      { slug: 'mainlives', name: 'x', description: 'x', check: { kind: 'unit_survives', scope: 'main' } },
      { slug: 'alllive', name: 'x', description: 'x', check: { kind: 'unit_survives', scope: 'all' } },
      { slug: 'mainkill', name: 'x', description: 'x', check: { kind: 'killing_blow_by_main' } },
      { slug: 'untouched', name: 'x', description: 'x', check: { kind: 'no_damage_to_main' } },
    ];
    const r = Object.fromEntries(evaluateBattleGoals(all, st).map((g) => [g.slug, g.achieved]));
    expect(r).toEqual({
      fast: true, slow: false, nodeaths: false, mainlives: true,
      alllive: false, mainkill: true, untouched: false,
    });
  });
});

describe('A7 — boons', () => {
  it('applies partyMaxHp, unitMaxHp, and startShielded to the built party', () => {
    const c = clone();
    c.boons = {
      hearty: { slug: 'hearty', name: 'Hearty Meal', description: 'x', effects: { partyMaxHp: 3 } },
      blade: { slug: 'blade', name: 'Honed Blade', description: 'x', effects: { unitMaxHp: { classSlug: 'fighter', amount: 2 }, startShielded: 'main' } },
    };
    const base = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E');
    const b = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E', undefined, ['hearty', 'blade']);
    const hp = (build: typeof b, slug: string) => build.state.units.find((u) => u.ownerPlayerId === 'H' && u.definitionSlug === slug)!.maxHealth;
    expect(hp(b, 'fighter')).toBe(hp(base, 'fighter') + 5); // +3 party +2 class
    expect(hp(b, 'ranger')).toBe(hp(base, 'ranger') + 3);
    const main = b.state.units[0];
    expect(main.statusEffects.some((e) => e.slug === 'shielded')).toBe(true);
    expect(base.state.units[0].statusEffects.some((e) => e.slug === 'shielded')).toBe(false);
  });

  it('rejects unknown boon keys, >2 goals, and bad boon defs', () => {
    const c = clone();
    expect(() => buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E', undefined, ['nope']))
      .toThrow('unknown boon');
    const g = (slug: string): BattleGoal => ({ slug, name: 'x', description: 'x', check: { kind: 'no_party_deaths' } });
    const c2 = clone();
    c2.encounters[encKey()].goals = [g('a'), g('b'), g('c')];
    expect(() => buildEncounterState(c2, encKey(), party, choices, 1, 'medium', 'H', 'E'))
      .toThrow('at most 2 battle goals');
    const c3 = clone();
    c3.boons = { dud: { slug: 'dud', name: 'x', description: 'x', effects: {} } };
    expect(() => buildEncounterState(c3, encKey(), party, choices, 1, 'medium', 'H', 'E'))
      .toThrow('at least one of');
  });
});

describe('A7 — arena inertness', () => {
  it('shipping campaigns build with no goalStats; goal-free encounters stay clean', () => {
    const b = buildEncounterState(lanternCampaign, encKey(), party, choices, 1, 'medium', 'H', 'E');
    expect(b.state.goalStats).toBeUndefined();
  });
});
