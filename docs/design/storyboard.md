# Fabulari — Storyboard

## 1. User Signs In and Opens a Chat Room

1. The user opens the login screen.
2. They enter their username and password and select Sign in.
3. Invalid credentials show an error; the user can try again.
4. Valid credentials open the user dashboard.
5. The user selects a group they belong to.
6. They select an available chat room.
7. The chat screen displays mock messages for the Phase 1 prototype.

## 2. User Requests a New Group

1. The user selects Request group on their dashboard.
2. They enter the proposed group details.
3. They submit the request.
4. The interface confirms that the request was submitted.
5. A Super Admin reviews the request.
6. The Super Admin creates the group if the request is approved.

## 3. Group Admin Edits a Group

1. The Group Admin selects a group they administer.
2. They edit its name, description, theme colour or age limit.
3. They select Save changes.
4. Invalid input displays an error.
5. Valid changes are saved and confirmation is displayed.

No user request is required for this action.

## 4. Group Admin Manages Chat Rooms

1. The Group Admin opens a managed group's administration screen.
2. They create a room or edit an existing room's details.
3. They save the changes and receive confirmation.
4. To delete a room, they select Delete beside that room.
5. A confirmation identifies the room being deleted.
6. Confirming deletes the room; cancelling keeps it.

## 5. Group Admin Bans a Member

1. The Group Admin selects a member of a managed group.
2. They select Ban from group.
3. A confirmation identifies the member and group.
4. Confirming applies the ban to that group.
5. The interface displays the outcome.

This does not delete the member's system account.

## 6. Group Admin Requests a Deletion

1. The Group Admin selects Request group deletion or
   Request account deletion.
2. The request identifies the target group or user.
3. The Group Admin submits the request to a Super Admin.
4. The Super Admin reviews the request.
5. Before executing deletion, the interface confirms the target.
6. The interface displays the outcome.

Only a Super Admin can delete a system account.

## Prototype Scope

These sequences describe the planned interactions.
Request processing may use mock data in Phase 1.
Basic login and the required creation, assignment and JSON
persistence functions must work in the Phase 1 prototype.