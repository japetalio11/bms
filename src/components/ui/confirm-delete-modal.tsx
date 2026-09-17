import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2 } from "lucide-react"

export interface ConfirmDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  confirmText?: string
  isDeleting?: boolean
  onConfirm: () => void | Promise<void>
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title = "Delete Record",
  description = "Are you sure you want to delete this record? This action cannot be undone.",
  confirmText = "Delete",
  isDeleting = false,
  onConfirm,
}: ConfirmDeleteModalProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-[400px]"
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed px-2">{description}</p>
        </div>

        <div className="flex items-center justify-end gap-2 w-full pt-4 border-t border-border mt-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs text-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-medium gap-1.5 shadow-xs cursor-pointer"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmText}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
