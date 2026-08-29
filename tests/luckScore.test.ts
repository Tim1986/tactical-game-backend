/**
 * luckScore.test.ts — the luck metric (MatchState.luck).
 *
 * Luck is `actual - expected` per roll, in EXPECTED HITS, credited to the
 * attacker's owner and debited from the target's. What matters most is what it
 * must NOT do: it may never influence a roll. These tests pin the arithmetic,
 * the zero-sum property that lets one number describe a whole match, and the
 * exclusion of scripted (puzzle) rolls, where every outcome was published in
 * advance and there is no variance to attribute.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { executeAbility, missChanceOf } from '../src/game/abilityExecutor.js';
import type { MatchState, UnitInstance } from '../src/types/matchState.js';

const P1 = 'p1', P2 = 'p2';
let seq = 0;
function unit(owner: string, x: number, ac: number): UnitInstance {
  return {
    instanceId: `u${++seq}`, definitionSlug: 'fighter', ownerPlayerId: owner,
    position: { x, y: 0 }, currentHealth: 50, maxHealth: 50, armorClass: ac,
    movementRange: 3, abilities: ['sword'], passives: [], isAlive: true,
    hasMovedThisTurn: false, hasActedThisTurn: false, cooldowns: {}, statusEffects: [],
  } as UnitInstance;
}
const SWORD = { slug: 'sword', name: 'Sword', range: 1, targetingType: 'single',
  effects: [{ type: 'damage', value: 10 }] } as never;

/** One attack, resolved through the real executor. */
function swing(st: MatchState, caster: UnitInstance, target: UnitInstance) {
  executeAbility({ state: st, caster, targetPosition: target.position, ability: SWORD, events: [] } as never);
}

function state(units: UnitInstance[], extra: Partial<MatchState> = {}): MatchState {
  return { board: { width: 8, height: 8 }, units, turnNumber: 1, roundNumber: 1,
    activePlayerId: P1, ...extra } as MatchState;
}

afterEach(() => vi.restoreAllMocks());

