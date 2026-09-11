import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (typeof window !== "undefined" && recaptchaSiteKey) {
  try {
    if (import.meta.env.DEV) {
      // @ts-ignore
      self.FIREBASE_APPCHECK_EXECUTE_IN_DEV = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn("[Firebase AppCheck Warning]:", err);
  }
} else if (typeof window !== "undefined") {
  console.warn("Warning: VITE_RECAPTCHA_SITE_KEY is missing from environment variables.");
}

export default app;
