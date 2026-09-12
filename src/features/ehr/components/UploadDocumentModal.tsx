import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UploadCloud, CheckCircle2 } from "lucide-react"
import { mothersApi } from "@/features/mothers/api"

interface UploadDocumentModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: (newDoc: any) => void
}

export function UploadDocumentModal({
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess
}: UploadDocumentModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(newOpen)
    if (!isControlled) setInternalOpen(newOpen)
  }

  const [title, setTitle] = React.useState("")
  const [category, setCategory] = React.useState("Clinical Protocols")
  const [patientName, setPatientName] = React.useState("Facility General")
  const [securityLevel, setSecurityLevel] = React.useState("Confidential")
  const [file, setFile] = React.useState<File | null>(null)
  const [fileUrl, setFileUrl] = React.useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [mothers, setMothers] = React.useState<any[]>([])

  React.useEffect(() => {
    const fetchMothers = async () => {
      try {
        const userStr = localStorage.getItem("user")
        const user = userStr ? JSON.parse(userStr) : null
        const data = await mothersApi.getActiveMothers(user?.facility_id)
        setMothers(data || [])
      } catch (err) {
        console.error("Failed to fetch mothers list for EHR upload", err)
      }
    }
    fetchMothers()
  }, [])

  // Create compressed lightweight Data URL to fit comfortably in localStorage
  const createCompressedDataUrl = (selectedFile: File): Promise<string> => {
    return new Promise((resolve) => {
      if (!selectedFile.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve("")
        reader.readAsDataURL(selectedFile)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) return resolve(e.target?.result as string)

          let width = img.width
          let height = img.height
          const MAX_DIM = 1200
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            } else {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", 0.85))
        }
        img.onerror = () => resolve(e.target?.result as string)
        img.src = e.target?.result as string
      }
      reader.onerror = () => resolve("")
      reader.readAsDataURL(selectedFile)
    })
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)

      try {
        const dataUrl = await createCompressedDataUrl(selectedFile)
        setFileUrl(dataUrl)
      } catch (err) {
        console.error("Failed to generate file preview Data URL", err)
      }

      // Auto-set document title from file name
      const rawName = selectedFile.name
      const nameWithoutExt = rawName.substring(0, rawName.lastIndexOf('.')) || rawName
      const formattedTitle = nameWithoutExt.replace(/[-_]/g, ' ').trim()

      if (formattedTitle) {
        setTitle(formattedTitle)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalTitle = title.trim() || (file ? file.name.substring(0, file.name.lastIndexOf('.')) || file.name : "Facility Document")
    if (!finalTitle) {
      alert("Please select a file or enter a document title.")
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      const newDoc = {
        id: `EHR-${Date.now().toString().slice(-4)}`,
        title: finalTitle,
        category,
        patientName: patientName || "Facility General",
        securityLevel,
        format: file ? file.name.split('.').pop()?.toUpperCase() || "PDF" : "PDF",
        size: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        dateUploaded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        uploadedBy: "Current Healthcare Staff",
        fileUrl: fileUrl
      }

      setIsSubmitting(false)
      setIsSuccess(true)

      setTimeout(() => {
        setIsSuccess(false)
        if (onSuccess) onSuccess(newDoc)
        handleOpenChange(false)
        setTitle("")
        setCategory("Clinical Protocols")
        setPatientName("Facility General")
        setFile(null)
        setFileUrl(undefined)
      }, 1000)
    }, 600)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      trigger={children}
      title="Upload EHR & Facility Record"
      description="Store clinical documents, patient archives, and health unit protocols."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 py-1 text-foreground max-h-[75vh] overflow-y-auto pr-1.5">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-emerald-500">
            <CheckCircle2 className="h-12 w-12 animate-bounce" />
            <p className="text-sm font-semibold">Document Uploaded Successfully!</p>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-title" className="text-xs font-medium">Document Title *</Label>
              <Input 
                id="doc-title" 
                placeholder="e.g. Prenatal Care Standard Protocol 2026" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label htmlFor="doc-category" className="text-xs font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="doc-category" className="h-9 text-xs w-full min-w-0">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinical Protocols">Clinical Protocols</SelectItem>
                  <SelectItem value="Lab & Diagnostics">Lab & Diagnostics</SelectItem>
                  <SelectItem value="Maternal Records">Maternal Records</SelectItem>
                  <SelectItem value="Facility Audit & Accreditation">Facility Audit & Accreditation</SelectItem>
                  <SelectItem value="Referral Archives">Referral Archives</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Associated Mother / Patient */}
            <div className="flex flex-col gap-1.5 min-w-0">
              <Label htmlFor="doc-patient" className="text-xs font-medium">Associated Mother / Patient</Label>
              <Select value={patientName} onValueChange={setPatientName}>
                <SelectTrigger id="doc-patient" className="h-9 text-xs w-full min-w-0">
                  <SelectValue placeholder="Select Mother / Patient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facility General">Facility General (No specific mother)</SelectItem>
                  {mothers.map((m: any) => {
                    const userObj = m.user || m
                    const name = [userObj.first_name, userObj.middle_name, userObj.last_name].filter(Boolean).join(" ") 
                      || m.name 
                      || m.full_name 
                      || "Patient Record"
                    const motherKey = m.mother_id || m.id || m.user_id
                    return (
                      <SelectItem key={motherKey} value={name}>
                        {name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* File Dropzone */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Attachment File (PDF, DOCX, PNG)</Label>
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-accent/50 transition-colors bg-card">
                <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-card-foreground">
                  {file ? file.name : "Click or drag file to upload"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Supports PDF, DOCX, CSV up to 25MB"}
                </span>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.doc,.csv,.png,.jpg" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="flex-1 h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                {isSubmitting ? "Uploading..." : "Save Record"}
              </Button>
            </div>
          </>
        )}
      </form>
    </ResponsiveModal>
  )
}
