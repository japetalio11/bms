import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Camera, UploadCloud, Scan, RefreshCw, CheckCircle2, FileText, AlertCircle } from "lucide-react"
import { recognize } from "tesseract.js"
import { mothersApi } from "@/features/mothers/api"

interface ScanDocumentModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: (newDoc: any) => void
}

export function ScanDocumentModal({
  children,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess
}: ScanDocumentModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = externalOpen !== undefined
  const isOpen = isControlled ? externalOpen : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(newOpen)
    if (!isControlled) setInternalOpen(newOpen)
  }

  // Camera & Image state
  const [activeInputMode, setActiveInputMode] = useState<"file" | "camera">("file")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  // OCR Processing State
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStatusText, setScanStatusText] = useState("")
  const [extractedText, setExtractedText] = useState("")
  const [ocrError, setOcrError] = useState<string | null>(null)

  // Document Metadata Form State
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("Clinical Protocols")
  const [patientName, setPatientName] = useState("Facility General")
  const [securityLevel, setSecurityLevel] = useState("Confidential")
  const [isSuccess, setIsSuccess] = useState(false)
  const [mothers, setMothers] = useState<any[]>([])

  useEffect(() => {
    const fetchMothers = async () => {
      try {
        const userStr = localStorage.getItem("user")
        const user = userStr ? JSON.parse(userStr) : null
        const data = await mothersApi.getActiveMothers(user?.facility_id)
        setMothers(data || [])
      } catch (err) {
        console.error("Failed to fetch mothers list for EHR scanner", err)
      }
    }
    fetchMothers()
  }, [])

  // Start Camera Stream
  const startCamera = async () => {
    try {
      setOcrError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setIsCameraActive(true)
    } catch (err) {
      console.error("Camera access error:", err)
      setOcrError("Unable to access camera. Please allow camera permissions or upload an image file.")
      setIsCameraActive(false)
    }
  }

  // Stop Camera Stream
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    setIsCameraActive(false)
  }

  useEffect(() => {
    if (isOpen && activeInputMode === "camera") {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [isOpen, activeInputMode])

  // Snap Photo from Video Stream
  const captureCameraPhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/png")
      setSelectedImage(dataUrl)
      stopCamera()
      // Run OCR automatically on capture
      runOcr(dataUrl)
    }
  }

  // Handle File Upload Select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        setSelectedImage(dataUrl)
        runOcr(dataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  // Run Tesseract.js OCR Recognition
  const runOcr = async (imageSrc: string) => {
    setIsScanning(true)
    setScanProgress(0)
    setScanStatusText("Initializing OCR Engine...")
    setOcrError(null)

    try {
      const result = await recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status) {
            setScanStatusText(m.status.replace(/_/g, " "))
          }
          if (typeof m.progress === "number") {
            setScanProgress(Math.round(m.progress * 100))
          }
        }
      })

      const text = result.data.text.trim()
      setExtractedText(text)
      setIsScanning(false)
      setScanProgress(100)
      setScanStatusText("OCR Complete")

      // Smart title auto-fill from first line of OCR text if empty
      if (text) {
        const lines = text.split("\n").filter(l => l.trim().length > 3)
        if (lines.length > 0 && !title) {
          const suggestedTitle = lines[0].slice(0, 60).replace(/[^a-zA-Z0-9\s-]/g, "")
          setTitle(suggestedTitle || "Scanned Medical Record")
        }
      }
    } catch (err: any) {
      console.error("Tesseract OCR Error:", err)
      setOcrError("Failed to extract text from document. Ensure image is clear and well-lit.")
      setIsScanning(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      alert("Please specify a document title.")
      return
    }

    const newDoc = {
      id: `EHR-SCAN-${Date.now().toString().slice(-4)}`,
      title,
      category,
      patientName: patientName || "Facility General",
      securityLevel,
      format: "SCANNED (OCR)",
      size: "1.5 MB",
      dateUploaded: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      uploadedBy: "Healthcare Staff (OCR Scan)",
      extractedText: extractedText
    }

    setIsSuccess(true)
    setTimeout(() => {
      setIsSuccess(false)
      if (onSuccess) onSuccess(newDoc)
      handleOpenChange(false)
      // Reset form
      setSelectedImage(null)
      setExtractedText("")
      setTitle("")
      setPatientName("")
    }, 1000)
  }

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => {
        handleOpenChange(open)
        if (!open) stopCamera()
      }}
      trigger={children}
      title="Scan Document with OCR"
      description="Capture a photo or upload an image to extract text using Tesseract.js"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-1 text-foreground max-h-[80vh] overflow-y-auto pr-1">
        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-emerald-500">
            <CheckCircle2 className="h-12 w-12 animate-bounce" />
            <p className="text-sm font-semibold">Scanned Record Added to EHR Vault!</p>
          </div>
        ) : (
          <>
            {/* Mode Switcher Buttons */}
            <div className="flex items-center gap-2 border-b border-sidebar-border pb-3">
              <Button
                type="button"
                variant={activeInputMode === "file" ? "default" : "outline"}
                onClick={() => {
                  setActiveInputMode("file")
                  stopCamera()
                }}
                className="flex-1 h-8 text-xs font-medium gap-2"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                Upload Image File
              </Button>
              <Button
                type="button"
                variant={activeInputMode === "camera" ? "default" : "outline"}
                onClick={() => setActiveInputMode("camera")}
                className="flex-1 h-8 text-xs font-medium gap-2"
              >
                <Camera className="h-3.5 w-3.5" />
                Take Photo (Camera)
              </Button>
            </div>

            {/* Input View 1: File Dropzone */}
            {activeInputMode === "file" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium">Document Image (PNG, JPG, BMP)</Label>
                <label htmlFor="scan-file-upload" className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-sidebar-border rounded-lg cursor-pointer hover:bg-accent/40 dark:hover:bg-white/5 transition-colors">
                  <UploadCloud className="h-7 w-7 text-muted-foreground mb-1" />
                  <span className="text-xs font-medium text-foreground">
                    {selectedImage ? "Image Loaded - Click to change" : "Choose image to scan"}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Supports PNG, JPG up to 15MB</span>
                  <input id="scan-file-upload" type="file" className="hidden" onChange={handleFileSelect} accept="image/*" />
                </label>
              </div>
            )}

            {/* Input View 2: Live Camera Video Stream */}
            {activeInputMode === "camera" && (
              <div className="flex flex-col gap-2">
                <div className="relative w-full h-[220px] bg-black rounded-lg overflow-hidden flex items-center justify-center border border-sidebar-border">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {!isCameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                      <Camera className="h-8 w-8 mb-2 opacity-50" />
                      <span className="text-xs">Initializing camera feed...</span>
                    </div>
                  )}
                </div>
                {isCameraActive && (
                  <Button type="button" onClick={captureCameraPhoto} className="h-9 text-xs font-medium gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Camera className="h-4 w-4" />
                    Snap Document Photo
                  </Button>
                )}
              </div>
            )}

            {/* Image Preview & OCR Scan Trigger */}
            {selectedImage && (
              <div className="flex flex-col gap-2 p-3 bg-card dark:bg-[#111] border border-sidebar-border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-400" />
                    Document Preview
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => runOcr(selectedImage)} disabled={isScanning} className="h-7 text-[11px] gap-1">
                    <RefreshCw className={`h-3 w-3 ${isScanning ? "animate-spin" : ""}`} />
                    Rescan
                  </Button>
                </div>
                <div className="max-h-[140px] overflow-hidden rounded border border-sidebar-border">
                  <img src={selectedImage} alt="Scanned Document" className="w-full h-auto object-contain max-h-[140px]" />
                </div>
              </div>
            )}

            {/* OCR Progress Bar & Status Indicator */}
            {isScanning && (
              <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="capitalize">{scanStatusText || "Processing OCR..."}</span>
                  <span>{scanProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-blue-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            )}

            {/* OCR Error Alert */}
            {ocrError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{ocrError}</span>
              </div>
            )}

            {/* Extracted Text Content Box */}
            {extractedText && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Extracted OCR Text
                </Label>
                <Textarea 
                  value={extractedText} 
                  onChange={(e) => setExtractedText(e.target.value)} 
                  rows={4} 
                  className="text-xs font-mono bg-muted/30 dark:bg-black border-sidebar-border" 
                  placeholder="Extracted text will appear here..."
                />
              </div>
            )}

            {/* Document Form Fields */}
            <div className="flex flex-col gap-3 pt-2 border-t border-sidebar-border">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scan-title" className="text-xs font-medium">Document Title *</Label>
                <Input
                  id="scan-title"
                  placeholder="e.g. Lab Results & Ultrasound Report"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="scan-category" className="text-xs font-medium">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="scan-category" className="h-9 text-xs">
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
                  <Label htmlFor="scan-security" className="text-xs font-medium">Security Access</Label>
                  <Select value={securityLevel} onValueChange={setSecurityLevel}>
                    <SelectTrigger id="scan-security" className="h-9 text-xs">
                      <SelectValue placeholder="Select Security" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Confidential">Confidential (Staff Only)</SelectItem>
                      <SelectItem value="Restricted">Restricted (Admin Only)</SelectItem>
                      <SelectItem value="Public">Public Notice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scan-patient" className="text-xs font-medium">Associated Mother / Patient</Label>
                <Select value={patientName} onValueChange={setPatientName}>
                  <SelectTrigger id="scan-patient" className="h-9 text-xs">
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
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 pt-3 border-t border-sidebar-border">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="flex-1 h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={isScanning || !selectedImage} className="flex-1 h-9 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black">
                Save Scanned Record
              </Button>
            </div>
          </>
        )}
      </form>
    </ResponsiveModal>
  )
}
