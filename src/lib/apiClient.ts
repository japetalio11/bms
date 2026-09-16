import axios from "axios"
import { syncEngine } from "@/lib/sync/syncEngine"

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_API_URL
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl
  }
  if (typeof window !== "undefined" && window.location?.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
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
    // Successfully reached backend API -> network is online
    syncEngine.setNetworkOnline(true)
    return response
  },
  (error) => {
    // Detect true browser offline state (browser network interface disabled)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.warn("[apiClient] Browser network interface is offline.")
      syncEngine.setNetworkOnline(false)
    }
    return Promise.reject(error)
  }
)

export { BASE_URL }

export const resolveFileUrl = (url?: string | null): string => {
  if (!url) return ""

  // Preserve inline data URLs and blob URLs
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url
  }

  let normalizedUrl = url

  // If URL contains Android emulator IP (10.0.2.2) or local loopbacks, normalize host to active BASE_URL
  if (normalizedUrl.includes("10.0.2.2:6700") || normalizedUrl.includes("localhost:6700") || normalizedUrl.includes("127.0.0.1:6700")) {
    normalizedUrl = normalizedUrl.replace(/http:\/\/(10\.0\.2\.2|localhost|127\.0\.0\.1):6700/, BASE_URL)
  }

  // If already absolute http/https, return normalized URL
  if (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://")) {
    return normalizedUrl
  }

  // Relative path fallback
  return `${BASE_URL}${normalizedUrl.startsWith("/") ? "" : "/"}${normalizedUrl}`
}
