# Fabulari — Wireframes

## 1. Login Screen

Users enter their username and password to access the application.

```text
+------------------------------------------+
|             FABULARI LOGO                |
|         where communities meet           |
|                                          |
|               Sign in                    |
|                                          |
|  Username                                |
|  [____________________________________]  |
|                                          |
|  Password                                |
|  [____________________________________]  |
|                                          |
|  [              Sign in               ]  |
|                                          |
|  Error message appears here if needed.   |
+------------------------------------------+
```

### Behaviour

- A successful login opens the user's dashboard.
- An unsuccessful login displays a clear error message.
- Administrative controls depend on the authenticated user's permissions.

### Responsive Design and Accessibility

- Centre the form on desktop screens.
- Use a single-column layout on mobile without horizontal scrolling.
- Give each input a visible label.
- Mask the password.
- Support keyboard navigation and visible focus indicators.
## 2. User Dashboard — Proposed Layout

Users browse their groups and select a chat room.

```text
+--------------------------------------------------------+
| FABULARI                         Username | [Sign out] |
+------------------+-------------------------------------+
| MY GROUPS        | Selected group                      |
|                  | Description                         |
| > Photography    |                                     |
|   Gaming         | CHAT ROOMS                          |
|   Study Club     | [ General ]                         |
|                  | [ Events  ]                         |
| [Browse groups]  |                                     |
| [Request group]  | Select a room to open its chat.      |
+------------------+-------------------------------------+
```

### Behaviour

- Selecting a group displays its details and available chat rooms.
- Selecting a chat room opens the chat screen.
- Requesting a new group sends a request to a Super Admin.
- Group names and chat room names shown here are example data.
- Group discovery and membership behaviour will be checked against
  the client briefing before implementation.

### Responsive Design and Accessibility

- On desktop, show group navigation beside the main content.
- On mobile, place group navigation in a collapsible menu.
- Clearly indicate the selected group.
- Use labelled controls and support keyboard navigation.
## 3. Chat Room — Proposed Layout

```text
+--------------------------------------------------------+
| FABULARI                         Username | [Sign out] |
+------------------+-------------------------------------+
| Photography      | General                             |
|                  |                                     |
| CHAT ROOMS       | Alex: Welcome to the group!         |
| > General        |                                     |
|   Events         | You: Hello everyone!                |
|                  |                                     |
| [Back to groups] | [Type a message...        ] [Send]  |
+------------------+-------------------------------------+
```

### Phase 1 Behaviour

- Show the selected group and chat room.
- Use mock messages to demonstrate the chat layout.
- Real-time messaging and image sharing are planned for Phase 2.
- Access to rooms follows the confirmed membership and permission rules.

### Responsive Design and Accessibility

- On mobile, collapse room navigation into a labelled menu.
- Keep the message input below the conversation.
- Allow long messages to wrap without horizontal scrolling.
- Label the message input and support keyboard navigation.
- Identify message authors using text rather than colour alone.
## 4. Group Admin — Proposed Layout

```text
+--------------------------------------------------------+
| FABULARI                         Username | [Sign out] |
+------------------+-------------------------------------+
| MANAGED GROUPS   | Manage: Photography                 |
| > Photography    |                                     |
|                  | GROUP DETAILS                       |
|                  | Name:        [Photography        ]  |
|                  | Description: [Share your photos  ]  |
|                  | Theme colour:[Blue               ]  |
|                  | Age limit:   [Configured value   ]  |
|                  | [Save changes]                      |
|                  |                                     |
|                  | CHAT ROOMS                          |
|                  | General     [Edit] [Delete]         |
|                  | Events      [Edit] [Delete]         |
|                  | [Create room]                       |
|                  |                                     |
|                  | MEMBERS                             |
|                  | Alex        [Ban from group]        |
|                  | [Request account deletion]          |
|                  |                                     |
|                  | [Request group deletion]            |
+------------------+-------------------------------------+
```

### Behaviour

- A Group Admin manages groups they administer.
- Group details can be edited without a user request.
- A Group Admin can create, edit and delete chat rooms.
- Banning a member affects that individual group.
- Account deletion requests identify the user and go to a Super Admin.
- Group deletion requests go to a Super Admin.
- Show confirmation before deleting a room or banning a member.
- Additional membership controls will be checked against the briefing.

### Responsive Design and Accessibility

- On mobile, stack group details, rooms and members vertically.
- Label every field and show feedback after saving.
- Include the room or member name in action labels.
- Clearly distinguish a group ban from system account deletion.
## 5. Super Admin — Proposed Layout

```text
+--------------------------------------------------------+
| FABULARI                         Username | [Sign out] |
+------------------+-------------------------------------+
| ADMINISTRATION   | REQUESTS                            |
| > Requests       |                                     |
|   Groups         | New group request from a User       |
|   Users          | Proposed name: Study Club           |
|                  | [Review]                            |
|                  |                                     |
|                  | Group deletion from a Group Admin   |
|                  | Group: Photography                  |
|                  | [Review]                            |
|                  |                                     |
|                  | Account deletion from a Group Admin |
|                  | User: Alex                          |
|                  | [Review]                            |
+------------------+-------------------------------------+
```

### Behaviour

- A Super Admin reviews group creation requests from users.
- A Super Admin reviews group deletion requests from Group Admins.
- A Super Admin reviews account deletion requests from Group Admins.
- Reviewing a request displays its requester, target and details.
- Confirm the target before executing a deletion.
- Show the outcome after processing a request.
- Further user management permissions will be checked against
  the client briefing before implementation.

### Responsive Design and Accessibility

- On mobile, stack requests as individual cards.
- Use clear text labels for request types and actions.
- Support keyboard navigation and visible focus indicators.
- Explain that account deletion affects the entire system.