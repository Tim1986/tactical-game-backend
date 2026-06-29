"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const response_js_1 = require("../utils/response.js");
/**
 * requireAuth middleware
 *
 * Verifies the Authorization: Bearer <token> header.
 * On success, sets req.user = { id, username }.
 * On failure, returns 401.
 */
function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        response_js_1.Errors.unauthorized(res);
        return;
    }
    const token = header.slice(7); // Remove "Bearer "
    try {
        const payload = jsonwebtoken_1.default.verify(token, index_js_1.config.jwt.accessSecret);
        req.user = {
            id: payload.sub,
            username: payload.username,
        };
        next();
    }
    catch (err) {
        if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
            response_js_1.Errors.unauthorized(res);
            return;
        }
        response_js_1.Errors.unauthorized(res);
    }
}
//# sourceMappingURL=auth.js.map