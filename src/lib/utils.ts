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
