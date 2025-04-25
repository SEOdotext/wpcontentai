Send an email invite link
Sends an invite link to an email address.

Sends an invite link to the user's email address.
The inviteUserByEmail() method is typically used by administrators to invite users to join the application.
Note that PKCE is not supported when using inviteUserByEmail. This is because the browser initiating the invite is often different from the browser accepting the invite which makes it difficult to provide the security guarantees required of the PKCE flow.
Parameters
email
Required
string
The email address of the user.

options
Required
object
Additional options to be included when inviting.

Details
Return Type
Promise<One of the following options>
Details
Option 1
object
Details
data
Required
object
Details
user
Required
User
Details
app_metadata
Required
UserAppMetadata
Details
aud
Required
string
created_at
Required
string
id
Required
string
user_metadata
Required
UserMetadata
action_link
Optional
string
confirmation_sent_at
Optional
string
confirmed_at
Optional
string
email
Optional
string
email_change_sent_at
Optional
string
email_confirmed_at
Optional
string
factors
Optional
Array<Factor>
Details
identities
Optional
Array<UserIdentity>
Details
invited_at
Optional
string
is_anonymous
Optional
boolean
is_sso_user
Optional
boolean
last_sign_in_at
Optional
string
new_email
Optional
string
new_phone
Optional
string
phone
Optional
string
phone_confirmed_at
Optional
string
recovery_sent_at
Optional
string
role
Optional
string
updated_at
Optional
string
error
Required
null
Option 2
object
Details
data
Required
object
Details
user
Required
null
error
Required
AuthError
Invite a user
const { data, error } = await supabase.auth.admin.inviteUserByEmail('email@example.com')
Response
Generate an email link
Generates email links and OTPs to be sent via a custom email provider.

The following types can be passed into generateLink(): signup, magiclink, invite, recovery, email_change_current, email_change_new, phone_change.
generateLink() only generates the email link for email_change_email if the Secure email change is enabled in your project's email auth provider settings.
generateLink() handles the creation of the user for signup, invite and magiclink.
Parameters
params
Required
GenerateLinkParams
Details
Return Type
Promise<One of the following options>
Details
Option 1
object
Details
data
Required
object
Details
properties
Required
GenerateLinkProperties
Details
action_link
Required
string
The email link to send to the user. The action_link follows the following format: auth/v1/verify?type={verification_type}&token={hashed_token}&redirect_to={redirect_to}

email_otp
Required
string
The raw email OTP. You should send this in the email if you want your users to verify using an OTP instead of the action link.

hashed_token
Required
string
The hashed token appended to the action link.

redirect_to
Required
string
The URL appended to the action link.

verification_type
Required
One of the following options
The verification type that the email link is associated to.

Details
Option 1
"signup"
Option 2
"invite"
Option 3
"magiclink"
Option 4
"recovery"
Option 5
"email_change_current"
Option 6
"email_change_new"
user
Required
User
Details
app_metadata
Required
UserAppMetadata
Details
provider
Optional
string
aud
Required
string
created_at
Required
string
id
Required
string
user_metadata
Required
UserMetadata
action_link
Optional
string
confirmation_sent_at
Optional
string
confirmed_at
Optional
string
email
Optional
string
email_change_sent_at
Optional
string
email_confirmed_at
Optional
string
factors
Optional
Array<Factor>
Details
identities
Optional
Array<UserIdentity>
Details
invited_at
Optional
string
is_anonymous
Optional
boolean
is_sso_user
Optional
boolean
last_sign_in_at
Optional
string
new_email
Optional
string
new_phone
Optional
string
phone
Optional
string
phone_confirmed_at
Optional
string
recovery_sent_at
Optional
string
role
Optional
string
updated_at
Optional
string
error
Required
null
Option 2
object
Details