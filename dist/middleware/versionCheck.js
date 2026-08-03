"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAppVersion = requireAppVersion;
const index_js_1 = require("../config/index.js");
const response_js_1 = require("../utils/response.js");
function requireAppVersion(req, res, next) {
    const required = index_js_1.config.game.requiredAppVersion;
    if (!required) {
        next();
        return;
    }
    const clientVersion = req.headers['x-app-version'];
    if (!clientVersion || clientVersion !== required) {
        response_js_1.Errors.upgradeRequired(res, required);
        return;
    }
    next();
}
//# sourceMappingURL=versionCheck.js.map