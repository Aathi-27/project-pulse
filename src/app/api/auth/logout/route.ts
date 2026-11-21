import { ok } from '@/lib/http';
import { SESSION_COOKIE } from '@/lib/session';

export async function POST() {
  const res = ok({ loggedOut: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
