# Fabulari — Proposed Data Structures

## Storage

Phase 1 stores application data in a server-side JSON file.
The file contains arrays of users, groups, channels and requests.

Each record has a unique ID. Related records reference these IDs
rather than duplicating complete objects.

## Users

| Field | Purpose |
|---|---|
| id | Unique user identifier |
| username | Unique login name |
| passwordHash | Password hash used for authentication |
| roles | Array of assigned roles: User, Group Admin, Super Admin |

Passwords and password hashes must not be returned to the frontend.

## Groups

| Field | Purpose |
|---|---|
| id | Unique group identifier |
| name | Display name |
| description | Description of the community |
| themeColour | Group interface colour |
| ageLimit | Configured age restriction |
| adminIds | IDs of users who administer this group |
| memberIds | IDs of users who belong to this group |
| bannedUserIds | IDs of users banned from this group |

A user's Group Admin role does not grant administration rights
over every group. The group's adminIds identify its administrators.

## Channels (Chat Rooms)

| Field | Purpose |
|---|---|
| id | Unique channel identifier |
| groupId | ID of the group containing the channel |
| name | Display name |
| description | Description of the channel |
| memberIds | IDs of users assigned to the channel |

Channel members must also be eligible members of the parent group.

## Requests

| Field | Purpose |
|---|---|
| id | Unique request identifier |
| type | groupCreation, groupDeletion or accountDeletion |
| requesterId | ID of the user submitting the request |
| targetId | Existing group or user ID, when applicable |
| proposedGroup | Proposed group details for a creation request |
| status | pending, approved or rejected |
| createdAt | Date and time of submission |
| reviewedBy | Super Admin ID, initially null |

Request processing may be demonstrated with mock data in Phase 1.

## Design Decisions to Confirm

- User profile fields needed to enforce age restrictions.
- Additional membership and request rules from the client briefing.
- How related records are updated when users, groups or channels
  are deleted.