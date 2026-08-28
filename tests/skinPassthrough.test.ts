/**
 * skinPassthrough.test.ts — Phase B: a unit carries its owner's skin choice.
 *
 * The whole point of the field is that the SERVER never interprets it. What is
 * pinned here is therefore narrow and deliberate: the value survives the trip
 * from a team's customization onto the live unit, and NOTHING about the unit's
 * combat surface changes when it does. If a future edit ever makes a stat read
 * this field, the second test fails — which is the guarantee that let a
 * cosmetic field through a frozen engine type in the first place.
 */
import { describe, it, expect } from 'vitest';
import { buildUnitInstance } from '../src/game/initialState.js';
import { DEFAULT_UNITS } from '../src/ai/defaultData.js';

const fighter = DEFAULT_UNITS.fighter as never;
const base = { specialSlug: 'shield_bash', passiveSlug: 'stalwart' };

describe('skinSetNum passthrough', () => {
  it('carries the chosen set onto the unit', () => {
    const u = buildUnitInstance(fighter, 'p1', { x: 0, y: 0 }, { ...base, skinSetNum: 2 });
    expect(u.skinSetNum).toBe(2);
  });

  it('is absent when the team never picked one', () => {
    const u = buildUnitInstance(fighter, 'p1', { x: 0, y: 0 }, base);
    expect(u.skinSetNum).toBeUndefined();
  });

  it('changes NOTHING else about the unit — it is cosmetic or it is a bug', () => {
    const plain = buildUnitInstance(fighter, 'p1', { x: 0, y: 0 }, base);
    const skinned = buildUnitInstance(fighter, 'p1', { x: 0, y: 0 }, { ...base, skinSetNum: 9 });
    const strip = (u: Record<string, unknown>) => {
      // instanceId is random per build; skinSetNum is the field under test.
      const { instanceId, skinSetNum, statusEffects, ...rest } = u;
      return { ...rest, statusEffects: JSON.stringify(statusEffects).replace(/i[a-z0-9_]+/g, 'ID') };
    };
    expect(strip(skinned as never)).toEqual(strip(plain as never));
  });
});
