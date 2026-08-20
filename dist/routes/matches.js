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
const fableTeams_js_1 = require("../config/fableTeams.js");
exports.matchRouter = (0, express_1.Router)();
exports.matchRouter.use(auth_js_1.requireAuth);
const turnActionSchema_js_1 = require("./turnActionSchema.js");
const ROD_ONLINE_ENABLED = process.env.ROD_ONLINE_ENABLED === 'true';
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
    const parsed = turnActionSchema_js_1.SubmitTurnSchema.safeParse(req.body);
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
exports.matchRouter.post('/:id/action', async (req, res) => {
    if (!ROD_ONLINE_ENABLED) {
        (0, response_js_1.sendError)(res, 501, 'NOT_IMPLEMENTED', 'Roll-on-demand is not enabled');
        return;
    }
    const parsed = turnActionSchema_js_1.SubmitRodActionSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid action data', parsed.error.flatten());
        return;
    }
    try {
        const r = await matchService.submitRodAction(req.params.id, req.user.id, parsed.data.action, parsed.data.seq);
        (0, response_js_1.sendSuccess)(res, r);
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
        if (err instanceof matchService.NotYourTurnError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        if (err instanceof matchService.SeqMismatchError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        if (err instanceof matchService.TurnValidationError) {
            response_js_1.Errors.validation(res, err.message);
            return;
        }
        throw err;
    }
});
exports.matchRouter.post('/:id/end-turn', async (req, res) => {
    if (!ROD_ONLINE_ENABLED) {
        (0, response_js_1.sendError)(res, 501, 'NOT_IMPLEMENTED', 'Roll-on-demand is not enabled');
        return;
    }
    try {
        const r = await matchService.submitRodEndTurn(req.params.id, req.user.id);
        (0, response_js_1.sendSuccess)(res, { events: r.events, matchOver: r.matchOver, winnerId: r.winnerId, updatedState: r.updatedState, match: { id: r.match.id, status: r.match.status, activePlayerId: r.match.active_player_id, turnNumber: r.match.turn_number, turnDeadline: r.match.turn_deadline, winnerId: r.match.winner_id, isPve: r.match.is_pve ?? false } });
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
        if (err instanceof matchService.NotYourTurnError) {
            response_js_1.Errors.forbidden(res);
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
const CreatePveMatchSchema = zod_1.z.object({
    myTeamId: zod_1.z.string().uuid(),
    // Either one of the player's own teams (a UUID) or one of Fable's rosters.
    // Fable roster ids are UUIDs too, so the union only widens this to admit the
    // non-UUID 'fable-random' sentinel; matchService resolves it.
    fableTeamId: zod_1.z.union([zod_1.z.string().uuid(), zod_1.z.literal(fableTeams_js_1.FABLE_RANDOM_TEAM_ID)]),
    difficulty: zod_1.z.enum(['easy', 'medium', 'hard', 'nightmare']).optional(),
});
exports.matchRouter.post('/pve', async (req, res) => {
    const parsed = CreatePveMatchSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, parsed.error.message);
        return;
    }
    const { myTeamId, fableTeamId, difficulty } = parsed.data;
    const { matchId, state } = await matchService.createPveMatch(req.user.id, myTeamId, fableTeamId, difficulty ?? 'hard');
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