## 🔍 Debug: Contact Us Page Failing to Send Messages

### 1. Symptom
The "Contact Us" page (`http://localhost:3000/contact`) was failing to send messages. The user suspected it was related to recent modifications on emailing.

### 2. Information Gathered
- The `ContactSupportModal.jsx` component successfully sends messages to `/api/contact`. 
- Testing the `/api/contact` endpoint directly with a test script (`check-contact.mjs`) confirmed that the backend successfully processes the request and sends the emails.
- Reviewing `src/pages/ContactPage.jsx` logic revealed it was using an incorrect environment variable reference.

### 3. Hypotheses
1. ❓ The frontend fetch request is pointing to the wrong URL due to an incorrect environment variable.
2. ❓ The backend endpoint `/api/contact` is failing due to missing `EMAIL_FROM` or `CONTACT_FORM_RECIPIENT_EMAIL` configuration.
3. ❓ The backend email service is encountering an error rendering the template or sending it via Resend.

### 4. Investigation

**Testing hypothesis 2 & 3:**
Created a test script (`check-contact.mjs`) to hit the API directly.
Result: The API returned `200 OK` with successfully sent email flags. The backend works correctly.

**Testing hypothesis 1:**
Checked the `src/pages/ContactPage.jsx` submit logic.
Result: The `fetch` call was using `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/contact`. 
However, the project uses `VITE_API_BASE_URL` in its `.env` file, meaning `import.meta.env.VITE_API_URL` was `undefined`. In Vite, if the env variable isn't prefixed with `VITE_` and isn't correctly referenced, or if the fallback URL is invalid in production, the API call goes nowhere or to the wrong address.

### 5. Root Cause
🎯 **The `ContactPage.jsx` component was using `import.meta.env.VITE_API_URL` instead of the correct `import.meta.env.VITE_API_BASE_URL` defined in the `.env` file.** This resulted in the fetch request failing to reach the backend properly, especially in environments where the fallback `http://localhost:3001` wasn't reachable via the browser due to CORS or when running through ngrok.

### 6. Fix
```javascript
// Before (in src/pages/ContactPage.jsx)
const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/contact`, {
  // ...
})

// After
const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/contact`, {
  // ...
})
```

*Note: The preferred method in the project is to use the `publicApi.post(endpoints.contactSupport, ...)` utility from `src/config/api.js`, which automatically handles the base URL and language headers. However, fixing the environment variable directly resolves the immediate issue without a larger refactoring.*

### 7. Prevention
🛡️ Consistent API URL usage: Always rely on `src/config/api.js` (`endpoints` and `publicApi`/`secureApi`) for API calls instead of hardcoding `fetch` and `import.meta.env` references in individual components.
