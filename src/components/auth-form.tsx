import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Eye, EyeOff, Building2, User, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import headerImage from "@/assets/header.svg"
import { db } from "@/lib/db/bmsDatabase"
import { TermsOfServiceModal } from "@/components/TermsOfServiceModal"
import { PrivacyPolicyModal } from "@/components/PrivacyPolicyModal"
import { usePhoneAuth } from "@/hooks/usePhoneAuth"

declare global {
  interface Window {
    google?: any
  }
}

const loadGoogleScript = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existingScript = document.getElementById("google-gsi-script")
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve())
      resolve()
      return
    }
    const script = document.createElement("script")
    script.id = "google-gsi-script"
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    document.body.appendChild(script)
  })
}

interface FacilityItem {
  facility_id: string
  facility_name: string
  type: string
  address?: string
}

export function AuthForm() {
  const navigate = useNavigate()
  const location = useLocation()
  
  const isRegisterPath = location.pathname.includes("register") || location.pathname.includes("sign-up")
  const isForgotPath = location.pathname.includes("forgot-password")
  
  const [isLogin, setIsLogin] = useState(!isRegisterPath && !isForgotPath)
  const [isForgotPassword, setIsForgotPassword] = useState(isForgotPath)
  const [regType] = useState<"user" | "facility">("facility")

  // Modal States
  const [showTermsModal, setShowTermsModal] = useState(location.pathname.includes("terms"))
  const [showPrivacyModal, setShowPrivacyModal] = useState(location.pathname.includes("privacy"))

  useEffect(() => {
    setIsForgotPassword(location.pathname.includes("forgot-password"))
    setIsLogin(!location.pathname.includes("register") && !location.pathname.includes("sign-up") && !location.pathname.includes("forgot-password"))
    setShowTermsModal(location.pathname.includes("terms"))
    setShowPrivacyModal(location.pathname.includes("privacy"))
  }, [location.pathname])

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [middleName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [role] = useState("HealthWorker")
  const [facilityId, setFacilityId] = useState("")
  
  // Facility Sign Up Specific State
  const [facilityName, setFacilityName] = useState("")
  const [facilityType, setFacilityType] = useState("RHU / Health Center")
  const [facilityAddress, setFacilityAddress] = useState("")
  const [facilityContact, setFacilityContact] = useState("")
  const [facilityEmail, setFacilityEmail] = useState("")

  // Forgot Password Specific State
  const [forgotIdentifier, setForgotIdentifier] = useState("")
  const [forgotOtp, setForgotOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isForgotOtpStep, setIsForgotOtpStep] = useState(false)

  const [facilities, setFacilities] = useState<FacilityItem[]>([])

  const [otp, setOtp] = useState("")
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState<string | null>(null)
  const [address, setAddress] = useState("")
  const [timer, setTimer] = useState(0)

  // Single Auth Method Priority state: "email" | "firebase_sms" | null
  const [activeOtpMethod, setActiveOtpMethod] = useState<"email" | "firebase_sms" | null>(null)

  // Firebase Phone Auth hook with visible reCAPTCHA ("I'm not a robot" checkbox)
  const {
    sendOtp: sendFirebaseOtp,
    verifyOtp: verifyFirebaseOtp,
    resetAuth: resetFirebaseAuth,
    cooldown: firebaseCooldown,
    isSubmitting: firebaseSubmitting,
    isOtpSent: firebaseOtpSent,
    isVerified: firebaseVerified,
    statusMessage: firebaseStatusMsg,
    statusType: firebaseStatusType,
  } = usePhoneAuth({
    containerId: "auth-recaptcha-container",
    recaptchaSize: "normal",
    cooldownDuration: 60
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsOtpStep(false)
    setIsForgotOtpStep(false)
    setError(null)
    setOtpMessage(null)
    setTimer(0)
    setActiveOtpMethod(null)
    resetFirebaseAuth()
  }, [location.pathname, regType, isForgotPassword])

  useEffect(() => {
    if (timer <= 0) return
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timer])

  // Fetch Public Facilities List
  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
        const response = await fetch(`${baseUrl}/api/v1/facility/public-list`)
        if (response.ok) {
          const data = await response.json()
          if (data.result && Array.isArray(data.result)) {
            setFacilities(data.result)
          }
        }
      } catch (err) {
        console.warn("Failed to fetch public facilities list:", err)
      }
    }
    fetchFacilities()
  }, [])

  // Priority-based Single Auth Method Handler:
  // Priority 1: Email OTP (if email provided)
  // Priority 2: Firebase SMS OTP with visible reCAPTCHA (if phone number only)
  const handleSendOtp = async (overrideIdentifier?: string, purpose = "registration") => {
    if (timer > 0 || firebaseCooldown > 0) return false

    // Determine target identifier and priority method
    let targetIdentifier = overrideIdentifier?.trim() || ""
    let isEmailMethod = false

    if (targetIdentifier) {
      isEmailMethod = targetIdentifier.includes("@")
    } else if (email.trim()) {
      targetIdentifier = email.trim()
      isEmailMethod = true
    } else if (phoneNumber.trim()) {
      targetIdentifier = phoneNumber.trim()
      isEmailMethod = false
    }

    if (!targetIdentifier) {
      setError("Please provide an email address or phone number to receive OTP")
      return false
    }
    
    setOtpLoading(true)
    setError(null)
    setOtpMessage(null)

    if (isEmailMethod) {
      // Priority 1: Email OTP via Backend
      setActiveOtpMethod("email")
      const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

      try {
        const response = await fetch(`${baseUrl}/api/v1/send/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: targetIdentifier,
            type: "email",
            purpose,
            provider: "email"
          })
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to send verification email.")
        }

        setTimer(60)
        setOtpMessage(`Verification code sent via Email to ${targetIdentifier}`)
        return true
      } catch (err: any) {
        setError(err.message || "Failed to send verification email.")
        return false
      } finally {
        setOtpLoading(false)
      }
    } else {
      // Priority 2: Firebase SMS OTP with Visible reCAPTCHA
      setActiveOtpMethod("firebase_sms")
      try {
        const sent = await sendFirebaseOtp(targetIdentifier)
        if (sent) {
          setTimer(60)
          setOtpMessage(`SMS OTP sent via Firebase to ${targetIdentifier}`)
          return true
        } else {
          setError(firebaseStatusMsg || "Failed to send SMS OTP. Please solve the reCAPTCHA box below.")
          return false
        }
      } catch (err: any) {
        setError(err.message || "Failed to send SMS OTP.")
        return false
      } finally {
        setOtpLoading(false)
      }
    }
  }

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotIdentifier) {
      setError("Please enter your registered email or phone number")
      return
    }

    const success = await handleSendOtp(forgotIdentifier, "reset_password")
    if (success) {
      setIsForgotOtpStep(true)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotOtp) {
      setError("Please enter the verification code")
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    setError(null)

    // If using Firebase SMS OTP, verify code client-side first
    let finalOtpCode = forgotOtp.trim()
    if (activeOtpMethod === "firebase_sms") {
      const verified = await verifyFirebaseOtp(forgotOtp)
      if (!verified) {
        setError(firebaseStatusMsg || "Invalid or expired Firebase SMS OTP code.")
        setIsLoading(false)
        return
      }
      finalOtpCode = "FIREBASE_VERIFIED"
    }

    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          otp: finalOtpCode,
          newPassword
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password")
      }

      if (data.token) {
        localStorage.setItem("token", data.token)
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user))
        await db.userSession.put({ id: "current_user", ...data.user, token: data.token })
      }

      setOtpMessage("Password reset successful! Redirecting to dashboard...")
      setTimeout(() => {
        navigate("/dashboard")
      }, 1000)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!facilityName || !facilityType || !facilityAddress || !firstName || !lastName || !password || (!email && !phoneNumber)) {
      setError("Please fill out all required facility and admin user fields")
      return
    }

    const success = await handleSendOtp()
    if (success) {
      setIsOtpStep(true)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp) {
      setError("Please enter the verification code")
      return
    }

    setIsLoading(true)
    setError(null)

    // If using Firebase SMS OTP, verify code client-side first
    let finalOtpCode = otp.trim()
    if (activeOtpMethod === "firebase_sms") {
      const verified = await verifyFirebaseOtp(otp)
      if (!verified) {
        setError(firebaseStatusMsg || "Invalid or expired Firebase SMS OTP code.")
        setIsLoading(false)
        return
      }
      finalOtpCode = "FIREBASE_VERIFIED"
    }

    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const endpoint = `${baseUrl}/api/v1/facility/public-register`
      const payload = {
        facility_name: facilityName,
        type: facilityType,
        address: facilityAddress,
        contact_number: facilityContact || phoneNumber,
        facility_email: facilityEmail || email,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        phone_number: phoneNumber,
        email: email,
        password: password,
        otp: finalOtpCode
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      if (data.token) {
        localStorage.setItem("token", data.token)
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user))
        await db.userSession.put({ id: "current_user", ...data.user, token: data.token })
      }

      navigate("/dashboard")

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      console.warn("Warning: VITE_GOOGLE_CLIENT_ID environment variable is missing.");
    }
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      await loadGoogleScript()

      if (window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid",
          callback: async (tokenRes: any) => {
            if (tokenRes.error) {
              setError("Google sign-in was cancelled or encountered an error.")
              setIsLoading(false)
              return
            }

            try {
              setIsLoading(true)
              const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenRes.access_token}` }
              })
              const googleUser = await userinfoRes.json()

              if (!googleUser || !googleUser.email) {
                throw new Error("Could not retrieve Google profile details.")
              }

              const response = await fetch(`${baseUrl}/api/v1/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: googleUser.email,
                  first_name: googleUser.given_name || googleUser.name || "Google",
                  last_name: googleUser.family_name || "User",
                  profile_url: googleUser.picture || null
                })
              })

              const data = await response.json()
              if (!response.ok) {
                throw new Error(data.message || data.error || "Google authentication failed")
              }

              if (data.token) {
                localStorage.setItem("token", data.token)
              }
              if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user))
                await db.userSession.put({
                  id: "current_user",
                  ...data.user,
                  token: data.token,
                  cachedEmail: data.user.email?.toLowerCase().trim(),
                  cachedUser: data.user,
                })
              }

              navigate("/dashboard")
            } catch (err: any) {
              setError(err.message)
            } finally {
              setIsLoading(false)
            }
          }
        })

        client.requestAccessToken()
      } else if (email.trim()) {
        const response = await fetch(`${baseUrl}/api/v1/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() })
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || data.error || "Google authentication failed")
        if (data.token) localStorage.setItem("token", data.token)
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user))
          await db.userSession.put({ id: "current_user", ...data.user, token: data.token })
        }
        navigate("/dashboard")
      } else {
        setError("Please enter your email above or allow the Google popup to sign in.")
        setIsLoading(false)
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      if (navigator.onLine) {
        try {
          const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: email, password }),
          })

          const data = await response.json()
          if (!response.ok) {
            throw new Error(data.error || "Authentication failed")
          }

          if (data.token) {
            localStorage.setItem("token", data.token)
          }
          if (data.user) {
            localStorage.setItem("user", JSON.stringify(data.user))
            await db.userSession.put({
              id: "current_user",
              ...data.user,
              token: data.token,
              cachedEmail: email.toLowerCase().trim(),
              cachedPassword: password,
              cachedUser: data.user,
            })
          }

          navigate("/dashboard")
          return
        } catch (fetchErr: any) {
          if (
            fetchErr.message &&
            fetchErr.message !== "Failed to fetch" &&
            !fetchErr.message.includes("NetworkError") &&
            !fetchErr.message.includes("fetch")
          ) {
            throw fetchErr
          }
        }
      }

      const cachedSession = await db.userSession.get("current_user")
      if (cachedSession) {
        const matchesIdentifier =
          !email ||
          cachedSession.email?.toLowerCase() === email.toLowerCase().trim() ||
          cachedSession.phone_number === email.trim() ||
          cachedSession.cachedEmail === email.toLowerCase().trim()

        const matchesPassword =
          !cachedSession.cachedPassword || cachedSession.cachedPassword === password

        if (matchesIdentifier && matchesPassword) {
          const token = cachedSession.token || "offline-session-token"
          const user = cachedSession.cachedUser || cachedSession
          localStorage.setItem("token", token)
          localStorage.setItem("user", JSON.stringify(user))
          navigate("/dashboard")
          return
        }
      }

      throw new Error("Offline login failed. Check credentials or log in online once to save session.")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center justify-center mb-2">
          <img src={headerImage} alt="BMS Logo" className="h-14 w-auto dark:invert" />
        </div>

        {/* Form Card */}
        <div className="w-full rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              {isForgotPassword
                ? isForgotOtpStep
                  ? "Set New Password"
                  : "Reset Password"
                : isOtpStep
                ? "Verify your Account"
                : isLogin
                ? "Welcome back"
                : "Register Healthcare Facility"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isForgotPassword
                ? isForgotOtpStep
                  ? `Enter code sent to ${forgotIdentifier} & set your new password`
                  : "Enter your account email or phone number to receive OTP"
                : isOtpStep
                ? `Enter the 6-digit code sent to ${email || phoneNumber}`
                : isLogin
                ? "Login to your account"
                : "Create a new facility & facility admin account"}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {error && (
              <div className="rounded border border-destructive/50 bg-destructive/10 p-2 text-center text-xs text-destructive">
                {error}
              </div>
            )}
            {otpMessage && (
              <div className="rounded border border-green-500/50 bg-green-500/10 p-2 text-center text-xs text-green-600 dark:text-green-400">
                {otpMessage}
              </div>
            )}
            {firebaseStatusMsg && activeOtpMethod === "firebase_sms" && (
              <div className={`rounded p-2 text-center text-xs border ${
                firebaseStatusType === "success"
                  ? "bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400"
                  : firebaseStatusType === "error"
                  ? "bg-destructive/10 border-destructive/50 text-destructive"
                  : "bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400"
              }`}>
                {firebaseStatusMsg}
              </div>
            )}
            <div
              id="auth-recaptcha-container"
              className={activeOtpMethod === "firebase_sms" ? "flex justify-center items-center my-2 min-h-[78px] w-full" : "hidden"}
            />

            {/* FORGOT PASSWORD WORKFLOW */}
            {isForgotPassword ? (
              isForgotOtpStep ? (
                /* Forgot Password Step 2: OTP & New Password */
                <form onSubmit={handleResetPasswordSubmit} className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="forgotOtp">Verification Code (OTP)</Label>
                    <Input
                      id="forgotOtp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      required
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      className="h-10 text-center text-base tracking-widest"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 6 characters"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="h-8 text-sm pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  <Button type="submit" disabled={isLoading} className="h-9 w-full text-sm mt-2">
                    {isLoading ? "Updating Password..." : "Reset Password & Login"}
                  </Button>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotOtpStep(false)}
                      className="hover:underline hover:text-foreground"
                    >
                      &larr; Change identifier
                    </button>
                    <button
                      type="button"
                      disabled={otpLoading || timer > 0}
                      onClick={() => handleSendOtp(forgotIdentifier, "reset_password")}
                      className="hover:underline hover:text-primary disabled:opacity-50 disabled:no-underline"
                    >
                      {otpLoading
                        ? "Sending..."
                        : timer > 0
                        ? `Resend in ${timer}s`
                        : "Resend Code"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Forgot Password Step 1: Identifier Input */
                <form onSubmit={handleSendForgotOtp} className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor="forgotIdentifier">Email or Phone Number</Label>
                    <Input
                      id="forgotIdentifier"
                      type="text"
                      placeholder="Enter registered email or phone"
                      required
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  </div>

                  <Button type="submit" disabled={otpLoading} className="h-9 w-full text-sm mt-2">
                    {otpLoading ? "Sending Code..." : "Send Verification Code"}
                  </Button>

                  <div className="text-center text-xs text-muted-foreground mt-2">
                    Remembered your password?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false)
                        setIsLogin(true)
                        navigate("/login")
                      }}
                      className="text-primary underline hover:text-primary/80"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )
            ) : isOtpStep ? (
              /* Step 2: Dedicated Registration OTP Verification Screen */
              <form onSubmit={handleRegisterSubmit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="otp">Verification Code (OTP)</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Enter code"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="h-10 text-center text-base tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="h-9 w-full text-sm mt-2">
                  {isLoading ? "Verifying..." : "Verify & Complete Registration"}
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                  <button
                    type="button"
                    onClick={() => setIsOtpStep(false)}
                    className="hover:underline hover:text-foreground"
                  >
                    &larr; Back to details
                  </button>
                  <button
                    type="button"
                    disabled={otpLoading || timer > 0}
                    onClick={() => handleSendOtp()}
                    className="hover:underline hover:text-primary disabled:opacity-50 disabled:no-underline"
                  >
                    {otpLoading
                      ? "Sending..."
                      : timer > 0
                      ? `Resend in ${timer}s`
                      : "Resend Code"}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 1: Main Login / Facility Register Form */
              <>
                {isLogin && (
                  <>
                    <Button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      variant="outline"
                      className="h-8 w-full text-sm dark:bg-black dark:text-white dark:hover:bg-accent"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="mr-2 h-4 w-4"
                      >
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Login with Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <form onSubmit={isLogin ? handleLoginSubmit : handleProceedToOtp} className="grid gap-4">

                  {/* FACILITY REGISTRATION FIELDS */}
                  {!isLogin && (
                    <>
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                        <div className="text-xs font-semibold text-primary flex items-center gap-1.5">
                          <Building2 className="h-4 w-4" />
                          Facility Details
                        </div>
                        
                        <div className="grid gap-1.5">
                          <Label htmlFor="facilityName">Facility Name *</Label>
                          <Input
                            id="facilityName"
                            type="text"
                            placeholder="e.g. Pili Rural Health Unit 1"
                            required
                            value={facilityName}
                            onChange={(e) => setFacilityName(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor="facilityType">Facility Type *</Label>
                            <select
                              id="facilityType"
                              value={facilityType}
                              onChange={(e) => setFacilityType(e.target.value)}
                              className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="RHU / Health Center">RHU / Health Center</option>
                              <option value="Hospital">Hospital</option>
                              <option value="Lying-In Clinic">Lying-In Clinic</option>
                              <option value="Barangay Health Station (BHS)">BHS / Health Station</option>
                              <option value="Private Clinic">Private Clinic</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="facilityContact">Contact Number</Label>
                            <Input
                              id="facilityContact"
                              type="tel"
                              placeholder="+639123456789"
                              value={facilityContact}
                              onChange={(e) => setFacilityContact(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="facilityAddress">Facility Address *</Label>
                          <Input
                            id="facilityAddress"
                            type="text"
                            placeholder="San Agustin, Pili, Camarines Sur"
                            required
                            value={facilityAddress}
                            onChange={(e) => setFacilityAddress(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="facilityEmail">Facility Official Email (Optional)</Label>
                          <Input
                            id="facilityEmail"
                            type="email"
                            placeholder="rhu.pili@health.gov.ph"
                            value={facilityEmail}
                            onChange={(e) => setFacilityEmail(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 pt-1">
                          <User className="h-4 w-4" />
                          Facility Admin Account
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-1.5">
                            <Label htmlFor="adminFirstName">First Name *</Label>
                            <Input
                              id="adminFirstName"
                              type="text"
                              placeholder="Maria"
                              required
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor="adminLastName">Last Name *</Label>
                            <Input
                              id="adminLastName"
                              type="text"
                              placeholder="Santos"
                              required
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="adminPhone">Admin Phone Number</Label>
                          <Input
                            id="adminPhone"
                            type="tel"
                            placeholder="+639198765432"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* COMMON EMAIL FIELD FOR LOGIN / REGISTER */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="email">
                      {isLogin
                        ? "Email or Phone Number"
                        : "Admin Account Email"}
                    </Label>
                    <Input
                      id="email"
                      type={isLogin ? "text" : "email"}
                      placeholder={isLogin ? "Email or Phone" : "admin@facility.gov.ph"}
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* COMMON PASSWORD FIELD */}
                  <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true)
                            navigate("/forgot-password")
                          }}
                          className="text-xs text-muted-foreground hover:underline hover:text-primary"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                        className="h-8 text-sm pr-8" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading || otpLoading} className="h-8 w-full text-sm mt-2">
                    {otpLoading
                      ? "Sending OTP..."
                      : isLoading
                      ? "Please wait..."
                      : isLogin
                      ? "Login"
                      : "Continue to Verification"}
                  </Button>
                </form>
              </>
            )}
          </div>

          {!isForgotPassword && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  navigate(isLogin ? "/register" : "/login")
                }}
                className="underline underline-offset-4 hover:text-primary font-medium"
              >
                {isLogin ? "Sign up facility" : "Login"}
              </button>
            </div>
          )}
        </div>

        {/* Footer text with interactive legal links */}
        <div className="text-center text-xs text-muted-foreground">
          By clicking continue, you agree to <br className="hidden sm:block" />
          our{" "}
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="underline underline-offset-4 hover:text-primary font-medium"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="underline underline-offset-4 hover:text-primary font-medium"
          >
            Privacy Policy
          </button>
          .
        </div>
      </div>

      {/* Interactive Terms of Service & Privacy Policy Modals */}
      <TermsOfServiceModal open={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyPolicyModal open={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  )
}
