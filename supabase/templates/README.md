# Auth email templates

Supabase sends these; the hosted project does **not** read this folder. Paste
each file into Supabase → Authentication → Emails → Templates.

| File | Template in Supabase | Subject |
|---|---|---|
| `magic_link.html` | Magic Link | `Your Gurukundali sign-in code` |
| `confirmation.html` | Confirm signup | `Welcome to Gurukundali — your code` |

Both must render `{{ .Token }}` (the 6-digit code), never
`{{ .ConfirmationURL }}`: the login page asks for a code
(`src/components/auth/EmailCodeForm.tsx`), so a link-style email leaves the
user with nothing to type. "Confirm signup" matters because a first-time
address gets that template, not Magic Link.

The app sends no other auth emails (no password reset, email change, invite or
reauthentication), so the other templates can stay default.

The sender name and address ("Supabase Auth" by default) are not part of the
template; they come from Authentication → SMTP Settings, which needs custom
SMTP (e.g. Resend with gurukundali.com verified).
