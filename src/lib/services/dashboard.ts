import { prisma } from '../db';
import { requireMembership } from '../permissions';

export interface DashboardStats {
  totalTasks: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  byPriority: { LOW: number; MEDIUM: number; HIGH: number };
  completed: number;
  completionPct: number;
  overdue: number;
  perMember: { userId: string; name: string; assigned: number; done: number }[];
}

/** Pure calculation, separated so it is directly unit-testable. */
export function computeStats(
  tasks: { status: string; priority: string; dueDate: Date | null; assigneeId: string | null }[],
  members: { userId: string; name: string }[],
  now: Date,
): DashboardStats {
  const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  let overdue = 0;
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status as keyof typeof byStatus] += 1;
    if (t.priority in byPriority) byPriority[t.priority as keyof typeof byPriority] += 1;
    if (t.dueDate && t.dueDate < now && t.status !== 'DONE') overdue += 1;
  }
  const completed = byStatus.DONE;
  const total = tasks.length;
  const perMember = members.map((m) => {
    const mine = tasks.filter((t) => t.assigneeId === m.userId);
    return {
      userId: m.userId,
      name: m.name,
      assigned: mine.length,
      done: mine.filter((t) => t.status === 'DONE').length,
    };
  });
  return {
    totalTasks: total,
    byStatus,
    byPriority,
    completed,
    completionPct: total === 0 ? 0 : Math.round((completed / total) * 100),
    overdue,
    perMember,
  };
}

export async function getDashboard(projectId: string, userId: string): Promise<DashboardStats> {
  await requireMembership(projectId, userId);
  const [tasks, members] = await Promise.all([
    prisma.task.findMany({
      where: { projectId },
      select: { status: true, priority: true, dueDate: true, assigneeId: true },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);
  return computeStats(
    tasks,
    members.map((m) => ({ userId: m.user.id, name: m.user.name })),
    new Date(),
  );
}

export interface UserOverview {
  totalProjects: number;
  totalTasks: number;
  byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  completed: number;
  completionPct: number;
  overdue: number;
}

/** Aggregate across every project the user owns or belongs to. */
export async function getUserOverview(userId: string): Promise<UserOverview> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = memberships.map((m) => m.projectId);
  const tasks = await prisma.task.findMany({
    where: { projectId: { in: projectIds } },
    select: { status: true, dueDate: true },
  });
  const now = new Date();
  const byStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  let overdue = 0;
  for (const t of tasks) {
    if (t.status in byStatus) byStatus[t.status as keyof typeof byStatus] += 1;
    if (t.dueDate && t.dueDate < now && t.status !== 'DONE') overdue += 1;
  }
  const total = tasks.length;
  return {
    totalProjects: projectIds.length,
    totalTasks: total,
    byStatus,
    completed: byStatus.DONE,
    completionPct: total === 0 ? 0 : Math.round((byStatus.DONE / total) * 100),
    overdue,
  };
}
