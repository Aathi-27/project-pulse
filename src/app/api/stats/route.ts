import { requireUser } from '@/lib/auth';
import { getUserOverview } from '@/lib/services/dashboard';
import { ok, fail } from '@/lib/http';

export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getUserOverview(user.id));
  } catch (err) {
    return fail(err);
  }
}
