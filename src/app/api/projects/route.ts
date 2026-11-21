import { requireUser } from '@/lib/auth';
import { createProject, listProjects } from '@/lib/services/projects';
import { serializeProject } from '@/lib/serializers';
import { ok, fail } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listProjects(user.id));
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const project = await createProject(user.id, await req.json());
    return ok(serializeProject(project, 'OWNER'), 201);
  } catch (err) {
    return fail(err);
  }
}
