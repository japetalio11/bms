# Firebase Phone Authentication Setup & Verification Guide

This guide details the exact steps required to configure Firebase Console, manage SMS rate limits, and implement Native Mobile App Attestation (Android & iOS) to prevent `auth/too-many-requests` and reCAPTCHA errors permanently.

---

## 1. Firebase Console Configuration Checklist

### A. Authorized Domains
Firebase Phone Auth requires all origin domains to be authorized to initialize `RecaptchaVerifier`.
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication > Settings > Authorized domains**.
3. Add the following origins:
   - `localhost` (Default for local development)
   - `127.0.0.1`
   - Your production frontend domain (e.g., `app.yourdomain.com`)
   - Staging/Vercel preview URLs (e.g., `*.vercel.app`)

---

### B. Add Phone Numbers for Testing (Bypass SMS Quota & Captcha)
Configuring test numbers allows developers and automated end-to-end tests to bypass SMS quotas and reCAPTCHA verification during local development.

1. Go to **Authentication > Sign-in method > Phone**.
2. Scroll to **Phone numbers for testing**.
3. Add test number pairs, for example:
   - **Phone Number:** `+639170000000` | **Verification Code:** `123456`
   - **Phone Number:** `+639171111111` | **Verification Code:** `123456`
4. *Note:* When these numbers are passed to `signInWithPhoneNumber`, Firebase does not send an actual SMS, nor does it consume SMS quotas or trigger rate limits.

---

### C. SMS Region Policy & Enforcement
To prevent billing fraud and unexpected rate-limiting from global SMS abuse:
1. Go to **Authentication > Settings > SMS Region Policy**.
2. Select **Allow specific SMS regions**.
3. Enable only the countries where your application operates (e.g., **Philippines (`+63`)**).
4. Save changes.

---

## 2. Preventing `auth/too-many-requests` (Best Practices Implemented)

Firebase Authentication enforces strict rate limits:
- **150 SMS requests per IP address per hour**.
- **5 SMS requests per phone number per 10 minutes** (production numbers).

### Applied Engineering Solution in `usePhoneAuth.ts`:
1. **Singleton `RecaptchaVerifier` Reference (`useRef`)**:
   - Ensures `RecaptchaVerifier` is instantiated only once per lifecycle rather than on every render.
2. **Explicit Teardown (`cleanupRecaptcha`)**:
   - Destroys active verifiers using `clear()` and empties container DOM before instantiating a new instance or switching screens.
3. **60-Second Mandatory Cooldown Timer**:
   - Prevents users or scripts from firing rapid repeated requests.
4. **Auto-Recovery on Error**:
   - Upon catching `auth/too-many-requests` or network errors, `resetRecaptchaState()` automatically clears stale captcha tokens and widget state so subsequent requests succeed cleanly after the cooldown expires.

---

## 3. Native Mobile App Attestation (Flutter / React Native / Expo)

When building native mobile apps (iOS & Android), Firebase Phone Authentication bypasses web reCAPTCHA entirely using silent app attestation.

### A. Android Setup (Play Integrity API)
1. **Register SHA Fingerprints:**
   - Obtain your app's debug and release SHA-1 & SHA-256 fingerprints:
     ```bash
     cd android && ./gradlew signingReport
     ```
   - Go to **Firebase Console > Project Settings > General > Your Android App**.
   - Add both **SHA-1** and **SHA-256** fingerprints.

2. **Enable Google Play Integrity API:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Select your Firebase Project.
   - Search for **Play Integrity API** and click **Enable**.

3. **Silent Attestation Flow:**
   - Android will verify app authenticity via Play Integrity. If Play Integrity fails or SHA fingerprints are missing, Firebase Auth falls back to opening a Web reCAPTCHA modal.

---

### B. iOS Setup (APNs Silent Notifications)
1. **Enable Push Notifications & Background Modes:**
   - In Xcode under **Signing & Capabilities**:
     - Add **Push Notifications**.
     - Add **Background Modes** and check **Remote notifications**.

2. **Upload APNs Key to Firebase Console:**
   - Download an **APNs Key (`.p8`)** from the Apple Developer Account (Certificates, Identifiers & Profiles > Keys).
   - Go to **Firebase Console > Project Settings > Cloud Messaging > iOS app configuration**.
   - Upload the `.p8` key, Key ID, and Team ID.

3. **App Attestation Flow:**
   - On iOS, Firebase Auth sends a silent APNs push notification to verify the device. If APNs is not configured, iOS falls back to SFSafariViewController reCAPTCHA verification.

---

## 4. Architectural Summary

```
                       +---------------------------------------+
                       |           User Input Form             |
                       +---------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       |    formatToE164 (Phone Normalizer)    |
                       +---------------------------------------+
                                           |
                                           v
                       +---------------------------------------+
                       | Client Throttling (60s Cooldown Guard) |
                       +---------------------------------------+
                                           |
                                           v
            +-----------------------------------------------------+
            | Is Dev & Test Number? (+639170000000)               |
            +-----------------------------------------------------+
                     /                                   \
             (Yes)  /                                     \ (No)
                   v                                       v
+------------------------------------+   +------------------------------------+
| auth.settings.appVerification...   |   |  getOrInitRecaptcha (Singleton)    |
| = true (Instant Mock Verification) |   |  (Invisible reCAPTCHA / APNs)       |
+------------------------------------+   +------------------------------------+
                   \                                       /
                    v                                     v
                       +---------------------------------------+
                       |   signInWithPhoneNumber (Firebase)    |
                       +---------------------------------------+
                                           |
                    +----------------------+----------------------+
                    |                                             |
             (Success) v                                  (Error) v
  +-------------------------------+             +-------------------------------+
  | Store ConfirmationResult      |             | Automatic reCAPTCHA Teardown  |
  | Prompt 6-digit OTP Input      |             | Human-Readable Error Message  |
  +-------------------------------+             +-------------------------------+
```
