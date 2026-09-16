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
