import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { ApiError } from '../auth';
import { registerSchema, loginSchema } from '../validation';

export async function registerUser(input: unknown) {
  const data = registerSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');
  const passwordHash = await bcrypt.hash(data.password, 10);
  return prisma.user.create({ data: { name: data.name, email: data.email, passwordHash } });
}

export async function verifyLogin(input: unknown) {
  const data = loginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  // Same error for unknown email and wrong password: do not leak which failed.
  if (!user) throw new ApiError(401, 'Invalid email or password.');
  const ok = await bcrypt.compare(data.password, user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid email or password.');
  return user;
}
