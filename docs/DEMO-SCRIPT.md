# Demo recording guide

The delivered silent recording is 3 minutes 15 seconds, at 1440x900. It uses
synthetic local accounts and data, not the applicant's personal account. The
brief asks for the workflows below but does not require narration. Optional
narration can be added by the applicant after reviewing the implementation.

## Recorded scenes

- 0:00-0:15: Register Cara Demo and reach the empty projects page.
- 0:15-0:34: Create Release Readiness.
- 0:34-0:48: Add the existing Bob Martinez account. Show the successful member
  addition notice and Owner/Member roles.
- 0:48-1:12: Create Prepare release checklist, set High priority, assign Bob.
- 1:12-1:36: Add a comment, then open the task's Activity history.
- 1:36-1:48: Drag the task from To Do to In Progress, then apply a priority filter.
- 1:48-2:05: Show project statistics and charts, then the mobile board.
- 2:05-2:32: Log out and log back in.
- 2:32-3:15: Show two independent sessions side by side, Cara on the left and
  Bob on the right. Cara changes the task title; Bob's board receives it without
  refresh. Bob changes the task status to Done; Cara's board receives that change.

Times are approximate. The recording is slowed for readability. The simultaneous
sessions retain their relative timing; the title and status assertions passed
before recording completion.

## Verification outside the recording

- 28 automated tests pass on SQLite.
- Production build passes.
- Cold development-mode login passed three browser trials after the auth-boundary
  navigation fix. Registration and logout/login also passed in production mode.
- Removing membership redirects an already-open board and makes the tasks API
  return 404; later owner updates do not restore access.
- PostgreSQL migration, seed and API smoke checks passed, not the full test suite.
- Physical touch drag on a real phone remains unverified. Use the task Status
  select for reliable cross-column movement on narrow screens.
