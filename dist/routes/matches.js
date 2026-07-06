"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const matchService = __importStar(require("../services/matchService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.matchRouter = (0, express_1.Router)();
exports.matchRouter.use(auth_js_1.requireAuth);
const BoardPositionSchema = zod_1.z.object({ x: zod_1.z.number().int().min(0).max(7), y: zod_1.z.number().int().min(0).max(7) });
const MoveActionSchema = zod_1.z.object({ type: zod_1.z.literal('MOVE'), unitInstanceId: zod_1.z.string().uuid(), destination: BoardPositionSchema });
const UseAbilityActionSchema = zod_1.z.object({ type: zod_1.z.literal('USE_ABILITY'), unitInstanceId: zod_1.z.string().uuid(), abilitySlug: zod_1.z.string().min(1), target: BoardPositionSchema });
const EndTurnActionSchema = zod_1.z.object({ type: zod_1.z.literal('END_TURN') });
const ChargeActionSchema = zod_1.z.object({ type: zod_1.z.literal('CHARGE'), unitInstanceId: zod_1.z.string().uuid(), destination: BoardPositionSchema });
const TurnActionSchema = zod_1.z.discriminatedUnion('type', [MoveActionSchema, ChargeActionSchema, UseAbilityActionSchema, EndTurnActionSchema]);
const SubmitTurnSchema = zod_1.z.object({ actions: zod_1.z.array(TurnActionSchema).min(1).max(10) });
exports.matchRouter.get('/', async (req, res) => {
    const matches = await matchService.getUserMatches(req.user.id);
    const summary = matches.map((m) => ({ id: m.id, playerOneId: m.player_one_id, playerTwoId: m.player_two_id, playerOneUsername: m.player_one_username, playerTwoUsername: m.player_two_username, status: m.status, activePlayerId: m.active_player_id, turnNumber: m.turn_number, turnDeadline: m.turn_deadline, winnerId: m.winner_id, eloDeltaP1: m.elo_delta_p1, eloDeltaP2: m.elo_delta_p2, createdAt: m.created_at, updatedAt: m.updated_at, completedAt: m.completed_at, isPve: m.is_pve, isMyTurn: m.active_player_id === req.user.id && m.status === 'active' }));
    (0, response_js_1.sendSuccess)(res, { matches: summary });
});
exports.matchRouter.get('/:id', async (req, res) => {
    try {
        const { match, playerOneUsername, playerTwoUsername } = await matchService.getMatchWithPlayers(req.params.id, req.user.id);
        (0, response_js_1.sendSuccess)(res, { id: match.id, playerOneId: match.player_one_id, playerTwoId: match.player_two_id, playerOneUsername, playerTwoUsername, status: match.status, activePlayerId: match.active_player_id, turnNumber: match.turn_number, turnDeadline: match.turn_deadline, winnerId: match.winner_id, matchState: match.match_state, lastTurnEvents: match.last_turn_events ?? [], eloDeltaP1: match.elo_delta_p1, eloDeltaP2: match.elo_delta_p2, createdAt: match.created_at, completedAt: match.completed_at, isMyTurn: match.active_player_id === req.user.id && match.status === 'active', isPve: match.is_pve ?? false });
    }
    catch (err) {
        if (err instanceof matchService.MatchNotFoundError) {
            response_js_1.Errors.notFound(res, 'Match');
            return;
        }
        if (err instanceof matchService.MatchAccessError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        throw err;
    }
});
exports.matchRouter.post('/:id/turn', async (req, res) => {
    const parsed = SubmitTurnSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid turn data', parsed.error.flatten());
        return;
    }
    try {
        const { result, match } = await matchService.submitTurn(req.params.id, req.user.id, parsed.data.actions);
        (0, response_js_1.sendSuccess)(res, { events: result.events, matchOver: result.matchOver, winnerId: result.winnerId, updatedState: result.updatedState, match: { id: match.id, status: match.status, activePlayerId: match.active_player_id, turnNumber: match.turn_number, turnDeadline: match.turn_deadline, winnerId: match.winner_id, isPve: match.is_pve ?? false } });
    }
    catch (err) {
        if (err instanceof matchService.MatchNotFoundError) {
            response_js_1.Errors.notFound(res, 'Match');
            return;
        }
        if (err instanceof matchService.MatchAccessError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        if (err instanceof matchService.MatchNotActiveError) {
            response_js_1.Errors.conflict(res, 'This match is no longer active');
            return;
        }
        if (err instanceof matchService.TurnValidationError) {
            response_js_1.Errors.validation(res, err.message);
            return;
        }
        throw err;
    }
});
exports.matchRouter.get('/:id/history', async (req, res) => {
    try {
        const history = await matchService.getTurnHistory(req.params.id, req.user.id);
        (0, response_js_1.sendSuccess)(res, { history });
    }
    catch (err) {
        if (err instanceof matchService.MatchNotFoundError) {
            response_js_1.Errors.notFound(res, 'Match');
            return;
        }
        if (err instanceof matchService.MatchAccessError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        throw err;
    }
});
const CreatePveMatchSchema = zod_1.z.object({ myTeamId: zod_1.z.string().uuid(), fableTeamId: zod_1.z.string().uuid() });
exports.matchRouter.post('/pve', async (req, res) => {
    const parsed = CreatePveMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, parsed.error.message);
        return;
    }
    const { myTeamId, fableTeamId } = parsed.data;
    const { matchId, state } = await matchService.createPveMatch(req.user.id, myTeamId, fableTeamId);
    (0, response_js_1.sendSuccess)(res, { matchId, state });
});
exports.matchRouter.post('/:id/forfeit', async (req, res) => {
    try {
        await matchService.forfeitMatch(req.params.id, req.user.id);
        (0, response_js_1.sendSuccess)(res, { message: 'Match forfeited' });
    }
    catch (err) {
        if (err instanceof matchService.MatchNotFoundError) {
            response_js_1.Errors.notFound(res, 'Match');
            return;
        }
        if (err instanceof matchService.MatchAccessError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        if (err instanceof matchService.MatchNotActiveError) {
            response_js_1.Errors.conflict(res, 'This match is no longer active');
            return;
        }
        throw err;
    }
});
//# sourceMappingURL=matches.js.map