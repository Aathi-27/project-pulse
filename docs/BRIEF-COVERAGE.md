# Brief coverage checklist (Ciranta Project Pulse, Round 1)

## Module 1 - Authentication & User Management
- [x] User registration, login, logout (auth-form, /api/auth/*)
- [x] Secure password storage (bcrypt, src/lib/password.ts)
- [x] Session management (signed JWT httpOnly cookie, 7-day expiry, src/lib/session.ts)
- [x] Authenticated routes and API access (middleware + requireUser in every route)
- [x] User profiles with name and email (shown in sidebar, members page, comments, activity)

## Module 2 - Project & Team Management
- [x] Create, view, edit, delete projects (owner-only edit/delete)
- [x] Add existing registered users to projects by email; view members
- [x] Manage project details; multiple projects per user
- [x] RBAC: Owner manages project/members/tasks; Member views and collaborates (server-enforced)

## Module 3 - Interactive Kanban Board
- [x] Three default columns; interactive cards
- [x] Drag and drop between and within columns (dnd-kit; touch via press-and-hold)
- [x] Status updates automatically after a move; persisted in the backend
- [x] State consistent after refresh (positions stored as floats in the DB)
- [x] Board updates live when another member changes a task (Socket.IO)
- [x] Integrated with the backend, not a visual demo (every move is a validated PATCH)

## Module 4 - Task Management
- [x] Create, view, edit, delete; assign to members; priority; descriptions; deadlines
- [x] Status changes (drag or dialog); search and filter (also Module 8)
- [x] Created/updated timestamps shown in the task dialog
- [x] All brief task fields present: title (required), description, status, priority,
      assignedTo, dueDate, createdBy, createdAt, updatedAt

## Module 5 - Real-Time Collaboration
- [x] Multi-user same project; changes reflected without refresh
- [x] Real-time create/edit/delete/move; collaborative assignment; shared task info
- [x] Verified with two separate browsers (Alice/Bob), no manual refresh

## Module 6 - Comments & Activity History
- [x] Comments on tasks with author and timestamp
- [x] Activity history: creation, status changes, assignment changes, updates, deletions,
      comments, membership changes - chronological

## Module 7 - Project Dashboard & Analytics
- [x] Per-project: total tasks, by status, completed count, completion %, overdue count,
      donut (status), bar (priority), per-member workload
- [x] Cross-project overview on My Projects: total projects, total tasks, completion %,
      overdue (with status breakdown)

## Module 8 - Search & Filtering
- [x] Search by title; filter by status, priority, assigned member
- [x] Matching results; empty states (no tasks, no matches)

## Module 9 - Responsive UI
- [x] Desktop and mobile layouts (mobile: top bar, one-column board with switcher)
- [x] Clear navigation, consistent styling, reusable components (ui.tsx)
- [x] Form validations, loading indicators, error messages

## Back-End & Database Requirements
- [x] Persistent DB (SQLite/Prisma; Postgres-ready schema); no mock/browser-only storage
- [x] Server-side input validation (zod), error handling, secure API access
- [x] Models: User, Project, ProjectMember, Task, Comment, Activity + relationships
- [x] AuthN + role-based authorization on the server; real-time support

## Testing Expectations
- [x] 28 automated tests: auth/protected routes, membership authorization, task
      create/update, drag-drop persistence + ordering, assignment validation, dashboard
      calculations, invalid input/error handling
- [x] Two-account testing (scripted two-browser E2E, ui-e2e.mjs)
- [x] Real-time between users verified live (two-browser scenario)

## Submission Requirements (A-F)
- [x] A: source + migration files (prisma/migrations) + config examples + tests + no secrets
- [x] B: README with all required sections
- [ ] C: live URL - OPTIONAL, not deployed (needs hosting approval)
- [x] D: demo video 3-5 min - silent 3:15 recording; scene guide in docs/DEMO-SCRIPT.md
- [x] E: technical explanation (README architecture + engineering notes, docs/WALKTHROUGH.md)
- [x] F: AI disclosure (README) + explainability prep (docs/WALKTHROUGH.md)

## Important Guidelines
- [x] 07 persistent database; 09 drag-drop updates backend; 10 real-time between sessions
- [x] 11 backend-enforced auth/RBAC; 04 libraries allowed, decisions documented
- [x] 10b known limitations documented in README
- [x] 09b fresh build, not an existing PM app
