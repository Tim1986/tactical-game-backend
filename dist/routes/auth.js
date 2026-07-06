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
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const authService = __importStar(require("../services/authService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.authRouter = (0, express_1.Router)();
// ---------------------------------------------------------------
// Input schemas (Zod validates all incoming data)
// ---------------------------------------------------------------
const RegisterSchema = zod_1.z.object({
    username: zod_1.z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain letters, numbers, and underscores'),
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be at most 128 characters'),
});
const LoginSchema = zod_1.z.object({
    usernameOrEmail: zod_1.z.string().min(1, 'Username or email is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const RefreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
const PushTokenSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    platform: zod_1.z.enum(['ios', 'android']),
});
// ---------------------------------------------------------------
// POST /auth/register
// ---------------------------------------------------------------
exports.authRouter.post('/register', async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid registration data', parsed.error.flatten());
        return;
    }
    try {
        const result = await authService.register(parsed.data);
        (0, response_js_1.sendSuccess)(res, result, 201);
    }
    catch (err) {
        if (err instanceof authService.ConflictError) {
            response_js_1.Errors.conflict(res, err.message);
            return;
        }
        throw err;
    }
});
// ---------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------
exports.authRouter.post('/login', async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid login data', parsed.error.flatten());
        return;
    }
    try {
        const result = await authService.login(parsed.data);
        (0, response_js_1.sendSuccess)(res, result);
    }
    catch (err) {
        if (err instanceof authService.AuthError) {
            (0, response_js_1.sendError)(res, 401, 'INVALID_CREDENTIALS', err.message);
            return;
        }
        throw err;
    }
});
// ---------------------------------------------------------------
// POST /auth/refresh
// ---------------------------------------------------------------
exports.authRouter.post('/refresh', async (req, res) => {
    const parsed = RefreshSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Refresh token is required');
        return;
    }
    try {
        const tokens = await authService.refresh(parsed.data.refreshToken);
        (0, response_js_1.sendSuccess)(res, { tokens });
    }
    catch (err) {
        if (err instanceof authService.AuthError) {
            response_js_1.Errors.unauthorized(res);
            return;
        }
        throw err;
    }
});
// ---------------------------------------------------------------
// POST /auth/logout  (single device)
// ---------------------------------------------------------------
exports.authRouter.post('/logout', auth_js_1.requireAuth, async (req, res) => {
    // Access token is short-lived; client must discard both tokens.
    // Server-side we just acknowledge.
    await authService.logout(req.user.id);
    (0, response_js_1.sendSuccess)(res, { message: 'Logged out' });
});
// ---------------------------------------------------------------
// POST /auth/logout-all  (invalidates all refresh tokens)
// ---------------------------------------------------------------
exports.authRouter.post('/logout-all', auth_js_1.requireAuth, async (req, res) => {
    await authService.logoutAll(req.user.id);
    (0, response_js_1.sendSuccess)(res, { message: 'Logged out from all devices' });
});
// ---------------------------------------------------------------
// POST /auth/push-token  (register device push token)
// ---------------------------------------------------------------
exports.authRouter.post('/push-token', auth_js_1.requireAuth, async (req, res) => {
    const parsed = PushTokenSchema.safeParse(req.body);
    if (!parsed.success) {
        response_js_1.Errors.validation(res, 'Invalid push token data', parsed.error.flatten());
        return;
    }
    await authService.savePushToken(req.user.id, parsed.data.token, parsed.data.platform);
    (0, response_js_1.sendSuccess)(res, { message: 'Push token registered' });
});
//# sourceMappingURL=auth.js.map