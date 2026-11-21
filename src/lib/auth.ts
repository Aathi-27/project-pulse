// Request-level auth helpers for API routes.
import { cookies } from 'next/headers';
import { prisma } from './db';
import { SESSION_COOKIE, verifySessionToken } from './session';
import type { User } from '@prisma/client';

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, 'You must be logged in.');
  return user;
}
