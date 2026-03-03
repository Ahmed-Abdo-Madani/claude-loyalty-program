## 🔍 Debug: Production Forgot Password Emails Failing

### 1. Symptom
In the production environment, the `forgot-password` endpoint fails to send the password reset email. The associated logs indicate:
`"error": "The madna.me domain is not verified. Please, add and verify your domain on https://resend.com/domains", "code": "EMAIL_SEND_FAILED"`

### 2. Information Gathered
- A previous effort fixed a similar email sending issue by updating the domain to the newly verified `updates.madna.me` within the backend's `.env` file.
- The `forgot-password` logic relies on `EmailService.sendTransactional()`, which sets the sender according to `process.env.EMAIL_FROM`.
- The root project `.env` file and `backend/.env.production` still contained the old, unverified domain references (`support@madna.me` and `noreply@madna.me`).

### 3. Root Cause
🎯 **The production environment variables for the sender email address still used the unverified `madna.me` domain instead of the verified `updates.madna.me` domain.**
Specifically, the file `backend/.env.production` contained `EMAIL_FROM=noreply@madna.me`. When the production server loaded these variables, Resend rejected the API request because the domain `madna.me` is not verified on the Resend dashboard.

### 4. Fix Applied
Updated the email configuration in `backend/.env.production` from the old domain to the new verified domain:

```bash
# Before
EMAIL_FROM=noreply@madna.me
SUPPORT_EMAIL=customer_support@madna.me
ADMIN_EMAIL=super_admin@madna.me

# After
EMAIL_FROM=noreply@updates.madna.me
SUPPORT_EMAIL=support@updates.madna.me
ADMIN_EMAIL=super_admin@updates.madna.me
CONTACT_FORM_RECIPIENT_EMAIL=support@updates.madna.me
```

*Note: Also updated the root project `.env` to make sure all environment definitions match across the board.*

### 5. Next Steps
You will need to ensure that the environment variables configured within your production hosting platform (e.g., Render, Vercel, Heroku, etc.) are also updated with:
`EMAIL_FROM=noreply@updates.madna.me`

Once the production server inherits these new variables via a deployment or restart, the password reset emails will send successfully!
