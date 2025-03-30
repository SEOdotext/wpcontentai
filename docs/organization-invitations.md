# Organization Invitations and Multi-Organization Membership

## Overview
This document outlines how to handle organization invitations and manage users who can be members or admins in multiple organizations.

## Database Schema
The system uses the following tables:
- `organisation_memberships`: Links users to organizations with roles
- `user_profiles`: Stores user information
- `website_access`: Manages website access for organization members

## Supabase Implementation

### Database Functions

#### 1. `handle_organisation_invitation`
```sql
CREATE OR REPLACE FUNCTION handle_organisation_invitation(
    p_email TEXT,
    p_organisation_id UUID,
    p_role TEXT,
    p_website_ids UUID[] DEFAULT NULL
) RETURNS JSONB
```
This function handles the entire invitation process:
- Checks if user exists
- Creates new user if needed
- Adds user to organization
- Sets up website access
- Returns status and user details

#### 2. `send_invitation_email`
```sql
CREATE OR REPLACE FUNCTION send_invitation_email(
    p_user_id UUID,
    p_organisation_id UUID,
    p_is_new_user BOOLEAN
) RETURNS void
```
This function handles email notifications:
- Gets user and organization details
- Prepares website access information
- Logs email details (actual sending to be implemented)

### Security Policies

#### 1. Admin-only Invitations
```sql
CREATE POLICY "Only admins can invite users"
    ON organisation_memberships
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM organisation_memberships
            WHERE member_id = auth.uid()
            AND organisation_id = organisation_memberships.organisation_id
            AND role = 'admin'
        )
    );
```

#### 2. Website Access Management
```sql
CREATE POLICY "Only admins can manage website access"
    ON website_access
    FOR ALL
    USING (
        EXISTS (
            SELECT 1
            FROM organisation_memberships om
            JOIN websites w ON w.organisation_id = om.organisation_id
            WHERE om.member_id = auth.uid()
            AND om.role = 'admin'
            AND w.id = website_access.website_id
        )
    );
```

## Application Implementation

### Example Usage in React
```typescript
const handleInvite = async (email: string, role: 'admin' | 'member', websiteIds?: string[]) => {
  try {
    // Handle invitation
    const { data, error } = await supabase.rpc('handle_organisation_invitation', {
      p_email: email,
      p_organisation_id: currentOrg.id,
      p_role: role,
      p_website_ids: websiteIds
    });

    if (error) throw error;

    if (data.status === 'success') {
      // Send invitation email
      await supabase.rpc('send_invitation_email', {
        p_user_id: data.user_id,
        p_organisation_id: currentOrg.id,
        p_is_new_user: data.is_new_user
      });

      toast.success(data.message);
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    console.error('Error inviting user:', error);
    toast.error('Failed to invite user');
  }
};
```

## Invitation Flow

### Unified Invitation Process
1. Admin enters user's email address
2. System checks if user exists:
   - If user exists in `user_profiles`:
     - Skip to step 4
   - If user doesn't exist:
     - Create new user in `auth.users`
     - Create `user_profile` record
     - Send welcome email with account setup instructions

3. System checks if user is already in organization:
   - If yes: Show message "User is already a member of this organization"
   - If no: Continue with invitation

4. Create `organisation_membership` record with:
   - Selected role (admin/member)
   - Organization ID
   - User ID

5. If role is 'member':
   - Create `website_access` records for selected websites
   - Include website list in notification

6. Send appropriate notification:
   - For new users: Welcome email with account setup and organization details
   - For existing users: Organization access notification with role and website access

## Multi-Organization Support

### User Profile Structure
```sql
user_profiles {
  id: uuid (primary key)
  email: text
  first_name: text
  last_name: text
  created_at: timestamp
}
```

### Organization Membership Structure
```sql
organisation_memberships {
  id: uuid (primary key)
  member_id: uuid (references user_profiles.id)
  organisation_id: uuid (references organisations.id)
  role: text ('admin' or 'member')
  created_at: timestamp
  UNIQUE(member_id, organisation_id)
}
```

### Website Access Structure
```sql
website_access {
  id: uuid (primary key)
  user_id: uuid (references user_profiles.id)
  website_id: uuid (references websites.id)
  created_at: timestamp
}
```

## Implementation Guidelines

### 1. Role Management
- Users can have different roles in different organizations
- Role changes in one organization don't affect other organizations
- Admins can only manage roles within their organizations

### 2. Website Access
- Website access is organization-specific
- Members only get access to websites in their organization
- Admins have access to all websites in their organization
- Website access is managed per organization

### 3. Security Considerations
- Row Level Security (RLS) policies ensure users can only:
  - View memberships in their organizations
  - Manage memberships if they're an admin
  - Access websites they have permission for
- Each organization's data is isolated

### 4. UI/UX Considerations
- Show organization switcher in header
- Display current organization name
- Show role badges with organization context
- List websites accessible in current organization
- Allow quick switching between organizations
- Single invitation form for both new and existing users
- Clear feedback messages about user status

## Testing Scenarios

1. **New User Invitation**
   - Enter new email address
   - Verify user creation
   - Check welcome email
   - Verify organization access

2. **Existing User Invitation**
   - Enter existing email
   - Verify organization addition
   - Check notification email
   - Verify website access

3. **Multi-Organization Access**
   - Add user to multiple organizations
   - Assign different roles
   - Set different website access
   - Verify isolation

4. **Role Management**
   - Change roles in different organizations
   - Verify role changes are isolated
   - Check website access updates

5. **Security**
   - Verify RLS policies
   - Test cross-organization access
   - Validate admin permissions

6. **Edge Cases**
   - Invite user already in organization
   - Invite non-existent email
   - Invite with invalid role
   - Invite with no website access

## Next Steps

1. **Email Implementation**
   - Set up email service (SendGrid, AWS SES, etc.)
   - Create email templates for:
     - New user welcome
     - Organization invitation
     - Role changes
   - Implement email verification

2. **User Onboarding**
   - Create password setup flow for new users
   - Add profile completion steps
   - Implement organization switching tutorial

3. **Monitoring**
   - Add logging for invitation process
   - Track email delivery status
   - Monitor failed invitations 