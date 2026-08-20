"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubmitRodActionSchema = exports.SubmitTurnSchema = exports.TurnActionSchema = void 0;
const zod_1 = require("zod");
// Kept dependency-free (zod only) so tests can validate the boundary layer
// without pulling in db/config. Instance ids are NOT uuids — buildInitialState's
// newInstanceId() emits `i<ts>_<seq>_<rand>` (RN-compatible). The engine
// validates existence/ownership; the schema only guards shape.
const BoardPositionSchema = zod_1.z.object({ x: zod_1.z.number().int().min(0).max(7), y: zod_1.z.number().int().min(0).max(7) });
const InstanceIdSchema = zod_1.z.string().min(1).max(64);
const MoveActionSchema = zod_1.z.object({ type: zod_1.z.literal('MOVE'), unitInstanceId: InstanceIdSchema, destination: BoardPositionSchema });
const UseAbilityActionSchema = zod_1.z.object({ type: zod_1.z.literal('USE_ABILITY'), unitInstanceId: InstanceIdSchema, abilitySlug: zod_1.z.string().min(1), target: BoardPositionSchema, pushDestination: BoardPositionSchema.optional() });
const EndTurnActionSchema = zod_1.z.object({ type: zod_1.z.literal('END_TURN') });
const ChargeActionSchema = zod_1.z.object({ type: zod_1.z.literal('CHARGE'), unitInstanceId: InstanceIdSchema, destination: BoardPositionSchema });
exports.TurnActionSchema = zod_1.z.discriminatedUnion('type', [MoveActionSchema, ChargeActionSchema, UseAbilityActionSchema, EndTurnActionSchema]);
exports.SubmitTurnSchema = zod_1.z.object({ actions: zod_1.z.array(exports.TurnActionSchema).min(1).max(10) });
// ROD3: single-action endpoint schema
const RodActionSchema = zod_1.z.discriminatedUnion('type', [MoveActionSchema, ChargeActionSchema, UseAbilityActionSchema]);
exports.SubmitRodActionSchema = zod_1.z.object({
    action: RodActionSchema,
    seq: zod_1.z.number().int().min(0),
});
//# sourceMappingURL=turnActionSchema.js.map