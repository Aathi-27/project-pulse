/** Demo seed: the Alice/Bob evaluation scenario, pre-populated. Uses the service
 *  layer so permissions, validation and activity history behave exactly as at runtime. */
import { registerUser } from '../src/lib/services/users';
import { createProject, addMember } from '../src/lib/services/projects';
import { createTask, updateTask, addComment } from '../src/lib/services/tasks';
import { prisma } from '../src/lib/db';

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

async function main() {
  const alice = await registerUser({ name: 'Alice Johnson', email: 'alice@example.com', password: 'password123' }).catch(() =>
    prisma.user.findUniqueOrThrow({ where: { email: 'alice@example.com' } }));
  const bob = await registerUser({ name: 'Bob Martinez', email: 'bob@example.com', password: 'password123' }).catch(() =>
    prisma.user.findUniqueOrThrow({ where: { email: 'bob@example.com' } }));

  const existing = await prisma.project.findFirst({ where: { name: 'Product Launch', members: { some: { userId: alice.id, role: 'OWNER' } } } });
  if (existing) { console.log('Demo project already exists; seed skipped.'); return; }

  const project = await createProject(alice.id, {
    name: 'Product Launch',
    description: 'Coordinate the Q1 launch of the new self-serve onboarding flow.',
  });
  await addMember(project.id, alice.id, { email: 'bob@example.com' });

  const landing = await createTask(project.id, alice.id, {
    title: 'Develop Landing Page',
    description: 'Build the public marketing page: hero, feature grid, pricing table and signup CTA. Copy lives in the shared doc; keep it within the existing design system.',
    priority: 'HIGH', assigneeId: bob.id, dueDate: days(2),
  });
  await updateTask(project.id, landing.id, alice.id, { status: 'IN_PROGRESS' });
  await addComment(project.id, landing.id, bob.id, { text: 'Started on the hero section. The pricing table needs final numbers before I can finish it.' });
  await addComment(project.id, landing.id, alice.id, { text: 'Final pricing is confirmed - I dropped it in the shared doc this morning.' });

  await createTask(project.id, alice.id, {
    title: 'Set up analytics events for the signup funnel',
    description: 'Track page view, signup started, signup completed and plan selected. Verify events land in the dashboard.',
    priority: 'MEDIUM', assigneeId: alice.id, dueDate: days(-1), // overdue on purpose
  });
  await createTask(project.id, alice.id, {
    title: 'Design onboarding email sequence',
    description: 'Three emails: welcome, day-2 tips, day-5 upgrade nudge. Needs review from marketing before handoff.',
    priority: 'MEDIUM', assigneeId: bob.id, dueDate: days(4),
  });
  await createTask(project.id, alice.id, {
    title: 'Write launch announcement blog post',
    priority: 'LOW', dueDate: days(9),
  });
  const competitive = await createTask(project.id, alice.id, {
    title: 'Competitive analysis of onboarding flows',
    description: 'Compared five competing products; notes and screenshots attached to the shared drive folder.',
    priority: 'MEDIUM', assigneeId: alice.id, dueDate: days(-3),
  });
  await updateTask(project.id, competitive.id, alice.id, { status: 'DONE' });
  const deck = await createTask(project.id, alice.id, {
    title: 'Prepare investor update deck for the Q4 review',
    priority: 'HIGH', assigneeId: alice.id, dueDate: days(-5),
  });
  await updateTask(project.id, deck.id, alice.id, { status: 'DONE' });

  console.log('Seeded: alice@example.com / bob@example.com (password: password123), project "Product Launch", 6 tasks.');
}

main().finally(() => prisma.$disconnect());
