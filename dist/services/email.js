"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmailEnabled = isEmailEnabled;
exports.sendEmail = sendEmail;
exports.sendSupportMessage = sendSupportMessage;
const index_js_1 = require("../config/index.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Minimal Resend integration over its REST API (no SDK dependency — Node's global
 * fetch is used). If no RESEND_API_KEY is configured, sending is treated as disabled
 * and callers get `{ ok: false, disabled: true }` so they can degrade gracefully.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
function isEmailEnabled() {
    return index_js_1.config.email.resendApiKey.length > 0;
}
async function sendEmail(input) {
    if (!isEmailEnabled()) {
        logger_js_1.logger.warn('sendEmail called but RESEND_API_KEY is not configured — skipping send');
        return { ok: false, disabled: true };
    }
    try {
        const res = await fetch(RESEND_ENDPOINT, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${index_js_1.config.email.resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: index_js_1.config.email.fromAddress,
                to: [input.to],
                subject: input.subject,
                html: input.html,
                ...(input.text ? { text: input.text } : {}),
                ...(input.replyTo ? { reply_to: input.replyTo } : {}),
            }),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            logger_js_1.logger.error({ status: res.status, body }, 'Resend API returned an error');
            return { ok: false, error: `Resend responded ${res.status}` };
        }
        const data = (await res.json().catch(() => ({})));
        return { ok: true, id: data.id };
    }
    catch (err) {
        logger_js_1.logger.error({ err }, 'Failed to reach Resend API');
        return { ok: false, error: 'network_error' };
    }
}
/** Escape user-supplied text before embedding it in the notification HTML. */
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
/** Deliver a support-form submission to the support inbox. */
async function sendSupportMessage(msg) {
    const safeName = escapeHtml(msg.name);
    const safeEmail = escapeHtml(msg.email);
    const safeTopic = escapeHtml(msg.topic);
    const safeMessage = escapeHtml(msg.message).replace(/\n/g, '<br>');
    const html = `
    <div style="font-family: Georgia, serif; color: #2e2013;">
      <h2 style="font-family: 'Cinzel', Georgia, serif;">New support message</h2>
      <p><strong>Topic:</strong> ${safeTopic}</p>
      <p><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
      <hr style="border:none;border-top:1px solid #cdbb8a;" />
      <p>${safeMessage}</p>
    </div>`;
    const text = `New support message
Topic: ${msg.topic}
From: ${msg.name} <${msg.email}>

${msg.message}`;
    return sendEmail({
        to: index_js_1.config.email.supportInbox,
        subject: `[Support] ${msg.topic} — ${msg.name}`,
        html,
        text,
        replyTo: msg.email,
    });
}
//# sourceMappingURL=email.js.map