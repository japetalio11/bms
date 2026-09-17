import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  CheckCircle2,
  Copy,
  Check,
  MessageSquare,
  Link,
  Key,
  Share2,
} from "lucide-react"

export interface ReferralSuccessData {
  motherName?: string
  destination?: string
  pinCode?: string
  link?: string
  formattedMessage?: string
}

export function ReferralSuccessModal({
  open,
  onOpenChange,
  referralData,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  referralData: ReferralSuccessData | null
}) {
  const [copiedType, setCopiedType] = useState<string>("")

  if (!referralData) return null

  const {
    motherName = "Patient",
    destination = "Destination Facility",
    pinCode = "N/A",
    link = "N/A",
    formattedMessage = "",
  } = referralData

  const fullShareText = `${formattedMessage}\n\n-----------------------------------\nSECURE LINK: ${link}\nPIN CODE: ${pinCode}`

  const handleCopy = (text: string, type: string) => {
    if (!text || text === "N/A") return
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(""), 2500)
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="e-Referral Created Successfully"
      description={`Referral for ${motherName} to ${destination} has been registered.`}
      className="sm:max-w-[580px]"
    >
      <div className="flex flex-col gap-4 py-2">
        <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">
              Ready to Share via Chat or Messaging Apps
            </span>
            <span className="text-[11px] opacity-90">
              Copy the PIN, Link, or Full Message below to send to receiving
              staff via Messenger/Viber.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-card-foreground">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Key className="h-3.5 w-3.5 text-amber-500" />
              Transfer PIN Code
            </Label>
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded bg-muted/40 px-2 py-1 font-mono text-sm font-bold text-foreground">
                {pinCode}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(pinCode, "pin")}
                className="h-8 gap-1 border-border text-xs"
              >
                {copiedType === "pin" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy PIN
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-card-foreground">
            <Label className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Link className="h-3.5 w-3.5 text-blue-500" />
              Direct Referral Link
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={link}
                className="h-8 border-border bg-muted/40 font-mono text-xs text-foreground"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(link, "link")}
                className="h-8 shrink-0 gap-1 border-border text-xs"
              >
                {copiedType === "link" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {formattedMessage && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Formatted Handoff Message (Ready for Messenger / Viber)
              </Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(fullShareText, "message")}
                className="h-7 gap-1 text-xs text-primary hover:bg-primary/10"
              >
                {copiedType === "message" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" /> Copied All
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Full Message
                  </>
                )}
              </Button>
            </div>

            <div className="max-h-[220px] overflow-y-auto rounded-xl border border-border bg-card p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-card-foreground shadow-inner">
              {fullShareText}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse items-center justify-between gap-2 border-t border-sidebar-border pt-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => handleCopy(fullShareText, "shareAll")}
          className="h-8 w-full gap-1.5 border-sidebar-border text-xs sm:w-auto"
        >
          {copiedType === "shareAll" ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" /> Copied Entire
              Message & Link
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" /> Copy Everything to Clipboard
            </>
          )}
        </Button>

        <Button
          onClick={() => onOpenChange(false)}
          className="h-8 w-full bg-foreground text-xs font-medium text-background hover:bg-foreground/90 sm:w-auto"
        >
          Done
        </Button>
      </div>
    </ResponsiveModal>
  )
}
