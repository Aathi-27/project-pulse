import { requireUser } from '@/lib/auth';
import { listTasks, createTask } from '@/lib/services/tasks';
import { serializeTask } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';
import { broadcast } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const tasks = await listTasks(id, user.id);
    return ok(tasks.map(serializeTask));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const task = await createTask(id, user.id, await req.json());
    broadcast(id, 'task:created', serializeTask(task));
    return ok(serializeTask(task), 201);
  } catch (err) {
    return fail(err);
  }
}
