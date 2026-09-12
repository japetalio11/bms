import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Copy, Check, MessageSquare, Link, Key, Share2 } from "lucide-react"

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

  // Combined full share message (Link + PIN + Clinical Message)
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
        {/* Banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Ready to Share via Chat or Messaging Apps</span>
            <span className="text-[11px] opacity-90">Copy the PIN, Link, or Full Message below to send to receiving staff via Messenger/Viber.</span>
          </div>
        </div>

        {/* PIN Code & Link Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Transfer PIN Code */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-card text-card-foreground">
            <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-amber-500" />
              Transfer PIN Code
            </Label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground flex-1 bg-muted/40 px-2 py-1 rounded">
                {pinCode}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(pinCode, "pin")}
                className="h-8 text-xs gap-1 border-border"
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

          {/* Secure Referral Link */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-card text-card-foreground">
            <Label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5 text-blue-500" />
              Direct Referral Link
            </Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={link}
                className="h-8 text-xs font-mono bg-muted/40 border-border text-foreground"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy(link, "link")}
                className="h-8 text-xs gap-1 border-border shrink-0"
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

        {/* Full Formatted Handoff Message (For Copy/Paste into Chat) */}
        {formattedMessage && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Formatted Handoff Message (Ready for Messenger / Viber)
              </Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(fullShareText, "message")}
                className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
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

            <div className="p-3 rounded-xl bg-card text-card-foreground border border-border text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[220px] overflow-y-auto shadow-inner">
              {fullShareText}
            </div>
          </div>
        )}
      </div>

      {/* Modal Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-2 pt-3 border-t border-sidebar-border">
        <Button
          variant="outline"
          onClick={() => handleCopy(fullShareText, "shareAll")}
          className="h-8 text-xs w-full sm:w-auto border-sidebar-border gap-1.5"
        >
          {copiedType === "shareAll" ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" /> Copied Entire Message & Link
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" /> Copy Everything to Clipboard
            </>
          )}
        </Button>

        <Button
          onClick={() => onOpenChange(false)}
          className="h-8 text-xs w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 font-medium"
        >
          Done
        </Button>
      </div>
    </ResponsiveModal>
  )
}
