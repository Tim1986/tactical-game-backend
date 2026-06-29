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
exports.teamRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const teamService = __importStar(require("../services/teamService.js"));
const userService = __importStar(require("../services/userService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.teamRouter = (0, express_1.Router)();
exports.teamRouter.use(auth_js_1.requireAuth);
// ---------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------
const PlacementSchema = zod_1.z.array(zod_1.z.object({ x: zod_1.z.number().int().min(0).max(3), y: zod_1.z.number().int().min(0).max(7) })).length(4).optional();
const CreateTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(40),
    unitIds: zod_1.z.array(zod_1.z.string().uuid()).length(4, 'Team must have exactly 4 units'),
    placement: PlacementSchema,
});
const UpdateTeamSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(40).optional(),
    unitIds: zod_1.z.array(zod_1.z.string().uuid()).length(4).optional(),
    placement: PlacementSchema,
});
// Helper to get account level for the current user
async function getAccountLevel(userId) {
    const me = await userService.getMe(userId);
    return me?.accountLevel ?? 1;
}
// ---------------------------------------------------------------
// GET /teams
// ---------------------------------------------------------------
exports.teamRouter.get('/', async (req, res) => {
    const teams = await teamService.getUserTeams(req.user.id);
    (0, response_js_1.sendSuccess)(res, { teams });
});
// ---------------------------------------------------------------
// POST /teams
// ---------------------------------------------------------------
exports.teamRouter.post('/', async (req, res) => {
    const parsed = CreateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid team data', parsed.error.flatten());
        return;
    }
    const accountLevel = await getAccountLevel(req.user.id);
    try {
        const team = await teamService.createTeam({
            ...parsed.data,
            userId: req.user.id,
            accountLevel,
        });
        (0, response_js_1.sendSuccess)(res, { team }, 201);
    }
    catch (err) {
        if (err instanceof teamService.TeamValidationError) {
            response_js_1.Errors.validation(res, err.message);
            return;
        }
        throw err;
    }
});
// ---------------------------------------------------------------
// PUT /teams/:id
// ---------------------------------------------------------------
exports.teamRouter.put('/:id', async (req, res) => {
    const parsed = UpdateTeamSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid team data', parsed.error.flatten());
        return;
    }
    const accountLevel = await getAccountLevel(req.user.id);
    try {
        const team = await teamService.updateTeam({
            teamId: req.params.id,
            userId: req.user.id,
            accountLevel,
            ...parsed.data,
        });
        (0, response_js_1.sendSuccess)(res, { team });
    }
    catch (err) {
        if (err instanceof teamService.TeamNotFoundError) {
            response_js_1.Errors.notFound(res, 'Team');
            return;
        }
        if (err instanceof teamService.TeamValidationError) {
            response_js_1.Errors.validation(res, err.message);
            return;
        }
        throw err;
    }
});
// ---------------------------------------------------------------
// DELETE /teams/:id
// ---------------------------------------------------------------
exports.teamRouter.delete('/:id', async (req, res) => {
    try {
        await teamService.deleteTeam(req.params.id, req.user.id);
        (0, response_js_1.sendSuccess)(res, { message: 'Team deleted' });
    }
    catch (err) {
        if (err instanceof teamService.TeamNotFoundError) {
            response_js_1.Errors.notFound(res, 'Team');
            return;
        }
        throw err;
    }
});
//# sourceMappingURL=teams.js.map