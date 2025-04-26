Send an email invite link
Sends an invite link to an email address.

Sends an invite link to the user's email address.
The invite_user_by_email() method is typically used by administrators to invite users to join the application.
Note that PKCE is not supported when using invite_user_by_email. This is because the browser initiating the invite is often different from the browser accepting the invite which makes it difficult to provide the security guarantees required of the PKCE flow.

response = supabase.auth.admin.invite_user_by_email("email@example.com")
