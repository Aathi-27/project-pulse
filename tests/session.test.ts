import { describe, it, expect } from 'vitest';
import { signSessionToken, verifySessionToken } from '@/lib/session';

describe('session tokens', () => {
  it('round-trips a signed token', async () => {
    const token = await signSessionToken({ userId: 'u1', email: 'a@example.com' });
    const session = await verifySessionToken(token);
    expect(session?.userId).toBe('u1');
    expect(session?.email).toBe('a@example.com');
  });

  it('rejects a tampered token', async () => {
    const token = await signSessionToken({ userId: 'u1', email: 'a@example.com' });
    const tampered = token.slice(0, -2) + 'xx';
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifySessionToken('not-a-token')).toBeNull();
  });
});
