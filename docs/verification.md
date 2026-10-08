# Phase 1 Verification

## Automated backend workflow checks

Run `npm.cmd test` in server. The suite uses a temporary database, an ephemeral
local server and HTTP requests with session cookies; it does not alter demo data.

| Check | Result |
|---|---|
| Initial setup once; valid registration; duplicate identity; invalid dates/passwords | Passed |
| Role escalation attempt during registration | Rejected as expected |
| Unauthenticated access, wrong password and untrusted browser origin | Rejected as expected |
| Group creation request with permitted reviewer; duplicate decision | Passed |
| JSON persistence and absence of password hashes in API output | Passed |
| Join approval and underage rejection | Passed |
| Member, non-member and Super Admin room permissions | Passed |
| Room create/edit/delete and assignment | Passed |
| Multiple-admin promotion, sole-admin handover/self-deletion safeguards | Passed |
| Pending Super Admin request blocks step-down | Passed |
| Ban request/approval and banned-user rejoin rejection | Passed |
| Group deletion removes rooms and recalculates admin roles | Passed |
| Logout and self-deletion invalidate authenticated access | Passed |

## Frontend checks

Angular's compiler (`ngc -p tsconfig.app.json`) completed successfully, checking
TypeScript and strict Angular templates. The prior starter test expecting the Angular
welcome heading was updated to check the routed application shell.

The complete production build passed in the student's ordinary VS Code terminal
on 8 October 2026. Initial output: 363.81 kB; estimated transfer size: 96.05 kB.
One non-fatal warning reported dashboard.css at 4.66 kB against a 4 kB warning budget.
The configured 8 kB error limit was not exceeded.

The browser preview tool failed to attach, so the expanded final interface has not
been visually verified. Earlier login/session/dashboard flows were verified by the
student before expansion. Use the following smoke check locally:

1. Sign in as demo: Photography, General and Events should appear.
2. Open a room preview, send/delete a local message; note the explicit mock label.
3. Sign out and navigate directly to /dashboard; expect /login.
4. Sign in as groupadmin: edit group/room metadata, create a room and refresh.
5. Register a new adult user, request membership; Group Admin approves from Requests.
6. Request a new group as User; Super Admin approves and requester gains scoped admin rights.
7. Restart Express and sign in again; changes must persist in JSON.
8. Resize to tablet/mobile width and navigate with Tab to inspect layout and focus.

Profile avatar upload and local image preview validate size/type but still need a
manual browser check. Actual real-time text/images/presence are Phase 2 work.
