# Fabulari — Implemented API

Base: http://localhost:3000/api. Requests and responses are JSON.
Authenticated calls use the fabulari.sid HTTP-only session cookie.

## Authentication

| Method | Path | Access / payload |
|---|---|---|
| GET | /health | Public server health |
| GET | /auth/bootstrap | Public; required=true only when no users exist |
| POST | /auth/bootstrap | Public once; username,password,firstName,lastName,email,dateOfBirth |
| POST | /auth/register | Public after bootstrap; same fields; always creates User |
| POST | /auth/login | username,password; returns safe user and session cookie |
| GET | /auth/me | Session required; returns safe user |
| POST | /auth/logout | Destroys session |

## Management

| Method | Path | Access / payload |
|---|---|---|
| GET | /state | Signed in; safe user, discoverable groups, accessible rooms, directory, visible requests and logs |
| GET | /groups | Signed in; joined groups, or all for Super Admin |
| POST | /users | Super Admin; creates regular user with registration fields |
| PATCH | /profile | Own profile: firstName,lastName,email,dateOfBirth,themeColour; optional password |
| POST | /profile/avatar | Own profile: data (PNG/JPEG/GIF base64 data URL <=2 MB) |
| DELETE | /profile | Own account; blocked for Super Admin/sole group admin |
| PATCH | /groups/:groupId | Group Admin; name,description,themeColour,ageLimit |
| POST | /groups/:groupId/members | Group Admin; requestId of pending join request |
| DELETE | /groups/:groupId/members/:userId | Group Admin or self-leaving; cannot remove admin before handover |
| POST | /groups/:groupId/admins | Group Admin; userId of existing member |
| DELETE | /groups/:groupId/admins/me | Step down, retaining successor and no pending Super Admin requests |
| POST | /groups/:groupId/channels | Group Admin; name,description,themeColour,ageLimit |
| PATCH | /channels/:channelId | Group Admin; same room fields |
| DELETE | /channels/:channelId | Group Admin |
| POST | /channels/:channelId/members | Group Admin; userId of eligible group member |
| GET | /channels/:channelId/preview | Group member meeting age limit; returns channel and mock=true |
| POST | /requests | Permitted User/Group Admin; type,groupId,targetId,reason and optional creation details |
| POST | /requests/:requestId/approve | Authorised reviewer; executes pending request |
| POST | /requests/:requestId/reject | Authorised reviewer; rejects pending request |

## Request permissions

| Type | Requester | Reviewer | Effect |
|---|---|---|---|
| groupCreation | User | Super Admin | Create group; requester becomes Group Admin |
| groupJoin | Non-member eligible User | Target Group Admin | Assign membership and rooms |
| channelCreation | Group member | Group Admin | Create room |
| banUser | Group member with target/reason | Group Admin | Ban target from that group |
| groupDeletion | Target Group Admin with reason | Super Admin | Remove group and rooms |
| accountDeletion | Group Admin targeting current/banned group member with reason | Super Admin | Remove system user, preserving admin successor safeguards |

Group creation details are top-level request fields: name,description,themeColour,ageLimit.
Super Admin cannot submit community requests or use chat.

## Responses and validation

Successful management mutations return message plus optional new record. /state returns
user,groups,channels,users,requests,logs. No response exposes passwordHash.
Profile and user validation enforce field limits, email/date formats, unique identity
and minimum password requirements. Group names <=30; descriptions <=250.
Errors return `{ "message": "..." }` with 400 validation, 401 authentication,
403 permission/age, 404 missing resource, 409 conflicting state, or 500 unexpected failure.
The server rejects writes from unexpected browser origins and only permits the local Angular origin.
