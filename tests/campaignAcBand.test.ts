import { describe, it, expect } from 'vitest';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { UNIT_DEFS } from '../src/config/gameData.js';

/**
 * Campaign enemy AC must live in the same band as player units.
 *
 * The AC rework shifted every player class by a uniform -5 (13-17 -> 8-12) but
 * campaign enemies were left on the OLD values. Enemies were then hit only
 * 45-65% of the time while they hit players 70-90% — and every campaign
 * collapsed: 54 of 60 cells out of band, nearly all too hard. It looked like an
 * hpScaleOverride problem and was not.
 *
 * Enemies may sit anywhere in the player band; nightmare's acBonus may push one
 * point above it. Anything outside that means a balance pass moved the player
 * band and forgot the campaigns.
 */
describe('campaign enemy AC stays in the player band', () => {
  const playerACs = UNIT_DEFS.map((u) => u.armor_class);
  const lo = Math.min(...playerACs);
  const hi = Math.max(...playerACs);

  it('player band is the expected 8-12', () => {
    expect([lo, hi]).toEqual([8, 12]);
  });

  for (const [slug, campaign] of Object.entries(CAMPAIGNS)) {
    it(`${slug}: every enemy AC is within [${lo}, ${hi}] (+1 allowed on nightmare)`, () => {
      const offenders: string[] = [];
      for (const [name, enemy] of Object.entries(campaign.enemies)) {
        const ac = (enemy as { armorClass: number }).armorClass;
        const bonus = (enemy as { nightmare?: { acBonus?: number } }).nightmare?.acBonus ?? 0;
        if (ac < lo || ac > hi) offenders.push(`${name} AC ${ac}`);
        if (ac + bonus > hi + 1) offenders.push(`${name} AC ${ac}+${bonus} on nightmare`);
      }
      expect(offenders, `outside the player AC band: ${offenders.join(', ')}`).toEqual([]);
    });
  }
});
