import { prisma } from '../db';
import { ApiError } from '../auth';
import { taskCreateSchema, taskUpdateSchema, commentCreateSchema } from '../validation';
import { requireMembership, canDeleteTask } from '../permissions';
import { recordActivity } from './activities';
import { STATUS_LABELS, type TaskStatus } from '../constants';
import type { Task, User } from '@prisma/client';

type TaskWithUsers = Task & { assignee: User | null; createdBy: User };

const taskInclude = { assignee: true, createdBy: true } as const;

/** Next position at the end of a column; positions are floats so drag reorder
 *  can insert between two cards without renumbering the column. */
async function nextPosition(projectId: string, status: TaskStatus): Promise<number> {
  const last = await prisma.task.findFirst({
    where: { projectId, status },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return (last?.position ?? 0) + 1024;
}

async function assertAssigneeIsMember(projectId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return;
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: assigneeId } },
  });
  if (!membership) throw new ApiError(400, 'The assignee must be a project member.');
}

export async function listTasks(projectId: string, userId: string): Promise<TaskWithUsers[]> {
  await requireMembership(projectId, userId);
  return prisma.task.findMany({
    where: { projectId },
    include: taskInclude,
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
  });
}

export async function createTask(projectId: string, userId: string, input: unknown) {
  await requireMembership(projectId, userId);
  const data = taskCreateSchema.parse(input);
  await assertAssigneeIsMember(projectId, data.assigneeId);
  const position = await nextPosition(projectId, 'TODO');
  const task = await prisma.task.create({
    data: {
      projectId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigneeId: data.assigneeId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      createdById: userId,
      status: 'TODO',
      position,
    },
    include: taskInclude,
  });
  await recordActivity(projectId, userId, 'TASK_CREATED', `Created task "${task.title}"`, task.id);
  return task;
}

function describeChanges(
  before: TaskWithUsers,
  data: { title?: string; status?: string; priority?: string; assigneeId?: string | null; dueDate?: string | null },
  assigneeName?: string | null,
): string[] {
  const changes: string[] = [];
  if (data.title !== undefined && data.title !== before.title) changes.push(`renamed it to "${data.title}"`);
  if (data.status !== undefined && data.status !== before.status) {
    changes.push(`moved it from ${STATUS_LABELS[before.status as TaskStatus]} to ${STATUS_LABELS[data.status as TaskStatus]}`);
  }
  if (data.priority !== undefined && data.priority !== before.priority) {
    changes.push(`changed priority from ${before.priority} to ${data.priority}`);
  }
  if (data.assigneeId !== undefined && data.assigneeId !== before.assigneeId) {
    changes.push(data.assigneeId ? `assigned it to ${assigneeName ?? 'a member'}` : 'unassigned it');
  }
  if (data.dueDate !== undefined) {
    const beforeDate = before.dueDate ? before.dueDate.toISOString() : null;
    if (data.dueDate !== beforeDate) changes.push(data.dueDate ? 'set the due date' : 'cleared the due date');
  }
  return changes;
}

export async function updateTask(projectId: string, taskId: string, userId: string, input: unknown) {
  await requireMembership(projectId, userId);
  const data = taskUpdateSchema.parse(input);
  const before = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: taskInclude,
  });
  if (!before) throw new ApiError(404, 'Task not found.');
  await assertAssigneeIsMember(projectId, data.assigneeId);

  let assigneeName: string | null = null;
  if (data.assigneeId) {
    const u = await prisma.user.findUnique({ where: { id: data.assigneeId } });
    assigneeName = u?.name ?? null;
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
      ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
    },
    include: taskInclude,
  });

  const changes = describeChanges(before, data, assigneeName);
  const type = data.status !== undefined && data.status !== before.status ? 'TASK_MOVED' : 'TASK_UPDATED';
  if (changes.length > 0) {
    await recordActivity(projectId, userId, type, `Updated "${before.title}": ${changes.join(', ')}`, taskId);
  }
  return task;
}

export async function deleteTask(projectId: string, taskId: string, userId: string) {
  const membership = await requireMembership(projectId, userId);
  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw new ApiError(404, 'Task not found.');
  if (!canDeleteTask(membership, task.createdById, userId)) {
    throw new ApiError(403, 'Only the project owner or the task creator can delete this task.');
  }
  await prisma.task.delete({ where: { id: taskId } });
  await recordActivity(projectId, userId, 'TASK_DELETED', `Deleted task "${task.title}"`, null);
  return task;
}

export async function listComments(projectId: string, taskId: string, userId: string) {
  await requireMembership(projectId, userId);
  return prisma.comment.findMany({
    where: { taskId, task: { projectId } },
    include: { author: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addComment(projectId: string, taskId: string, userId: string, input: unknown) {
  await requireMembership(projectId, userId);
  const data = commentCreateSchema.parse(input);
  const task = await prisma.task.findFirst({ where: { id: taskId, projectId } });
  if (!task) throw new ApiError(404, 'Task not found.');
  const comment = await prisma.comment.create({
    data: { taskId, authorId: userId, text: data.text },
    include: { author: true },
  });
  await recordActivity(projectId, userId, 'COMMENT_ADDED', `Commented on "${task.title}"`, taskId);
  return comment;
}
