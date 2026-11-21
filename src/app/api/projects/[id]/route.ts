import { requireUser } from '@/lib/auth';
import { getProject, updateProject, deleteProject } from '@/lib/services/projects';
import { serializeProject, serializeMember } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';
import { broadcast } from '@/lib/realtime';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const { project, role } = await getProject(id, user.id);
    return ok({
      ...serializeProject(project, role),
      members: project.members.map(serializeMember),
    });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    const project = await updateProject(id, user.id, await req.json());
    broadcast(id, 'project:updated', serializeProject(project));
    return ok(serializeProject(project));
  } catch (err) {
    return fail(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteProject(id, user.id);
    broadcast(id, 'project:deleted', { id });
    return ok({ deleted: true });
  } catch (err) {
    return fail(err);
  }
}
