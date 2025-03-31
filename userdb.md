# User & Organization Data Model

## Multiple Organization Support
- **New**: A user can belong to multiple organizations through the `organisation_memberships` table
- **Old**: Previously, a user could only belong to one organization (stored in `user_profiles`)

## Role Management
- **Old**: Role was stored in `user_profiles`, meaning a user had the same role everywhere
- **New**: Role is stored in `organisation_memberships`, allowing a user to have different roles in different organizations

## Data Model
- **Old**: Organization membership was a direct column in `user_profiles`
- **New**: Organization membership is a separate table with proper relationships

## Key Functions

### Adding Users
- `handle_organisation_invitation(p_email, p_organisation_id, p_role, p_website_ids)`: Adds a user to an organization
  - Checks if the user exists in `auth.users`
  - Verifies the user isn't already a member of the organization
  - Creates membership record in `organisation_memberships`
  - Assigns website access if needed

### Removing Users
- `remove_user_from_organisation(p_user_id, p_organisation_id)`: Removes a user from a specific organization
  - Removes website access for websites in the organization
  - Deletes the organization membership record

### Cleanup on User Deletion
- `handle_user_deletion()`: Trigger function that runs when a user is deleted from `auth.users`
  - Removes all website access records for the user
  - Deletes all organization memberships for the user

## User Interface
The Team Management page allows:
- Inviting new users to join the organization
- Managing user roles (admin/member) within the organization
- Controlling website access for members
- Removing users from the organization

## Data Flow
1. User signs up via authentication
2. User is invited to an organization with a specific role
3. User is granted access to websites based on role
4. User can be removed from organizations independently
5. If a user account is deleted, all memberships and access are cleaned up


