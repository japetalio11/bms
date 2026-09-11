import { useState, useRef, useEffect, useCallback } from "react";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type UserCredential,
  type User
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  formatToE164,
  isValidE164,
  getFirebaseErrorMessage,
  isTestPhoneNumber
} from "@/lib/phoneAuthUtils";

export interface UsePhoneAuthOptions {
  containerId?: string;
  recaptchaSize?: "normal" | "invisible";
  cooldownDuration?: number;
  defaultCountryPrefix?: string;
}

export interface UsePhoneAuthReturn {
  sendOtp: (phoneInput: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  resetAuth: () => void;
  cooldown: number;
  isSubmitting: boolean;
  isOtpSent: boolean;
  isVerified: boolean;
  statusMessage: string;
  statusType: "info" | "success" | "error" | "";
  formattedPhone: string;
  user: User | null;
  resetRecaptchaState: () => void;
  lastError: { code?: string; message?: string; details?: any } | null;
}

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    grecaptcha?: {
      reset: (widgetId?: number) => void;
    };
  }
}

export function usePhoneAuth(options: UsePhoneAuthOptions = {}): UsePhoneAuthReturn {
  const {
    containerId = "recaptcha-container",
    recaptchaSize = "invisible",
    cooldownDuration = 60,
    defaultCountryPrefix = "+63"
  } = options;

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);

  const [cooldown, setCooldown] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusType, setStatusType] = useState<"info" | "success" | "error" | "">("");
  const [formattedPhone, setFormattedPhone] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [lastError, setLastError] = useState<{ code?: string; message?: string; details?: any } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const cleanupRecaptcha = useCallback(() => {
    try {
      if (verifierRef.current) {
        try {
          verifierRef.current.clear();
        } catch (_) {}
        verifierRef.current = null;
      }
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (_) {}
        window.recaptchaVerifier = undefined;
      }

      if (window.grecaptcha && typeof window.grecaptcha.reset === "function") {
        try {
          window.grecaptcha.reset();
        } catch (_) {}
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecaptcha();
    };
  }, [cleanupRecaptcha]);

  const getOrInitRecaptcha = useCallback((): RecaptchaVerifier => {
    if (verifierRef.current) {
      return verifierRef.current;
    }

    cleanupRecaptcha();

    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }

    const newVerifier = new RecaptchaVerifier(auth, containerId, {
      size: recaptchaSize,
      callback: () => {
        console.log("✅ [reCAPTCHA] Verification Callback Fired");
      },
      "expired-callback": () => {
        console.warn("⚠️ [reCAPTCHA] Token Expired Callback Fired");
        if (verifierRef.current) {
          try {
            verifierRef.current.render().then((widgetId) => {
              if (window.grecaptcha) window.grecaptcha.reset(widgetId);
            });
          } catch (_) {}
        }
      }
    });

    verifierRef.current = newVerifier;
    window.recaptchaVerifier = newVerifier;
    return newVerifier;
  }, [containerId, recaptchaSize, cleanupRecaptcha]);

  const resetRecaptchaState = useCallback(() => {
    cleanupRecaptcha();
  }, [cleanupRecaptcha]);

  const sendOtp = useCallback(
    async (phoneInput: string): Promise<boolean> => {
      setLastError(null);

      if (cooldown > 0) {
        setStatusType("error");
        setStatusMessage(`Please wait ${cooldown} seconds before requesting a new OTP.`);
        return false;
      }

      if (isSubmitting) return false;

      const formatted = formatToE164(phoneInput, defaultCountryPrefix);
      setFormattedPhone(formatted);

      if (!isValidE164(formatted)) {
        setStatusType("error");
        setStatusMessage(
          `Invalid phone number format: "${phoneInput}". Please enter a valid phone number (e.g., 09171234567).`
        );
        return false;
      }

      setIsSubmitting(true);
      setStatusType("info");
      setStatusMessage(`Initiating SMS verification for ${formatted}...`);

      const isDev = import.meta.env.DEV || import.meta.env.MODE !== "production";
      const isTestNum = isTestPhoneNumber(formatted);

      console.group("🔥 [Firebase Phone Auth Detailed Debug]");
      console.log("📞 Target Input Phone:", phoneInput);
      console.log("📱 Formatted E.164:", formatted);
      console.log("🧪 Is Dev Environment:", isDev);
      console.log("🎯 Is Recognized Test Number:", isTestNum);
      console.log("⚙️ Firebase Project ID:", auth.app.options.projectId);
      console.log("🔑 Firebase Auth Domain:", auth.app.options.authDomain);
      console.log("🌐 Current Location Origin:", window.location.origin);
      console.log("📦 Container ID Target:", containerId);

      const containerEl = document.getElementById(containerId);
      console.log("🖼️ Container Element in DOM:", containerEl);
      if (containerEl) {
        const computedStyle = window.getComputedStyle(containerEl);
        console.log("📐 Container Dimensions & Style:", {
          offsetWidth: containerEl.offsetWidth,
          offsetHeight: containerEl.offsetHeight,
          display: computedStyle.display,
          visibility: computedStyle.visibility
        });
      }

      if (isDev && isTestNum) {
        console.log("⚡ Enabling appVerificationDisabledForTesting = true (Bypassing reCAPTCHA for test number)");
        auth.settings.appVerificationDisabledForTesting = true;
      } else if (isDev) {
        console.log("🛡️ Setting appVerificationDisabledForTesting = false (Executing real reCAPTCHA flow)");
        auth.settings.appVerificationDisabledForTesting = false;
      }

      try {
        console.log("🔨 Initializing/Fetching RecaptchaVerifier...");
        const appVerifier = getOrInitRecaptcha();

        console.log("🎨 Explicitly rendering RecaptchaVerifier widget in DOM...");
        await appVerifier.render();

        console.log("🚀 Calling signInWithPhoneNumber(auth, formatted, appVerifier)...");
        const confirmationResult = await signInWithPhoneNumber(auth, formatted, appVerifier);
        confirmationResultRef.current = confirmationResult;

        console.log("🎉 signInWithPhoneNumber SUCCESS! Verification Session ID:", confirmationResult.verificationId);
        console.groupEnd();

        setIsOtpSent(true);
        setStatusType("success");
        setStatusMessage(
          isTestNum
            ? `📲 Test OTP ready! Use test code "123456" for test number ${formatted}.`
            : `📲 SMS OTP sent to ${formatted}! Please check your phone.`
        );

        setCooldown(cooldownDuration);
        return true;
      } catch (error: any) {
        console.groupEnd();
        console.group("❌ [Firebase Phone Auth Error Trace]");
        console.error("Code:", error?.code);
        console.error("Message:", error?.message);
        console.error("CustomData:", error?.customData);
        console.error("Full Error Object:", error);
        console.groupEnd();

        setLastError({
          code: error?.code || "unknown_error",
          message: error?.message || String(error),
          details: {
            customData: error?.customData,
            origin: window.location.origin,
            formattedPhone: formatted,
            isTestNum,
            recaptchaContainerExists: !!document.getElementById(containerId)
          }
        });

        resetRecaptchaState();
        const humanMessage = getFirebaseErrorMessage(error?.code || error?.message || "");
        setStatusType("error");
        setStatusMessage(humanMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [cooldown, isSubmitting, defaultCountryPrefix, cooldownDuration, getOrInitRecaptcha, resetRecaptchaState]
  );

  const verifyOtp = useCallback(
    async (code: string): Promise<boolean> => {
      if (!confirmationResultRef.current) {
        setStatusType("error");
        setStatusMessage("No active SMS verification session. Please request a new OTP.");
        return false;
      }

      const cleanCode = code.trim();
      if (!cleanCode || cleanCode.length < 6) {
        setStatusType("error");
        setStatusMessage("Please enter the complete 6-digit verification code.");
        return false;
      }

      setIsSubmitting(true);
      setStatusType("info");
      setStatusMessage("Verifying OTP code...");

      try {
        const result: UserCredential = await confirmationResultRef.current.confirm(cleanCode);
        setUser(result.user);
        setIsVerified(true);
        setStatusType("success");
        setStatusMessage(`🎉 Verification Successful! Verified Phone: ${result.user.phoneNumber}`);
        return true;
      } catch (error: any) {
        const humanMessage = getFirebaseErrorMessage(error?.code || error?.message || "");
        setStatusType("error");
        setStatusMessage(humanMessage);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const resetAuth = useCallback(() => {
    confirmationResultRef.current = null;
    setIsOtpSent(false);
    setIsVerified(false);
    setStatusMessage("");
    setStatusType("");
    setUser(null);
    cleanupRecaptcha();
  }, [cleanupRecaptcha]);

  return {
    sendOtp,
    verifyOtp,
    resetAuth,
    cooldown,
    isSubmitting,
    isOtpSent,
    isVerified,
    statusMessage,
    statusType,
    formattedPhone,
    user,
    resetRecaptchaState,
    lastError
  };
}
