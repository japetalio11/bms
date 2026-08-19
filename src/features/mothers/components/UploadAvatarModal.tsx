import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Check, Loader2 } from "lucide-react"
import axios from "axios"

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
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [uploading, setUploading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setSelectedFile(null)
      setPreviewUrl(motherData?.user?.profile_url || null)
      setSuccess(false)
      setError(null)
    }
  }, [open, motherData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const handleSave = async () => {
    if (!selectedFile || !motherData?.mother_id) return

    setUploading(true)
    setError(null)
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const uploadRes = await axios.post(`${baseUrl}/api/v1/lab-screening/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })

      if (uploadRes.data?.file_url) {
        await axios.put(
          `${baseUrl}/api/v1/mother/update/${motherData.mother_id}`,
          { profile_url: uploadRes.data.file_url },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setSuccess(true)
        setTimeout(() => {
          onSuccess?.()
          onOpenChange(false)
        }, 1000)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to upload avatar")
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
          <label className="w-full cursor-pointer">
            <input
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
              className="w-full h-9 text-xs font-medium border-sidebar-border gap-2 pointer-events-none bg-background dark:bg-black"
            >
              <Upload className="h-3.5 w-3.5" />
              {selectedFile ? selectedFile.name : "Choose New Photo (PNG, JPG)"}
            </Button>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 w-full pt-3 border-t border-sidebar-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedFile || uploading || success}
            className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-medium"
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
