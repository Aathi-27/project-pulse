import { requireUser } from '@/lib/auth';
import { listActivities } from '@/lib/services/activities';
import { serializeActivity } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const taskId = new URL(req.url).searchParams.get('taskId') ?? undefined;
    const activities = await listActivities(id, user.id, taskId);
    return ok(activities.map(serializeActivity));
  } catch (err) {
    return fail(err);
  }
}
