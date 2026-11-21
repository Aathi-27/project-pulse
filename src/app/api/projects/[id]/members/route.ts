import { requireUser } from '@/lib/auth';
import { getProject, addMember } from '@/lib/services/projects';
import { serializeMember } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';
import { broadcast } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { project } = await getProject(id, user.id);
    return ok(project.members.map(serializeMember));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const member = await addMember(id, user.id, await req.json());
    broadcast(id, 'member:added', serializeMember(member));
    return ok(serializeMember(member), 201);
  } catch (err) {
    return fail(err);
  }
}
