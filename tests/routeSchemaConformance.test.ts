import { describe, it, expect } from 'vitest';
import { SubmitTurnSchema } from '../src/routes/turnActionSchema.js';
import { newInstanceId, buildInitialState } from '../src/game/initialState.js';
import { DEFAULT_UNITS } from '../src/ai/defaultData.js';

// Regression for the "move + charge = endless errors" bug: the route layer's
// zod schema required uuid instance ids, but buildInitialState (shared with
// mobile since the RN-compat refactor) generates `i<ts>_<seq>_<rand>` ids.
// Every action on a newly created match was rejected at the route BEFORE
// reaching the engine — so engine tests and sims could never catch it.
// Lesson encoded here: the boundary layer must be tested with REAL ids and
// REAL payloads produced by the same code that produces them in production.

describe('route schema accepts what the engine actually produces', () => {
  const team = ['fighter', 'barbarian', 'ranger', 'rogue'].map((s) => DEFAULT_UNITS[s]);
  const state = buildInitialState('p1', 'p2', team, team, [], []);
  const realId = state.units[0].instanceId;

  it('accepts engine-generated (non-uuid) instance ids on every action type', () => {
    const r = SubmitTurnSchema.safeParse({
      actions: [
        { type: 'MOVE', unitInstanceId: realId, destination: { x: 1, y: 1 } },
        { type: 'CHARGE', unitInstanceId: realId, destination: { x: 2, y: 1 } },
        { type: 'END_TURN' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('accepts legacy uuid instance ids (matches created before the refactor)', () => {
    const r = SubmitTurnSchema.safeParse({
      actions: [
        { type: 'MOVE', unitInstanceId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', destination: { x: 1, y: 1 } },
        { type: 'END_TURN' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('newInstanceId format is stable and passes the schema', () => {
    for (let i = 0; i < 20; i++) {
      const r = SubmitTurnSchema.safeParse({
        actions: [{ type: 'MOVE', unitInstanceId: newInstanceId(), destination: { x: 0, y: 0 } }, { type: 'END_TURN' }],
      });
      expect(r.success).toBe(true);
    }
  });

  it('preserves pushDestination through parsing (zod strips undeclared keys)', () => {
    // Fear's player-chosen push direction was silently dropped by the schema,
    // so the server always recomputed the default push. The parsed output —
    // which is what the service layer receives — must retain it.
    const r = SubmitTurnSchema.parse({
      actions: [
        { type: 'USE_ABILITY', unitInstanceId: realId, abilitySlug: 'fear', target: { x: 3, y: 3 }, pushDestination: { x: 3, y: 6 } },
        { type: 'END_TURN' },
      ],
    });
    const ability = r.actions[0] as { pushDestination?: { x: number; y: number } };
    expect(ability.pushDestination).toEqual({ x: 3, y: 6 });
  });

  it('still rejects malformed payloads', () => {
    expect(SubmitTurnSchema.safeParse({ actions: [{ type: 'MOVE', unitInstanceId: '', destination: { x: 1, y: 1 } }] }).success).toBe(false);
    expect(SubmitTurnSchema.safeParse({ actions: [{ type: 'MOVE', unitInstanceId: realId, destination: { x: 9, y: 1 } }] }).success).toBe(false);
    expect(SubmitTurnSchema.safeParse({ actions: [] }).success).toBe(false);
  });
});
