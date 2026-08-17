/**
 * A6 — novel monsters & campaign-scoped abilities (ENCOUNTER_SPEC.md).
 * Campaign ability merge, enemy kit overrides, artKey routing, build-time
 * validation (unknown slugs / effect kinds fail loudly), arena inertness.
 */
import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { applyCampaignAbilities } from '../src/game/abilityOverrides.js';
import { buildAbilityMap } from '../src/ai/defaultData.js';
import { lanternCampaign } from '../src/campaigns/lantern.js';
import { processTurn } from '../src/game/turnProcessor.js';
import type { AbilityDefinition } from '../src/types/index.js';

const party = ['fighter', 'cleric', 'ranger', 'rogue'];
const choices = [undefined, undefined, undefined, undefined];
const encKey = () => Object.keys(lanternCampaign.encounters)[0];
const clone = () => JSON.parse(JSON.stringify(lanternCampaign));

const boneRake: AbilityDefinition = {
  id: '00000000-0000-4000-8000-00000000a601', slug: 'bone_rake', name: 'Bone Rake',
  description: 'A raking claw of splintered bone.', targetingType: 'single',
  range: 1, areaRadius: 0, cooldownTurns: 0, isSpecial: false, isUnblockable: false,
  effects: [{ type: 'damage', value: 9 }],
} as AbilityDefinition;

describe('A6 — campaign ability merge', () => {
  it('applyCampaignAbilities adds definitions without mutating the base map', () => {
    const base = buildAbilityMap();
    const merged = applyCampaignAbilities(base, { bone_rake: boneRake });
    expect(merged.get('bone_rake')?.name).toBe('Bone Rake');
    expect(base.has('bone_rake')).toBe(false);
    expect(merged.size).toBe(base.size + 1);
  });

  it('build exposes campaignAbilities and a custom kit reaches the unit', () => {
    const c = clone();
    c.abilities = { bone_rake: boneRake };
    const firstKey = c.encounters[encKey()].enemies[0];
    c.enemies[firstKey].abilities = ['bone_rake'];
    c.enemies[firstKey].artKey = 'skeleton';
    const b = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E');
    expect(b.campaignAbilities?.bone_rake.slug).toBe('bone_rake');
    const enemy = b.state.units.find((u) => u.ownerPlayerId === 'E')!;
    expect(enemy.abilities).toEqual(['bone_rake']);
    expect(enemy.artKey).toBe('skeleton');
    expect(enemy.cooldowns).toEqual({ bone_rake: 0 });
  });

  it('a custom-kit enemy can actually cast its campaign ability', () => {
    const c = clone();
    c.abilities = { bone_rake: boneRake };
    const e = c.encounters[encKey()];
    const firstKey = e.enemies[0];
    c.enemies[firstKey].abilities = ['bone_rake'];
    const b = buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E');
    const map = applyCampaignAbilities(buildAbilityMap(), b.campaignAbilities);
    const st = b.state;
    // Round-1 handoff: human commits first; force a simple scenario instead —
    // put the enemy adjacent to a hero and drive its commit directly.
    const hero = st.units.find((u) => u.ownerPlayerId === 'H')!;
    const enemy = st.units.find((u) => u.ownerPlayerId === 'E' && u.abilities[0] === 'bone_rake')!;
    enemy.position = { x: hero.position.x + 1, y: hero.position.y };
    st.rollScript = ['hit']; st.rollIndex = 0;
    // Human commits a hold move first, then the enemy swings with bone_rake.
    const r1 = processTurn(st, [
      { type: 'MOVE', unitInstanceId: hero.instanceId, destination: hero.position },
      { type: 'END_TURN' },
    ] as never, 'H', 'H', 'E', map);
    const hp0 = hero.currentHealth;
    const r2 = processTurn(r1.updatedState, [
      { type: 'USE_ABILITY', unitInstanceId: enemy.instanceId, abilitySlug: 'bone_rake', target: hero.position },
      { type: 'END_TURN' },
    ] as never, 'E', 'H', 'E', map);
    const heroAfter = r2.updatedState.units.find((u) => u.instanceId === hero.instanceId)!;
    expect(heroAfter.currentHealth).toBe(hp0 - 9);
  });
});

describe('A6 — build-time validation', () => {
  it('rejects a kit referencing an unknown ability slug', () => {
    const c = clone();
    const firstKey = c.encounters[encKey()].enemies[0];
    c.enemies[firstKey].abilities = ['soul_blast'];
    expect(() => buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E'))
      .toThrow('unknown ability "soul_blast"');
  });

  it('rejects a campaign ability with an unimplemented effect kind', () => {
    const c = clone();
    c.abilities = { weird: { ...boneRake, slug: 'weird', effects: [{ type: 'summon', value: 1 }] } };
    expect(() => buildEncounterState(c, encKey(), party, choices, 1, 'medium', 'H', 'E'))
      .toThrow('not implemented by the executor');
  });

  it('rejects a slug/key mismatch and an unknown targeting type', () => {
    const c1 = clone();
    c1.abilities = { other_name: boneRake };
    expect(() => buildEncounterState(c1, encKey(), party, choices, 1, 'medium', 'H', 'E'))
      .toThrow('slug field must match');
    const c2 = clone();
    c2.abilities = { bone_rake: { ...boneRake, targetingType: 'beam' } };
    expect(() => buildEncounterState(c2, encKey(), party, choices, 1, 'medium', 'H', 'E'))
      .toThrow('unknown targetingType');
  });
});

describe('A6 — arena inertness', () => {
  it('shipping campaigns build unchanged: no campaignAbilities, no artKey', () => {
    const b = buildEncounterState(lanternCampaign, encKey(), party, choices, 1, 'medium', 'H', 'E');
    expect(b.campaignAbilities).toBeNull();
    expect(b.state.units.every((u) => u.artKey === undefined)).toBe(true);
  });
});
