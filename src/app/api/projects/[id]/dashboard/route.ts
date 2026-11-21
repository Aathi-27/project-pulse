import { requireUser } from '@/lib/auth';
import { getDashboard } from '@/lib/services/dashboard';
import { ok, fail } from '@/lib/http';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return ok(await getDashboard(id, user.id));
  } catch (err) {
    return fail(err);
  }
}
