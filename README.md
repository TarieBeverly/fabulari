# Fabulari

The active codex/phase2 branch uses Angular, Express, MongoDB and Socket.IO. Start with [Phase 2 startup](docs/phase2-startup.md) and [Phase 2 report](Phase2.md).

Phase 1 is preserved at commit 5b7c152. Its report and PDF describe the JSON prototype and mock chat at that checkpoint. The instructions below are retained as historical Phase 1 documentation; use the Phase 2 startup guide for the active branch.

# Fabulari — Phase 1

**Student:** Tariro Kandeya  
**Student number:** s5373405  
**Workshop:** GC Thursday @1100

Community chat prototype built with Angular 20, Express and Node.js.
Phase 1 management data is saved in `server/data/db.json`.

## Run locally

Open two terminals in the project root.

Backend:
```powershell
cd server
npm.cmd ci
npm.cmd start
```

Frontend:
```powershell
cd client
npm.cmd ci
npm.cmd start
```

Open http://localhost:4200. Keep both terminals running.
For this existing project, dependencies are already installed: skip `npm.cmd ci`.
Restart Express after changing backend source files. Restarting signs out existing sessions.

## Demo accounts

These credentials are exclusively for the local assessment prototype.

| Username | Password | Purpose |
|---|---|---|
| superadmin | SuperDemo123! | Review creation/deletion requests; manage user directory and logs |
| groupadmin | GroupDemo123! | Manage the sample Photography group |
| demo | UserDemo123! | Browse groups, request membership and preview chat |

`npm.cmd run seed` in `server` creates missing demo accounts and an explicitly labelled
sample Photography group with General and Events rooms. It preserves existing passwords.
Use separate browser profiles or private windows to demonstrate different users simultaneously.

## Implemented

- Initial Super Admin setup if the database has no users; disabled afterward.
- Self-registration, profile editing, password hashing and session login/logout.
- Group browsing, creation requests and approval assigning the requester as Group Admin.
- Join requests with age validation, membership assignment and removal.
- Group metadata editing, room creation/editing/deletion and room assignment.
- Room creation requests for regular members.
- Ban requests and Group Admin approval.
- Group/account deletion requests handled by Super Admin.
- Multiple administrators, protected handover and sole-admin deletion safeguards.
- Role-based interfaces and independent server permission checks.
- Profile images up to 2 MB, saved as data URLs in JSON for this prototype.
- Per-user theme colour override and administrative audit logs.

## Phase 1 mock functionality

Chat is a labelled **local preview**: five sample messages are shown on entry;
messages, image previews and deleting your own messages only affect the current browser.
There is no live Socket.IO communication, genuine online presence or persistent chat history.
Phase 2 will introduce MongoDB, Socket.IO, shared message deletion and server image storage.
Super Admin accounts cannot access the chat preview.

## Verification

```powershell
cd server
npm.cmd test
```

The tests use a temporary isolated database and leave `server/data/db.json` intact.

```powershell
cd client
npm.cmd run build
```

See [verification](docs/verification.md) for the checks performed and limitations.

## Documentation

- [Phase 1 report](Phase1.md)
- [Requirements](docs/requirements.md)
- [Data structures](docs/data-structures.md)
- [Angular architecture](docs/angular-architecture.md)
- [API endpoints](docs/api-endpoints.md)
- [Wireframes](docs/design/wireframes.md)
- [Storyboard](docs/design/storyboard.md)

The repository must remain private. Add the teaching staff member as a collaborator
using their confirmed GitHub username. The source and report must be understood and
explained during the assessment demonstration.

## Phase 1 final checkpoint

Backend workflow tests (8 checks) passed and the production Angular build passed.
Final visual smoke checking and teaching staff collaborator access remain to be confirmed.
The Phase 1 submission PDF is in docs/submission/Phase1-Submission.pdf.
