import type { Task, User, Comment, Activity, Project, ProjectMember } from '@prisma/client';

export function serializeUser(u: User) {
  return { id: u.id, name: u.name, email: u.email };
}

export function serializeTask(t: Task & { assignee?: User | null; createdBy?: User }) {
  return {
    id: t.id,
    projectId: t.projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    position: t.position,
    assigneeId: t.assigneeId,
    assignee: t.assignee ? serializeUser(t.assignee) : null,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdById: t.createdById,
    createdBy: t.createdBy ? serializeUser(t.createdBy) : undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function serializeComment(c: Comment & { author?: User }) {
  return {
    id: c.id,
    taskId: c.taskId,
    text: c.text,
    author: c.author ? serializeUser(c.author) : undefined,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeActivity(a: Activity & { actor?: User }) {
  return {
    id: a.id,
    projectId: a.projectId,
    taskId: a.taskId,
    type: a.type,
    detail: a.detail,
    actor: a.actor ? serializeUser(a.actor) : undefined,
    createdAt: a.createdAt.toISOString(),
  };
}

export function serializeProject(p: Project, role?: string) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    ownerId: p.ownerId,
    role,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function serializeMember(m: ProjectMember & { user?: User }) {
  return {
    id: m.id,
    role: m.role,
    user: m.user ? serializeUser(m.user) : undefined,
    createdAt: m.createdAt.toISOString(),
  };
}
