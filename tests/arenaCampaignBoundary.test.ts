import { describe, it, expect } from 'vitest';
import { buildUnitInstance } from '../src/game/initialState.js';
import { buildCampaignPlayerInstance, campaignGrowthFor } from '../src/campaigns/runtime.js';
import { applyCampaignAbilityTuning } from '../src/game/abilityOverrides.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { ABILITY_DEFS } from '../src/config/gameData.js';

/**
 * THE ARENA/CAMPAIGN BOUNDARY (owner question, 2026-08-24: "there is a very
 * hard line between what you're doing now and arena, right?").
 *
 * Yes — and this test is what makes it hard rather than merely intended.
 * Gate 1 added two engine capabilities that must be campaign-only:
 *   1. CAMPAIGN_GROWTH's basic-damage rung (unit.basicDamageBonus)
 *   2. the percentage execute floor (effect.healthThresholdPercent)
 *
 * Both are OPT-IN by data: absent fields mean absent behaviour. This suite
 * asserts the arena side never opts in, from three directions — the unit
 * builder, the ability data, and the tuning entry point.
 *
 * ⚠ The shared-path risk this guards: offline Fable matches and puzzles run
 * through the SAME executor and the SAME ability-map helpers as campaigns.
 * They are separated only by `match.campaign?.level ?? 1` — a non-campaign
 * match has no `campaign` block, so it tunes at level 1, i.e. not at all.
 */
const AT = { x: 0, y: 0 };
const CLASSES = Object.keys(DEFAULT_UNITS);

describe('arena/campaign boundary', () => {
  it('the ARENA unit builder never produces growth fields', () => {
    for (const slug of CLASSES) {
      const def = DEFAULT_UNITS[slug];
      for (const specialSlug of (def.specialOptions.length ? def.specialOptions : [undefined])) {
        const u = buildUnitInstance(def, 'p', AT, { specialSlug } as never) as {
          basicDamageBonus?: number; basicAbilitySlug?: string;
        };
        expect(u.basicDamageBonus, `${slug}/${specialSlug}`).toBeUndefined();
        expect(u.basicAbilitySlug, `${slug}/${specialSlug}`).toBeUndefined();
      }
    }
  });

  it('the CAMPAIGN builder produces them only above the anchor', () => {
    for (const slug of CLASSES) {
      const def = DEFAULT_UNITS[slug];
      for (const lvl of [1, 3, 5]) {
        const u = buildCampaignPlayerInstance(def, 'p', AT, lvl, {}) as { basicDamageBonus?: number };
        expect(u.basicDamageBonus, `${slug} L${lvl} must be clean`).toBeUndefined();
      }
      // Somewhere at or below L10 it must switch on, or the curve is dead.
      const top = buildCampaignPlayerInstance(def, 'p', AT, 10, {}) as { basicDamageBonus?: number };
      expect(top.basicDamageBonus, `${slug} L10 should have growth`).toBe(campaignGrowthFor(slug, 10).basicDamage);
    }
  });

  it('no SHIPPED arena ability carries a percentage execute floor', () => {
    for (const a of ABILITY_DEFS) {
      for (const e of a.effects as readonly { healthThresholdPercent?: number }[]) {
        expect(e.healthThresholdPercent, `${a.slug}`).toBeUndefined();
      }
    }
  });

  it('tuning is a NO-OP for every non-campaign level, including the default', () => {
    const base = buildAbilityMap();
    // 1 is what a non-campaign match passes (`match.campaign?.level ?? 1`).
    for (const lvl of [1, 2, 3, 4, 5]) {
      expect(applyCampaignAbilityTuning(base, lvl), `L${lvl}`).toBe(base);
    }
  });

  it('an arena-shaped unit gets no bonus even if the map WAS tuned', () => {
    // Belt and braces: if a tuned map ever reached an arena unit, the unit
    // still carries no basicDamageBonus, so the damage path is unchanged.
    const def = DEFAULT_UNITS.fighter;
    const u = buildUnitInstance(def, 'p', AT, undefined as never) as { basicDamageBonus?: number };
    expect(u.basicDamageBonus).toBeUndefined();
  });
});
