import * as React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Search,
  Upload,
  PlusCircle,
  MoreVertical,
  FileSpreadsheet,
  FileCheck,
  Maximize2,
  ArrowLeft,
  Download,
  Minus,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { UploadDocumentModal } from "./UploadDocumentModal"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal"
import { toast } from "sonner"

import { useLiveQuery } from "dexie-react-hooks"
import {
  ehrRepository,
  type EhrDocument,
} from "@/lib/repositories/ehrRepository"
export type { EhrDocument }

export function EhrPage() {
  const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
  const user = userStr ? JSON.parse(userStr) : null
  const facilityId = user?.facility_id || user?.facilityId

  const liveDocs = useLiveQuery(() => ehrRepository.getLocalDocuments(facilityId), [facilityId])
  const [remoteDocs, setRemoteDocs] = useState<EhrDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const documents = liveDocs !== undefined ? liveDocs : remoteDocs

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<
    string[]
  >([])

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<EhrDocument | null>(null)
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null)
  const [zoomScale, setZoomScale] = useState(1)

  const [docToDelete, setDocToDelete] = useState<EhrDocument | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await ehrRepository.getAllDocuments(facilityId)
      setRemoteDocs(docs || [])
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchDocuments()
  }, [facilityId])

  const handleAddDocument = async (newDoc: EhrDocument) => {
    await ehrRepository.createDocument(newDoc)
  }

  const handleDeleteDocument = (doc: EhrDocument) => {
    setDocToDelete(doc)
  }

  const executeDeleteDocument = async () => {
    if (!docToDelete) return
    setIsDeleting(true)
    try {
      await ehrRepository.deleteDocument(docToDelete.id)
      toast.success("EHR record removed successfully")
      setDocToDelete(null)
    } catch (err) {
      console.error("Failed to delete EHR document:", err)
      toast.error("Failed to remove EHR document. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownload = (doc: EhrDocument) => {
    if (doc.fileUrl) {
      const link = document.createElement("a")
      link.href = doc.fileUrl
      const ext = doc.format ? doc.format.toLowerCase() : "png"
      const cleanTitle = doc.title.replace(/[^a-zA-Z0-9]/g, "_")
      link.download = cleanTitle.endsWith(`.${ext}`)
        ? cleanTitle
        : `${cleanTitle}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    const content = `Facility EHR Document Report\n-------------------------\nID: ${doc.id}\nTitle: ${doc.title}\nCategory: ${doc.category}\nPatient/Scope: ${doc.patientName}\nSecurity Level: ${doc.securityLevel}\nDate Uploaded: ${doc.dateUploaded}\nUploaded By: ${doc.uploadedBy}\n`
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${doc.title.replace(/[^a-zA-Z0-9]/g, "_")}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const matchTitle = doc.title.toLowerCase().includes(q)
        const matchCat = doc.category.toLowerCase().includes(q)
        const matchPatient = doc.patientName.toLowerCase().includes(q)
        if (!matchTitle && !matchCat && !matchPatient) return false
      }

      if (activeTab === "protocols" && doc.category !== "Clinical Protocols")
        return false
      if (activeTab === "labs" && doc.category !== "Lab & Diagnostics")
        return false
      if (activeTab === "maternal" && doc.category !== "Maternal Records")
        return false
      if (
        activeTab === "audit" &&
        doc.category !== "Facility Audit & Accreditation"
      )
        return false

      if (selectedCategoryFilters.length > 0) {
        if (!selectedCategoryFilters.includes(doc.category)) return false
      }

      return true
    })
  }, [documents, searchQuery, activeTab, selectedCategoryFilters])

  const toggleFilter = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item))
    else setList([...list, item])
  }

  return (
    <div className="relative flex h-full w-full items-start overflow-hidden bg-background">
      <div className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto text-foreground">
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-border bg-background p-4 pr-4 pb-4 pl-3 md:border-none">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full md:w-auto"
          >
            <TabsList className="h-9 w-full justify-start gap-1 rounded-md border border-border bg-muted p-1 md:w-max">
              <TabsTrigger value="all" className="px-2.5 py-1 text-xs">
                All Records
              </TabsTrigger>
              <TabsTrigger value="protocols" className="px-2.5 py-1 text-xs">
                Protocols
              </TabsTrigger>
              <TabsTrigger value="labs" className="px-2.5 py-1 text-xs">
                Lab Archives
              </TabsTrigger>
              <TabsTrigger value="maternal" className="px-2.5 py-1 text-xs">
                Maternal Files
              </TabsTrigger>
              <TabsTrigger value="audit" className="px-2.5 py-1 text-xs">
                Audit & Compliance
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex w-full items-center justify-end gap-2 md:w-auto">
            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search EHR records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 border-border bg-card pl-8 text-xs text-card-foreground"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 shrink-0 gap-1.5 border-border bg-card px-2 text-xs font-medium text-card-foreground hover:bg-accent"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Category{" "}
                  {selectedCategoryFilters.length > 0 &&
                    `(${selectedCategoryFilters.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="flex w-[200px] flex-col gap-2.5 p-3"
                align="end"
              >
                {[
                  "Clinical Protocols",
                  "Lab & Diagnostics",
                  "Maternal Records",
                  "Facility Audit & Accreditation",
                  "Referral Archives",
                ].map((cat) => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox
                      id={`filter-cat-${cat}`}
                      checked={selectedCategoryFilters.includes(cat)}
                      onCheckedChange={() =>
                        toggleFilter(
                          selectedCategoryFilters,
                          setSelectedCategoryFilters,
                          cat
                        )
                      }
                      className="h-3.5 w-3.5 border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <label
                      htmlFor={`filter-cat-${cat}`}
                      className="cursor-pointer text-xs text-foreground"
                    >
                      {cat}
                    </label>
                  </div>
                ))}
                {selectedCategoryFilters.length > 0 && (
                  <Button
                    onClick={() => setSelectedCategoryFilters([])}
                    className="mt-1 h-7 bg-primary text-xs text-primary-foreground"
                  >
                    Clear
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <UploadDocumentModal
              open={isUploadModalOpen}
              onOpenChange={setIsUploadModalOpen}
              onSuccess={handleAddDocument}
            >
              <Button className="h-9 shrink-0 gap-2 bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </UploadDocumentModal>
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pr-4 pb-24 pl-3 md:pt-0 md:pb-4">
        <div className="flex flex-col gap-4 md:hidden">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center md:hidden">
              <FileText className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
              <h3 className="text-sm font-semibold text-card-foreground">
                No EHR Records Found
              </h3>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                No electronic health records match your current criteria. Upload a new document to get started.
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Document
              </Button>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
                onClick={() => setViewingDoc(doc)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {doc.format === "PDF" && (
                      <FileText className="h-4 w-4 shrink-0 text-red-400" />
                    )}
                    {doc.format === "CSV" && (
                      <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-400" />
                    )}
                    {doc.format !== "PDF" && doc.format !== "CSV" && (
                      <FileCheck className="h-4 w-4 shrink-0 text-blue-400" />
                    )}
                    <h3 className="truncate text-sm font-semibold text-card-foreground">
                      {doc.title}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      doc.securityLevel === "Public"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                        : doc.securityLevel === "Confidential"
                          ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                          : "border-purple-500/20 bg-purple-500/10 text-purple-500"
                    }`}
                  >
                    {doc.securityLevel}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-card-foreground">
                      {doc.category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Scope / Patient
                    </span>
                    <span className="font-medium text-card-foreground">
                      {doc.patientName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Date Uploaded</span>
                    <span className="text-card-foreground">
                      {doc.dateUploaded}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewingDoc(doc)
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(doc)
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteDocument(doc)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="hidden flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center md:flex">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground opacity-50" />
            <h3 className="text-sm font-semibold text-card-foreground">
              No EHR Records Found
            </h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              No electronic health records match your current criteria. Upload a new document to get started.
            </p>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-4 h-8 bg-primary text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload Document
            </Button>
          </div>
        )}

        {filteredDocuments.length > 0 && (
          <div className="hidden overflow-x-auto rounded-md border border-border bg-card md:block">
            <div className="min-w-[900px]">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-12 pl-4 text-center">
                    <Checkbox className="border-border" />
                  </TableHead>
                  <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                    Document Title
                  </TableHead>
                  <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                    Category
                  </TableHead>
                  <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                    Scope / Patient
                  </TableHead>
                  <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                    Security Level
                  </TableHead>
                  <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                    Format & Size
                  </TableHead>
                  <TableHead className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                    Date Uploaded
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="group cursor-pointer border-border transition-colors hover:bg-accent/50"
                      onClick={() => {
                        const idx = filteredDocuments.findIndex(
                          (d) => d.id === doc.id
                        )
                        setPreviewDocIndex(idx >= 0 ? idx : 0)
                        setZoomScale(1)
                      }}
                    >
                      <TableCell
                        className="pl-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox className="border-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" />
                      </TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap text-card-foreground">
                        <div className="flex items-center gap-3">
                          {doc.fileUrl &&
                          (doc.format === "PNG" ||
                            doc.format === "JPG" ||
                            doc.format === "JPEG" ||
                            doc.format === "WEBP" ||
                            doc.format === "GIF" ||
                            doc.format === "BMP") ? (
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-transform hover:scale-105">
                              <img
                                src={doc.fileUrl}
                                alt={doc.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
                              {doc.format === "PDF" && (
                                <FileText className="h-6 w-6 text-red-400" />
                              )}
                              {doc.format === "CSV" && (
                                <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
                              )}
                              {doc.format !== "PDF" && doc.format !== "CSV" && (
                                <FileCheck className="h-6 w-6 text-blue-400" />
                              )}
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col">
                            <span
                              className="max-w-[260px] truncate text-xs font-semibold text-card-foreground"
                              title={doc.title}
                            >
                              {doc.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {doc.format} • {doc.size}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-card-foreground">
                        {doc.category}
                      </TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap text-card-foreground">
                        {doc.patientName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                            doc.securityLevel === "Public"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                              : doc.securityLevel === "Confidential"
                                ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                                : "border-purple-500/20 bg-purple-500/10 text-purple-500"
                          }`}
                        >
                          {doc.securityLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {doc.format} • {doc.size}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {doc.dateUploaded}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-foreground hover:bg-accent"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-[160px] rounded-xl border-border shadow-md"
                          >
                            <DropdownMenuLabel className="text-xs">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                const idx = filteredDocuments.findIndex(
                                  (d) => d.id === doc.id
                                )
                                setPreviewDocIndex(idx >= 0 ? idx : 0)
                                setZoomScale(1)
                              }}
                              className="cursor-pointer rounded-md text-xs"
                            >
                              View Full Screen
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDownload(doc)}
                              className="cursor-pointer rounded-md text-xs"
                            >
                              Download File
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc)}
                              className="cursor-pointer rounded-md text-xs text-red-500 focus:text-red-500"
                            >
                              Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </div>
        </div>
        )}
      </div>

      {previewDocIndex !== null &&
        filteredDocuments[previewDocIndex] &&
        (() => {
          const activeDoc = filteredDocuments[previewDocIndex]
          return (
            <div className="fixed inset-0 z-[100] flex animate-in flex-col bg-black/95 text-white backdrop-blur-md duration-200 select-none fade-in">
              <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/90 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewDocIndex(null)}
                    className="h-9 w-9 rounded-full text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex min-w-0 items-center gap-2">
                    {activeDoc.format === "PDF" ? (
                      <FileText className="h-5 w-5 shrink-0 text-red-400" />
                    ) : (
                      <FileCheck className="h-5 w-5 shrink-0 text-blue-400" />
                    )}
                    <span
                      className="max-w-[320px] truncate text-sm font-semibold text-white"
                      title={activeDoc.title}
                    >
                      {activeDoc.title}
                    </span>
                    <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] text-white/90">
                      {activeDoc.format}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoomScale((z) => Math.max(0.4, z - 0.25))}
                    className="h-7 w-7 rounded-full text-white hover:bg-white/10"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-mono text-xs text-white/90">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoomScale((z) => Math.min(3.5, z + 0.25))}
                    className="h-7 w-7 rounded-full text-white hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setZoomScale(1)}
                    className="h-7 rounded-full px-2 text-[11px] text-white/80 hover:bg-white/10"
                  >
                    Reset
                  </Button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    onClick={() => handleDownload(activeDoc)}
                    className="h-9 gap-2 rounded-full bg-blue-600 px-4 text-xs font-medium text-white shadow-lg hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewDocIndex(null)}
                    className="h-9 w-9 rounded-full text-white hover:bg-white/10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="relative flex h-full w-full flex-1 items-center justify-center overflow-auto bg-black/90 p-4">
                {previewDocIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPreviewDocIndex(previewDocIndex - 1)
                      setZoomScale(1)
                    }}
                    className="absolute left-6 z-20 h-12 w-12 rounded-full border border-white/20 bg-black/60 text-white shadow-2xl transition-all hover:bg-black/90"
                    title="Previous Document"
                  >
                    <ChevronLeft className="h-7 w-7" />
                  </Button>
                )}

                <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
                  {(() => {
                    const url = activeDoc.fileUrl || ""
                    const isImageData =
                      url.startsWith("data:image/") ||
                      Boolean(
                        url.match(/\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i)
                      ) ||
                      [
                        "PNG",
                        "JPG",
                        "JPEG",
                        "WEBP",
                        "GIF",
                        "BMP",
                        "IMAGE",
                      ].includes(activeDoc.format?.toUpperCase())

                    const isPdfData =
                      url.startsWith("data:application/pdf") ||
                      Boolean(url.match(/\.pdf(\?.*)?$/i)) ||
                      activeDoc.format?.toUpperCase() === "PDF"

                    if (url && isImageData) {
                      return (
                        <img
                          src={url}
                          alt={activeDoc.title}
                          style={{ transform: `scale(${zoomScale})` }}
                          className="max-h-[85vh] max-w-[92vw] rounded-lg object-contain shadow-2xl transition-transform duration-200 ease-out"
                        />
                      )
                    }

                    if (url && isPdfData) {
                      return (
                        <iframe
                          src={url}
                          title={activeDoc.title}
                          style={{
                            transform: `scale(${zoomScale})`,
                            transformOrigin: "top center",
                          }}
                          className="h-[84vh] w-[88vw] rounded-xl border border-white/20 bg-white shadow-2xl"
                        />
                      )
                    }

                    return (
                      <div
                        style={{
                          transform: `scale(${zoomScale})`,
                          transformOrigin: "center center",
                        }}
                        className="flex min-h-[520px] w-[720px] max-w-[90vw] flex-col justify-between rounded-xl border border-zinc-200 bg-white p-8 text-zinc-900 shadow-2xl transition-transform duration-200 ease-out"
                      >
                        <div className="flex items-start justify-between border-b-2 border-primary/20 pb-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                              Republic of the Philippines • Department of Health
                            </span>
                            <h2 className="text-lg leading-tight font-bold text-zinc-900">
                              {activeDoc.title}
                            </h2>
                            <p className="text-xs text-zinc-500">
                              Maternal & Child Health Information System • EHR
                              Archive
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-1 font-mono text-xs font-bold text-zinc-700">
                              {activeDoc.id}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {activeDoc.dateUploaded}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-b border-zinc-200 py-6 text-xs">
                          <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                              Document Category
                            </span>
                            <span className="font-medium text-zinc-800">
                              {activeDoc.category}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                              Patient / Scope
                            </span>
                            <span className="font-medium text-zinc-800">
                              {activeDoc.patientName}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                              Security Classification
                            </span>
                            <span className="font-medium text-amber-700">
                              {activeDoc.securityLevel}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                            <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                              Uploaded By
                            </span>
                            <span className="font-medium text-zinc-800">
                              {activeDoc.uploadedBy}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-2 py-4">
                          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                            Clinical Summary Record
                          </span>
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700">
                            This electronic health record is archived under
                            facility clinical compliance regulations. The record
                            verifies maternal care guidelines, screening
                            diagnostics, or facility administrative protocol.
                          </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-[11px] text-zinc-500">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-emerald-600" />
                            <span>
                              Verified Facility Health Record • Digital
                              Signature Authenticated
                            </span>
                          </div>
                          <span className="font-mono text-[10px] text-zinc-400">
                            Format: {activeDoc.format} ({activeDoc.size})
                          </span>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {previewDocIndex < filteredDocuments.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setPreviewDocIndex(previewDocIndex + 1)
                      setZoomScale(1)
                    }}
                    className="absolute right-6 z-20 h-12 w-12 rounded-full border border-white/20 bg-black/60 text-white shadow-2xl transition-all hover:bg-black/90"
                    title="Next Document"
                  >
                    <ChevronRight className="h-7 w-7" />
                  </Button>
                )}
              </div>
            </div>
          )
        })()}

      <ConfirmDeleteModal
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title="Delete EHR Record"
        description={`Are you sure you want to delete "${docToDelete?.title || "this record"}" from facility EHR archives? This action cannot be undone.`}
        confirmText="Delete Record"
        isDeleting={isDeleting}
        onConfirm={executeDeleteDocument}
      />
      </div>
    </div>
  )
}
