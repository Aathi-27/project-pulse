# Project Pulse: technical walkthrough

Review these sections against the code before the interview. This document is
preparation material, not a claim that the candidate has personally reviewed it.

## Authentication
`src/app/api/auth/*/route.ts` validates registration and login, uses bcrypt password
hashes, then creates a signed JWT session cookie through `src/lib/session.ts`.
`src/middleware.ts` gates application pages. API handlers separately call
`requireUser`, so bypassing the page does not bypass authentication.

## Data and permissions
`prisma/schema.prisma` defines User, Project, ProjectMember, Task, Comment, Activity.
Role belongs to a membership: a user can own one project and join another as Member.
`src/lib/permissions.ts` owns `getMembership`, `requireMembership`, `requireOwner`,
and `canDeleteTask`. Outsiders get 404, project members get 403 for owner-only work.
Task deletion is allowed to the project owner or the task creator.

## Drag and drop
`src/components/board.tsx` uses dnd-kit. A drop computes the target status and a
float position between neighboring tasks, updates the UI optimistically, then
PATCHes the task route. Failed requests restore the prior state. The database
stores status and position, so a refresh retains both. On narrow phones, use the
task dialog's Status select for reliable cross-column moves; physical touch-drag
behavior still needs a real-device check.

## Real-time
`server.ts` runs Next and Socket.IO on the same HTTP server. A socket must pass the
session-cookie check, then membership validation before entering `project:<id>`.
`src/lib/realtime.ts` broadcasts after successful mutations. The board deduplicates
created tasks by id and replaces updated tasks by id. Room membership and session
validation are server-side, not client trust.

## Comments, activity, dashboard
`src/lib/services/tasks.ts` writes comments and activity records for mutations.
`src/lib/services/activities.ts` retrieves the ordered activity feed.
`src/lib/services/dashboard.ts` calculates status/priority counts, completion,
overdue work and member workload. It also provides the all-project overview.
`src/components/dashboard.tsx` renders charts and updates on socket events.

## Verification and trade-offs
The 28 Vitest checks use an isolated real SQLite database. Browser/API checks cover
the Alice/Bob scenario. A separate real local PostgreSQL instance passed migration,
seed and running-app API smoke checks, but not the full test suite. SQLite and
PostgreSQL require separate migration histories; see README before switching.

Custom session code is small and explainable but production hardening should add
rate limiting, session revocation and a review of CSRF/session-expiry behavior.
Multi-instance deployment needs shared Socket.IO coordination, such as Redis.

## Questions to practice
- Why must API routes check membership even though the UI hides buttons?
- How does a float position avoid rewriting every card during reordering?
- What happens if the API rejects an optimistic move?
- Why are socket room joins authorized independently?
- How would you handle a member removed while they are already connected?
- How would you avoid conflicts when two people move the same card at once?
- What would you test differently before a multi-instance production deployment?
