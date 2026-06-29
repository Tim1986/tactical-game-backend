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
exports.matchmakingRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const matchmakingService = __importStar(require("../services/matchmakingService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.matchmakingRouter = (0, express_1.Router)();
exports.matchmakingRouter.use(auth_js_1.requireAuth);
const EnterQueueSchema = zod_1.z.object({ teamId: zod_1.z.string().uuid('Invalid team ID') });
const ChallengeSchema = zod_1.z.object({ teamId: zod_1.z.string().uuid('Invalid team ID'), opponentId: zod_1.z.string().uuid('Invalid opponent ID') });
exports.matchmakingRouter.post('/queue', async (req, res) => {
    const parsed = EnterQueueSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid queue data', parsed.error.flatten());
        return;
    }
    try {
        const result = await matchmakingService.enterQueue(req.user.id, parsed.data.teamId);
        (0, response_js_1.sendSuccess)(res, { message: 'Entered matchmaking queue', position: result.position }, 201);
    }
    catch (err) {
        if (err instanceof matchmakingService.AlreadyInQueueError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        if (err instanceof matchmakingService.ActiveMatchExistsError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        if (err instanceof matchmakingService.TeamNotFoundError) {
            response_js_1.Errors.notFound(res, 'Team');
            return;
        }
        throw err;
    }
});
exports.matchmakingRouter.delete('/queue', async (req, res) => {
    try {
        await matchmakingService.leaveQueue(req.user.id);
        (0, response_js_1.sendSuccess)(res, { message: 'Left matchmaking queue' });
    }
    catch (err) {
        if (err instanceof matchmakingService.NotInQueueError) {
            response_js_1.Errors.notFound(res, 'Queue entry');
            return;
        }
        throw err;
    }
});
exports.matchmakingRouter.get('/queue', async (req, res) => {
    const status = await matchmakingService.getQueueStatus(req.user.id);
    (0, response_js_1.sendSuccess)(res, status);
});
exports.matchmakingRouter.post('/challenge', async (req, res) => {
    const parsed = ChallengeSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid challenge data', parsed.error.flatten());
        return;
    }
    try {
        await matchmakingService.sendChallenge(req.user.id, parsed.data.teamId, parsed.data.opponentId);
        (0, response_js_1.sendSuccess)(res, { message: 'Challenge sent' }, 201);
    }
    catch (err) {
        if (err instanceof matchmakingService.ChallengeError) {
            response_js_1.Errors.validation(res, err.message);
            return;
        }
        if (err instanceof matchmakingService.TeamNotFoundError) {
            response_js_1.Errors.notFound(res, 'Team');
            return;
        }
        throw err;
    }
});
//# sourceMappingURL=matchmaking.js.map