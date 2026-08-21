/**
 * The reset mailer must never throw.
 *
 * /auth/forgot-password answers 200 for every address on purpose (it must not
 * reveal whether an account exists). The mailer used to throw on any Resend
 * failure with no catch in the route, so a real account produced a 500 while an
 * unknown one produced a fast 200 — an enumeration oracle, and the reason a
 * tester saw a connection error on a request the server had actually received.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/email.js', () => ({ sendEmail: vi.fn() }));

import { sendEmail } from '../src/services/email.js';
import { sendPasswordResetEmail } from '../src/services/emailService.js';

const mockSend = vi.mocked(sendEmail);

describe('sendPasswordResetEmail', () => {
  beforeEach(() => mockSend.mockReset());

  it('resolves when Resend reports an error', async () => {
    mockSend.mockResolvedValue({ ok: false, error: 'Resend responded 403' });
    await expect(sendPasswordResetEmail('a@b.test', '123456')).resolves.toBeUndefined();
  });

  it('resolves when email is not configured at all', async () => {
    mockSend.mockResolvedValue({ ok: false, disabled: true });
    await expect(sendPasswordResetEmail('a@b.test', '123456')).resolves.toBeUndefined();
  });

  it('puts the code in both the text and html bodies', async () => {
    mockSend.mockResolvedValue({ ok: true, id: 'e1' });
    await sendPasswordResetEmail('a@b.test', '654321');
    const arg = mockSend.mock.calls[0][0];
    expect(arg.to).toBe('a@b.test');
    expect(arg.text).toContain('654321');
    expect(arg.html).toContain('654321');
  });

  it('does not set its own sender — delivery uses the configured MAIL_FROM', async () => {
    mockSend.mockResolvedValue({ ok: true, id: 'e1' });
    await sendPasswordResetEmail('a@b.test', '111111');
    expect(mockSend.mock.calls[0][0]).not.toHaveProperty('from');
  });
});
