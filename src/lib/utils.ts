import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "N/A"
  const date = new Date(dateInput)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function getMessagePreview(
  content?: string | null,
  msgType?: string,
  fileName?: string
): string {
  if (!content) return "No messages yet"

  if (
    msgType === "image" ||
    msgType === "photo" ||
    (typeof content === "string" &&
      (content.startsWith("data:image/") ||
        /\.(jpg|jpeg|png|webp|gif)$/i.test(content)))
  ) {
    return "📷 Photo"
  }

  if (
    msgType === "file" ||
    msgType === "pdf" ||
    msgType === "document" ||
    (typeof content === "string" && content.startsWith("data:application/"))
  ) {
    return `📎 ${fileName || "Attachment"}`
  }

  if (typeof content === "string" && content.startsWith("data:")) {
    return "📎 Attachment"
  }

  return content
}

export function sanitizeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== "string") return ""
  if (url.startsWith("data:") || url.startsWith("blob:")) return url

  const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
  if (url.startsWith("/uploads/")) {
    return `${backendUrl}${url}`
  }

  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    const backendUrl = import.meta.env.VITE_BACKEND_API_URL || ""
    if (url.startsWith("http://localhost:6700")) {
      if (backendUrl && backendUrl.startsWith("http")) {
        return url.replace("http://localhost:6700", backendUrl)
      }
      return url.replace("http://", "https://")
    }
    if (url.startsWith("http://")) {
      if (backendUrl && (url.includes("/uploads/") || url.includes(":6700"))) {
        const pathPart = url.substring(url.indexOf("/uploads/"))
        if (pathPart.startsWith("/uploads/")) {
          return `${backendUrl}${pathPart}`
        }
      }
      return url.replace("http://", "https://")
    }
  }
  return url
}
