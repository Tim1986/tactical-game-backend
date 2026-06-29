"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
const index_js_1 = require("../config/index.js");
exports.logger = (0, pino_1.default)({
    level: index_js_1.config.isDevelopment ? 'debug' : 'info',
    transport: index_js_1.config.isDevelopment
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});
//# sourceMappingURL=logger.js.map