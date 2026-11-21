import { getSessionUser } from '@/lib/auth';
import { ok } from '@/lib/http';
import { serializeUser } from '@/lib/serializers';

export async function GET() {
  const user = await getSessionUser();
  return ok(user ? serializeUser(user) : null);
}
