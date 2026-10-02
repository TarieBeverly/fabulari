# Fabulari — Proposed Angular Architecture

## Components

| Component | Responsibility |
|---|---|
| App | Main application shell and route outlet |
| Login | Username/password form and login errors |
| Dashboard | Group navigation and available chat rooms |
| ChatRoom | Selected room and mock conversation |
| GroupAdmin | Management of administered groups, rooms and members |
| SuperAdmin | Review of administrative requests |
| GroupForm | Creation or editing of group details |
| ChannelForm | Creation or editing of chat room details |
| UserForm | User creation and assignment interface |
| RequestForm | Submission of administrative requests |

Component names are proposed and may change during implementation.

## Services

| Service | Responsibility |
|---|---|
| AuthService | Login, logout and current authentication state |
| UserService | Calls to user management endpoints |
| GroupService | Calls to group and membership endpoints |
| ChannelService | Calls to chat room endpoints |
| RequestService | Submission and retrieval of requests |

Services use Angular HttpClient to communicate with the Express server.
Components display data and handle interaction; services handle API calls.

## Models

- User: safe user details and assigned roles; excludes password hashes.
- Group: group details and related user IDs.
- Channel: chat room details, parent group ID and member IDs.
- AdminRequest: request type, requester, target and status.
- ChatMessage: mock author and message content for Phase 1.

Models follow the structures in data-structures.md.

## Proposed Routes

| Route | Screen |
|---|---|
| /login | Login |
| /dashboard | User dashboard |
| /groups/:groupId/channels/:channelId | Chat room |
| /admin/groups/:groupId | Group administration |
| /super-admin | Super Admin interface |

The default route redirects to the dashboard when authenticated
or to login otherwise.

## Access Control

- An authentication guard restricts protected routes.
- Administrative screens check the current user's permissions.
- Group administration checks the selected group's adminIds.
- The server independently validates permissions for every
  protected action.

Route guards control navigation; server checks enforce access.

## State and Phase 1 Scope

Angular signals hold local interface state, such as selected groups
and loading indicators. HTTP responses are handled using observables.

Phase 1 uses mock chat messages. Socket.IO integration and MongoDB
storage are planned for Phase 2.
