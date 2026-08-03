"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../config/index.js");
const response_js_1 = require("../utils/response.js");
exports.versionRouter = (0, express_1.Router)();
// GET /version — public, no auth, no version middleware
// Returns the required app version (null if no gate is active) plus the build
// stamp of the running server, so you can confirm which commit is deployed.
exports.versionRouter.get('/', (_req, res) => {
    (0, response_js_1.sendSuccess)(res, {
        requiredVersion: index_js_1.config.game.requiredAppVersion ?? null,
        commit: index_js_1.config.build.commit,
        branch: index_js_1.config.build.branch,
        dirty: index_js_1.config.build.dirty,
        builtAt: index_js_1.config.build.builtAt,
    });
});
//# sourceMappingURL=version.js.map