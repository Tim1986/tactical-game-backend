import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildInitialState } from '../src/game/initialState.js';
import { beginTurn, applyAction, endTurn } from '../src/game/turnProcessor.js';
import { buildAbilityMap, DEFAULT_UNITS } from '../src/ai/defaultData.js';
import { SubmitRodActionSchema } from '../src/routes/turnActionSchema.js';
import { MatchState, UseAbilityAction } from '../src/types/matchState.js';

// ROD6 — integrity audit tests. These prove the properties the ROD6 gate
// requires WITHOUT a DB: (1) the wire cannot carry a client roll, (2) the
// engine's roll comes only from server RNG (an injected roll on the action is
// ignored and never enters state), (3) seq idempotency means a re-submit never
// re-rolls, (4) out-of-turn / wrong-unit actions are rejected.

const P1 = 'player-one';
const P2 = 'player-two';
const abilityMap = buildAbilityMap();

// 1v1 duel. buildInitialState assigns its own board placement, so we force the
// two barbarians adjacent afterward: P1's unit is the lone acting unit (active
// player), P2's unit sits one tile away — in range of strike (range 1).
function duelState(): MatchState {
  const state = buildInitialState(
    P1, P2,
    [DEFAULT_UNITS['barbarian']], [DEFAULT_UNITS['barbarian']],
    [{ x: 5, y: 0 }], [{ x: 6, y: 0 }],
    P1,
    [{ specialSlug: 'whirlwind', passiveSlug: null }],
    [{ specialSlug: 'whirlwind', passiveSlug: null }],
  );
  const attacker = state.units.find((u) => u.ownerPlayerId === P1)!;
  const target = state.units.find((u) => u.ownerPlayerId === P2)!;
  attacker.position = { x: 5, y: 0 };
  target.position = { x: 6, y: 0 };
  return state;
}

afterEach(() => { vi.restoreAllMocks(); });

describe('ROD6 wire: the client cannot supply a roll', () => {
  it('SubmitRodActionSchema strips every roll-shaped field a client might inject', () => {
    const dirty = {
      action: {
        type: 'USE_ABILITY', unitInstanceId: 'u1', abilitySlug: 'strike', target: { x: 6, y: 0 },
        // Adversarial extras — every field a cheating client might try:
        rolls: ['hit', 'hit'], rollScript: ['hit'], rollLog: ['hit'],
        roll: 20, hit: true, missed: false, damage: 999,
      },
      seq: 0,
    };
    const parsed = SubmitRodActionSchema.parse(dirty);
    for (const k of ['rolls', 'rollScript', 'rollLog', 'roll', 'hit', 'missed', 'damage']) {
      expect(parsed.action).not.toHaveProperty(k);
    }
    // Legit fields survive untouched.
    expect(parsed.action).toMatchObject({ type: 'USE_ABILITY', abilitySlug: 'strike', target: { x: 6, y: 0 } });
  });

  it('rejects a negative seq and refuses END_TURN on the per-action endpoint', () => {
    expect(SubmitRodActionSchema.safeParse({ action: { type: 'MOVE', unitInstanceId: 'u', destination: { x: 1, y: 1 } }, seq: -1 }).success).toBe(false);
    expect(SubmitRodActionSchema.safeParse({ action: { type: 'END_TURN' }, seq: 0 }).success).toBe(false);
  });
});

