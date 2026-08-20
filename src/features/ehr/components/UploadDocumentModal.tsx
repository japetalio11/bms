import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UploadCloud, CheckCircle2 } from "lucide-react"

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
  const [patientName, setPatientName] = React.useState("")
  const [securityLevel, setSecurityLevel] = React.useState("Confidential")
  const [file, setFile] = React.useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      alert("Please enter a document title.")
      return
    }

    setIsSubmitting(true)

    setTimeout(() => {
      const newDoc = {
        id: `EHR-${Date.now().toString().slice(-4)}`,
        title,
        category,
        patientName: patientName || "Facility General",
        securityLevel,
        format: file ? file.name.split('.').pop()?.toUpperCase() || "PDF" : "PDF",
        size: file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB",
        dateUploaded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        uploadedBy: "Current Healthcare Staff"
      }

      setIsSubmitting(false)
      setIsSuccess(true)

      setTimeout(() => {
        setIsSuccess(false)
        if (onSuccess) onSuccess(newDoc)
        handleOpenChange(false)
        setTitle("")
        setCategory("Clinical Protocols")
        setPatientName("")
        setFile(null)
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2 text-foreground">
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

            {/* Category & Security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-category" className="text-xs font-medium">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="doc-category" className="h-9 text-xs">
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="doc-security" className="text-xs font-medium">Security Access Level</Label>
                <Select value={securityLevel} onValueChange={setSecurityLevel}>
                  <SelectTrigger id="doc-security" className="h-9 text-xs">
                    <SelectValue placeholder="Select Security" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Confidential">Confidential (Facility Staff Only)</SelectItem>
                    <SelectItem value="Restricted">Restricted (Admins Only)</SelectItem>
                    <SelectItem value="Public">Public Facility Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Associated Mother / Patient */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-patient" className="text-xs font-medium">Associated Mother / Patient (Optional)</Label>
              <Input 
                id="doc-patient" 
                placeholder="e.g. Anna Marie Santos (or leave blank for facility-wide)" 
                value={patientName} 
                onChange={(e) => setPatientName(e.target.value)} 
                className="h-9 text-xs"
              />
            </div>

            {/* File Dropzone */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Attachment File (PDF, DOCX, PNG)</Label>
              <label htmlFor="file-upload" className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-sidebar-border rounded-lg cursor-pointer hover:bg-accent/50 dark:hover:bg-white/5 transition-colors">
                <UploadCloud className="h-7 w-7 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-foreground">
                  {file ? file.name : "Click or drag file to upload"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Supports PDF, DOCX, CSV up to 25MB"}
                </span>
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.docx,.doc,.csv,.png,.jpg" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-sidebar-border">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="flex-1 h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 h-9 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black">
                {isSubmitting ? "Uploading..." : "Save Record"}
              </Button>
            </div>
          </>
        )}
      </form>
    </ResponsiveModal>
  )
}
