"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
/**
 * Outbound email via the Resend HTTP API (https://resend.com).
 *
 * Configuration (env):
 *   RESEND_API_KEY — API key from the Resend dashboard. If unset, emails are
 *                    not sent; the message is logged instead (dev fallback so
 *                    the reset flow is fully testable without an account).
 *   EMAIL_FROM     — verified sender, e.g. "Dungeon Combat <noreply@yourdomain.com>".
 *                    Defaults to Resend's onboarding sender (works for testing,
 *                    but only delivers to the account owner's email).
 */
const logger_js_1 = require("../utils/logger.js");
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const EMAIL_FROM = process.env.EMAIL_FROM ?? 'Dungeon Combat <onboarding@resend.dev>';
async function sendEmail(to, subject, text) {
    if (!RESEND_API_KEY) {
        logger_js_1.logger.warn(`[email] RESEND_API_KEY not set — email NOT sent. To: ${to} | Subject: ${subject} | Body: ${text}`);
        return;
    }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Resend API error ${res.status}: ${body}`);
    }
}
async function sendPasswordResetEmail(to, code) {
    await sendEmail(to, 'Your Dungeon Combat password reset code', `Your password reset code is: ${code}\n\n` +
        'Enter this code in the app to choose a new password. ' +
        'The code expires in 15 minutes.\n\n' +
        "If you didn't request this, you can safely ignore this email — " +
        'your password has not been changed.');
}
//# sourceMappingURL=emailService.js.map