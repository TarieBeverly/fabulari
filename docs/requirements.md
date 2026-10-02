# Fabulari — Requirements

## Overview

Fabulari is a community chat application where users communicate
through groups and chat rooms. It supports three permission levels:
User, Group Admin and Super Admin.

## Phase 1 Scope

- Design the interfaces for all three permission levels.
- Implement basic username and password authentication.
- Support creating and assigning users, groups and chat rooms.
- Store users, groups and chat rooms in a JSON file on the server.
- Use mock data for functionality outside the prototype scope.

## Required Technologies

- Angular 20 or later for the frontend.
- Node.js and Express for the backend.
- JSON file storage for Phase 1.
- Git and a private GitHub repository for version control.

## Design Evidence

Store storyboards and wireframes in `docs/design/` and push them
to GitHub before starting application code.
## Confirmed Administration Rules

| Action | Authorised role | Required request |
|---|---|---|
| Create a group | Super Admin | A request from a User |
| Delete a group | Super Admin | A request from a Group Admin |
| Edit a group's name, description, theme colour or age limit | Group Admin | No request required |
| Create, edit or delete chat rooms within a managed group | Group Admin | No request requirement stated |
| Ban a user from an individual managed group | Group Admin | No request requirement stated |
| Delete a user from the entire system | Super Admin | A request from a Group Admin |

Administrative actions do not all require user requests.
A group ban and deletion of a system account are separate actions.

## Requirements Sources

- Assignment-2026 (2).pdf
- Client briefing transcript from 22 July 2026
- Requirements clarification transcript from 29 July 2026
- Additional clarification supplied by the teaching team