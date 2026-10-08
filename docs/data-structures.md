# Fabulari — Implemented Data Structures

The server JSON file contains five arrays. UUIDs identify records. Related objects
are referenced by IDs rather than copies. All changes use read-modify-write within
a single Node.js process; writes go to a temporary file then replace the database.

## User

| Field | Meaning |
|---|---|
| id, username | Unique UUID and case-insensitive unique login |
| firstName, lastName, email | Profile; email is unique |
| dateOfBirth | YYYY-MM-DD; age calculated at access time |
| passwordHash | Random salt and scrypt hash, excluded from API output |
| roles | User, Group Admin or Super Admin |
| themeColour | Optional personal group colour override |
| avatar | Validated PNG/JPEG/GIF data URL, <=2 MB binary size |

## Group

`id`, `name` (unique, <=30), `description` (<=250), `themeColour` (hex),
`ageLimit` (0–120), `adminIds`, `memberIds`, `bannedUserIds`.
The demo fixture additionally has `demoFixture: true`.
Group Admin is scoped by adminIds. Removing a group recalculates global Group Admin roles.

## Channel

`id`, `groupId`, `name` (unique within group, <=30), `description`, `themeColour`,
`ageLimit`, `memberIds`. Existing members are assigned when a room is created;
joining a group assigns the user to its rooms. Access still requires group membership
and age >= max(group.ageLimit, channel.ageLimit).

## Request

`id`, `type`, `requesterId`, `groupId`, `targetId`, `payload`, `reason`, `status`,
`createdAt`, `reviewedBy`, and optionally `reviewedAt`.

Types: groupCreation, groupJoin, channelCreation, banUser, groupDeletion, accountDeletion.
Statuses: pending, approved, rejected, cancelled.
Creation payload contains name, description, colour and age limit.
Approval validates current permissions again and executes the change atomically in the
same synchronous read-modify-write. A resolved request cannot be processed twice.

## AuditLog

`id`, `actorId`, `actorName`, `action`, `targetId`, `groupId`, `createdAt`.
The latest 100 visible entries are returned to administrators. Historical actor names
remain readable after deleting an account. The demo seed is explicitly identified.

## Cleanup rules

- Group deletion removes its rooms, cancels pending group requests and recalculates roles.
- User deletion removes membership/admin/ban IDs and room assignments and cancels
  relevant pending requests. A sole administrator or Super Admin cannot be deleted.
- Ban removes membership and room assignments, preserving an explicit group ban.
- Local chat messages are browser-only objects and are never saved in Phase 1 JSON.