describe('luck score', () => {
  it('a HIT credits the attacker exactly the miss chance it beat', () => {
    const a = unit(P1, 0, 10), d = unit(P2, 1, 12);   // AC 12 -> 30% dodge
    const st = state([a, d]);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);   // never below missChance -> hit
    swing(st, a, d);
    expect(st.luck![P1]).toBeCloseTo(missChanceOf(12), 10);
    expect(st.luck![P2]).toBeCloseTo(-missChanceOf(12), 10);
  });

  it('a MISS debits the attacker the hit chance it squandered', () => {
    const a = unit(P1, 0, 10), d = unit(P2, 1, 12);
    const st = state([a, d]);
    vi.spyOn(Math, 'random').mockReturnValue(0);      // always below missChance -> miss
    swing(st, a, d);
    expect(st.luck![P1]).toBeCloseTo(-(1 - missChanceOf(12)), 10);
    expect(st.luck![P2]).toBeCloseTo(1 - missChanceOf(12), 10);
  });

  it('an UNLIKELY hit is worth more than a likely one', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const hard = state([unit(P1, 0, 10), unit(P2, 1, 12)]);   // 30% dodge
    swing(hard, hard.units[0], hard.units[1]);
    const easy = state([unit(P1, 0, 10), unit(P2, 1, 8)]);    // 10% dodge
    swing(easy, easy.units[0], easy.units[1]);
    expect(hard.luck![P1]).toBeGreaterThan(easy.luck![P1]);
  });

  it('is zero-sum, so one number describes the match', () => {
    const st = state([unit(P1, 0, 10), unit(P2, 1, 12)]);
    for (const r of [0.99, 0, 0.5, 0.2, 0.8]) {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      st.units[0].hasActedThisTurn = false;
      swing(st, st.units[0], st.units[1]);
    }
    expect(st.luck![P1] + st.luck![P2]).toBeCloseTo(0, 10);
  });

  it('ignores an AUTHORED puzzle script — its outcomes were published up front', () => {
    const st = state([unit(P1, 0, 10), unit(P2, 1, 12)],
      { rollScript: ['hit'], rollIndex: 0, rollScriptAuthored: true });
    swing(st, st.units[0], st.units[1]);
    expect(st.luck).toBeUndefined();
  });

  it('DOES count a REPLAYED script — that is the offline client handing back real rolls', () => {
    // Offline, the player is shown a roll immediately and the authoritative
    // execution replays it at End Turn. Skipping replays would have zeroed the
    // human's luck offline while still counting Fable's.
    const st = state([unit(P1, 0, 10), unit(P2, 1, 12)], { rollScript: ['hit'], rollIndex: 0 });
    swing(st, st.units[0], st.units[1]);
    expect(st.luck![P1]).toBeCloseTo(missChanceOf(12), 10);
  });

  it('never touches a roll: outcomes are identical with luck already present', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const fresh = state([unit(P1, 0, 10), unit(P2, 1, 12)]);
    swing(fresh, fresh.units[0], fresh.units[1]);
    const loaded = state([unit(P1, 0, 10), unit(P2, 1, 12)], { luck: { [P1]: -99, [P2]: 99 } });
    swing(loaded, loaded.units[0], loaded.units[1]);
    expect(loaded.units[1].currentHealth).toBe(fresh.units[1].currentHealth);
  });

  it('counts the rolls it covered, so the score can be weighed', () => {
    const st = state([unit(P1, 0, 10), unit(P2, 1, 12)]);
    for (const r of [0.99, 0, 0.99]) {
      vi.spyOn(Math, 'random').mockReturnValue(r);
      swing(st, st.units[0], st.units[1]);
    }
    expect(st.luckRolls).toBe(3);
  });

  it('counts the KILLING BLOW — the roll is made before damage, like any other', () => {
    const a = unit(P1, 0, 10), d = unit(P2, 1, 12);
    d.currentHealth = 1;                       // this hit ends the match
    const st = state([a, d]);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    swing(st, a, d);
    expect(d.currentHealth).toBeLessThanOrEqual(0);
    expect(st.luck![P1]).toBeCloseTo(missChanceOf(12), 10);
    expect(st.luckRolls).toBe(1);
  });

  it('records NOTHING when no die was thrown — unblockable, exposed', () => {
    // Not an omission: luck tracks variance, and both of these resolve with no
    // roll at all. An execute that cannot miss is not a lucky kill.
    const unblockable = { ...(SWORD as object), isUnblockable: true } as never;
    const st = state([unit(P1, 0, 10), unit(P2, 1, 12)]);
    executeAbility({ state: st, caster: st.units[0], targetPosition: st.units[1].position,
      ability: unblockable, events: [] } as never);
    expect(st.units[1].currentHealth).toBeLessThan(50);   // it DID land
    expect(st.luck).toBeUndefined();                      // but no roll happened

    const exposed = state([unit(P1, 0, 10), unit(P2, 1, 12)]);
    exposed.units[1].statusEffects = [{ slug: 'exposed', turnsRemaining: 9, stacks: 1,
      sourceUnitInstanceId: exposed.units[1].instanceId }];
    swing(exposed, exposed.units[0], exposed.units[1]);
    expect(exposed.luck).toBeUndefined();
  });

  it('DOES count a swing at a SHIELDED unit — it dodges like anyone else (DGE-5)', () => {
    // Before the 2026-08-28 ruling the shield resolved first and no die was
    // thrown, so these attacks were invisible to luck. They roll now.
    const st = state([unit(P1, 0, 10), unit(P2, 1, 12)]);
    st.units[1].statusEffects = [{ slug: 'shielded', turnsRemaining: 9, stacks: 1,
      sourceUnitInstanceId: st.units[1].instanceId }];
    vi.spyOn(Math, 'random').mockReturnValue(0.99);       // hit -> shield absorbs
    swing(st, st.units[0], st.units[1]);
    expect(st.luck![P1]).toBeCloseTo(missChanceOf(12), 10);
    expect(st.luckRolls).toBe(1);
  });
});
