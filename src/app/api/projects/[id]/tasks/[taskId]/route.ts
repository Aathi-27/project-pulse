import { requireUser } from '@/lib/auth';
import { updateTask, deleteTask } from '@/lib/services/tasks';
import { serializeTask } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';
import { broadcast } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, taskId } = await ctx.params;
    const task = await updateTask(id, taskId, user.id, await req.json());
    broadcast(id, 'task:updated', serializeTask(task));
    return ok(serializeTask(task));
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, taskId } = await ctx.params;
    const task = await deleteTask(id, taskId, user.id);
    broadcast(id, 'task:deleted', { id: taskId, title: task.title });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