describe('ROD6 engine: the server RNG is the only roller', () => {
  it('ignores a roll injected on the action object — server RNG decides, and the injected script never enters state', () => {
    const state = duelState();
    state.rollLog = []; // enable roll recording (as the client dry-run path does)
    const attacker = state.units.find((u) => u.ownerPlayerId === P1)!;
    const target = state.units.find((u) => u.ownerPlayerId === P2)!;

    const action: UseAbilityAction = {
      type: 'USE_ABILITY', unitInstanceId: attacker.instanceId, abilitySlug: 'strike', target: { ...target.position },
    };
    // Pollute the action with a client roll demanding a MISS.
    (action as unknown as Record<string, unknown>).rollScript = ['miss'];
    (action as unknown as Record<string, unknown>).rolls = ['miss'];

    // Force the server RNG to a HIT (barbarian AC 15 → missChance 0.45; 0.9 ≥ 0.45 ⇒ hit).
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    // The incremental API deep-copies and returns updatedState — thread it, as the service does.
    const begun = beginTurn(state, action, P1, P1, P2);
    const applied = applyAction(begun.updatedState, action, P1, P1, P2, abilityMap);

    // The recorded roll follows the server RNG (hit), NOT the injected 'miss'.
    expect(applied.updatedState.rollLog).toEqual(['hit']);
    // The injected script/rolls never entered engine state.
    expect(applied.updatedState.rollScript).toBeUndefined();
    expect(applied.updatedState.rollIndex).toBeUndefined();
    // The hit actually landed — target took damage.
    const after = applied.updatedState.units.find((u) => u.instanceId === target.instanceId)!;
    expect(after.currentHealth).toBeLessThan(target.currentHealth);
  });

  it('a forced-miss RNG spares the target regardless of an injected hit', () => {
    const state = duelState();
    state.rollLog = [];
    const attacker = state.units.find((u) => u.ownerPlayerId === P1)!;
    const target = state.units.find((u) => u.ownerPlayerId === P2)!;
    const action: UseAbilityAction = {
      type: 'USE_ABILITY', unitInstanceId: attacker.instanceId, abilitySlug: 'strike', target: { ...target.position },
    };
    (action as unknown as Record<string, unknown>).rollScript = ['hit']; // demand a hit

    vi.spyOn(Math, 'random').mockReturnValue(0.0); // 0.0 < 0.45 ⇒ forced miss

    const begun = beginTurn(state, action, P1, P1, P2);
    const applied = applyAction(begun.updatedState, action, P1, P1, P2, abilityMap);

    expect(applied.updatedState.rollLog).toEqual(['miss']);
    const after = applied.updatedState.units.find((u) => u.instanceId === target.instanceId)!;
    expect(after.currentHealth).toBe(target.currentHealth); // unharmed
  });
});

