/**
 * tierLevers.test.ts — [B4] per-tier threat access, the primary difficulty
 * lever (owner-signaled: e4 Flame Jet, e5 wisp, e6 exits, e7 freeze).
 */
import { describe, it, expect } from 'vitest';
import { buildEncounterState } from '../src/campaigns/runtime.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';
import { choicesForLevel } from '../src/ai/campaignSim.js';
import type { CampaignDifficulty } from '../src/campaigns/types.js';

const P = ['barbarian', 'sorcerer', 'warlock', 'rogue'];
const c = CAMPAIGNS.unlitbeacon;

function build(enc: string, d: CampaignDifficulty) {
  const level = c.encounters[enc].level;
  return buildEncounterState(c, enc, P, choicesForLevel(P, level), level, d, 'H', 'E');
}
const enemySpecials = (b: ReturnType<typeof build>): (string | undefined)[] =>
  b.state.units.filter((u) => u.ownerPlayerId === 'E')
    .map((u) => u.abilities.find((a) => a !== 'bolt' && a !== 'missile' && a !== 'sword' && a !== 'twin' && a !== 'strike' && a !== 'eldritch' && a !== 'mace' && a !== 'arrow'));

describe('e4 — the Torchhand kit follows the tier', () => {
  it('easy: the torch is unlit (no flame jet anywhere on the board)', () => {
    const all = build('e4', 'easy').state.units.flatMap((u) => u.abilities);
    expect(all).not.toContain('flame_jet');
    expect(all).not.toContain('flame_jet_soft');
  });
  it('medium: the soft jet (13), resolved through campaignAbilities', () => {
    const b = build('e4', 'medium');
    const all = b.state.units.flatMap((u) => u.abilities);
    expect(all).toContain('flame_jet_soft');
    expect(all).not.toContain('flame_jet');
    const soft = b.campaignAbilities?.flame_jet_soft as { effects: { value?: number }[] };
    expect(soft.effects[0].value).toBe(13);
  });
  it('hard and nightmare: the full jet', () => {
    for (const d of ['hard', 'nightmare'] as const) {
      expect(build('e4', d).state.units.flatMap((u) => u.abilities)).toContain('flame_jet');
    }
  });
});

describe('e6 — exit tiles narrow with the tier', () => {
  it('easy/medium keep the full far shore; hard/nightmare get four', () => {
    for (const [d, n] of [['easy', 6], ['medium', 6], ['hard', 4], ['nightmare', 4]] as const) {
      const win = (build('e6', d).state as { objective?: { win: { kind: string; tiles?: unknown[] }[] } })
        .objective!.win.find((w) => w.kind === 'units_at_tiles')!;
      expect(win.tiles!.length, d).toBe(n);
    }
  });
});

describe('e7 — one Voice falls silent on easy', () => {
  it('easy has exactly one freeze-caster; medium+ have two', () => {
    const count = (d: CampaignDifficulty): number =>
      build('e7', d).state.units.filter((u) => u.abilities.includes('freeze')).length;
    expect(count('easy')).toBe(1);
    expect(count('medium')).toBe(2);
    expect(count('nightmare')).toBe(2);
  });
  it('the quiet Voice is the same body — stats identical, kit smaller', () => {
    const q = c.enemies.winters_voice_quiet;
    const v = c.enemies.winters_voice;
    expect(q.maxHealth).toBe(v.maxHealth);
    expect(q.armorClass).toBe(v.armorClass);
    expect(q.specialSlug).toBeUndefined();
  });
});

describe('e5 — the wisp arrives with the tier', () => {
  it('round 2 on easy/medium, round 1 on hard/nightmare, one wisp either way', () => {
    for (const [d, round] of [['easy', 2], ['medium', 2], ['hard', 1], ['nightmare', 1]] as const) {
      const waves = (build('e5', d).state as { encounterProgress?: { waves: { trigger: { round?: number }; units: unknown[] }[] } })
        .encounterProgress!.waves;
      expect(waves.length, d).toBe(1);
      expect(waves[0].trigger.round, d).toBe(round);
    }
  });
});

describe('grammar guards', () => {
  it('a per-tier roster must be a 1:1 swap', () => {
    const enc = { ...c.encounters.e4, enemiesByDifficulty: { easy: ['poacher_cutter'] } };
    const camp = { ...c, encounters: { ...c.encounters, e4: enc } };
    expect(() => buildEncounterState(camp as never, 'e4', P, choicesForLevel(P, 3), 3, 'easy', 'H', 'E'))
      .toThrow(/1:1 swaps/);
  });
});
