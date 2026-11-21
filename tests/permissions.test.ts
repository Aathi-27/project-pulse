import { describe, it, expect, beforeEach } from 'vitest';
import { requireMembership, requireOwner, canDeleteTask } from '@/lib/permissions';
import { addMember } from '@/lib/services/projects';
import { resetDb, makeUser, makeProject } from './helpers';

describe('project membership authorization', () => {
  beforeEach(resetDb);

  it('makes the creator the project owner', async () => {
    const alice = await makeUser('Alice', 'alice@example.com');
    const project = await makeProject(alice.id);
    const membership = await requireMembership(project.id, alice.id);
    expect(membership.role).toBe('OWNER');
  });

  it('blocks outsiders with 404 so the project is not revealed', async () => {
    const alice = await makeUser('Alice', 'alice@example.com');
    const bob = await makeUser('Bob', 'bob@example.com');
    const project = await makeProject(alice.id);
    await expect(requireMembership(project.id, bob.id)).rejects.toMatchObject({ status: 404 });
  });

  it('lets an added member in but keeps them out of owner actions', async () => {
    const alice = await makeUser('Alice', 'alice@example.com');
    const bob = await makeUser('Bob', 'bob@example.com');
    const project = await makeProject(alice.id);
    await addMember(project.id, alice.id, { email: 'bob@example.com' });
    const membership = await requireMembership(project.id, bob.id);
    expect(membership.role).toBe('MEMBER');
    await expect(requireOwner(project.id, bob.id)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects adding an unregistered email', async () => {
    const alice = await makeUser('Alice', 'alice@example.com');
    const project = await makeProject(alice.id);
    await expect(addMember(project.id, alice.id, { email: 'nobody@example.com' }))
      .rejects.toMatchObject({ status: 404 });
  });

  it('rejects adding the same user twice', async () => {
    const alice = await makeUser('Alice', 'alice@example.com');
    await makeUser('Bob', 'bob@example.com');
    const project = await makeProject(alice.id);
    await addMember(project.id, alice.id, { email: 'bob@example.com' });
    await expect(addMember(project.id, alice.id, { email: 'bob@example.com' }))
      .rejects.toMatchObject({ status: 409 });
  });

  it('task deletion is limited to the owner or the creator', async () => {
    const ownerMembership = { role: 'OWNER' } as never;
    const memberMembership = { role: 'MEMBER' } as never;
    expect(canDeleteTask(ownerMembership, 'someone-else', 'me')).toBe(true);
    expect(canDeleteTask(memberMembership, 'me', 'me')).toBe(true);
    expect(canDeleteTask(memberMembership, 'someone-else', 'me')).toBe(false);
  });
});
