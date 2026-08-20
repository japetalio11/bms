import * as React from "react"
import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  FileText, 
  Search, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  ShieldCheck, 
  PlusCircle, 
  FolderArchive,
  RefreshCw,
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

const INITIAL_DOCUMENTS: EhrDocument[] = [
  {
    id: "EHR-1001",
    title: "High-Risk Pregnancy Clinical Guidelines 2026",
    category: "Clinical Protocols",
    patientName: "Facility General",
    securityLevel: "Public",
    format: "PDF",
    size: "3.4 MB",
    dateUploaded: "Aug 15, 2026",
    uploadedBy: "Dr. Elena Rostova"
  },
  {
    id: "EHR-1002",
    title: "Maternal Blood Screening & Lab Summary",
    category: "Lab & Diagnostics",
    patientName: "Anna Marie Santos",
    securityLevel: "Confidential",
    format: "PDF",
    size: "1.8 MB",
    dateUploaded: "Aug 18, 2026",
    uploadedBy: "Nurse Maria Lopez"
  },
  {
    id: "EHR-1003",
    title: "RHU Facility DOH Accreditation Certificate",
    category: "Facility Audit & Accreditation",
    patientName: "Facility General",
    securityLevel: "Restricted",
    format: "PDF",
    size: "5.2 MB",
    dateUploaded: "Jul 10, 2026",
    uploadedBy: "Admin System"
  },
  {
    id: "EHR-1004",
    title: "Ultrasound Scan Report & Fetal Doppler Data",
    category: "Maternal Records",
    patientName: "Maria Clara Santos",
    securityLevel: "Confidential",
    format: "PNG",
    size: "4.1 MB",
    dateUploaded: "Aug 12, 2026",
    uploadedBy: "Dr. Ramon Reyes"
  },
  {
    id: "EHR-1005",
    title: "Inter-Clinic Emergency Referral Log Q2 2026",
    category: "Referral Archives",
    patientName: "Facility General",
    securityLevel: "Confidential",
    format: "CSV",
    size: "820 KB",
    dateUploaded: "Jul 30, 2026",
    uploadedBy: "Nurse Joy Cruz"
  }
]

export function EhrPage() {
  const [documents, setDocuments] = useState<EhrDocument[]>(INITIAL_DOCUMENTS)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([])
  const [selectedSecurityFilters, setSelectedSecurityFilters] = useState<string[]>([])

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

      // Security popover filter
      if (selectedSecurityFilters.length > 0) {
        if (!selectedSecurityFilters.includes(doc.securityLevel)) return false
      }

      return true
    })
  }, [documents, searchQuery, activeTab, selectedCategoryFilters, selectedSecurityFilters])

  const toggleFilter = (list: string[], setList: (v: string[]) => void, item: string) => {
    if (list.includes(item)) setList(list.filter(i => i !== item))
    else setList([...list, item])
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground p-4 md:p-6 overflow-y-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Electronic Health Records (EHR)</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Central repository for facility medical documents, clinical SOPs, and patient records.
          </p>
        </div>

        <UploadDocumentModal open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen} onSuccess={handleAddDocument}>
          <Button className="h-9 px-3 text-xs font-medium gap-2 bg-primary text-primary-foreground dark:bg-white dark:text-black hover:bg-zinc-200">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        </UploadDocumentModal>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total EHR Records</span>
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <span className="text-2xl font-bold mt-2">{documents.length}</span>
          <span className="text-[10px] text-emerald-500 mt-1 font-medium">Synced with facility vault</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Clinical Protocols</span>
            <FileCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold mt-2">
            {documents.filter(d => d.category === "Clinical Protocols").length}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">DOH & RHU Standard SOPs</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Patient Records</span>
            <FolderArchive className="h-4 w-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold mt-2">
            {documents.filter(d => d.category === "Maternal Records" || d.category === "Lab & Diagnostics").length}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">Patient-linked files</span>
        </div>

        <div className="flex flex-col p-4 rounded-xl border border-sidebar-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Encrypted Storage</span>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </div>
          <span className="text-2xl font-bold mt-2">15.3 MB</span>
          <span className="text-[10px] text-muted-foreground mt-1">HIPAA compliant security</span>
        </div>
      </div>

      {/* Control Bar: Tabs, Search, Popover Filters */}
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
            <div className="relative w-full sm:w-[220px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Search EHR records..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Category Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 text-xs font-medium gap-1.5 border-sidebar-border shrink-0">
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

            {/* Security Level Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 px-2 text-xs font-medium gap-1.5 border-sidebar-border shrink-0">
                  <PlusCircle className="h-3.5 w-3.5" />
                  Security {selectedSecurityFilters.length > 0 && `(${selectedSecurityFilters.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[180px] p-3 flex flex-col gap-2.5" align="end">
                {["Public", "Confidential", "Restricted"].map(sec => (
                  <div key={sec} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`filter-sec-${sec}`}
                      checked={selectedSecurityFilters.includes(sec)}
                      onCheckedChange={() => toggleFilter(selectedSecurityFilters, setSelectedSecurityFilters, sec)}
                      className="h-3.5 w-3.5"
                    />
                    <label htmlFor={`filter-sec-${sec}`} className="text-xs cursor-pointer">{sec}</label>
                  </div>
                ))}
                {selectedSecurityFilters.length > 0 && (
                  <Button onClick={() => setSelectedSecurityFilters([])} className="h-7 text-xs mt-1">Clear</Button>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* EHR Records Data Table */}
      <div className="border border-sidebar-border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-sidebar-border bg-muted/30 dark:bg-white/5 text-muted-foreground font-medium">
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Scope / Patient</th>
                <th className="py-3 px-4">Security Level</th>
                <th className="py-3 px-4">Format & Size</th>
                <th className="py-3 px-4">Date Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sidebar-border">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map(doc => (
                  <tr key={doc.id} className="hover:bg-accent/40 dark:hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {doc.format === "PDF" && <FileText className="h-4 w-4 text-red-400 shrink-0" />}
                        {doc.format === "CSV" && <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />}
                        {doc.format !== "PDF" && doc.format !== "CSV" && <FileCheck className="h-4 w-4 text-blue-400 shrink-0" />}
                        <span className="truncate max-w-[220px]" title={doc.title}>{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{doc.category}</td>
                    <td className="py-3.5 px-4 text-foreground font-medium">{doc.patientName}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        doc.securityLevel === 'Public' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        doc.securityLevel === 'Confidential' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-purple-500/10 text-purple-500 border-purple-500/20'
                      }`}>
                        {doc.securityLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {doc.format} • {doc.size}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{doc.dateUploaded}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setViewingDoc(doc)} 
                          title="View Details"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDownload(doc)} 
                          title="Download Record"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteDocument(doc.id)} 
                          title="Delete Record"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground italic">
                    No EHR records matching your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
