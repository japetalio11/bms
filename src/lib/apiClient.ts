import axios from "axios"
import { syncEngine } from "@/lib/sync/syncEngine"

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_API_URL
  if (
    envUrl &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("127.0.0.1")
  ) {
    return envUrl
  }
  if (
    typeof window !== "undefined" &&
    window.location?.hostname &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return `http://${window.location.hostname}:6700`
  }
  return envUrl || "http://localhost:6700"
}

const BASE_URL = getApiBaseUrl()

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    syncEngine.setNetworkOnline(true)
    return response
  },
  (error) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("[apiClient] Browser network interface is offline.")
      syncEngine.setNetworkOnline(false)
    }

    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || ""
      const isAuthEndpoint =
        requestUrl.includes("/api/v1/auth/login") ||
        requestUrl.includes("/api/v1/auth/reset-password") ||
        requestUrl.includes("/api/v1/facility/public-register")

      if (!isAuthEndpoint && typeof window !== "undefined") {
        console.warn("[apiClient] 401 Unauthorized received. Session expired or revoked.")
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.dispatchEvent(new CustomEvent("bms:unauthorized"))
      }
    }

    return Promise.reject(error)
  }
)

export { BASE_URL }

export const resolveFileUrl = (url?: string | null): string => {
  if (!url) return ""

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url
  }

  let normalizedUrl = url

  if (
    normalizedUrl.includes("10.0.2.2:6700") ||
    normalizedUrl.includes("localhost:6700") ||
    normalizedUrl.includes("127.0.0.1:6700")
  ) {
    normalizedUrl = normalizedUrl.replace(
      /http:\/\/(10\.0\.2\.2|localhost|127\.0\.0\.1):6700/,
      BASE_URL
    )
  }

  if (
    normalizedUrl.startsWith("http://") ||
    normalizedUrl.startsWith("https://")
  ) {
    return normalizedUrl
  }

  return `${BASE_URL}${normalizedUrl.startsWith("/") ? "" : "/"}${normalizedUrl}`
}
