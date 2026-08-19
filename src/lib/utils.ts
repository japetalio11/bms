import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateInput?: string | Date | number | null): string {
  if (!dateInput) return "N/A"
  const date = new Date(dateInput)
  if (isNaN(date.getTime())) return "N/A"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date)
}

