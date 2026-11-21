import { describe, it, expect, beforeEach } from 'vitest';
import { createTask, updateTask, deleteTask, addComment, listTasks } from '@/lib/services/tasks';
import { addMember } from '@/lib/services/projects';
import { listActivities } from '@/lib/services/activities';
import { resetDb, makeUser, makeProject } from './helpers';

describe('task management', () => {
  let alice: { id: string }, bob: { id: string }, project: { id: string };

  beforeEach(async () => {
    await resetDb();
    alice = await makeUser('Alice', 'alice@example.com');
    bob = await makeUser('Bob', 'bob@example.com');
    project = await makeProject(alice.id);
    await addMember(project.id, alice.id, { email: 'bob@example.com' });
  });

  it('creates a task in To Do with defaults', async () => {
    const task = await createTask(project.id, alice.id, { title: 'Develop Landing Page' });
    expect(task.status).toBe('TODO');
    expect(task.priority).toBe('MEDIUM');
    expect(task.createdById).toBe(alice.id);
    expect(task.createdAt).toBeTruthy();
    expect(task.updatedAt).toBeTruthy();
  });

  it('requires a title', async () => {
    await expect(createTask(project.id, alice.id, { title: '  ' })).rejects.toThrow();
  });

  it('rejects assigning to a non-member', async () => {
    const carol = await makeUser('Carol', 'carol@example.com');
    await expect(createTask(project.id, alice.id, { title: 'X', assigneeId: carol.id }))
      .rejects.toMatchObject({ status: 400 });
  });

  it('persists a drag-and-drop status change and records activity', async () => {
    const task = await createTask(project.id, alice.id, { title: 'Develop Landing Page', assigneeId: bob.id, priority: 'HIGH' });
    const moved = await updateTask(project.id, task.id, alice.id, { status: 'IN_PROGRESS', position: 512 });
    expect(moved.status).toBe('IN_PROGRESS');

    // State survives a fresh read (what a page refresh does).
    const reread = await listTasks(project.id, bob.id);
    expect(reread.find((t) => t.id === task.id)?.status).toBe('IN_PROGRESS');

    const activity = await listActivities(project.id, alice.id, task.id);
    const moveEntry = activity.find((a) => a.type === 'TASK_MOVED');
    expect(moveEntry?.detail).toContain('To Do');
    expect(moveEntry?.detail).toContain('In Progress');
  });

  it('lets a member drag a task to Done, like Bob in the scenario', async () => {
    const task = await createTask(project.id, alice.id, { title: 'Develop Landing Page', assigneeId: bob.id });
    const done = await updateTask(project.id, task.id, bob.id, { status: 'DONE' });
    expect(done.status).toBe('DONE');
  });

  it('blocks outsiders from creating or listing tasks', async () => {
    const carol = await makeUser('Carol', 'carol@example.com');
    await expect(createTask(project.id, carol.id, { title: 'Sneaky' })).rejects.toMatchObject({ status: 404 });
    await expect(listTasks(project.id, carol.id)).rejects.toMatchObject({ status: 404 });
  });

  it('restricts deletion: member-creator yes, other member no, owner yes', async () => {
    const aliceTask = await createTask(project.id, alice.id, { title: 'Alice task' });
    await expect(deleteTask(project.id, aliceTask.id, bob.id)).rejects.toMatchObject({ status: 403 });
    const bobTask = await createTask(project.id, bob.id, { title: 'Bob task' });
    await expect(deleteTask(project.id, bobTask.id, bob.id)).resolves.toBeTruthy();
    await expect(deleteTask(project.id, aliceTask.id, alice.id)).resolves.toBeTruthy();
  });

  it('records comments with author and logs activity', async () => {
    const task = await createTask(project.id, alice.id, { title: 'Develop Landing Page' });
    const comment = await addComment(project.id, task.id, bob.id, { text: 'On it.' });
    expect(comment.author?.id).toBe(bob.id);
    const activity = await listActivities(project.id, alice.id, task.id);
    expect(activity.some((a) => a.type === 'COMMENT_ADDED')).toBe(true);
  });

  it('orders tasks within a column by position', async () => {
    const a = await createTask(project.id, alice.id, { title: 'A' });
    const b = await createTask(project.id, alice.id, { title: 'B' });
    // Drag B above A.
    await updateTask(project.id, b.id, alice.id, { position: a.position - 1024 });
    const tasks = await listTasks(project.id, alice.id);
    const titles = tasks.filter((t) => t.status === 'TODO').map((t) => t.title);
    expect(titles).toEqual(['B', 'A']);
  });
});
