// Server-side input validation (zod). Every API route validates before touching the DB.
import { z } from 'zod';
import { TASK_PRIORITIES, TASK_STATUSES } from './constants';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.').max(120),
  description: z.string().trim().max(2000).optional().default(''),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.').max(120).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const memberAddSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').max(200),
  description: z.string().trim().max(5000).optional().default(''),
  priority: z.enum(TASK_PRIORITIES).optional().default('MEDIUM'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required.').max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  position: z.number().finite().optional(),
});

export const commentCreateSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty.').max(2000),
});
