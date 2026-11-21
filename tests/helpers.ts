import { prisma } from '@/lib/db';
import { registerUser } from '@/lib/services/users';
import { createProject } from '@/lib/services/projects';

export async function resetDb() {
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

export async function makeUser(name: string, email: string, password = 'password123') {
  return registerUser({ name, email, password });
}

export async function makeProject(ownerId: string, name = 'Product Launch') {
  return createProject(ownerId, { name, description: '' });
}
