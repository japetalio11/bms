import React, { useState } from "react";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { formatToE164, isValidE164, MOCK_TEST_NUMBERS } from "@/lib/phoneAuthUtils";

export function TestSmsPage() {
  const [method, setMethod] = useState<"backend" | "firebase">("firebase");
  const [phoneNumber, setPhoneNumber] = useState("09242926043");
  const [otpCode, setOtpCode] = useState("");

  const [backendLoading, setBackendLoading] = useState(false);
  const [backendSent, setBackendSent] = useState(false);
  const [backendVerified, setBackendVerified] = useState(false);
  const [backendStatusMsg, setBackendStatusMsg] = useState("");
  const [backendStatusType, setBackendStatusType] = useState<"info" | "success" | "error" | "">("");

  const {
    sendOtp,
    verifyOtp,
    resetAuth,
    cooldown,
    isSubmitting: firebaseSubmitting,
    isOtpSent: firebaseSent,
    isVerified: firebaseVerified,
    statusMessage: firebaseStatusMsg,
    statusType: firebaseStatusType
  } = usePhoneAuth({
    containerId: "recaptcha-container",
    recaptchaSize: "invisible",
    cooldownDuration: 60
  });

  const displayFormattedPhone = formatToE164(phoneNumber);

  const handleBackendSendSMS = async () => {
    if (!displayFormattedPhone || !isValidE164(displayFormattedPhone)) {
      setBackendStatusType("error");
      setBackendStatusMsg("Invalid phone number format for Backend SMS.");
      return;
    }

    setBackendLoading(true);
    setBackendStatusType("info");
    setBackendStatusMsg(`Sending SMS via iProgSMS Backend to ${displayFormattedPhone}...`);

    try {
      const response = await fetch("http://localhost:6700/send/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: displayFormattedPhone,
          type: "sms",
          purpose: "verification",
          provider: "sms"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to send SMS via backend.");
      }

      setBackendSent(true);
      setBackendStatusType("success");
      setBackendStatusMsg(`📲 Real SMS sent via iProgSMS Backend to ${displayFormattedPhone}! Check your phone.`);
    } catch (error: any) {
      setBackendStatusType("error");
      setBackendStatusMsg(`Backend SMS Error: ${error.message || "Failed to send SMS"}`);
    } finally {
      setBackendLoading(false);
    }
  };

  const handleBackendVerifyOTP = async () => {
    if (!otpCode) return;
    setBackendLoading(true);
    setBackendStatusType("info");
    setBackendStatusMsg("Verifying iProgSMS OTP code...");

    try {
      const response = await fetch("http://localhost:6700/send/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: displayFormattedPhone,
          code: otpCode,
          purpose: "verification"
        })
      });

      const data = await response.json();

      if (!response.ok || !data.data) {
        throw new Error(data.error || "Invalid or expired OTP code.");
      }

      setBackendVerified(true);
      setBackendStatusType("success");
      setBackendStatusMsg(`🎉 Backend Verification Successful for ${displayFormattedPhone}!`);
    } catch (error: any) {
      setBackendStatusType("error");
      setBackendStatusMsg(`OTP Verification Failed: ${error.message}`);
    } finally {
      setBackendLoading(false);
    }
  };

  const handleSendSMS = async () => {
    if (method === "backend") {
      await handleBackendSendSMS();
    } else {
      await sendOtp(phoneNumber);
    }
  };

  const handleVerifyOTP = async () => {
    if (method === "backend") {
      await handleBackendVerifyOTP();
    } else {
      await verifyOtp(otpCode);
    }
  };

  const handleReset = () => {
    setOtpCode("");
    if (method === "backend") {
      setBackendSent(false);
      setBackendVerified(false);
      setBackendStatusMsg("");
      setBackendStatusType("");
    } else {
      resetAuth();
    }
  };

  const isSent = method === "backend" ? backendSent : firebaseSent;
  const isVerified = method === "backend" ? backendVerified : firebaseVerified;
  const isLoading = method === "backend" ? backendLoading : firebaseSubmitting;
  const activeStatusMsg = method === "backend" ? backendStatusMsg : firebaseStatusMsg;
  const activeStatusType = method === "backend" ? backendStatusType : firebaseStatusType;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div id="recaptcha-container" className="hidden"></div>

      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <span>📱</span> Phone SMS Auth Tester
          </h1>
          <p className="text-xs text-slate-400">
            Resilient Phone Authentication with reCAPTCHA Singleton & Throttling Guards
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => {
              setMethod("backend");
              handleReset();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              method === "backend"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Backend (iProgSMS)
          </button>
          <button
            type="button"
            onClick={() => {
              setMethod("firebase");
              handleReset();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              method === "firebase"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Firebase Auth
          </button>
        </div>

        {method === "firebase" && (
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-slate-300">
              <span>🛠️ Dev Test Numbers (Firebase Console)</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Bypasses SMS Rate Limits
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_TEST_NUMBERS.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    setPhoneNumber(num);
                    if (num === "+639170000000") setOtpCode("123456");
                  }}
                  disabled={isLoading || isSent}
                  className={`text-[11px] font-mono px-2 py-1 rounded transition-colors border ${
                    phoneNumber === num
                      ? "bg-blue-900/60 text-blue-300 border-blue-500"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                >
                  {num} {num === "+639170000000" ? "(OTP: 123456)" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Mobile Phone Number
              </label>
              {displayFormattedPhone && (
                <span className="text-[11px] font-mono text-emerald-400">
                  E.164: {displayFormattedPhone}
                </span>
              )}
            </div>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="09242926043 or +639171234567"
              disabled={isLoading || isSent}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-base disabled:opacity-60"
            />
          </div>

          {!isSent ? (
            <button
              type="button"
              onClick={handleSendSMS}
              disabled={isLoading || !phoneNumber || (method === "firebase" && cooldown > 0)}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span>Sending SMS...</span>
              ) : method === "firebase" && cooldown > 0 ? (
                <span>⏳ Resend Cooldown ({cooldown}s)</span>
              ) : (
                <span>Send SMS OTP ({method === "backend" ? "iProgSMS" : "Firebase"})</span>
              )}
            </button>
          ) : (
            <div className="space-y-4 pt-4 border-t border-slate-700">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex justify-between">
                  <span>6-Digit OTP Code</span>
                  {isVerified && <span className="text-emerald-400 font-bold">VERIFIED ✓</span>}
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  disabled={isLoading || isVerified}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-center text-xl font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono disabled:opacity-60"
                />
              </div>

              {!isVerified && (
                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otpCode.length < 6}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? "Verifying..." : "Verify OTP Code"}
                </button>
              )}

              {method === "firebase" && !isVerified && (
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Didn't receive SMS?</span>
                  <button
                    type="button"
                    onClick={handleSendSMS}
                    disabled={cooldown > 0 || isLoading}
                    className="text-blue-400 hover:text-blue-300 disabled:text-slate-600 underline font-medium cursor-pointer"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend SMS Code"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="w-full text-xs text-slate-400 hover:text-slate-200 underline text-center cursor-pointer pt-2"
              >
                Send code to another number
              </button>
            </div>
          )}

          {activeStatusMsg && (
            <div
              className={`p-3.5 rounded-lg text-xs font-medium leading-relaxed break-words ${
                activeStatusType === "success"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-700"
                  : activeStatusType === "error"
                  ? "bg-rose-950/80 text-rose-300 border border-rose-700"
                  : "bg-blue-950/80 text-blue-300 border border-blue-700"
              }`}
            >
              {activeStatusMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestSmsPage;
