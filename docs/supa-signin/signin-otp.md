Create a new user
Creates a new user.

By default, the user needs to verify their email address before logging in. To turn this off, disable Confirm email in your project.
Confirm email determines if users need to confirm their email address after signing up.
If Confirm email is enabled, a user is returned but session is null.
If Confirm email is disabled, both a user and a session are returned.
When the user confirms their email address, they are redirected to the SITE_URL by default. You can modify your SITE_URL or add additional redirect URLs in your project.
If signUp() is called for an existing confirmed user:
When both Confirm email and Confirm phone (even when phone provider is disabled) are enabled in your project, an obfuscated/fake user object is returned.
When either Confirm email or Confirm phone (even when phone provider is disabled) is disabled, the error message, User already registered is returned.
To fetch the currently logged-in user, refer to getUser().


const { data, error } = await supabase.auth.signUp({
  email: 'example@email.com',
  password: 'example-password',
})

----

const { data, error } = await supabase.auth.signInWithOtp({
  email: 'example@email.com',
  options: {
    emailRedirectTo: 'https://example.com/welcome'
  }
})

---

Sign in a user through OTP
Log in a user using magiclink or a one-time password (OTP).

Requires either an email or phone number.
This method is used for passwordless sign-ins where a OTP is sent to the user's email or phone number.
If the user doesn't exist, signInWithOtp() will signup the user instead. To restrict this behavior, you can set shouldCreateUser in SignInWithPasswordlessCredentials.options to false.
If you're using an email, you can configure whether you want the user to receive a magiclink or a OTP.
If you're using phone, you can configure whether you want the user to receive a OTP.
The magic link's destination URL is determined by the SITE_URL.
See redirect URLs and wildcards to add additional redirect URLs to your project.
Magic links and OTPs share the same implementation. To send users a one-time code instead of a magic link, modify the magic link email template to include {{ .Token }} instead of {{ .ConfirmationURL }}.
See our Twilio Phone Auth Guide for details about configuring WhatsApp sign in.
Parameters
credentials
Required
One of the following options
Details
Option 1
object
Details
Option 2
object
Details
Return Type
Promise<One of the following options>
Details
Option 1
object
Details
Option 2
object
Details
Sign in with email
Sign in with SMS OTP
Sign in with WhatsApp OTP
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'example@email.com',
  options: {
    emailRedirectTo: 'https://example.com/welcome'
  }
})
Response
Notes