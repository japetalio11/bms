import * as React from "react"
import { CheckCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"

// Mock Data
const INBOX_MESSAGES = [
  { id: 1, name: "Maria Santos", message: "Thank you for the update.", time: "10:24 AM", unread: 2, avatar: "https://github.com/shadcn.png" },
  { id: 2, name: "Jessica Reyes", message: "When is my next appointment?", time: "Yesterday", unread: 0, avatar: "" },
  { id: 3, name: "Ana Cruz", message: "I have uploaded the lab results.", time: "Monday", unread: 1, avatar: "https://github.com/nextjs.png" },
  { id: 4, name: "Diana Lim", message: "Noted, doctor.", time: "Sunday", unread: 0, avatar: "" },
  { id: 5, name: "Elena Ramos", message: "Can I reschedule?", time: "Last Week", unread: 0, avatar: "" },
]

export function InboxSidebar() {
  const [activeChat, setActiveChat] = React.useState(1)

  return (
    <div className="hidden lg:flex flex-col h-full w-[350px] shrink-0 border-r border-sidebar-border bg-background dark:bg-[#0a0a0a]">
      {/* Header - Fixed height matching other columns */}
      <div className="h-[72px] px-6 py-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground dark:text-white">Messages</h1>
          <span className="inline-flex items-center justify-center bg-muted dark:bg-[#111] text-muted-foreground text-[10px] font-medium h-5 px-2 rounded-full border border-sidebar-border">
            {INBOX_MESSAGES.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
           <CheckCheck className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Search */}
      <div className="px-6 py-3 border-b border-sidebar-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages..." 
            className="pl-8 h-8 text-xs bg-muted/50 dark:bg-[#111] border-sidebar-border focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {INBOX_MESSAGES.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => setActiveChat(chat.id)}
            className={clsx(
              "flex items-start gap-3 px-6 py-4 border-b border-sidebar-border cursor-pointer transition-colors hover:bg-muted/50 dark:hover:bg-[#111]",
              activeChat === chat.id ? "bg-muted dark:bg-[#111]" : ""
            )}
          >
            <Avatar className="h-10 w-10 border border-sidebar-border shrink-0">
              <AvatarImage src={chat.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{chat.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0 gap-1 mt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground dark:text-white truncate">{chat.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={clsx(
                  "text-xs truncate", 
                  chat.unread > 0 ? "text-foreground dark:text-white font-medium" : "text-muted-foreground"
                )}>
                  {chat.message}
                </span>
                {chat.unread > 0 && (
                  <span className="inline-flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1 rounded-full shrink-0">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
