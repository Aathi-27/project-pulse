import { prisma } from '../db';
import { requireMembership } from '../permissions';

export async function recordActivity(
  projectId: string,
  actorId: string,
  type: string,
  detail: string,
  taskId: string | null,
) {
  return prisma.activity.create({ data: { projectId, actorId, type, detail, taskId } });
}

export async function listActivities(projectId: string, userId: string, taskId?: string) {
  await requireMembership(projectId, userId);
  return prisma.activity.findMany({
    where: { projectId, ...(taskId ? { taskId } : {}) },
    include: { actor: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
