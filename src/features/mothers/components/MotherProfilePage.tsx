import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMotherProfile } from "../hooks/useMotherProfile"
import { ProfileHeader } from "./profile/ProfileHeader"
import { PregnancyTab } from "./profile/PregnancyTab"
import { VisitationTab } from "./profile/VisitationTab"
import { AppointmentsTab } from "./profile/AppointmentsTab"
import { LaboratoryTab } from "./profile/LaboratoryTab"
import { PrescriptionsTab } from "./profile/PrescriptionsTab"

import { EditMotherModal } from "./EditMotherModal"
import { UploadAvatarModal } from "./UploadAvatarModal"
import { LogVitalsModal } from "./LogVitalsModal"
import { RegisterPregnancyModal } from "./RegisterPregnancyModal"
import { RegisterAppointmentModal } from "./RegisterAppointmentModal"
import { RegisterLabModal } from "./RegisterLabModal"
import { RegisterSupplementModal } from "./RegisterSupplementModal"
import { DetailSideSheet } from "./DetailSideSheet"
import { extractRiskLevel } from "@/lib/riskUtils"

export function MotherProfilePage({ motherId }: { motherId?: string }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const targetId = id || motherId

  const [activeTab, setActiveTab] = useState("pregnancy")

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [logVitalsModalOpen, setLogVitalsModalOpen] = useState(false)
  const [registerPregnancyModalOpen, setRegisterPregnancyModalOpen] = useState(false)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [supplementModalOpen, setSupplementModalOpen] = useState(false)

  // Side sheet state
  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [sideSheetType, setSideSheetType] = useState<"pregnancy" | "visitation" | "appointment" | "laboratory" | "prescription" | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const openSideSheet = (type: "pregnancy" | "visitation" | "appointment" | "laboratory" | "prescription", record: any) => {
    setSideSheetType(type)
    setSelectedRecord(record)
    setSideSheetOpen(true)
  }

  // Reactive SWR hook (<10ms local Dexie cache + background composite sync)
  const {
    mother,
    pregnancies,
    prenatalVisits,
    appointments,
    labRecords,
    supplements,
    isLoading,
    isSyncing,
    refresh,
  } = useMotherProfile(targetId)

  // Redirect if temporary ID has reconciled to a permanent canonical ID
  useEffect(() => {
    if (mother) {
      const canonicalId = mother.mother_id || mother._id || mother.id
      if (canonicalId && canonicalId !== targetId && targetId?.startsWith("temp-")) {
        navigate(`/dashboard/mothers/${canonicalId}`, { replace: true })
      }
    }
  }, [mother, targetId, navigate])

  // Listen for background sync temp-id reconciliations
  useEffect(() => {
    const handleReconciled = (e: any) => {
      const { tempId, canonicalId } = e.detail || {}
      if (tempId === targetId && canonicalId) {
        navigate(`/dashboard/mothers/${canonicalId}`, { replace: true })
      } else {
        refresh()
      }
    }

    window.addEventListener("bms:temp-id-reconciled", handleReconciled)
    return () => window.removeEventListener("bms:temp-id-reconciled", handleReconciled)
  }, [targetId, navigate, refresh])

  // Compute composite data for legacy modal compatibility
  const fullMotherData = useMemo(() => {
    if (!mother) return null
    return {
      ...mother,
      mother_id: mother.mother_id || mother.user_id || mother._id || mother.id || targetId,
      _id: mother.mother_id || mother.user_id || mother._id || mother.id || targetId,
      id: mother.mother_id || mother.user_id || mother._id || mother.id || targetId,
      pregnancies,
      prenatalVisits,
      appointments,
      labRecords,
      supplementationRecords: supplements,
    }
  }, [mother, pregnancies, prenatalVisits, appointments, labRecords, supplements, targetId])

  const motherName = useMemo(() => {
    if (!mother) return "Mother Profile"
    return (
      [
        mother.user?.first_name || mother.first_name,
        mother.user?.middle_name || mother.middle_name,
        mother.user?.last_name || mother.last_name,
      ].filter(Boolean).join(" ") || mother.name || "Mother Profile"
    )
  }, [mother])

  const defaultRisk = useMemo(() => {
    return extractRiskLevel(mother, pregnancies, prenatalVisits)
  }, [mother, pregnancies, prenatalVisits])

  const tabTriggerClass = "text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all"

  // Only block the UI if Dexie has zero cached data and initial sync is running
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full p-8 text-xs text-muted-foreground bg-background gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading mother profile...</span>
      </div>
    )
  }

  return (
    <div className="relative flex items-start w-full h-full overflow-hidden bg-background">
      {/* Main Content Area */}
      <div className="flex flex-col w-full h-full text-foreground min-w-0 overflow-y-auto relative">
        {/* Scrollable Content */}
        <div className="flex flex-col gap-4 p-4 pl-3 pr-4 pb-24 md:pb-4">
          
          {/* Top Bar with Back Button & Sync Indicator */}
          <div className="flex items-center justify-between -mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 -ml-2"
              onClick={() => navigate('/dashboard/mothers')}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Masterlist
            </Button>

            {isSyncing && (
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-muted-foreground bg-muted/50 rounded-md">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Updating profile...</span>
              </div>
            )}
          </div>

          {/* Section A: Profile Header */}
          <ProfileHeader
            motherData={fullMotherData}
            pregnancies={pregnancies}
            prenatalVisits={prenatalVisits}
            onEditClick={() => setEditModalOpen(true)}
            onLogVitalsClick={() => setLogVitalsModalOpen(true)}
            onAvatarClick={() => setAvatarModalOpen(true)}
          />

          {/* Tabs Navigation */}
          <div className="sticky top-0 z-10 w-full overflow-x-auto shrink-0 pb-2 -mb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-background pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-max">
              <TabsList className="bg-muted border border-border h-9 w-full md:w-max justify-start rounded-lg p-1 gap-1 *:flex-1 md:*:flex-initial">
                <TabsTrigger value="pregnancy" className={tabTriggerClass}>Pregnancy</TabsTrigger>
                <TabsTrigger value="encounters" className={tabTriggerClass}>Visitation</TabsTrigger>
                <TabsTrigger value="appointments" className={tabTriggerClass}>Appointments</TabsTrigger>
                <TabsTrigger value="laboratory" className={tabTriggerClass}>Laboratory Records</TabsTrigger>
                <TabsTrigger value="prescriptions" className={tabTriggerClass}>Prescriptions & Supplements</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Section B: Tabbed Content */}
          <div className="w-full">
            {activeTab === "pregnancy" && (
              <PregnancyTab
                pregnancyList={pregnancies}
                onViewRecord={(p) => openSideSheet("pregnancy", p)}
                onEditRecord={(p) => openSideSheet("pregnancy", p)}
                onDeleteRecord={(p) => openSideSheet("pregnancy", p)}
                onNewRecord={() => setRegisterPregnancyModalOpen(true)}
                onRefresh={refresh}
              />
            )}

            {activeTab === "encounters" && (
              <VisitationTab
                visitationList={prenatalVisits}
                defaultRisk={defaultRisk}
                onViewRecord={(v) => openSideSheet("visitation", v)}
                onEditRecord={(v) => openSideSheet("visitation", v)}
                onDeleteRecord={(v) => openSideSheet("visitation", v)}
                onNewRecord={() => setLogVitalsModalOpen(true)}
                onRefresh={refresh}
              />
            )}

            {activeTab === "appointments" && (
              <AppointmentsTab
                appointmentList={appointments}
                onViewRecord={(a) => openSideSheet("appointment", a)}
                onEditRecord={(a) => openSideSheet("appointment", a)}
                onDeleteRecord={(a) => openSideSheet("appointment", a)}
                onNewRecord={() => setAppointmentModalOpen(true)}
                onRefresh={refresh}
              />
            )}

            {activeTab === "laboratory" && (
              <LaboratoryTab
                labRecordList={labRecords}
                onViewRecord={(l) => openSideSheet("laboratory", l)}
                onEditRecord={(l) => openSideSheet("laboratory", l)}
                onDeleteRecord={(l) => openSideSheet("laboratory", l)}
                onNewRecord={() => setLabModalOpen(true)}
                onRefresh={refresh}
              />
            )}

            {activeTab === "prescriptions" && (
              <PrescriptionsTab
                supplementList={supplements}
                onViewRecord={(s) => openSideSheet("prescription", s)}
                onEditRecord={(s) => openSideSheet("prescription", s)}
                onDeleteRecord={(s) => openSideSheet("prescription", s)}
                onNewRecord={() => setSupplementModalOpen(true)}
                onRefresh={refresh}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals & Sheets */}
      <EditMotherModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        motherData={fullMotherData}
        onSuccess={refresh}
      />
      <UploadAvatarModal
        open={avatarModalOpen}
        onOpenChange={setAvatarModalOpen}
        motherData={fullMotherData}
        onSuccess={refresh}
      />
      <LogVitalsModal
        open={logVitalsModalOpen}
        onOpenChange={setLogVitalsModalOpen}
        motherData={fullMotherData}
        onSuccess={refresh}
      />
      <RegisterPregnancyModal
        open={registerPregnancyModalOpen}
        onOpenChange={setRegisterPregnancyModalOpen}
        motherData={fullMotherData}
        onSuccess={refresh}
      />
      <RegisterAppointmentModal
        open={appointmentModalOpen}
        onOpenChange={setAppointmentModalOpen}
        motherData={fullMotherData}
        onSuccess={refresh}
      />
      <RegisterLabModal
        open={labModalOpen}
        onOpenChange={setLabModalOpen}
        motherData={fullMotherData}
        visitationList={prenatalVisits}
        onSuccess={refresh}
      />
      <RegisterSupplementModal
        open={supplementModalOpen}
        onOpenChange={setSupplementModalOpen}
        motherData={fullMotherData}
        visitationList={prenatalVisits}
        onSuccess={refresh}
      />
      <DetailSideSheet
        open={sideSheetOpen}
        onOpenChange={setSideSheetOpen}
        type={sideSheetType}
        data={selectedRecord}
        motherName={motherName}
        onSuccess={refresh}
      />
    </div>
  )
}
