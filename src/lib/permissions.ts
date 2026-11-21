// Role-based access control, enforced on the server for every project request.
import { prisma } from './db';
import { ApiError } from './auth';
import type { ProjectMember } from '@prisma/client';

export async function getMembership(projectId: string, userId: string): Promise<ProjectMember | null> {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function requireMembership(projectId: string, userId: string): Promise<ProjectMember> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new ApiError(404, 'Project not found.');
  const membership = await getMembership(projectId, userId);
  // Outsiders get 404, not 403: do not reveal that the project exists.
  if (!membership) throw new ApiError(404, 'Project not found.');
  return membership;
}

export async function requireOwner(projectId: string, userId: string): Promise<ProjectMember> {
  const membership = await requireMembership(projectId, userId);
  if (membership.role !== 'OWNER') {
    throw new ApiError(403, 'Only the project owner can do that.');
  }
  return membership;
}

/** Task deletion: the project owner or the task's creator. */
export function canDeleteTask(membership: ProjectMember, taskCreatedById: string, userId: string): boolean {
  return membership.role === 'OWNER' || taskCreatedById === userId;
}
