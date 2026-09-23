import { lazy, type ComponentType } from "react"

export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T } | { [key: string]: any }>,
  name?: string
) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed =
      sessionStorage.getItem(`bms_chunk_reload_${window.location.pathname}`) === "true"

    try {
      const mod = (await componentImport()) as any
      sessionStorage.removeItem(`bms_chunk_reload_${window.location.pathname}`)

      if (name && mod[name]) {
        return { default: mod[name] }
      }
      if (mod.default) {
        return { default: mod.default }
      }
      return { default: mod }
    } catch (error: any) {
      console.warn("[lazyWithRetry] Dynamic chunk import failed:", error)

      if (!pageHasBeenForceRefreshed) {
        sessionStorage.setItem(`bms_chunk_reload_${window.location.pathname}`, "true")
        window.location.reload()
        return new Promise(() => {})
      }

      throw error
    }
  })
}
