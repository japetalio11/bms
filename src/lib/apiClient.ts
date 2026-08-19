import axios from "axios"

const BASE_URL = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

export const apiClient = axios.create({
  baseURL: BASE_URL,
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
