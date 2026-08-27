import axios from "axios"
import { syncEngine } from "@/lib/sync/syncEngine"

const BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 2000,
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
    // Detect network failure (e.g. Chrome DevTools Offline, server down, connection dropped)
    if (!error.response || error.code === "ERR_NETWORK" || error.message?.includes("Network Error") || error.code === "ECONNABORTED") {
      console.warn("[apiClient] Network request failed. Setting network status to OFFLINE.")
      syncEngine.setNetworkOnline(false)
    }
    return Promise.reject(error)
  }
)
