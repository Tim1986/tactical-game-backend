"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPAIGNS = void 0;
const lantern_js_1 = require("./lantern.js");
const goblinopolis_js_1 = require("./goblinopolis.js");
const moonberry_js_1 = require("./moonberry.js");
const sealeddeep_js_1 = require("./sealeddeep.js");
exports.CAMPAIGNS = {
    [lantern_js_1.lanternCampaign.slug]: lantern_js_1.lanternCampaign,
    [goblinopolis_js_1.goblinopolisCampaign.slug]: goblinopolis_js_1.goblinopolisCampaign,
    [moonberry_js_1.moonberryCampaign.slug]: moonberry_js_1.moonberryCampaign,
    [sealeddeep_js_1.sealedDeepCampaign.slug]: sealeddeep_js_1.sealedDeepCampaign,
};
//# sourceMappingURL=index.js.map