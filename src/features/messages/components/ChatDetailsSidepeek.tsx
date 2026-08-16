import * as React from "react"
import { ChevronRight, FileText, Link as LinkIcon, Image as ImageIcon } from "lucide-react"

export function ChatDetailsSidepeek() {
  return (
    <div className="hidden lg:flex flex-col h-full w-[350px] shrink-0 border-l border-sidebar-border bg-background dark:bg-[#0a0a0a]">
      {/* Header - Fixed height matching other columns */}
      <div className="h-[72px] px-6 py-4 border-b border-sidebar-border flex items-center shrink-0">
        <h2 className="text-base font-semibold text-foreground dark:text-white">Chat Details</h2>
      </div>

      {/* Accordions / Lists */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Photos and Videos */}
        <div className="border-b border-sidebar-border">
          <button className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/50 dark:hover:bg-[#111] transition-colors">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground dark:text-white">Photos and Videos</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <div className="px-6 pb-6 grid grid-cols-3 gap-2">
            <div className="aspect-square bg-muted dark:bg-[#1a1a1a] rounded-md border border-sidebar-border animate-pulse" />
            <div className="aspect-square bg-muted dark:bg-[#1a1a1a] rounded-md border border-sidebar-border animate-pulse" />
            <div className="aspect-square bg-muted dark:bg-[#1a1a1a] rounded-md border border-sidebar-border animate-pulse" />
          </div>
        </div>

        {/* Shared Files */}
        <div className="border-b border-sidebar-border">
          <button className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/50 dark:hover:bg-[#111] transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground dark:text-white">Shared Files</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
          </button>
          
          <div className="flex flex-col gap-3 px-6 pb-6">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-sidebar-border bg-card dark:bg-[#111]">
              <div className="h-8 w-8 rounded bg-[#ef4444]/10 text-[#ef4444] flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium text-foreground dark:text-white truncate">Urinalysis_Results_Q2.pdf</span>
                <span className="text-[10px] text-muted-foreground">1.2 MB • Jun 16, 2026</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border border-sidebar-border bg-card dark:bg-[#111]">
              <div className="h-8 w-8 rounded bg-[#3b82f6]/10 text-[#3b82f6] flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium text-foreground dark:text-white truncate">Prenatal_Care_Guide.pdf</span>
                <span className="text-[10px] text-muted-foreground">3.4 MB • May 04, 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Shared Links */}
        <div className="border-b border-sidebar-border">
          <button className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/50 dark:hover:bg-[#111] transition-colors">
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground dark:text-white">Shared Links</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

      </div>
    </div>
  )
}
