import { describe, it, expect } from 'vitest';
import { frontlineOrder, basicReach } from '../src/ai/simPlacement.js';
import { CAMPAIGNS } from '../src/campaigns/index.js';

const MELEE = ['fighter', 'barbarian', 'rogue', 'cleric'];
const RANGED = ['ranger', 'wizard', 'sorcerer', 'warlock'];

describe('basicReach', () => {
  it('splits the roster cleanly into melee and ranged', () => {
    for (const s of MELEE) expect(basicReach(s), s).toBeLessThanOrEqual(1);
    for (const s of RANGED) expect(basicReach(s), s).toBeGreaterThanOrEqual(4);
  });

  it('reads the AT-WILL attack, never a special', () => {
    // Whirlwind is range 0 and Heal is range 2; neither says where a unit stands.
    expect(basicReach('barbarian')).toBe(1);
    expect(basicReach('cleric')).toBe(1);
  });
});

describe('frontlineOrder', () => {
  const tiles = [{ x: 1, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 3 }, { x: 2, y: 4 }]; // 0-1 back, 2-3 front
  const enemies = [{ x: 6, y: 3 }, { x: 6, y: 4 }];

  it('puts melee on the tiles nearest the enemy and ranged furthest', () => {
    const order = frontlineOrder(['sorcerer', 'wizard', 'fighter', 'barbarian'], tiles, enemies);
    // slots 2,3 are the melee; they must land on the front tiles (2,3)
    expect([order[2], order[3]].sort()).toEqual([2, 3]);
    expect([order[0], order[1]].sort()).toEqual([0, 1]);
  });

  it('is always a permutation of the default tile set', () => {
    for (const party of [
      ['fighter', 'sorcerer', 'wizard', 'warlock'],
      ['ranger', 'wizard', 'sorcerer', 'warlock'],   // all ranged
      ['fighter', 'barbarian', 'rogue', 'cleric'],   // all melee
      ['barbarian', 'sorcerer', 'warlock', 'rogue'], // the owner's calibration comp
    ]) {
      const o = frontlineOrder(party, tiles, enemies);
      expect(o.length).toBe(party.length);
      expect([...o].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it('is deterministic — the same inputs give the same board every time', () => {
    const p = ['barbarian', 'sorcerer', 'warlock', 'rogue'];
    const a = frontlineOrder(p, tiles, enemies);
    for (let i = 0; i < 5; i++) expect(frontlineOrder(p, tiles, enemies)).toEqual(a);
  });

  it('changes NOTHING when the room has no enemies', () => {
    // There is no "front" without something to face. Inventing one (advance
    // along +x) cost e8 fifty points of win rate against the plain default.
    expect(frontlineOrder(['sorcerer', 'fighter'], [{ x: 1, y: 3 }, { x: 2, y: 3 }], []))
      .toEqual([0, 1]);
    expect(frontlineOrder(['fighter', 'sorcerer'], [{ x: 1, y: 3 }, { x: 2, y: 3 }], []))
      .toEqual([0, 1]);
  });

  it('refuses a party that does not fit the placement tiles', () => {
    expect(() => frontlineOrder(['fighter', 'wizard'], [{ x: 1, y: 3 }], [])).toThrow(/placement tiles/);
  });

  it('fixes the inverted default on every Unlit Beacon encounter', () => {
    // The regression this exists for: with the slot-order default, a melee
    // hero starts at the BACK. Assert the heuristic never leaves a melee unit
    // behind a ranged one, on real encounter geometry.
    const c: any = (CAMPAIGNS as any).unlitbeacon;
    const party = ['barbarian', 'sorcerer', 'warlock', 'rogue'];
    for (const [id, enc] of Object.entries<any>(c.encounters)) {
      const enemies = enc.enemyPlacement ?? enc.rooms?.[0]?.enemyPlacement ?? [];
      const order = frontlineOrder(party, enc.playerPlacement, enemies);
      if (enemies.length === 0) continue;   // no front to check
      const dist = (ti: number) =>
        Math.min(...enemies.map((e: any) => Math.abs(enc.playerPlacement[ti].x - e.x) + Math.abs(enc.playerPlacement[ti].y - e.y)));
      for (let i = 0; i < party.length; i++) {
        for (let j = 0; j < party.length; j++) {
          if (basicReach(party[i]) <= 1 && basicReach(party[j]) > 1) {
            expect(dist(order[i]), `${id}: ${party[i]} must not stand behind ${party[j]}`)
              .toBeLessThanOrEqual(dist(order[j]));
          }
        }
      }
    }
  });
});

describe('[SKILL1] the player-brain axis', () => {
  it('the baseline bot does strictly worse where play quality matters', async () => {
    const { simEncounterCell } = await import('../src/ai/campaignSim.js');
    const P = ['barbarian', 'sorcerer', 'warlock', 'rogue'];
    // e6 measures +100 points of skill delta at 120 games; 12 games is ample
    // separation without making the suite slow.
    const opt = simEncounterCell('unlitbeacon', 'e6', 'medium', 'custom', P, { games: 12 });
    const base = simEncounterCell('unlitbeacon', 'e6', 'medium', 'custom', P,
      { games: 12, playerBrain: 'baseline' });
    expect(opt.winRate).toBeGreaterThan(base.winRate);
  });
});
