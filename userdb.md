Multiple Organization Support:
New: A user can belong to multiple organizations through the organization_memberships table
Role Management:
Old: Role was stored in user_profiles, meaning a user had the same role everywhere
New: Role is stored in organization_memberships, allowing a user to have different roles in different organizations
Data Model:
Old: Organization membership was a direct column in user_profiles
New: Organization membership is a separate table with proper relationships


