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
exports.userRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const userService = __importStar(require("../services/userService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.userRouter = (0, express_1.Router)();
// All user routes require authentication
exports.userRouter.use(auth_js_1.requireAuth);
const UpdateMeSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores')
        .optional(),
});
// ---------------------------------------------------------------
// GET /users/me
// ---------------------------------------------------------------
exports.userRouter.get('/me', async (req, res) => {
    const user = await userService.getMe(req.user.id);
    if (!user) {
        response_js_1.Errors.notFound(res, 'User');
        return;
    }
    (0, response_js_1.sendSuccess)(res, user);
});
// ---------------------------------------------------------------
// PUT /users/me
// ---------------------------------------------------------------
exports.userRouter.put('/me', async (req, res) => {
    const parsed = UpdateMeSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid update data', parsed.error.flatten());
        return;
    }
    if (!parsed.data.username) {
        response_js_1.Errors.validation(res, 'At least one field must be provided');
        return;
    }
    try {
        await userService.updateUsername(req.user.id, parsed.data.username);
        const updated = await userService.getMe(req.user.id);
        (0, response_js_1.sendSuccess)(res, updated);
    }
    catch (err) {
        if (err instanceof userService.UsernameConflictError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        throw err;
    }
});
// ---------------------------------------------------------------
// GET /users/:id/profile  (public)
// ---------------------------------------------------------------
exports.userRouter.get('/:id/profile', async (req, res) => {
    const profile = await userService.getPublicProfile(req.params.id);
    if (!profile) {
        response_js_1.Errors.notFound(res, 'User');
        return;
    }
    (0, response_js_1.sendSuccess)(res, profile);
});
//# sourceMappingURL=users.js.map