"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = void 0;
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function sendSuccess(res, data, statusCode = 200) {
    const body = { success: true, data };
    res.status(statusCode).json(body);
}
function sendError(res, statusCode, code, message, details) {
    const body = {
        success: false,
        error: { code, message, ...(details !== undefined && { details }) },
    };
    res.status(statusCode).json(body);
}
// Common error shortcuts
exports.Errors = {
    unauthorized: (res) => sendError(res, 401, 'UNAUTHORIZED', 'Authentication required'),
    forbidden: (res) => sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action'),
    notFound: (res, resource = 'Resource') => sendError(res, 404, 'NOT_FOUND', `${resource} not found`),
    conflict: (res, message) => sendError(res, 409, 'CONFLICT', message),
    validation: (res, message, details) => sendError(res, 422, 'VALIDATION_ERROR', message, details),
    internal: (res) => sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
};
//# sourceMappingURL=response.js.map