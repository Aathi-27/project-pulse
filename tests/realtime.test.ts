import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeUserFromProjectRoom } from '@/lib/realtime';

afterEach(() => { globalThis.__io = undefined; });

describe('live membership revocation', () => {
  it('is safe when no socket server is running', () => {
    globalThis.__io = undefined;
    expect(() => removeUserFromProjectRoom('p1', 'u1')).not.toThrow();
  });

  it('notifies the removed user and evicts all their sockets from only this project', () => {
    const emit = vi.fn();
    const socketsLeave = vi.fn();
    const to = vi.fn(() => ({ emit }));
    const room = vi.fn(() => ({ socketsLeave }));
    globalThis.__io = { to, in: room } as unknown as NonNullable<typeof globalThis.__io>;
    removeUserFromProjectRoom('p1', 'u1');
    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('project:access-revoked', { projectId: 'p1' });
    expect(room).toHaveBeenCalledWith('user:u1');
    expect(socketsLeave).toHaveBeenCalledWith('project:p1');
  });
});
