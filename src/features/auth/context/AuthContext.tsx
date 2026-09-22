import React, { createContext, useState, useEffect, useCallback } from "react"
import { db } from "@/lib/db/bmsDatabase"
import { clearPinConfig } from "@/lib/security/pinSessionStore"

export interface AuthUser {
  id?: string
  user_id?: string
  email?: string
  first_name?: string
  last_name?: string
  middle_name?: string
  role?: string
  phone_number?: string
  facility_id?: string
  facility_name?: string
  facility_profile_url?: string
  profile_url?: string
  facility?: any
  [key: string]: any
}

export interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: AuthUser) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<boolean>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

function isTokenExpired(token: string): boolean {
  if (!token) return true
  if (token === "offline-session-token") return false

  try {
    const parts = token.split(".")
    if (parts.length !== 3) {
      // Non-JWT token string (fallback or mock)
      return false
    }
    const payload = JSON.parse(atob(parts[1]))
    if (payload.exp && typeof payload.exp === "number") {
      // payload.exp is in seconds
      return payload.exp * 1000 <= Date.now()
    }
    return false
  } catch {
    return false
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const clearAuthData = useCallback(async () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setToken(null)
    setUser(null)
  }, [])

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const storedToken = localStorage.getItem("token")
      const storedUserStr = localStorage.getItem("user")

      if (storedToken && storedUserStr) {
        if (isTokenExpired(storedToken)) {
          console.warn("[AuthContext] Token expired. Clearing session.")
          await clearAuthData()
          return false
        }

        try {
          const parsedUser = JSON.parse(storedUserStr)
          setToken(storedToken)
          setUser(parsedUser)
          return true
        } catch {
          await clearAuthData()
          return false
        }
      }

      // Check Dexie offline session fallback
      const cachedSession = await db.userSession.get("current_user").catch(() => null)
      if (cachedSession) {
        const fallbackToken = cachedSession.token || "offline-session-token"
        const fallbackUser = cachedSession.cachedUser || cachedSession

        localStorage.setItem("token", fallbackToken)
        localStorage.setItem("user", JSON.stringify(fallbackUser))
        setToken(fallbackToken)
        setUser(fallbackUser)
        return true
      }

      setToken(null)
      setUser(null)
      return false
    } catch (err) {
      console.warn("[AuthContext] Error validating auth session:", err)
      setToken(null)
      setUser(null)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [clearAuthData])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") {
        checkAuth()
      }
    }

    const handleUnauthorizedEvent = () => {
      console.warn("[AuthContext] Received 401 unauthorized notification.")
      clearAuthData().then(() => {
        window.location.href = "/login"
      })
    }

    const handleAuthChangeEvent = () => {
      checkAuth()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("bms:unauthorized", handleUnauthorizedEvent)
    window.addEventListener("bms:auth-change", handleAuthChangeEvent)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("bms:unauthorized", handleUnauthorizedEvent)
      window.removeEventListener("bms:auth-change", handleAuthChangeEvent)
    }
  }, [checkAuth, clearAuthData])

  const login = async (newToken: string, newUser: AuthUser) => {
    localStorage.setItem("token", newToken)
    localStorage.setItem("user", JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    window.dispatchEvent(new CustomEvent("bms:auth-change"))
  }

  const logout = async () => {
    try {
      const pendingCount = await db.offlineQueue.count().catch(() => 0)
      if (pendingCount > 0) {
        const confirmLogout = window.confirm(
          `You have ${pendingCount} unsynced offline change(s) in your queue. Logging out now will clear the local patient cache on this device. Do you wish to proceed?`
        )
        if (!confirmLogout) return
      }
      await db.clearClinicalCache(false).catch(() => {})
    } catch (err) {
      console.warn("[AuthContext] Error cleaning up offline database on logout:", err)
    } finally {
      clearPinConfig()
      localStorage.removeItem("user")
      localStorage.removeItem("token")
      localStorage.clear()
      sessionStorage.clear()
      setToken(null)
      setUser(null)
      window.dispatchEvent(new CustomEvent("bms:auth-change"))
    }
  }

  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
