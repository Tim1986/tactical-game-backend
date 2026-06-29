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
exports.unitRouter = void 0;
const express_1 = require("express");
const unitService = __importStar(require("../services/unitService.js"));
const userService = __importStar(require("../services/userService.js"));
const auth_js_1 = require("../middleware/auth.js");
const response_js_1 = require("../utils/response.js");
exports.unitRouter = (0, express_1.Router)();
exports.unitRouter.use(auth_js_1.requireAuth);
// ---------------------------------------------------------------
// GET /units
// Returns all unit definitions available to this player based on
// their current account level. Also returns the full ability
// definitions for those units so the client can render tooltips.
// ---------------------------------------------------------------
exports.unitRouter.get('/', async (req, res) => {
    const me = await userService.getMe(req.user.id);
    if (!me) {
        response_js_1.Errors.unauthorized(res);
        return;
    }
    const { units, abilities } = await unitService.getUnlockedUnits(me.accountLevel);
    (0, response_js_1.sendSuccess)(res, { units, abilities });
});
//# sourceMappingURL=units.js.map