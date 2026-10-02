# Fabulari — Proposed Server Endpoints

All paths use the `/api` prefix. This is a design proposal;
not every endpoint must be implemented in Phase 1.

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | Validate credentials and establish a session |
| POST | /api/auth/logout | End the current session |
| GET | /api/auth/me | Return the current user's safe profile |

## Users

| Method | Path | Purpose |
|---|---|---|
| GET | /api/users | Retrieve users permitted by the caller's role |
| POST | /api/users | Create a user through the authorised workflow |

User creation permissions and required fields must be confirmed
against the client briefing before implementation.
Responses exclude passwords and password hashes.

## Groups and Membership

| Method | Path | Purpose |
|---|---|---|
| GET | /api/groups | Retrieve groups visible to the current user |
| GET | /api/groups/:groupId | Retrieve an accessible group's details |
| PATCH | /api/groups/:groupId | Edit details of an administered group |
| POST | /api/groups/:groupId/members | Assign an eligible user to a group |
| POST | /api/groups/:groupId/bans | Ban a user from an administered group |

Membership assignment permissions and workflows must be confirmed
against the client briefing.

## Channels (Chat Rooms)

| Method | Path | Purpose |
|---|---|---|
| GET | /api/groups/:groupId/channels | List accessible rooms in a group |
| POST | /api/groups/:groupId/channels | Create a room in an administered group |
| PATCH | /api/channels/:channelId | Edit a room in an administered group |
| DELETE | /api/channels/:channelId | Delete a room in an administered group |
| POST | /api/channels/:channelId/members | Assign an eligible group member to a room |

## Administrative Requests

| Method | Path | Purpose |
|---|---|---|
| POST | /api/requests | Submit a permitted administrative request |
| GET | /api/requests | Retrieve requests visible to the current user |
| POST | /api/requests/:requestId/approve | Approve and execute a request as Super Admin |
| POST | /api/requests/:requestId/reject | Reject a request as Super Admin |

Request types and permissions:

- Group creation: submitted by a User.
- Group deletion: submitted by a Group Admin of the target group.
- Account deletion: submitted by a Group Admin.
- Approval and execution: performed by a Super Admin.

Approval creates the requested group or deletes the identified
group/account. The server checks that the request is pending
and valid before executing it.

## Validation and Responses

- Validate required fields and referenced IDs.
- Derive the caller's identity from the authenticated session.
- Check roles and group-specific permissions on the server.
- Save successful data changes to the server-side JSON file.
- Return 400 for invalid input, 401 for unauthenticated requests,
  403 for forbidden actions and 404 for missing resources.
- Return clear success responses and error messages.

## Phase 1 Scope

Implement basic authentication and the required creation,
assignment and JSON persistence functions.
Other interfaces may use clearly identified mock data.
Real-time chat endpoints/events are planned for Phase 2.