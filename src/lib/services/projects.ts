import { prisma } from '../db';
import { ApiError } from '../auth';
import { projectCreateSchema, projectUpdateSchema, memberAddSchema } from '../validation';
import { requireMembership, requireOwner } from '../permissions';
import { recordActivity } from './activities';

export async function createProject(userId: string, input: unknown) {
  const data = projectCreateSchema.parse(input);
  return prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      ownerId: userId,
      members: { create: { userId, role: 'OWNER' } },
    },
  });
}

export async function listProjects(userId: string) {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    include: {
      project: {
        include: {
          _count: { select: { tasks: true, members: true } },
          tasks: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return memberships.map((m) => {
    const total = m.project.tasks.length;
    const done = m.project.tasks.filter((t) => t.status === 'DONE').length;
    return {
      id: m.project.id,
      name: m.project.name,
      description: m.project.description,
      role: m.role,
      memberCount: m.project._count.members,
      taskCount: total,
      doneCount: done,
      completion: total === 0 ? 0 : Math.round((done / total) * 100),
      updatedAt: m.project.updatedAt.toISOString(),
    };
  });
}

export async function getProject(projectId: string, userId: string) {
  const membership = await requireMembership(projectId, userId);
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { include: { user: true }, orderBy: { createdAt: 'asc' } } },
  });
  return { project, role: membership.role };
}

export async function updateProject(projectId: string, userId: string, input: unknown) {
  await requireOwner(projectId, userId);
  const data = projectUpdateSchema.parse(input);
  const project = await prisma.project.update({ where: { id: projectId }, data });
  await recordActivity(projectId, userId, 'PROJECT_UPDATED', `Updated project details`, null);
  return project;
}

export async function deleteProject(projectId: string, userId: string) {
  await requireOwner(projectId, userId);
  await prisma.project.delete({ where: { id: projectId } });
}

export async function addMember(projectId: string, actorId: string, input: unknown) {
  await requireOwner(projectId, actorId);
  const data = memberAddSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(404, 'No registered user with that email.');
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (existing) throw new ApiError(409, 'That user is already a member.');
  const member = await prisma.projectMember.create({
    data: { projectId, userId: user.id, role: 'MEMBER' },
    include: { user: true },
  });
  await recordActivity(projectId, actorId, 'MEMBER_ADDED', `Added ${user.name} to the project`, null);
  return member;
}

export async function removeMember(projectId: string, actorId: string, memberId: string) {
  await requireOwner(projectId, actorId);
  const member = await prisma.projectMember.findUnique({
    where: { id: memberId },
    include: { user: true },
  });
  if (!member || member.projectId !== projectId) throw new ApiError(404, 'Member not found.');
  if (member.role === 'OWNER') throw new ApiError(400, 'The project owner cannot be removed.');
  await prisma.projectMember.delete({ where: { id: memberId } });
  // Unassign their tasks in this project so nothing points at a non-member.
  await prisma.task.updateMany({
    where: { projectId, assigneeId: member.userId },
    data: { assigneeId: null },
  });
  await recordActivity(projectId, actorId, 'MEMBER_REMOVED', `Removed ${member.user.name} from the project`, null);
  return member;
}
