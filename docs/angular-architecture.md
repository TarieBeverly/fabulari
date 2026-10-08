# Fabulari — Implemented Angular Architecture

## Components

| Component | Files | Responsibility |
|---|---|---|
| App | src/app/app.ts, app.html, app.css | Routed application shell |
| Login | pages/login/login.ts/.html/.css | Login, registration and initial bootstrap |
| Dashboard | pages/dashboard/dashboard.ts/.html/.css | Group browsing, room preview, administration, requests, users, profile and audit tabs |

The original proposal included separate forms and administrative components. In the
implemented Phase 1 prototype these are consolidated into dashboard sections.
The design documents remain pre-coding evidence; this document describes actual code.

## Services and models

- AuthService: currentUser signal, login, logout, loadCurrentUser.
- ApiService: state retrieval and authenticated HTTP mutations.
- ApiService models: Profile, Group, Channel, AdminRequest, AuditLog and State.
- HttpClient communicates with http://localhost:3000/api using session credentials.
- Input state uses ngModel; conditional/list rendering uses Angular @if and @for.
- Async HTTP results use RxJS observables; auth state uses an Angular signal.
- The dashboard refreshes after mutations; Refresh retrieves decisions made in other sessions.

## Routes and guard

| Route | Behaviour |
|---|---|
| /login | Public sign-in, registration or first-run setup |
| /dashboard | Protected by authGuard checking /auth/me |
| / and unknown routes | Redirect to dashboard; guard redirects unauthenticated users to login |

Internal dashboard tabs and selected group/room are component state, not separate routes.
The backend independently enforces all role, membership and age checks.

## Phase 1 limitations

Chat is one local preview at a time. Five mock messages are generated on entry, new
text/images are local, and own-message deletion modifies the local array. Leaving
clears messages. There is no Socket.IO service yet.
Profile pictures and group theme overrides are implemented; real presence is not.
