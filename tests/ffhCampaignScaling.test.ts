/**
 * ffhCampaignScaling.test.ts — Ring of Fire must actually scale in PLAY.
 *
 * Owner 2026-08-31 (e9, level 8): "I opened with my Ring of Fire and it only
 * did 16 damage. With gift damage that makes sense, but it also means my Ring
 * of Fire never scaled." 14 base + 2 Deep Gift = 16; the L6 campaign tuning to
 * 18 would have made it 20.
 *
 * The tuning lives in applyCampaignAbilityTuning and is applied by THREE call
 * sites that must never disagree: campaignSim (the balance numbers), the match
 * screen's dry-run (what the player is shown), and localMatchService (what
 * actually resolves). These pin the engine half of that contract.
 */
import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import {
  applyCampaignAbilities, applyCooldownOverrides, applyCampaignAbilityTuning,
  FFH_CAMPAIGN_DAMAGE, CAMPAIGN_TUNING_MIN_LEVEL,
} from '../src/game/abilityOverrides.js';
import { executeAbility, GIFT_DAMAGE_BONUS } from '../src/game/abilityExecutor.js';
import type { GameEvent } from '../src/types/matchState.js';

const PARTY = ['barbarian', 'sorcerer', 'warlock', 'rogue'];

function castRingOfFire(level: number, withGift: boolean): number {
  const c = CAMPAIGNS.unlitbeacon;
  const choices = [{}, { specialSlug: 'ffh', ...(withGift ? { deepGiftSlug: 'damage' as const } : {}) }, {}, {}];
  const b = buildEncounterState(c, 'e9', PARTY, choices as never, level, 'medium', 'HUMAN', 'ENEMY');
  const st = b.state;
  const map = applyCampaignAbilityTuning(
    applyCooldownOverrides(applyCampaignAbilities(buildAbilityMap(), b.campaignAbilities), b.cooldownOverrides),
    level);
  const sorc = st.units.find((u) => u.definitionSlug === 'sorcerer')!;
  const foe = st.units.find((u) => u.ownerPlayerId === 'ENEMY')!;
  const hp0 = foe.currentHealth;
  const centre = { x: foe.position.x - 1, y: foe.position.y };
  sorc.position = { x: centre.x - 1, y: centre.y };
  const events: GameEvent[] = [];
  executeAbility({ state: st, caster: sorc, targetPosition: centre, ability: map.get('ffh')!, events } as never);
  return hp0 - foe.currentHealth;
}

describe('Ring of Fire campaign scaling', () => {
  it(`deals ${FFH_CAMPAIGN_DAMAGE} at level ${CAMPAIGN_TUNING_MIN_LEVEL}+ with no gift`, () => {
    expect(castRingOfFire(8, false)).toBe(FFH_CAMPAIGN_DAMAGE);
  });

  it('stacks the Deep Gift ON TOP of the scaled value, not instead of it', () => {
    // The owner's exact reading: 16 means base+gift, i.e. the scaling was lost.
    expect(castRingOfFire(8, true)).toBe(FFH_CAMPAIGN_DAMAGE + GIFT_DAMAGE_BONUS);
    expect(castRingOfFire(8, true)).not.toBe(14 + GIFT_DAMAGE_BONUS);
  });

  it('is UNSCALED below the anchor — L5 is arena-equal by contract', () => {
    expect(castRingOfFire(5, false)).toBe(14);
  });

  it('the tuned map itself carries the scaled value', () => {
    const tuned = applyCampaignAbilityTuning(buildAbilityMap(), 8).get('ffh')!;
    expect(tuned.effects.find((e) => e.type === 'damage')!.value).toBe(FFH_CAMPAIGN_DAMAGE);
    const raw = applyCampaignAbilityTuning(buildAbilityMap(), 5).get('ffh')!;
    expect(raw.effects.find((e) => e.type === 'damage')!.value).toBe(14);
  });
});
