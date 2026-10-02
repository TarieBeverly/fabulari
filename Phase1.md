# Fabulari — Phase 1

- **Name:** [Tariro Kandeya]
- **Student number:** [s5373405]
- **Workshop time:** [GC Thursday @1100]

## 1. Project Overview

Fabulari is a community chat application built using Angular,
Node.js and Express. Users communicate through groups and chat
rooms, with administrative functions controlled by three roles:
User, Group Admin and Super Admin.

Phase 1 provides the application design and an initial prototype
with basic authentication and management of users, groups and
chat rooms. Data is persisted in a server-side JSON file.

## 2. Requirements

The requirements and confirmed administration rules are documented
in [Requirements](docs/requirements.md).

## 3. Git Strategy

The project uses a private GitHub repository:

https://github.com/TarieBeverly/fabulari

The main branch stores stable project milestones. Feature branches
will be used for individual implementation tasks and merged into
main after checking that the changes work.

Commits are made for meaningful changes with descriptive messages.
Changes are pushed regularly to preserve progress online.

Wireframes and storyboards were committed and pushed before
application coding began. The teaching staff member will be
added as a collaborator for marking.

## 4. Data Structures

The proposed data structures are documented in
[Data Structures](docs/data-structures.md).

Phase 1 uses a server-side JSON file containing arrays of users,
groups, channels and requests. Unique IDs connect related records.

Group administration permissions are determined by each group's
adminIds. Password hashes are stored on the server and excluded
from responses sent to the frontend.

## 5. Angular Architecture

The proposed frontend structure is documented in
[Angular Architecture](docs/angular-architecture.md).

Components provide the login, dashboard, chat and administration
interfaces. Shared services communicate with the Express server
using HttpClient, while models describe the application data.

Route guards control access to protected screens. The server
independently checks permissions for protected actions.

Phase 1 displays mock chat messages.

## 6. Proposed Server Endpoints

The proposed server endpoints are documented in
[API Endpoints](docs/api-endpoints.md).

The API covers authentication, users, groups, membership,
chat rooms and administrative requests.

The Express server validates input and permissions before
saving changes to the Phase 1 JSON file. Group creation,
group deletion and account deletion follow the required
request workflows.

Not every proposed endpoint will be implemented in Phase 1.
Functions outside the required prototype scope may use mock data.
## 7. Design Documents
The proposed screen layouts and user journeys are documented in:

- [Wireframes](docs/design/wireframes.md)
- [Storyboard](docs/design/storyboard.md)

The designs cover login, the user dashboard, chat rooms,
Group Admin controls and Super Admin request management.
They include responsive layouts and accessibility considerations.

These documents will be committed and pushed to GitHub before
application coding begins.