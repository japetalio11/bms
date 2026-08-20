import * as React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  ChevronRight
} from "lucide-react"
import { UploadDocumentModal } from "./UploadDocumentModal"
import { ResponsiveModal } from "@/components/ui/responsive-modal"

export interface EhrDocument {
  id: string
  title: string
  category: string
  patientName: string
  securityLevel: string
  format: string
  size: string
  dateUploaded: string
  uploadedBy: string
  fileUrl?: string
}

export function EhrPage() {
  const [documents, setDocuments] = useState<EhrDocument[]>(() => {
    try {
      const userStr = localStorage.getItem("user")
      const user = userStr ? JSON.parse(userStr) : null
      const facilityId = user?.facility_id || "default"
      const saved = localStorage.getItem(`bms_ehr_docs_${facilityId}`)
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      return []
    }
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([])

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<EhrDocument | null>(null)
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null)
  const [zoomScale, setZoomScale] = useState(1)

  // Save to localStorage whenever documents array updates
  React.useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      const user = userStr ? JSON.parse(userStr) : null
      const facilityId = user?.facility_id || "default"
      localStorage.setItem(`bms_ehr_docs_${facilityId}`, JSON.stringify(documents))
    } catch (e) {
      console.error("Failed to save EHR documents to localStorage", e)
    }
  }, [documents])

  const handleAddDocument = (newDoc: EhrDocument) => {
    setDocuments(prev => [newDoc, ...prev])
  }

  const handleDeleteDocument = (id: string) => {
    if (!confirm("Are you sure you want to remove this record from facility EHR archives?")) return
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const handleDownload = (doc: EhrDocument) => {
    if (doc.fileUrl) {
      const link = document.createElement("a")
      link.href = doc.fileUrl
      const ext = doc.format ? doc.format.toLowerCase() : "png"
      const cleanTitle = doc.title.replace(/[^a-zA-Z0-9]/g, "_")
      link.download = cleanTitle.endsWith(`.${ext}`) ? cleanTitle : `${cleanTitle}.${ext}`
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

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Search
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase()
        const matchTitle = doc.title.toLowerCase().includes(q)
        const matchCat = doc.category.toLowerCase().includes(q)
        const matchPatient = doc.patientName.toLowerCase().includes(q)
        if (!matchTitle && !matchCat && !matchPatient) return false
      }

      // Tab filter
      if (activeTab === "protocols" && doc.category !== "Clinical Protocols") return false
      if (activeTab === "labs" && doc.category !== "Lab & Diagnostics") return false
      if (activeTab === "maternal" && doc.category !== "Maternal Records") return false
      if (activeTab === "audit" && doc.category !== "Facility Audit & Accreditation") return false

      // Category popover filter
      if (selectedCategoryFilters.length > 0) {
        if (!selectedCategoryFilters.includes(doc.category)) return false
      }

      return true
    })
  }, [documents, searchQuery, activeTab, selectedCategoryFilters])

  const toggleFilter = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) setList(list.filter(i => i !== item))
    else setList([...list, item])
  }

  return (
    <div className="flex flex-col h-full bg-background dark:bg-black text-foreground p-4 md:p-6 overflow-y-auto space-y-4">
      {/* Control Bar: Tabs, Search, Popover Filters & Upload Button */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="bg-muted dark:bg-[#1e1e1e] border-none h-9 w-full md:w-max justify-start rounded-md p-1 gap-1">
              <TabsTrigger value="all" className="text-xs px-2.5 py-1">All Records</TabsTrigger>
              <TabsTrigger value="protocols" className="text-xs px-2.5 py-1">Protocols</TabsTrigger>
              <TabsTrigger value="labs" className="text-xs px-2.5 py-1">Lab Archives</TabsTrigger>
              <TabsTrigger value="maternal" className="text-xs px-2.5 py-1">Maternal Files</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs px-2.5 py-1">Audit & Compliance</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <div className="relative w-full sm:w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search EHR records..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs border-sidebar-border"
              />
            </div>

            {/* Category Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 text-xs font-medium gap-1.5 border-sidebar-border shrink-0 !bg-background dark:!bg-black">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Category {selectedCategoryFilters.length > 0 && `(${selectedCategoryFilters.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-3 flex flex-col gap-2.5" align="end">
                {["Clinical Protocols", "Lab & Diagnostics", "Maternal Records", "Facility Audit & Accreditation", "Referral Archives"].map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`filter-cat-${cat}`}
                      checked={selectedCategoryFilters.includes(cat)}
                      onCheckedChange={() => toggleFilter(selectedCategoryFilters, setSelectedCategoryFilters, cat)}
                      className="h-3.5 w-3.5"
                    />
                    <label htmlFor={`filter-cat-${cat}`} className="text-xs cursor-pointer">{cat}</label>
                  </div>
                ))}
                {selectedCategoryFilters.length > 0 && (
                  <Button onClick={() => setSelectedCategoryFilters([])} className="h-7 text-xs mt-1">Clear</Button>
                )}
              </PopoverContent>
            </Popover>

            <UploadDocumentModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} onSuccess={handleAddDocument}>
              <Button className="h-9 px-3 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200 shrink-0">
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            </UploadDocumentModal>
          </div>
        </div>
      </div>

      {/* EHR Records Data Table Container */}
      <div className="flex flex-col gap-4">
        {/* Mobile List View (Hidden on MD and up) */}
        <div className="flex md:hidden flex-col gap-4">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-sidebar-border rounded-xl bg-card dark:bg-black">
              <p className="text-xs text-muted-foreground">No EHR records found</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card dark:bg-black gap-3 cursor-pointer hover:border-foreground/20 transition-colors"
                onClick={() => setViewingDoc(doc)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {doc.format === "PDF" && <FileText className="h-4 w-4 text-red-400 shrink-0" />}
                    {doc.format === "CSV" && <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />}
                    {doc.format !== "PDF" && doc.format !== "CSV" && <FileCheck className="h-4 w-4 text-blue-400 shrink-0" />}
                    <h3 className="text-sm font-semibold text-foreground dark:text-white truncate">{doc.title}</h3>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    doc.securityLevel === 'Public' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    doc.securityLevel === 'Confidential' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                    'bg-purple-500/10 text-purple-500 border-purple-500/20'
                  }`}>
                    {doc.securityLevel}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="text-foreground dark:text-white font-medium">{doc.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Scope / Patient</span>
                    <span className="text-foreground dark:text-white font-medium">{doc.patientName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Date Uploaded</span>
                    <span className="text-foreground dark:text-white">{doc.dateUploaded}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-sidebar-border gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setViewingDoc(doc); }}>View</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>Download</Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Data Table */}
        <div className="hidden md:block rounded-md border border-sidebar-border overflow-x-auto bg-background dark:bg-black">
          <div className="min-w-[900px]">
            <Table>
              <TableHeader className="bg-card dark:bg-[#111]">
                <TableRow className="border-sidebar-border hover:bg-transparent">
                  <TableHead className="w-12 text-center pl-4">
                    <Checkbox className="border-sidebar-border" />
                  </TableHead>
                  <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Document Title</TableHead>
                  <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Category</TableHead>
                  <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Scope / Patient</TableHead>
                  <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Security Level</TableHead>
                  <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Format & Size</TableHead>
                  <TableHead className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">Date Uploaded</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-xs text-muted-foreground">
                      No EHR records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="border-sidebar-border cursor-pointer transition-colors group hover:bg-accent dark:hover:bg-white/5"
                      onClick={() => {
                        const idx = filteredDocuments.findIndex(d => d.id === doc.id)
                        setPreviewDocIndex(idx >= 0 ? idx : 0)
                        setZoomScale(1)
                      }}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {doc.fileUrl && (doc.format === "PNG" || doc.format === "JPG" || doc.format === "JPEG" || doc.format === "WEBP" || doc.format === "GIF" || doc.format === "BMP") ? (
                            <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-sidebar-border shrink-0 bg-black/40 shadow-sm hover:scale-105 transition-transform">
                              <img src={doc.fileUrl} alt={doc.title} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="h-12 w-12 rounded-lg flex items-center justify-center border border-sidebar-border shrink-0 bg-card dark:bg-[#181818]">
                              {doc.format === "PDF" && <FileText className="h-6 w-6 text-red-400" />}
                              {doc.format === "CSV" && <FileSpreadsheet className="h-6 w-6 text-emerald-400" />}
                              {doc.format !== "PDF" && doc.format !== "CSV" && <FileCheck className="h-6 w-6 text-blue-400" />}
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="truncate max-w-[260px] font-semibold text-foreground dark:text-white text-xs" title={doc.title}>{doc.title}</span>
                            <span className="text-[10px] text-muted-foreground">{doc.format} • {doc.size}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-foreground dark:text-white whitespace-nowrap">{doc.category}</TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">{doc.patientName}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          doc.securityLevel === 'Public' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          doc.securityLevel === 'Confidential' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                          'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        }`}>
                          {doc.securityLevel}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{doc.format} • {doc.size}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{doc.dateUploaded}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground dark:text-white group-hover:text-foreground dark:group-hover:text-white">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px] rounded-xl border-border shadow-md">
                            <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              const idx = filteredDocuments.findIndex(d => d.id === doc.id)
                              setPreviewDocIndex(idx >= 0 ? idx : 0)
                              setZoomScale(1)
                            }} className="text-xs cursor-pointer rounded-md">View Full Screen</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)} className="text-xs cursor-pointer rounded-md">Download File</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteDocument(doc.id)} className="text-xs cursor-pointer rounded-md text-red-500 focus:text-red-500">Delete Record</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Google Drive-Style Full Screen Lightbox Overlay */}
      {previewDocIndex !== null && filteredDocuments[previewDocIndex] && (() => {
        const activeDoc = filteredDocuments[previewDocIndex]
        return (
          <div className="fixed inset-0 z-[100] bg-black/95 text-white flex flex-col backdrop-blur-md select-none animate-in fade-in duration-200">
            {/* Top Toolbar Header (Google Drive Style) */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/90 border-b border-white/10 shrink-0">
              {/* Left: Close, Icon, Title */}
              <div className="flex items-center gap-3 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => setPreviewDocIndex(null)} className="h-9 w-9 text-white hover:bg-white/10 rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2 min-w-0">
                  {activeDoc.format === "PDF" ? <FileText className="h-5 w-5 text-red-400 shrink-0" /> : <FileCheck className="h-5 w-5 text-blue-400 shrink-0" />}
                  <span className="font-semibold text-sm text-white truncate max-w-[320px]" title={activeDoc.title}>{activeDoc.title}</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15 shrink-0 font-mono">
                    {activeDoc.format}
                  </span>
                </div>
              </div>

              {/* Center: Zoom Controls */}
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/15">
                <Button variant="ghost" size="icon" onClick={() => setZoomScale(z => Math.max(0.4, z - 0.25))} className="h-7 w-7 text-white hover:bg-white/10 rounded-full">
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono w-12 text-center text-white/90">{Math.round(zoomScale * 100)}%</span>
                <Button variant="ghost" size="icon" onClick={() => setZoomScale(z => Math.min(3.5, z + 0.25))} className="h-7 w-7 text-white hover:bg-white/10 rounded-full">
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setZoomScale(1)} className="h-7 text-[11px] text-white/80 hover:bg-white/10 rounded-full px-2">
                  Reset
                </Button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Button onClick={() => handleDownload(activeDoc)} className="h-9 px-4 text-xs font-medium gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setPreviewDocIndex(null)} className="h-9 w-9 text-white hover:bg-white/10 rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Center Canvas Viewport */}
            <div className="relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-auto bg-black/90">
              {/* Previous Arrow */}
              {previewDocIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setPreviewDocIndex(previewDocIndex - 1); setZoomScale(1); }}
                  className="absolute left-6 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-2xl transition-all"
                  title="Previous Document"
                >
                  <ChevronLeft className="h-7 w-7" />
                </Button>
              )}

              {/* Main Content Render */}
              <div className="flex items-center justify-center w-full h-full overflow-auto">
                {activeDoc.fileUrl ? (
                  activeDoc.format === "PNG" || activeDoc.format === "JPG" || activeDoc.format === "JPEG" || activeDoc.format === "WEBP" || activeDoc.format === "GIF" || activeDoc.format === "BMP" ? (
                    <img
                      src={activeDoc.fileUrl}
                      alt={activeDoc.title}
                      style={{ transform: `scale(${zoomScale})` }}
                      className="max-h-[85vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-transform duration-200 ease-out"
                    />
                  ) : activeDoc.format === "PDF" ? (
                    <iframe
                      src={activeDoc.fileUrl}
                      title={activeDoc.title}
                      style={{ transform: `scale(${zoomScale})`, transformOrigin: "top center" }}
                      className="w-[88vw] h-[84vh] rounded-xl border border-white/20 bg-white shadow-2xl"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-white/10 gap-3 text-white/80">
                      <FileCheck className="h-16 w-16 text-blue-400" />
                      <p className="text-sm font-semibold">{activeDoc.title}</p>
                      <p className="text-xs text-white/60">{activeDoc.format} Document Record</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-2xl border border-white/10 gap-3 text-white/80">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm font-semibold">{activeDoc.title}</p>
                    <p className="text-xs text-white/60">No direct image file payload available</p>
                  </div>
                )}
              </div>

              {/* Next Arrow */}
              {previewDocIndex < filteredDocuments.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setPreviewDocIndex(previewDocIndex + 1); setZoomScale(1); }}
                  className="absolute right-6 z-20 h-12 w-12 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 shadow-2xl transition-all"
                  title="Next Document"
                >
                  <ChevronRight className="h-7 w-7" />
                </Button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
