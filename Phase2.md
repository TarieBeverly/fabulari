# Fabulari � Phase 2

- **Name:** Tariro Kandeya
- **Student number:** s5373405
- **Workshop:** GC Thursday @1100
- **Repository:** https://github.com/TarieBeverly/fabulari
- **Branch:** codex/phase2
- **Phase 1 checkpoint:** 5b7c152

## Requirements and scope

The [elicited requirements](docs/requirements.md) and teaching-team clarifications remain the basis of administration permissions. Phase 2 replaces JSON persistence with MongoDB and the local chat preview with authenticated Socket.IO conversations. Super Admins administer the system and do not enter chat rooms. Group creation/deletion and account deletion retain their required request/approval paths.

Members can send plain text and PNG/JPEG/GIF images up to 2 MB, see active room participants and arrivals/departures, and delete their own messages for everyone currently in the room. Only five recent messages per room persist. Active clients keep their session's conversation until leaving; older own messages may be deleted during that session. One account can occupy only one room across tabs. Joining elsewhere closes the previous room. Bans, membership removal, account deletion, room deletion and changed age limits revalidate live access. URLs remain plain text. Video/voice, friend lists, typing indicators and message search are outside the brief.

## Architecture and MongoDB

Angular 20 uses AuthService/ApiService for HTTP and ChatService for socket communication. Express handles authentication and approved administration. The existing salted scrypt password hashes and UUID references are retained during migration. MongoDB collections are users, groups, channels, requests, logs and roomHistory. Administrative collections have unique id indexes; roomHistory uses the channel UUID as its MongoDB _id and stores at most five message objects. Profile and chat images are stored in server/uploads. MongoDB's media
collection stores their metadata, and messages reference authenticated
/api/media/:mediaId URLs. Messages also record the author's profile-picture
URL. Only the latest five messages per room are retained in MongoDB.

Administrative writes run in a MongoDB transaction. A shared queue serializes HTTP and socket mutations in this single server process to prevent overlapping snapshot updates. This design is intended for the assignment's single server; multiple workers would need distributed concurrency control. Sessions remain in express-session's memory store and expire after one hour or a restart. Production deployment would need a persistent session store.

The local development runner uses a real, disk-backed MongoDB replica set with wiredTiger; the database is stored under server/.mongo/data and is preserved on shutdown. It downloads the official MongoDB server binary on first use. MongoDB Atlas can instead be supplied through MONGODB_URI. Import refuses to overwrite a nonempty database.

## HTTP and socket interfaces

Existing administrative [HTTP endpoints](docs/api-endpoints.md) keep their validation, roles and approval requirements. Session cookies authenticate both HTTP and Socket.IO. Every socket action reloads the session and checks current membership, age and role. Logout disconnects sockets belonging to the ended session. Untrusted browser origins are refused.

| Event | Direction | Behaviour |
|---|---|---|
| room:join | Client to server | Validate access; replace previous active tab/room; acknowledge recent five messages and participants |
| room:leave | Client to server | Remove presence and clear session message ownership |
| message:send | Client to server | Validate text/image; persist latest five; broadcast message:new |
| message:delete | Client to server | Check own message ID in current room session; update retained history; broadcast message:deleted |
| room:participants | Server to client | Current participants only |
| room:notice | Server to client | Arrival/departure notification |
| room:closed | Server to client | Access removed, replacement tab, or session end |
| messages:authors | Server to client | Remove deleted users' messages from active clients |
| workspace:updated | Server to client | Refresh administrative data after saved changes |

Acknowledgements use `{ok:true,...}` or `{ok:false,message}`. The client handles timeouts and displays errors. Successful sends broadcast to all active room clients, including the sender. Stored history is available only after authorised room entry.

## Design and accessibility

The original [wireframes](docs/design/wireframes.md) and [storyboard](docs/design/storyboard.md) were recorded before application coding. Phase 2 keeps the same dashboard layout and replaces preview labels with live rooms, presence and shared-message actions. Forms retain labels, visible focus styles, accessible error/status messages, keyboard buttons and responsive layouts. Chat uses plain text interpolation to avoid executing user HTML. Theme colours come from groups with optional profile overrides.

## Automated verification

| Check | Evidence/result |
|---|---|
| Bootstrap, profiles, registration and role assignment | Existing workflow tests pass |
| Authentication, wrong passwords, origins and logout | Existing workflow tests pass |
| Requests, age limits, group/room administration and no-orphan safeguards | Existing workflow tests pass |
| Real MongoDB administrative persistence | Integration test passes |
| Two clients, room presence and shared text | Integration test passes |
| Own deletion across clients, including older active-session messages | Integration test passes |
| Image signature validation and valid image delivery | Integration test passes |
| Five retained messages and second-tab replacement | Integration test passes |
| Approved ban immediately removes live access | Integration test passes |
| Logout disconnects the existing socket | Integration test passes |
| Changed age limits, account deletion message cleanup, room-history deletion | Integration test passes |

Verification completed on 8 October 2026:

- Phase 1 regression tests: 8 passed.
- MongoDB and Socket.IO integration tests: 12 passed.
- Angular client tests: 7 passed.
- Production build: passed, with a dashboard CSS size warning.
- Browser checks with demo and groupadmin accounts: shared text,
  live delivery in both directions, live message deletion, image
  sharing, participant departure updates and logout protection passed.

HTTPS deployment has not been tested.

## Running and remaining checks

See [Phase 2 startup](docs/phase2-startup.md). HTTP localhost is the development default. Optional HTTPS is supported using trusted certificate/key paths and HTTPS Angular options, but the HTTPS deployment has not been exercised. Do not present localhost HTTP testing as verified HTTPS deployment. The teacher/collaborator invitation and LMS submission remain student actions.

## Dependency and deployment notes

The server and production client dependency audits report zero vulnerabilities. Compatible development-tool fixes were applied. The remaining audit findings concern the Karma development test-tool chain; a forced downgrade was not applied. HTTPS configuration is provided but still needs trusted certificates and a deployment check. The production build and browser walkthrough passed on 8 October 2026.
HTTPS deployment remains untested.