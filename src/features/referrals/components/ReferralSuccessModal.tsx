import * as React from "react"
import { useState } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Copy,
  Check,
  Link,
  Key,
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
      title="Share Referral"
      className="sm:max-w-[420px]"
    >
      <div className="flex flex-col gap-6 py-2 pt-4">
        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Key className="h-3.5 w-3.5 text-amber-500" />
            Transfer PIN Code
          </Label>
          <div className="flex items-center gap-2">
            <span className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-base font-bold text-foreground tracking-wider text-center shadow-inner">
              {pinCode}
            </span>
            <Button
              variant="outline"
              onClick={() => handleCopy(pinCode, "pin")}
              className="h-11 px-4 gap-2 border-border hover:bg-muted"
            >
              {copiedType === "pin" ? (
                <><Check className="h-4 w-4 text-green-500" /> Copied</>
              ) : (
                <><Copy className="h-4 w-4 text-muted-foreground" /> Copy</>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Link className="h-3.5 w-3.5 text-blue-500" />
            Direct Referral Link
          </Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={link}
              className="h-11 border-border bg-muted/30 font-mono text-xs text-foreground shadow-inner focus-visible:ring-0"
            />
            <Button
              variant="outline"
              onClick={() => handleCopy(link, "link")}
              className="h-11 px-4 shrink-0 gap-2 border-border hover:bg-muted"
            >
              {copiedType === "link" ? (
                <><Check className="h-4 w-4 text-green-500" /> Copied</>
              ) : (
                <><Copy className="h-4 w-4 text-muted-foreground" /> Copy</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-sidebar-border pt-4 flex justify-end">
        <Button
          onClick={() => onOpenChange(false)}
          className="w-full sm:w-auto min-w-[100px]"
        >
          Done
        </Button>
      </div>
    </ResponsiveModal>
  )
}
