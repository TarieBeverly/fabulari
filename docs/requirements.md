# Fabulari — Requirements and Elicitation

## Sources and precedence

1. Assignment-2026 (2).pdf: Phase 1 and Phase 2 scope and documentation.
2. July 22 client briefing: Wednesday Lecture_Common time (1).docx.
3. July 29 clarification: Wednesday Lecture_Common time (2).docx.
4. Later teaching-team clarification supplied by the student in this conversation:
   designs must be pushed before coding; Group Admins can edit group metadata and
   room details; group creation/deletion and deletion of another user require requests.

The July 29 briefing permits direct self-deletion with sole-admin safeguards.
The later clarification about Group Admin requests is interpreted as deletion of
**another** user. Group Admins can create/edit/delete rooms directly in this prototype
under the later clarification; regular members submit room requests. Bans retain
the July 29 request-and-approval flow because the later clarification does not
explicitly remove that requirement.

## Functional requirements

| ID | Requirement | Phase 1 implementation |
|---|---|---|
| U01 | First-run setup creates initial Super Admin and then disables itself | Implemented when users array is empty |
| U02 | Users self-register with unique username/email, first/last name and date of birth | Implemented |
| U03 | Password minimum 8 characters and at least one uppercase; never store plain text | Implemented, salted scrypt hash |
| U04 | Basic username/password authentication | Implemented with server sessions |
| U05 | Profile image and profile preferences | Implemented; image data URL in JSON, colour override |
| U06 | Self-deletion cannot orphan a group; Super Admin cannot self-delete | Implemented |
| G01 | All groups are discoverable; users request their own membership | Implemented |
| G02 | Super Admin creates groups from User requests; requester becomes Group Admin | Implemented |
| G03 | Group names unique; name <=30 and description <=250 characters | Implemented server validation |
| G04 | Group metadata includes name, description, colour and age limit | Implemented editable form |
| G05 | Group Admin can administer multiple groups and appoint additional admins | Implemented |
| G06 | Join request approved/rejected by group administrator; age restriction enforced | Implemented |
| G07 | Group Admin can remove membership; group ban is distinct from system deletion | Implemented |
| G08 | User ban report includes target and reason and is reviewed by Group Admin | Implemented |
| G09 | Group deletion requires Group Admin request to Super Admin | Implemented with room cleanup and role recalculation |
| G10 | Group must retain at least one admin; pending Super Admin requests block step-down | Implemented |
| C01 | Group members can access group rooms subject to minimum age | Implemented access validation; preview UI |
| C02 | Group Admin can create, rename, edit and delete rooms | Implemented, plus member room requests |
| C03 | Users/groups/rooms can be created and assigned and survive server restart | Implemented JSON persistence |
| A01 | Delete another user only via Group Admin request and Super Admin approval | Implemented with last-admin safeguard |
| A02 | Request status communicates administrative outcomes | Implemented pending/approved/rejected/cancelled |
| A03 | Administrative changes are logged | Implemented audit array and scoped log screen |
| A04 | Super Admin is administrative only and does not chat | Enforced in UI and server |
| M01 | Real-time text and PNG/JPEG/GIF images, no voice/video | Phase 2; labelled local Phase 1 preview |
| M02 | Image maximum 2 MB | Enforced for profile and local preview images |
| M03 | Show up to five preceding messages on room entry | Five sample messages in Phase 1; real history Phase 2 |
| M04 | Entry/exit notification and list of people currently in room | Mock/deferred to Phase 2; no genuine presence claimed |
| M05 | Users delete only their own messages and other clients update | Local own-message deletion preview; shared deletion Phase 2 |
| M06 | One active room, no replies, no friend system or external notifications | One local preview at a time; no additional social features |

## Non-functional requirements

- Angular 20+, Node.js and Express; JSON storage in Phase 1.
- MongoDB and Socket.IO are required for Phase 2.
- Private GitHub repository with regular commits and teaching staff access.
- Storyboards/wireframes committed and pushed before application coding.
- Desktop/tablet responsiveness, labelled inputs, keyboard support and accessible feedback.
- Phase1.md documents overview, Git, elicitation, structures, architecture, endpoints and design.
- Demonstration and explanation of submitted code remain part of the assessment.

## Explicit prototype decisions

- Consolidate administration into dashboard tabs for Phase 1; component separation is future work.
- Save profile images as data URLs in JSON; Phase 2 moves uploaded files to server storage.
- Room membership IDs record assignment, but eligible group members retain room access,
  following the briefing that membership grants access to all group rooms.
- Existing demo users receive fictional example.test emails and a 2000-01-01 birthday.
- Sessions expire after an hour and are cleared by a server restart.
- JSON storage is for a small single-process prototype, not a production concurrent database.