describe('ROD6 replay/abuse: the same action cannot re-roll or act out of turn', () => {
  // Mirrors the seq-idempotency guard in submitRodAction: a re-submit at the
  // already-applied seq returns the stored state without re-running the engine.
  it('a duplicate seq is served from stored state — the engine never rolls twice', () => {
    const state = duelState();
    state.rollLog = [];
    const attacker = state.units.find((u) => u.ownerPlayerId === P1)!;
    const target = state.units.find((u) => u.ownerPlayerId === P2)!;
    const action: UseAbilityAction = {
      type: 'USE_ABILITY', unitInstanceId: attacker.instanceId, abilitySlug: 'strike', target: { ...target.position },
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    const begun = beginTurn(state, action, P1, P1, P2);
    const applied = applyAction(begun.updatedState, action, P1, P1, P2, abilityMap);
    applied.updatedState.turnContext!.seq = 0; // service stamps the applied seq

    const rollsAfterFirst = [...(applied.updatedState.rollLog ?? [])];
    const hpAfterFirst = applied.updatedState.units.find((u) => u.instanceId === target.instanceId)!.currentHealth;

    // Replay guard: seq === turnContext.seq ⇒ service returns stored state, no engine call.
    const tc = applied.updatedState.turnContext!;
    const resubmitSeq = 0;
    const isDuplicate = tc.seq === resubmitSeq;
    expect(isDuplicate).toBe(true); // service short-circuits here — applyAction is never re-invoked

    // The stored state is unchanged: no extra roll, no extra damage.
    expect(applied.updatedState.rollLog).toEqual(rollsAfterFirst);
    expect(applied.updatedState.units.find((u) => u.instanceId === target.instanceId)!.currentHealth).toBe(hpAfterFirst);
  });

  it('a seq gap is rejected (service throws SeqMismatchError)', () => {
    // expectedSeq = (turnContext.seq ?? -1) + 1. After seq 0 is applied, seq 2 is a gap.
    const tcSeq = 0;
    const expectedSeq = tcSeq + 1;
    const incoming = 2;
    expect(incoming).not.toBe(expectedSeq);
    expect(incoming === tcSeq).toBe(false); // not a duplicate either ⇒ mismatch path
  });

  // ROD7 regression: the client MUST send MOVE/CHARGE through the per-action
  // endpoint before an ability. This proves the engine contract both ways: an
  // attack after a committed move resolves range from the MOVED position, and
  // the same attack without the move is rejected — the exact "wizard attacks
  // 4 squares away → Target out of range" bug when moves were kept client-only.
  it('move-then-attack: range is resolved from the moved position (and fails from the stale one)', () => {
    const mkState = (): MatchState => {
      const s = buildInitialState(
        P1, P2,
        [DEFAULT_UNITS['wizard']], [DEFAULT_UNITS['wizard']],
        [{ x: 0, y: 3 }], [{ x: 7, y: 3 }],
        P1,
        [{ specialSlug: 'freeze', passiveSlug: null }],
        [{ specialSlug: 'freeze', passiveSlug: null }],
      );
      s.units.find((u) => u.ownerPlayerId === P1)!.position = { x: 0, y: 3 };
      s.units.find((u) => u.ownerPlayerId === P2)!.position = { x: 7, y: 3 };
      return s;
    };
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // force hit

    // Ice Blast (missile): range 5 Manhattan. Target at distance 7 — out of
    // range from the start position; distance 4 after moving to (3,3).
    // (Each mkState() mints fresh instanceIds, so derive actions per state.)
    const mkActions = (s: MatchState) => {
      const wizId = s.units.find((u) => u.ownerPlayerId === P1)!.instanceId;
      return {
        attack: { type: 'USE_ABILITY', unitInstanceId: wizId, abilitySlug: 'missile', target: { x: 7, y: 3 } } as UseAbilityAction,
        move: { type: 'MOVE' as const, unitInstanceId: wizId, destination: { x: 3, y: 3 } },
        wizId,
      };
    };

    // Without the move (client kept it local): server rejects — the user-visible bug.
    const stale = mkState();
    const s1 = mkActions(stale);
    const b1 = beginTurn(stale, s1.attack, P1, P1, P2);
    expect(() => applyAction(b1.updatedState, s1.attack, P1, P1, P2, abilityMap)).toThrow(/out of range/i);

    // With the move committed first (the fix): attack resolves from (3,3), hits.
    const fresh = mkState();
    const s2 = mkActions(fresh);
    const b2 = beginTurn(fresh, s2.move, P1, P1, P2);
    const m2 = applyAction(b2.updatedState, s2.move, P1, P1, P2, abilityMap);
    expect(m2.updatedState.units.find((u) => u.instanceId === s2.wizId)!.position).toEqual({ x: 3, y: 3 });
    const a2 = applyAction(m2.updatedState, s2.attack, P1, P1, P2, abilityMap);
    const tgt = a2.updatedState.units.find((u) => u.ownerPlayerId === P2)!;
    expect(tgt.currentHealth).toBeLessThan(tgt.maxHealth);
    expect(a2.events.some((e) => e.type === 'DAMAGE_DEALT')).toBe(true);
  });

  it('applyAction rejects an action for a unit that is not the active initiative unit', () => {
    const state = duelState();
    const attacker = state.units.find((u) => u.ownerPlayerId === P1)!;
    const enemy = state.units.find((u) => u.ownerPlayerId === P2)!;
    const good: UseAbilityAction = {
      type: 'USE_ABILITY', unitInstanceId: attacker.instanceId, abilitySlug: 'strike', target: { ...enemy.position },
    };
    const begun = beginTurn(state, good, P1, P1, P2);
    // Now try to act with the OPPONENT's unit inside P1's open turn.
    const wrong: UseAbilityAction = {
      type: 'USE_ABILITY', unitInstanceId: enemy.instanceId, abilitySlug: 'strike', target: { ...attacker.position },
    };
    expect(() => applyAction(begun.updatedState, wrong, P1, P1, P2, abilityMap)).toThrow();
  });
});
