/**
 * Auth service tests.
 *
 * These test the pure logic of token issuance and verification
 * without hitting a real database.
 *
 * Integration tests (hitting the DB) would go in tests/integration/
 * and require a running Postgres instance — those are added in Phase 4.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------
// Mock dependencies before importing the service
// ---------------------------------------------------------------
vi.mock('../src/db/pool.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('../src/config/index.js', () => ({
  config: {
    jwt: {
      accessSecret: 'test-access-secret-long-enough-for-hs256-algorithm',
      refreshSecret: 'test-refresh-secret-long-enough-for-hs256-algorithm',
      accessExpiry: '15m',
      refreshExpiry: '30d',
    },
    isDevelopment: true,
  },
}));

import { issueTokenPair, verifyRefreshToken, AuthError } from '../src/services/authService.js';

describe('issueTokenPair', () => {
  it('returns access and refresh tokens', () => {
    const result = issueTokenPair({ id: 'user-123', username: 'testuser', tokenVersion: 0 });
    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });

  it('tokens are non-empty strings', () => {
    const result = issueTokenPair({ id: 'user-abc', username: 'alice', tokenVersion: 0 });
    expect(result.accessToken.length).toBeGreaterThan(10);
    expect(result.refreshToken.length).toBeGreaterThan(10);
  });
});

describe('verifyRefreshToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies a valid refresh token', () => {
    const { refreshToken } = issueTokenPair({ id: 'user-456', username: 'bob', tokenVersion: 2 });
    const payload = verifyRefreshToken(refreshToken);
    expect(payload.sub).toBe('user-456');
    expect(payload.tokenVersion).toBe(2);
  });

  it('throws on an invalid token', () => {
    expect(() => verifyRefreshToken('not-a-real-token')).toThrow();
  });

  it('throws on a token signed with wrong secret', () => {
    // Manually craft an invalid token
    const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.wrong-sig';
    expect(() => verifyRefreshToken(fakeToken)).toThrow();
  });
});

describe('AuthError', () => {
  it('has the correct name', () => {
    const err = new AuthError('test');
    expect(err.name).toBe('AuthError');
    expect(err.message).toBe('test');
  });
});
