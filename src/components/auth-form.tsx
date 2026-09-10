import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Eye, EyeOff, Building2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import headerImage from "@/assets/Header.svg"
import { db } from "@/lib/db/bmsDatabase"

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
  const [isLogin, setIsLogin] = useState(!isRegisterPath)
  const [regType] = useState<"user" | "facility">("facility")

  useEffect(() => {
    setIsLogin(!isRegisterPath)
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

  const [facilities, setFacilities] = useState<FacilityItem[]>([])

  const [otp, setOtp] = useState("")
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpMessage, setOtpMessage] = useState<string | null>(null)
  const [address, setAddress] = useState("")
  const [timer, setTimer] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsOtpStep(false)
    setError(null)
    setOtpMessage(null)
    setTimer(0)
  }, [location.pathname, regType])

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

  const handleSendOtp = async () => {
    if (timer > 0) return false

    const identifier = email || phoneNumber
    if (!identifier) {
      setError("Please provide an email or phone number to receive OTP")
      return false
    }
    
    setOtpLoading(true)
    setError(null)
    setOtpMessage(null)

    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const response = await fetch(`${baseUrl}/api/v1/send/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier,
          type: email ? "email" : "sms",
          purpose: "registration",
          provider: email ? "email" : "sms"
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP")
      }

      setTimer(60)
      setOtpMessage(`Verification code sent to ${identifier}`)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    } finally {
      setOtpLoading(false)
    }
  }

  const handleProceedToOtp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (regType === "facility") {
      if (!facilityName || !facilityType || !facilityAddress || !firstName || !lastName || !password || (!email && !phoneNumber)) {
        setError("Please fill out all required facility and admin user fields")
        return
      }
    } else {
      if (!firstName || !lastName || !phoneNumber || !password) {
        setError("Please fill out all required user registration fields")
        return
      }
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
    
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      let endpoint = `${baseUrl}/api/v1/auth/register`
      let payload: any = {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone_number: phoneNumber,
        address: address,
        email,
        facility_id: facilityId,
        password,
        role,
        otp
      }

      if (regType === "facility") {
        endpoint = `${baseUrl}/api/v1/facility/public-register`
        payload = {
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
          otp: otp
        }
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

      // Offline re-authentication fallback using cached IndexedDB user session
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
          <img src={headerImage} alt="Header Logo" className="h-14 w-auto" />
        </div>

        {/* Form Card */}
        <div className="w-full rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-xl font-semibold tracking-tight">
              {isOtpStep
                ? "Verify your Account"
                : isLogin
                ? "Welcome back"
                : "Register Healthcare Facility"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isOtpStep
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

            {isOtpStep ? (
              /* Step 2: Dedicated OTP Verification Screen */
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
                    onClick={handleSendOtp}
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
              /* Step 1: Main Login / Register Form */
              <>
                {isLogin && (
                  <>
                    <Button variant="outline" className="h-8 w-full text-sm dark:bg-black dark:text-white dark:hover:bg-accent">
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

                  {/* COMMON EMAIL FIELD FOR ALL MODES */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="email">
                      {isLogin
                        ? "Email or Phone Number"
                        : regType === "facility"
                        ? "Admin Account Email"
                        : "Email"}
                    </Label>
                    <Input
                      id="email"
                      type={isLogin ? "text" : "email"}
                      placeholder={isLogin ? "Email or Phone" : regType === "facility" ? "admin@facility.gov.ph" : "name@example.com"}
                      required={isLogin || regType === "facility"}
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
                        <a
                          href="#"
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Forgot password?
                        </a>
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

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => navigate(isLogin ? "/register" : "/login")}
              className="underline underline-offset-4 hover:text-primary"
            >
              {isLogin ? "Sign up" : "Login"}
            </button>
          </div>
        </div>

        {/* Footer text */}
        <div className="text-center text-xs text-muted-foreground">
          By clicking continue, you agree to <br className="hidden sm:block" />
          our{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-4 hover:text-primary">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  )
}

