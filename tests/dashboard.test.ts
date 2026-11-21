import { describe, it, expect } from 'vitest';
import { computeStats } from '@/lib/services/dashboard';

const members = [
  { userId: 'u1', name: 'Alice' },
  { userId: 'u2', name: 'Bob' },
];

describe('dashboard calculations', () => {
  it('computes totals, status counts and completion percentage', () => {
    const stats = computeStats([
      { status: 'TODO', priority: 'LOW', dueDate: null, assigneeId: 'u1' },
      { status: 'IN_PROGRESS', priority: 'HIGH', dueDate: null, assigneeId: 'u2' },
      { status: 'DONE', priority: 'MEDIUM', dueDate: null, assigneeId: 'u1' },
      { status: 'DONE', priority: 'HIGH', dueDate: null, assigneeId: 'u2' },
    ], members, new Date('2026-11-21T00:00:00Z'));
    expect(stats.totalTasks).toBe(4);
    expect(stats.byStatus).toEqual({ TODO: 1, IN_PROGRESS: 1, DONE: 2 });
    expect(stats.completed).toBe(2);
    expect(stats.completionPct).toBe(50);
  });

  it('counts overdue tasks but never done ones', () => {
    const past = new Date('2026-11-01T00:00:00Z');
    const future = new Date('2026-12-01T00:00:00Z');
    const stats = computeStats([
      { status: 'TODO', priority: 'LOW', dueDate: past, assigneeId: null },
      { status: 'DONE', priority: 'LOW', dueDate: past, assigneeId: null },
      { status: 'IN_PROGRESS', priority: 'LOW', dueDate: future, assigneeId: null },
    ], members, new Date('2026-11-21T00:00:00Z'));
    expect(stats.overdue).toBe(1);
  });

  it('handles an empty project without dividing by zero', () => {
    const stats = computeStats([], members, new Date());
    expect(stats.totalTasks).toBe(0);
    expect(stats.completionPct).toBe(0);
    expect(stats.overdue).toBe(0);
  });

  it('reports per-member workload', () => {
    const stats = computeStats([
      { status: 'DONE', priority: 'LOW', dueDate: null, assigneeId: 'u1' },
      { status: 'TODO', priority: 'LOW', dueDate: null, assigneeId: 'u1' },
      { status: 'TODO', priority: 'LOW', dueDate: null, assigneeId: 'u2' },
    ], members, new Date());
    const alice = stats.perMember.find((m) => m.name === 'Alice');
    const bob = stats.perMember.find((m) => m.name === 'Bob');
    expect(alice).toMatchObject({ assigned: 2, done: 1 });
    expect(bob).toMatchObject({ assigned: 1, done: 0 });
  });
});
