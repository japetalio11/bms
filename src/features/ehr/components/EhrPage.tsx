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
  FileCheck
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
}

export function EhrPage() {
  const [documents, setDocuments] = useState<EhrDocument[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([])

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<EhrDocument | null>(null)

  const handleAddDocument = (newDoc: EhrDocument) => {
    setDocuments(prev => [newDoc, ...prev])
  }

  const handleDeleteDocument = (id: string) => {
    if (!confirm("Are you sure you want to remove this record from facility EHR archives?")) return
    setDocuments(prev => prev.filter(d => d.id !== id))
  }

  const handleDownload = (doc: EhrDocument) => {
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
                      onClick={() => setViewingDoc(doc)}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox className="border-sidebar-border data-[state=checked]:bg-primary dark:data-[state=checked]:bg-white data-[state=checked]:text-primary-foreground dark:data-[state=checked]:text-black" />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {doc.format === "PDF" && <FileText className="h-4 w-4 text-red-400 shrink-0" />}
                          {doc.format === "CSV" && <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />}
                          {doc.format !== "PDF" && doc.format !== "CSV" && <FileCheck className="h-4 w-4 text-blue-400 shrink-0" />}
                          <span className="truncate max-w-[220px]" title={doc.title}>{doc.title}</span>
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
                            <DropdownMenuItem onClick={() => setViewingDoc(doc)} className="text-xs cursor-pointer rounded-md">View Details</DropdownMenuItem>
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

      {/* Document Detail Preview Modal */}
      {viewingDoc && (
        <ResponsiveModal
          open={!!viewingDoc}
          onOpenChange={(open) => !open && setViewingDoc(null)}
          title="EHR Document Details"
          description={`Metadata & preview summary for ${viewingDoc.id}`}
        >
          <div className="flex flex-col gap-4 py-2 text-xs text-foreground">
            <div className="flex items-start justify-between border-b border-sidebar-border pb-3">
              <div>
                <h3 className="text-sm font-semibold">{viewingDoc.title}</h3>
                <p className="text-muted-foreground text-[11px] mt-0.5">{viewingDoc.category}</p>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-md">
                {viewingDoc.format}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground block text-[11px]">Scope / Patient</span>
                <span className="font-medium">{viewingDoc.patientName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Security Level</span>
                <span className="font-medium">{viewingDoc.securityLevel}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">File Size</span>
                <span className="font-medium">{viewingDoc.size}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Uploaded By</span>
                <span className="font-medium">{viewingDoc.uploadedBy}</span>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border border-sidebar-border mt-2">
              <span className="font-semibold block mb-1">Document Status & Verification</span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                This document is digitally signed and indexed under facility records. SHA-256 hash verified with system audit logs.
              </p>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-sidebar-border">
              <Button variant="ghost" onClick={() => setViewingDoc(null)} className="flex-1 h-8 text-xs">
                Close
              </Button>
              <Button onClick={() => handleDownload(viewingDoc)} className="flex-1 h-8 text-xs bg-primary text-primary-foreground dark:bg-white dark:text-black">
                Download File
              </Button>
            </div>
          </div>
        </ResponsiveModal>
      )}
    </div>
  )
}
