# Comprehensive Web Phone SMS Authentication Checklist & Architecture Guide

This master checklist details all requirements to implement web phone SMS authentication cleanly using **Firebase Authentication**, **Google Cloud reCAPTCHA Enterprise**, and **Backend SMS Gateway (iProgSMS)** while avoiding common pitfalls like `auth/invalid-app-credential`, 403 App Check throttling, and Vercel 404 errors.

---

## 1. Firebase Console Setup Checklist

- [ ] **Authorized Domains**
  - Navigate to **Firebase Console > Authentication > Settings > Authorized domains**.
  - Add all environment domains:
    - `localhost`
    - `127.0.0.1`
    - Staging Vercel URLs (e.g. `your-app-git-branch.vercel.app`)
    - Production custom domain (e.g. `app.yourdomain.com`)

- [ ] **Phone Sign-in Provider**
  - Go to **Authentication > Sign-in method > Phone**.
  - Switch the **Enable** toggle to `ON`.

- [ ] **Phone Numbers for Testing (Bypass SMS Quota in Dev)**
  - Under **Sign-in method > Phone**, scroll to **Phone numbers for testing**.
  - Register dev test numbers (e.g. `+639170000000` with verification code `123456`).
  - *Note:* In dev mode, test numbers bypass reCAPTCHA and SMS quotas instantly.

- [ ] **SMS Region Policy**
  - Go to **Authentication > Settings > SMS Region Policy**.
  - Select **Allow specific SMS regions**.
  - Enable **Philippines (`+63`)** (or your target country). Saving this ensures real SMS messages are not suppressed by regional fraud filters.

---

## 2. Google Cloud & reCAPTCHA Enterprise Setup Checklist

- [ ] **reCAPTCHA Enterprise Site Key Creation**
  - Open [Google Cloud Console > reCAPTCHA Enterprise](https://console.cloud.google.com/security/recaptcha).
  - Create a **Website** key.
  - Add allowed domains (`localhost`, `127.0.0.1`, `*.vercel.app`).
  - Copy the generated **Site Key** (`6LdT...`).

- [ ] **Link Site Key in Firebase Console**
  - Go to **Firebase Console > Authentication > reCAPTCHA > Configured platform site keys**.
  - Edit the **`</>` Web** platform key and paste the reCAPTCHA Enterprise Site Key.

- [ ] **App Check Caution (Client SDK)**
  - **Do NOT** call `initializeAppCheck` in client JS unless App Check is fully registered and enforced in **Firebase Console > App Check**. Unregistered App Check client calls return `403 Forbidden` and cause Google to throttle/suppress real SMS delivery for 24 hours.

---

## 3. Frontend Architecture Checklist (`usePhoneAuth.ts`)

- [ ] **E.164 Phone Normalization**
  - Always format phone numbers to E.164 format (e.g. `09686255210` ➔ `+639686255210`) before invoking Firebase Auth.

- [ ] **Singleton `RecaptchaVerifier` Reference (`useRef`)**
  - Store the `RecaptchaVerifier` instance in a React `useRef` to prevent duplicate widget instantiations and DOM leaks across re-renders.

- [ ] **DOM Container Visibility**
  - Ensure the target `#recaptcha-container` is **NOT** set to `display: none` (`className="hidden"`). Invisible reCAPTCHA requires an unhidden DOM node to render iframe bounds.

- [ ] **Explicit Widget Render (`appVerifier.render()`)**
  - Always call `await appVerifier.render()` before calling `signInWithPhoneNumber(auth, formattedPhone, appVerifier)`.

- [ ] **Client Throttling Guard (60s Cooldown)**
  - Maintain a 60-second cooldown state to prevent users from hitting Firebase's rate limit (**5 SMS per number per 10 minutes**).

- [ ] **Safe Teardown (`cleanupRecaptcha`)**
  - On component unmount or auth reset, invoke `verifierRef.current.clear()` safely instead of wiping `container.innerHTML` directly to avoid `recaptcha__en.js` script crashes.

---

## 4. Backend SMS Gateway Setup (iProgSMS)

- [ ] **Direct Gateway Invocation**
  - Do **NOT** call Google's REST API (`identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode`) directly from Node.js (which fails with 400 Bad Request without a client reCAPTCHA token).
  - Call the iProgSMS REST endpoint directly (`https://www.iprogsms.com/api/v1/sms_messages`) using `SMS_API_TOKEN` loaded exclusively from environment variables (`process.env.SMS_API_TOKEN`).

---

## 5. Vercel Single Page Application (SPA) Routing Setup

- [ ] **`vercel.json` Rewrite Rule**
  - Create a `vercel.json` in project root with SPA rewrite rules so direct URL navigation (e.g. `https://your-app.vercel.app/test-sms`) routes to `index.html` without returning 404 Not Found:
    ```json
    {
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/index.html"
        }
      ]
    }
    ```
