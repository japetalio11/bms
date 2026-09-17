import * as React from "react"
import { Loader2 } from "lucide-react"

export function UnifiedPageLoader({ label = "Loading page..." }: { label?: string }) {
  return (
    <div className="flex flex-1 w-full h-[calc(100vh-80px)] min-h-[300px] items-center justify-center p-6 bg-background/50">
      <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-card/90 dark:bg-[#111]/90 shadow-md backdrop-blur-md border border-border/40 animate-in fade-in-0 duration-200">
        <Loader2 className="h-5 w-5 animate-spin text-primary dark:text-white" />
        <span className="text-sm font-medium text-foreground dark:text-white tracking-tight">
          {label}
        </span>
      </div>
    </div>
  )
}

export default UnifiedPageLoader
