import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Check, Loader2, Camera, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { userRepository } from "@/lib/repositories/userRepository"

export interface UploadStaffAvatarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staffData: any
  onSuccess?: () => void
}

export function UploadStaffAvatarModal({
  open,
  onOpenChange,
  staffData,
  onSuccess,
}: UploadStaffAvatarModalProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const staffName = staffData
    ? `${staffData.first_name || ""} ${staffData.last_name || ""}`.trim()
    : "Staff Member"
  const initials = staffData
    ? `${staffData.first_name?.[0] || ""}${staffData.last_name?.[0] || ""}`
    : "ST"

  React.useEffect(() => {
    if (open) {
      setSelectedFile(null)
      setPreviewUrl(staffData?.profile_url || staffData?.avatar || null)
      setSuccess(false)
      setError(null)
    }
  }, [open, staffData])

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      const errMsg = `Selected image (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed 10 MB size limit.`
      setError(errMsg)
      toast.error(errMsg)
      e.target.value = ""
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const handleSave = async () => {
    const targetId =
      staffData?.user_id ||
      staffData?.id ||
      staffData?._id
    if (!selectedFile) {
      toast.error("Please choose a photo file first.")
      return
    }
    if (!targetId) {
      toast.error("Staff user ID could not be identified.")
      return
    }

    setUploading(true)
    setError(null)
    toast.loading("Saving staff profile picture...", { id: "staff-avatar-save" })

    try {
      await userRepository.uploadStaffPhoto(targetId, selectedFile)

      setSuccess(true)
      toast.success("Profile picture updated successfully!", {
        id: "staff-avatar-save",
      })

      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
      }, 500)
    } catch (err: any) {
      console.error("Staff avatar upload failed:", err)
      const msg =
        err.response?.data?.error || err.message || "Failed to update profile photo."
      setError(msg)
      toast.error(msg, { id: "staff-avatar-save" })
    } finally {
      setUploading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Update Profile Photo"
      description={`Upload a new profile picture for ${staffName}. Supports JPG, PNG, and WebP (max 10 MB).`}
      className="sm:max-w-[440px]"
    >
      <div className="flex flex-col items-center gap-5 py-4">
        {error && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Avatar Preview */}
        <div className="relative group">
          <Avatar className="h-28 w-28 border-2 border-border shadow-md">
            <AvatarImage
              src={previewUrl || ""}
              alt={staffName}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute right-0 bottom-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-110 disabled:opacity-50"
            title="Choose new image"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {/* Selected file info */}
        <div className="flex w-full flex-col items-center gap-1 text-center">
          {selectedFile ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              <span className="max-w-[280px] truncate">{selectedFile.name}</span>
              <span className="text-[10px] text-muted-foreground">
                ({(selectedFile.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Click the camera icon or button below to select an image from your device.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-9 gap-2 border-border text-xs font-medium"
          >
            <Upload className="h-3.5 w-3.5" />
            {selectedFile ? "Change Photo" : "Choose Photo"}
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedFile || uploading}
            className="h-9 gap-2 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : success ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Saved!
              </>
            ) : (
              "Save Photo"
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
