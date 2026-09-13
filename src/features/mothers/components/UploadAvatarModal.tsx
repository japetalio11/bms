import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Check, Loader2 } from "lucide-react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { mothersApi } from "../api"

export interface UploadAvatarModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  onSuccess?: () => void
}

export function UploadAvatarModal({
  open,
  onOpenChange,
  motherData,
  onSuccess,
}: UploadAvatarModalProps) {
  const params = useParams()
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setSelectedFile(null)
      setPreviewUrl(motherData?.user?.profile_url || motherData?.photo_url || motherData?.profile_url || null)
      setSuccess(false)
      setError(null)
    }
  }, [open, motherData])

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
    const targetId = motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || params.id || params.motherId
    if (!selectedFile) {
      toast.error("Please choose a photo file first.")
      return
    }
    if (!targetId) {
      toast.error("Mother profile ID could not be identified.")
      return
    }

    setUploading(true)
    setError(null)
    toast.loading("Saving profile picture...", { id: "avatar-save" })

    try {
      let fileUrl = ""
      try {
        const uploadRes = await mothersApi.uploadLabFile(selectedFile)
        if (typeof uploadRes === "string") {
          fileUrl = uploadRes
        } else if (uploadRes && typeof uploadRes === "object") {
          fileUrl = (uploadRes as any).file_url || (uploadRes as any).url || (uploadRes as any).fileUrl || (uploadRes as any).result || ""
        }
      } catch (uploadErr) {
        // Fallback for offline/local base64 image preview
        fileUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(selectedFile)
        })
      }

      if (!fileUrl) {
        throw new Error("Failed to process image file.")
      }

      // Update backend & local store
      try {
        await mothersApi.updateMother(targetId, {
          profile_url: fileUrl,
          photo_url: fileUrl,
        })
      } catch {
        const { db } = await import("@/lib/db/bmsDatabase")
        let local: any = await db.mothers.get(targetId)
        if (!local) {
          const all = await db.mothers.toArray()
          local = all.find((m: any) => m.id === targetId || m._id === targetId || m.mother_id === targetId || m.user_id === targetId) || null
        }
        if (local) {
          await db.mothers.update(local.id, {
            photo_url: fileUrl,
            profile_url: fileUrl,
            user: { ...(local.user || {}), profile_url: fileUrl, photo_url: fileUrl },
          })
        }
      }

      setSuccess(true)
      toast.success("Profile picture updated successfully!", { id: "avatar-save" })

      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
      }, 500)
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || "Failed to upload avatar"
      setError(msg)
      toast.error(msg, { id: "avatar-save" })
    } finally {
      setUploading(false)
    }
  }

  const motherName = [motherData?.user?.first_name, motherData?.user?.last_name].filter(Boolean).join(" ") || "Mother"

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Upload Profile Picture"
      description="Choose a profile photo for this mother."
      className="sm:max-w-[400px]"
    >
      <div className="flex flex-col items-center gap-5 py-3">
        {error && (
          <div className="w-full rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Avatar Preview */}
        <div className="relative group">
          <Avatar className="h-28 w-28 border-2 border-sidebar-border shadow-md">
            {previewUrl && <AvatarImage src={previewUrl} className="object-cover" />}
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {motherName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Upload Action */}
        <div className="flex flex-col items-center gap-2 w-full">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || success}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading || success}
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-9 text-xs font-medium border-border gap-2 bg-card text-card-foreground cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            {selectedFile ? selectedFile.name : "Choose New Photo (PNG, JPG)"}
          </Button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 w-full pt-3 border-t border-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedFile || uploading || success}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Uploading...
              </>
            ) : success ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                Saved!
              </>
            ) : (
              "Save Picture"
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
