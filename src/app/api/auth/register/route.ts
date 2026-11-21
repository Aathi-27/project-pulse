import { registerUser } from '@/lib/services/users';
import { signSessionToken, sessionCookieAttributes, SESSION_COOKIE } from '@/lib/session';
import { ok, fail } from '@/lib/http';
import { serializeUser } from '@/lib/serializers';

export async function POST(req: Request) {
  try {
    const user = await registerUser(await req.json());
    const token = await signSessionToken({ userId: user.id, email: user.email });
    const res = ok(serializeUser(user), 201);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieAttributes());
    return res;
  } catch (err) {
    return fail(err);
  }
}
