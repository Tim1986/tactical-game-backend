/**
 * casualBrain.test.ts — the easy tier's yardstick must be legal and must sit
 * between the two brains it interpolates.
 *
 * Built 2026-08-31 after SKILL2 showed BaselineBrain was too weak to answer the
 * easy tier's question ("does a player who knows their kit still get through?").
 */
import { describe, it, expect } from 'vitest';
import { CasualBrain, BaselineBrain, OptimalBrain } from '../src/ai/aiBrain.js';
import { simEncounterCell } from '../src/ai/campaignSim.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { choicesForLevel } from '../src/ai/campaignSim.js';
import { runMatch } from '../src/ai/simHarness.js';

const PARTY = ['barbarian', 'sorcerer', 'warlock', 'rogue'];

describe('CasualBrain legality', () => {
  it('never submits an illegal action — carelessness is not delusion', () => {
    // The regression: v1 fired Kill Shot above its execute window on sight,
    // the engine refused the cast, and the unit forfeited its entire turn.
    // 5,326 rejected actions across 36 cells, scoring BELOW the mindless bot.
    const c = CAMPAIGNS.unlitbeacon as never as { encounters: Record<string, { level: number; enemies?: unknown[]; rooms?: { enemies?: unknown[] }[] }> };
    const map = buildAbilityMap();
    let errors = 0;
    for (const id of ['e2', 'e4', 'e9', 'e12']) {
      const enc = c.encounters[id];
      const choices = choicesForLevel(PARTY, enc.level);
      for (let i = 0; i < 3; i++) {
        const r = runMatch(PARTY, (enc.enemies ?? enc.rooms?.[0]?.enemies ?? []) as never,
          map, new CasualBrain(), new OptimalBrain(), {
            p1Id: 'HUMAN', p2Id: 'ENEMY', forceFirstPlayerId: 'HUMAN',
            stateFactory: () => buildEncounterState(
              CAMPAIGNS.unlitbeacon, id, PARTY, choices, enc.level, 'medium', 'HUMAN', 'ENEMY').state,
          } as never);
        errors += r.validationErrors;
      }
    }
    expect(errors).toBe(0);
  });
});

describe('CasualBrain behaviour', () => {
  it('uses its kit — specials and heals, which the baseline never touches', () => {
    const map = buildAbilityMap();
    const c = CAMPAIGNS.unlitbeacon;
    const choices = choicesForLevel(PARTY, 3);
    const state = buildEncounterState(c, 'e4', PARTY, choices, 3, 'medium', 'HUMAN', 'ENEMY').state;
    const specials = new Set(['whirlwind', 'ffh', 'drain', 'assassinate']);
    const seen = (brain: CasualBrain | BaselineBrain): boolean => {
      for (let i = 0; i < 40; i++) {
        const s = JSON.parse(JSON.stringify(state));
        // Walk the initiative so several different units get to choose.
        s.initiative.activeUnitId = s.units.filter((u: { ownerPlayerId: string }) => u.ownerPlayerId === 'HUMAN')[i % 4].instanceId;
        s.initiative.isRound1 = false;
        for (const u of s.units) { u.position = { ...u.position }; }
        const acts = brain.selectActions(s, 'HUMAN', map) as { type: string; abilitySlug?: string }[];
        if (acts.some((a) => a.type === 'USE_ABILITY' && specials.has(a.abilitySlug ?? ''))) return true;
      }
      return false;
    };
    expect(seen(new CasualBrain()), 'casual should reach for a special').toBe(true);
    expect(seen(new BaselineBrain()), 'baseline never uses one').toBe(false);
  });

  it('outperforms the baseline where knowing your kit is what matters', () => {
    // e5/easy: baseline 5%, casual ~70%. Using your abilities at all is the
    // whole difference. Small game count — the gap is enormous.
    const b = simEncounterCell('unlitbeacon', 'e5', 'easy', 'custom', PARTY,
      { games: 16, playerBrain: 'baseline' });
    const c = simEncounterCell('unlitbeacon', 'e5', 'easy', 'custom', PARTY,
      { games: 16, playerBrain: 'casual' });
    expect(c.winRate).toBeGreaterThan(b.winRate);
  });

  it('still loses to the optimal brain — it is a floor, not a player', () => {
    const c = simEncounterCell('unlitbeacon', 'e6', 'medium', 'custom', PARTY,
      { games: 16, playerBrain: 'casual' });
    const o = simEncounterCell('unlitbeacon', 'e6', 'medium', 'custom', PARTY, { games: 16 });
    expect(o.winRate).toBeGreaterThan(c.winRate);
  });
});
