import { describe, it, expect } from 'vitest';
import { dryRunTurnSoFar } from '../src/game/turnBuilder.js';
import { processTurn, TurnValidationError } from '../src/game/turnProcessor.js';
import { buildInitialState, FABLE_PLAYER_ID } from '../src/game/initialState.js';
import { DEFAULT_UNITS, DEFAULT_ABILITIES } from '../src/ai/defaultData.js';
import { MatchState, TurnAction } from '../src/types/matchState.js';

const HUMAN = 'human-player';
const amap = new Map((DEFAULT_ABILITIES as any[]).map((a) => [a.slug, a])) as any;

function mkState(): MatchState {
  return buildInitialState(
    HUMAN, FABLE_PLAYER_ID,
    ['fighter', 'ranger', 'rogue', 'cleric'].map((s) => (DEFAULT_UNITS as any)[s]),
    ['barbarian', 'wizard', 'sorcerer', 'warlock'].map((s) => (DEFAULT_UNITS as any)[s]),
    [], [], HUMAN, undefined, undefined, 1,
  );
}
const unitOf = (st: MatchState, slug: string, owner = HUMAN) =>
  st.units.find((u) => u.ownerPlayerId === owner && u.definitionSlug === slug)!;

describe('dryRunTurnSoFar — mid-turn dry run for the offline client', () => {
  it('processTurn REJECTS an in-progress action list (the bug being fixed)', () => {
    const st = mkState();
    const f = unitOf(st, 'fighter');
    const actions: TurnAction[] = [
      { type: 'USE_ABILITY', unitInstanceId: f.instanceId, abilitySlug: 'second_wind', target: f.position } as TurnAction,
    ];
    // No END_TURN — exactly what the match screen passes while the turn is open.
    expect(() => processTurn(st, actions, HUMAN, HUMAN, FABLE_PLAYER_ID, amap))
      .toThrow(TurnValidationError);
  });

  it('resolves a self-cast: heals, sets the cooldown, records no roll', () => {
    const st = mkState();
    const f = unitOf(st, 'fighter');
    f.currentHealth = 20;
    (st as any).rollLog = [];
    const actions: TurnAction[] = [
      { type: 'USE_ABILITY', unitInstanceId: f.instanceId, abilitySlug: 'second_wind', target: f.position } as TurnAction,
    ];
    const { events, updatedState } = dryRunTurnSoFar(st, actions, HUMAN, HUMAN, FABLE_PLAYER_ID, amap);
    const after = updatedState.units.find((u) => u.instanceId === f.instanceId)!;
    expect(events.some((e) => e.type === 'HEALING_DONE')).toBe(true);
    expect(after.currentHealth).toBeGreaterThan(20);
    // The gold star only greys out when the cooldown reaches the client.
    expect(after.cooldowns['second_wind']).toBeGreaterThan(0);
    // Self-cast is unblockable — no dodge roll.
    expect((updatedState as any).rollLog).toEqual([]);
  });

  it('records one roll per blockable attack, so dice and roll lines can render', () => {
    const st = mkState();
    const r = unitOf(st, 'rogue');
    const foe = st.units.find((u) => u.ownerPlayerId === FABLE_PLAYER_ID)!;
    r.position = { x: foe.position.x - 1, y: foe.position.y };
    (st as any).rollLog = [];
    const actions: TurnAction[] = [
      { type: 'USE_ABILITY', unitInstanceId: r.instanceId, abilitySlug: 'twin', target: foe.position } as TurnAction,
    ];
    const { events, updatedState } = dryRunTurnSoFar(st, actions, HUMAN, HUMAN, FABLE_PLAYER_ID, amap);
    const resolved = events.filter((e) => e.type === 'DAMAGE_DEALT' || e.type === 'DODGED').length;
    // Twin Strike is multi-hit: two blows, two rolls, and the counts must line
    // up or resolveOfflineAttack falls back to a grouped line with no dice.
    expect(resolved).toBe(2);
    expect((updatedState as any).rollLog).toHaveLength(2);
  });

  it('does NOT finalize: statuses keep their duration and initiative does not advance', () => {
    const st = mkState();
    const c = unitOf(st, 'cleric');
    c.statusEffects = [{ slug: 'weakened', turnsRemaining: 2, stacks: 1, sourceUnitInstanceId: 'x' } as any];
    const before = JSON.parse(JSON.stringify(st.initiative));
    const actions: TurnAction[] = [
      { type: 'MOVE', unitInstanceId: c.instanceId, destination: { x: c.position.x + 1, y: c.position.y } } as TurnAction,
    ];
    const { updatedState } = dryRunTurnSoFar(st, actions, HUMAN, HUMAN, FABLE_PLAYER_ID, amap);
    const after = updatedState.units.find((u) => u.instanceId === c.instanceId)!;
    // Appending a synthetic END_TURN would have ticked this to 1 a turn early.
    expect(after.statusEffects[0].turnsRemaining).toBe(2);
    expect(updatedState.initiative!.slot).toBe(before.slot);
  });

  it('move-then-attack accumulates both actions', () => {
    const st = mkState();
    const rg = unitOf(st, 'ranger');
    (st as any).rollLog = [];
    const dest = { x: rg.position.x + 1, y: rg.position.y };
    // Nearest foe, measured from where the ranger ENDS UP. The armies deploy on
    // opposite sides (x 0-2 vs x 5-7), so the first foe in unit order is not
    // necessarily inside arrow's range-6 Manhattan reach.
    const foe = st.units
      .filter((u) => u.ownerPlayerId === FABLE_PLAYER_ID)
      .sort((a, b) =>
        (Math.abs(a.position.x - dest.x) + Math.abs(a.position.y - dest.y)) -
        (Math.abs(b.position.x - dest.x) + Math.abs(b.position.y - dest.y)))[0];
    const actions: TurnAction[] = [
      { type: 'MOVE', unitInstanceId: rg.instanceId, destination: dest } as TurnAction,
      { type: 'USE_ABILITY', unitInstanceId: rg.instanceId, abilitySlug: 'arrow', target: foe.position } as TurnAction,
    ];
    const { events, updatedState } = dryRunTurnSoFar(st, actions, HUMAN, HUMAN, FABLE_PLAYER_ID, amap);
    expect(events.some((e) => e.type === 'UNIT_MOVED')).toBe(true);
    expect(events.some((e) => e.type === 'ABILITY_USED')).toBe(true);
    const after = updatedState.units.find((u) => u.instanceId === rg.instanceId)!;
    expect(after.position).toEqual(dest);
  });
});
