import { describe, it, expect, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { registerUser, verifyLogin } from '@/lib/services/users';
import { resetDb } from './helpers';

describe('authentication', () => {
  beforeEach(resetDb);

  it('registers with a bcrypt-hashed password, never plaintext', async () => {
    const user = await registerUser({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
    expect(user.passwordHash).not.toContain('password123');
    expect(await bcrypt.compare('password123', user.passwordHash)).toBe(true);
  });

  it('rejects a duplicate email', async () => {
    await registerUser({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
    await expect(registerUser({ name: 'Alice 2', email: 'alice@example.com', password: 'password123' }))
      .rejects.toMatchObject({ status: 409 });
  });

  it('rejects a short password at validation', async () => {
    await expect(registerUser({ name: 'A', email: 'a@example.com', password: 'short' })).rejects.toThrow();
  });

  it('logs in with correct credentials and rejects wrong ones with the same error', async () => {
    await registerUser({ name: 'Alice', email: 'alice@example.com', password: 'password123' });
    const ok = await verifyLogin({ email: 'alice@example.com', password: 'password123' });
    expect(ok.email).toBe('alice@example.com');
    await expect(verifyLogin({ email: 'alice@example.com', password: 'wrong-pass' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid email or password.' });
    await expect(verifyLogin({ email: 'ghost@example.com', password: 'password123' }))
      .rejects.toMatchObject({ status: 401, message: 'Invalid email or password.' });
  });
});
