import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnifiedTableLoaderProps {
  isLoading: boolean
  label?: string
  children: React.ReactNode
  className?: string
}

export function UnifiedTableLoader({
  isLoading,
  label = "Loading...",
  children,
  className,
}: UnifiedTableLoaderProps) {
  return (
    <div className={cn("relative w-full min-h-[160px]", className)}>
      {/* Main Table / Container Content (always rendered) */}
      {children}

      {/* Unified Loading Overlay over Table */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/50 dark:bg-black/50 backdrop-blur-[2px] rounded-md transition-all duration-300 animate-in fade-in-0">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-card/90 dark:bg-[#111]/90 shadow-md backdrop-blur-md border border-transparent">
            <Loader2 className="h-4 w-4 animate-spin text-primary dark:text-white" />
            <span className="text-xs font-medium text-foreground dark:text-white tracking-tight">
              {label}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
