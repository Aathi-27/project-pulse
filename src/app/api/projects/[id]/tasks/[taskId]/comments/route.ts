import { requireUser } from '@/lib/auth';
import { listComments, addComment } from '@/lib/services/tasks';
import { serializeComment } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';
import { broadcast } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string; taskId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, taskId } = await ctx.params;
    const comments = await listComments(id, taskId, user.id);
    return ok(comments.map(serializeComment));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id, taskId } = await ctx.params;
    const comment = await addComment(id, taskId, user.id, await req.json());
    broadcast(id, 'comment:added', serializeComment(comment));
    return ok(serializeComment(comment), 201);
  } catch (err) {
    return fail(err);
  }
}
