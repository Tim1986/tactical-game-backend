"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
const logger_js_1 = require("../utils/logger.js");
const response_js_1 = require("../utils/response.js");
function errorHandler(err, req, res, 
// Express requires all 4 params even if next is unused
_next) {
    logger_js_1.logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
    response_js_1.Errors.internal(res);
}
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route not found: ${req.method} ${req.path}`,
        },
    });
}
//# sourceMappingURL=errorHandler.js.map