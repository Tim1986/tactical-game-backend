/**
 * Password-reset email.
 *
 * This module used to carry its OWN copy of the Resend integration, and the
 * copy had drifted from the real one in `email.ts` in two ways that between
 * them broke the reset flow in production:
 *
 *   1. It read the sender from `EMAIL_FROM`; every other part of the app (and
 *      therefore the deploy's env) uses `MAIL_FROM`. So reset mail fell back to
 *      Resend's shared `onboarding@resend.dev`, which only delivers to the
 *      Resend account owner — a tester's code could never arrive.
 *   2. Its fetch had no timeout and it THREW on failure, with no catch in the
 *      route. A slow or unreachable Resend therefore held the HTTP request open
 *      past the app's own 15s abort, and the user saw "Can't reach the server —
 *      check your connection" (client.ts NETWORK_ERROR) even though the request
 *      had arrived and the code had already been stored.
 *
 * Both are gone: delivery goes through the single integration in `email.ts`
 * (correct env vars, bounded, returns instead of throwing).
 */
import { sendEmail } from './email.js';
import { logger } from '../utils/logger.js';

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const text =
    `Your password reset code is: ${code}\n\n` +
    'Enter this code in the app to choose a new password. ' +
    'The code expires in 15 minutes.\n\n' +
    "If you didn't request this, you can safely ignore this email — " +
    'your password has not been changed.';

  const html = `
    <div style="font-family: Georgia, serif; color: #2e2013;">
      <h2 style="font-family: 'Cinzel', Georgia, serif;">Password reset</h2>
      <p>Your password reset code is:</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold;">${code}</p>
      <p>Enter it in the app to choose a new password. The code expires in 15 minutes.</p>
      <hr style="border:none;border-top:1px solid #cdbb8a;" />
      <p style="font-size: 13px;">If you didn't request this, you can ignore this email —
      your password has not been changed.</p>
    </div>`;

  const result = await sendEmail({
    to,
    subject: 'Your Dungeon Combat password reset code',
    html,
    text,
  });

  // Never thrown to the caller: /auth/forgot-password answers 200 for every
  // address by design, so a delivery failure must not become a 500 (that
  // difference is itself an account-existence oracle). Log loudly instead —
  // "reset code stored but not delivered" is the line to grep for in Railway.
  if (!result.ok) {
    logger.error(
      { disabled: result.disabled, error: result.error },
      'Password reset code was stored but the email could NOT be delivered',
    );
  }
}
