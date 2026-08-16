import * as React from "react"
import { Paperclip, Image as ImageIcon, Send, FileText, User as UserIcon, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"

const MOCK_MESSAGES = [
  { id: 1, sender: "midwife", content: "Hi Maria, how are you feeling today?", timestamp: "10:00 AM" },
  { id: 2, sender: "mother", content: "I've had a slight headache this morning.", timestamp: "10:05 AM" },
  { id: 3, sender: "midwife", content: "Please make sure to monitor your blood pressure. Let me know if the headache persists or worsens.", timestamp: "10:15 AM" },
  { id: 4, sender: "mother", content: "I will do that. Thank you for the update.", timestamp: "10:24 AM" },
]

export function ChatArea() {
  const [message, setMessage] = React.useState("")
  const [isOffline, setIsOffline] = React.useState(true) // Mocking offline state for demo purposes

  return (
    <div className="flex flex-col flex-1 h-full bg-background dark:bg-black min-w-0">
      {/* Chat Header - Fixed height matching other columns */}
      <div className="h-[72px] px-6 py-4 border-b border-sidebar-border shrink-0 bg-background dark:bg-black flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-sidebar-border">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">M</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-foreground dark:text-white">Maria Santos</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-3 w-3" />
                Low Risk
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">24 Weeks</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 border-sidebar-border">
            <UserIcon className="h-3.5 w-3.5" />
            View Profile
          </Button>
          <Button size="sm" className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <FileText className="h-3.5 w-3.5" />
            Log Vitals
          </Button>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {MOCK_MESSAGES.map((msg) => {
          const isMe = msg.sender === "midwife"
          return (
            <div key={msg.id} className={clsx("flex flex-col gap-1 w-full max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
              <div className={clsx(
                "p-3 rounded-2xl text-sm leading-relaxed",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-muted dark:bg-[#1a1a1a] border border-sidebar-border text-foreground dark:text-white rounded-tl-sm"
              )}>
                {msg.content}
              </div>
              <span className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</span>
            </div>
          )
        })}
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6 pt-4 bg-background dark:bg-black shrink-0 border-t border-transparent flex flex-col gap-2">
        <div className="flex items-end gap-2 bg-muted/50 dark:bg-[#111] border border-sidebar-border p-2 rounded-xl focus-within:ring-1 focus-within:ring-ring transition-shadow w-full">
          <div className="flex items-center gap-1 mb-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-2.5 px-2 text-foreground dark:text-white placeholder:text-muted-foreground"
            rows={1}
          />
          
          <Button 
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors mb-0.5"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {isOffline && (
          <div className="flex items-center gap-1.5 px-2">
            <AlertCircle className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Offline: Message will be queued</span>
          </div>
        )}
      </div>
    </div>
  )
}
