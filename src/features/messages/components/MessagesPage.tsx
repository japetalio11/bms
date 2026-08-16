import * as React from "react"
import { InboxSidebar } from "./InboxSidebar"
import { ChatArea } from "./ChatArea"
import { ChatDetailsSidepeek } from "./ChatDetailsSidepeek"

export function MessagesPage() {
  return (
    <div className="flex w-full h-[calc(100vh-64px)] overflow-hidden bg-background">
      {/* 
        Depending on the surrounding layout, if there's no top nav, it might just be h-full or h-screen. 
        Assuming DashboardLayout handles the top-level height, we use h-full.
      */}
      <div className="flex w-full h-full overflow-hidden">
        {/* Left Column */}
        <InboxSidebar />

        {/* Center Column */}
        <ChatArea />

        {/* Right Column */}
        <ChatDetailsSidepeek />
      </div>
    </div>
  )
}
