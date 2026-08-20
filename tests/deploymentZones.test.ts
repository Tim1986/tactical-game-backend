/**
 * deploymentZones.test.ts — The armies start on opposite sides.
 *
 * The deployment zone is a pair of COLUMN bands, not rows: player one owns
 * x 0–2, player two owns the mirror, x 5–7. Everything that feeds a placement
 * into buildInitialState() — planPlacement(), a team's saved placement, the
 * built-in fallbacks — is authored in the P1 frame, and buildInitialState
 * mirrors player two's with x -> 7-x.
 *
 * That mirror is the trap this file guards. A p2 fallback written in the P2
 * frame (x=6) mirrors to x=1 and deploys player two inside player one's zone,
 * stacked on their units — the shipped bug these tests were added for.
 */

import { describe, it, expect } from 'vitest';
import { buildInitialState } from '../src/game/initialState.js';
import { planPlacement, mirrorPlacement } from '../src/ai/placement.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { UnitDefinition } from '../src/types/index.js';

const P1_ZONE = [0, 1, 2];
const P2_ZONE = [5, 6, 7];

const COMPS: string[][] = [
  ['fighter', 'rogue', 'cleric', 'wizard'],   // phalanx (melee + support)
  ['fighter', 'barbarian', 'rogue', 'cleric'],
  ['ranger', 'wizard', 'sorcerer', 'warlock'], // castle (no melee)
  ['rogue', 'rogue', 'rogue', 'rogue'],        // rush (all melee, duplicates)
];

const units = (slugs: string[]): UnitDefinition[] => slugs.map((s) => DEFAULT_UNITS[s]);

describe('planPlacement stays inside the P1 deployment zone', () => {
  for (const slugs of COMPS) {
    it(`${slugs.join('/')} places every unit in x 0-2`, () => {
      const plan = planPlacement(slugs, buildAbilityMap());
      expect(plan).toHaveLength(slugs.length);
      for (const p of plan) {
        expect(P1_ZONE).toContain(p.x);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(7);
      }
    });

    it(`${slugs.join('/')} mirrors into x 5-7`, () => {
      for (const p of mirrorPlacement(planPlacement(slugs, buildAbilityMap()))) {
        expect(P2_ZONE).toContain(p.x);
      }
    });
  }
});

describe('buildInitialState puts the armies on opposite sides', () => {
  const slugs = ['fighter', 'rogue', 'cleric', 'wizard'];
  const plan = planPlacement(slugs, buildAbilityMap());

  const zonesOf = (state: ReturnType<typeof buildInitialState>) => ({
    p1: state.units.filter((u) => u.ownerPlayerId === 'p1').map((u) => u.position.x),
    p2: state.units.filter((u) => u.ownerPlayerId === 'p2').map((u) => u.position.x),
  });

  it('with explicit placements on both sides', () => {
    const state = buildInitialState('p1', 'p2', units(slugs), units(slugs), plan, plan, 'p1');
    const { p1, p2 } = zonesOf(state);
    for (const x of p1) expect(P1_ZONE).toContain(x);
    for (const x of p2) expect(P2_ZONE).toContain(x);
  });

  // The regression: an empty p2 placement drops through to the fallback, which
  // must be in the P1 frame so the mirror lands it at x 5-7.
  it('when player two falls back to the default placement', () => {
    const state = buildInitialState('p1', 'p2', units(slugs), units(slugs), plan, [], 'p1');
    const { p2 } = zonesOf(state);
    expect(p2).toHaveLength(4);
    for (const x of p2) expect(P2_ZONE).toContain(x);
  });

  it('when BOTH sides fall back', () => {
    const state = buildInitialState('p1', 'p2', units(slugs), units(slugs), [], [], 'p1');
    const { p1, p2 } = zonesOf(state);
    for (const x of p1) expect(P1_ZONE).toContain(x);
    for (const x of p2) expect(P2_ZONE).toContain(x);
  });

  it('never stacks two units on one tile', () => {
    for (const p2Place of [plan, []]) {
      const state = buildInitialState('p1', 'p2', units(slugs), units(slugs), [], p2Place, 'p1');
      const keys = state.units.map((u) => `${u.position.x},${u.position.y}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('never deploys onto a removed corner', () => {
    const state = buildInitialState('p1', 'p2', units(slugs), units(slugs), [], [], 'p1');
    for (const u of state.units) {
      const corner = (u.position.x === 0 || u.position.x === 7) && (u.position.y === 0 || u.position.y === 7);
      expect(corner).toBe(false);
    }
  });
});
