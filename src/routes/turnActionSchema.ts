import { z } from 'zod';

// Kept dependency-free (zod only) so tests can validate the boundary layer
// without pulling in db/config. Instance ids are NOT uuids — buildInitialState's
// newInstanceId() emits `i<ts>_<seq>_<rand>` (RN-compatible). The engine
// validates existence/ownership; the schema only guards shape.
const BoardPositionSchema = z.object({ x: z.number().int().min(0).max(7), y: z.number().int().min(0).max(7) });
const InstanceIdSchema = z.string().min(1).max(64);
const MoveActionSchema = z.object({ type: z.literal('MOVE'), unitInstanceId: InstanceIdSchema, destination: BoardPositionSchema });
const UseAbilityActionSchema = z.object({ type: z.literal('USE_ABILITY'), unitInstanceId: InstanceIdSchema, abilitySlug: z.string().min(1), target: BoardPositionSchema, pushDestination: BoardPositionSchema.optional() });
const EndTurnActionSchema = z.object({ type: z.literal('END_TURN') });
const ChargeActionSchema = z.object({ type: z.literal('CHARGE'), unitInstanceId: InstanceIdSchema, destination: BoardPositionSchema });
export const TurnActionSchema = z.discriminatedUnion('type', [MoveActionSchema, ChargeActionSchema, UseAbilityActionSchema, EndTurnActionSchema]);
export const SubmitTurnSchema = z.object({ actions: z.array(TurnActionSchema).min(1).max(10) });
