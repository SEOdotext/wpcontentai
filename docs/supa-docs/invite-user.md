# User Invitation Flow

## Admin Invites User
1. Admin uses `supabase.auth.admin.inviteUserByEmail(email, options)` to send invitation
2. User receives email with magic link containing token
3. User clicks link and is redirected to `/auth/callback?token=...`
4. AuthCallback exchanges token for session using `exchangeCodeForSession`
5. User is redirected to dashboard

## Code Example
```typescript
// Send invitation
const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
  data: {
    organisation_id: organisation.id,
    role: role
  }
});

// Handle callback (in AuthCallback.tsx)
const { data, error } = await supabase.auth.exchangeCodeForSession(token);
```

## Important Notes
- PKCE is not supported for invites
- Invitation links are single-use
- Invites include custom metadata (org ID, role)
