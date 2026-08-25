import { describe, it, expect } from 'vitest';
import { buildCampaignPlayerInstance, campaignGrowthFor, PLAYER_HP_DELTA } from '../src/campaigns/runtime.js';
import { DEFAULT_UNITS } from '../src/ai/defaultData.js';

/**
 * THE ANCHOR INVARIANT (Gate 1, owner-signed 2026-08-24).
 *
 * The owner's requirement for the whole campaign-tuning architecture:
 * "this will be much easier to sell if the arena balance exists exactly the
 * same way as campaigns at a specific level… I need arena to represent a
 * specific level, not an entirely different universe."
 *
 * That level is **5**. At L5 a campaign unit must equal its arena definition
 * EXACTLY — every stat, for every class, for every special and passive
 * choice. Growth exists only above it.
 *
 * This test is the contract. It means:
 *  - an arena rebalance propagates to the anchor automatically, and
 *  - any campaign-side drift at or below L5 fails CI instead of shipping.
 * If it ever fails, the fix is the CAMPAIGN code, never this file — unless
 * the owner has moved the anchor itself.
 */
const CLASSES = Object.keys(DEFAULT_UNITS);
const AT = { x: 0, y: 0 };

describe('anchor: campaign L5 === arena, exactly', () => {
  it('every class matches its arena definition at L5, for every loadout', () => {
    for (const slug of CLASSES) {
      const def = DEFAULT_UNITS[slug];
      const specials = def.specialOptions.length ? def.specialOptions : [undefined];
      const passives = def.passiveOptions?.length ? def.passiveOptions : [undefined];
      for (const specialSlug of specials) {
        for (const passive of passives) {
          const u = buildCampaignPlayerInstance(def, 'p', AT, 5, {
            specialSlug: specialSlug as string | undefined,
            passiveSlug: (passive as { slug?: string } | undefined)?.slug,
          });
          const passiveStat = (passive as { stat?: string; value?: number } | undefined);
          const expectedHp = def.maxHealth + (passiveStat?.stat === 'maxHealth' ? (passiveStat.value ?? 0) : 0);
          const expectedAc = def.armorClass + (passiveStat?.stat === 'armorClass' ? (passiveStat.value ?? 0) : 0);
          const expectedMove = def.movementRange + (passiveStat?.stat === 'movementRange' ? (passiveStat.value ?? 0) : 0);
          const where = `${slug}/${specialSlug ?? 'none'}/${passiveStat?.stat ?? 'none'}`;

          expect(u.maxHealth, `${where} maxHealth`).toBe(expectedHp);
          expect(u.armorClass, `${where} armorClass`).toBe(expectedAc);
          expect(u.movementRange, `${where} movementRange`).toBe(expectedMove);
          // No growth may leak in at or below the anchor.
          expect((u as { basicDamageBonus?: number }).basicDamageBonus, `${where} basicDamageBonus`).toBeUndefined();
          // L5 is below the L10 second-charge gate.
          expect((u as { extraCharges?: unknown }).extraCharges, `${where} extraCharges`).toBeUndefined();
        }
      }
    }
  });

  it('PLAYER_HP_DELTA is zero from L4 up — the ramp INTO the anchor is complete', () => {
    for (const lvl of [4, 5, 6, 7, 8, 9, 10]) {
      expect(PLAYER_HP_DELTA[lvl], `L${lvl}`).toBe(0);
    }
  });

  it('CAMPAIGN_GROWTH is zero at every level up to the anchor', () => {
    for (const slug of CLASSES) {
      for (const lvl of [1, 2, 3, 4, 5]) {
        const g = campaignGrowthFor(slug, lvl);
        expect(g.maxHp, `${slug} L${lvl} maxHp`).toBe(0);
        expect(g.basicDamage, `${slug} L${lvl} basicDamage`).toBe(0);
      }
    }
  });

  it('growth is monotonic and Rogue never out-grows the field PER TURN', () => {
    // Rogue's Twin Strike pays the rung twice, so its per-effect number is
    // halved; this asserts the normalisation actually holds at every level.
    const HITS: Record<string, number> = { rogue: 2 };
    for (const lvl of [6, 7, 8, 9, 10]) {
      const field = campaignGrowthFor('fighter', lvl);
      for (const slug of CLASSES) {
        const g = campaignGrowthFor(slug, lvl);
        const prev = campaignGrowthFor(slug, lvl - 1);
        expect(g.maxHp, `${slug} L${lvl} hp monotonic`).toBeGreaterThanOrEqual(prev.maxHp);
        expect(g.basicDamage, `${slug} L${lvl} dmg monotonic`).toBeGreaterThanOrEqual(prev.basicDamage);
        const perTurn = g.basicDamage * (HITS[slug] ?? 1);
        expect(perTurn, `${slug} L${lvl} per-turn growth exceeds field`).toBeLessThanOrEqual(field.basicDamage);
      }
    }
  });
});

describe('growth is always a REWARD', () => {
  it('every class gains something at every level from L6 to L10', () => {
    // A level-up screen that grants a class nothing is a design failure even
    // when the totals are right — Rogue hit exactly that at L7 before its HP
    // rungs were smoothed.
    for (const slug of CLASSES) {
      for (const lvl of [6, 7, 8, 9, 10]) {
        const now = campaignGrowthFor(slug, lvl);
        const prev = campaignGrowthFor(slug, lvl - 1);
        const gained = (now.maxHp - prev.maxHp) + (now.basicDamage - prev.basicDamage);
        expect(gained, `${slug} gains nothing at L${lvl}`).toBeGreaterThan(0);
      }
    }
  });
});
