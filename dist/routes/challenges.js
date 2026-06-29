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
exports.challengeRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const challengeService = __importStar(require("../services/challengeService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.challengeRouter = (0, express_1.Router)();
exports.challengeRouter.use(auth_js_1.requireAuth);
const IssueChallengeSchema = zod_1.z.object({
    opponentUsername: zod_1.z.string().min(3).max(20),
    teamId: zod_1.z.string().uuid(),
});
const AcceptChallengeSchema = zod_1.z.object({
    teamId: zod_1.z.string().uuid(),
});
// GET /challenges — get pending received + recent sent challenges
exports.challengeRouter.get('/', async (req, res) => {
    const { received, sent } = await challengeService.getChallenges(req.user.id);
    (0, response_js_1.sendSuccess)(res, {
        challenges: received.map((c) => ({
            id: c.id,
            fromUserId: c.challenger_id,
            fromUsername: c.challenger_username,
            teamId: c.challenger_team_id,
            status: c.status,
            createdAt: c.created_at,
            expiresAt: c.expires_at,
        })),
        sent: sent.map((c) => ({
            id: c.id,
            toUserId: c.opponent_id,
            toUsername: c.opponent_username,
            teamId: c.challenger_team_id,
            status: c.status,
            matchId: c.match_id,
            createdAt: c.created_at,
        })),
    });
});
// POST /challenges — issue a challenge
exports.challengeRouter.post('/', async (req, res) => {
    const parsed = IssueChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid challenge data', parsed.error.flatten());
        return;
    }
    try {
        const result = await challengeService.issueChallenge(req.user.id, parsed.data.teamId, parsed.data.opponentUsername);
        (0, response_js_1.sendSuccess)(res, result);
    }
    catch (err) {
        if (err instanceof challengeService.ChallengeError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        throw err;
    }
});
// POST /challenges/:id/accept
exports.challengeRouter.post('/:id/accept', async (req, res) => {
    const parsed = AcceptChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Team ID required', parsed.error.flatten());
        return;
    }
    try {
        const result = await challengeService.acceptChallenge(req.params.id, req.user.id, parsed.data.teamId);
        (0, response_js_1.sendSuccess)(res, result);
    }
    catch (err) {
        if (err instanceof challengeService.ChallengeNotFoundError) {
            response_js_1.Errors.notFound(res, 'Challenge');
            return;
        }
        if (err instanceof challengeService.ChallengeAccessError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        if (err instanceof challengeService.ChallengeError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        throw err;
    }
});
// POST /challenges/:id/decline
exports.challengeRouter.post('/:id/decline', async (req, res) => {
    try {
        await challengeService.declineChallenge(req.params.id, req.user.id);
        (0, response_js_1.sendSuccess)(res, { message: 'Challenge declined' });
    }
    catch (err) {
        if (err instanceof challengeService.ChallengeNotFoundError) {
            response_js_1.Errors.notFound(res, 'Challenge');
            return;
        }
        if (err instanceof challengeService.ChallengeAccessError) {
            response_js_1.Errors.forbidden(res);
            return;
        }
        if (err instanceof challengeService.ChallengeError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        throw err;
    }
});
//# sourceMappingURL=challenges.js.map