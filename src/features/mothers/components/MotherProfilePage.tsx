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

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [logVitalsModalOpen, setLogVitalsModalOpen] = useState(false)
  const [registerPregnancyModalOpen, setRegisterPregnancyModalOpen] =
    useState(false)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [supplementModalOpen, setSupplementModalOpen] = useState(false)

  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [sideSheetType, setSideSheetType] = useState<
    | "pregnancy"
    | "visitation"
    | "appointment"
    | "laboratory"
    | "prescription"
    | null
  >(null)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const openSideSheet = (
    type:
      | "pregnancy"
      | "visitation"
      | "appointment"
      | "laboratory"
      | "prescription",
    record: any
  ) => {
    setSideSheetType(type)
    setSelectedRecord(record)
    setSideSheetOpen(true)
  }

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

  useEffect(() => {
    if (mother) {
      const canonicalId = mother.mother_id || mother._id || mother.id
      if (
        canonicalId &&
        canonicalId !== targetId &&
        targetId?.startsWith("temp-")
      ) {
        navigate(`/dashboard/mothers/${canonicalId}`, { replace: true })
      }
    }
  }, [mother, targetId, navigate])

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
    return () =>
      window.removeEventListener("bms:temp-id-reconciled", handleReconciled)
  }, [targetId, navigate, refresh])

  const fullMotherData = useMemo(() => {
    if (!mother) return null
    return {
      ...mother,
      mother_id:
        mother.mother_id ||
        mother.user_id ||
        mother._id ||
        mother.id ||
        targetId,
      _id:
        mother.mother_id ||
        mother.user_id ||
        mother._id ||
        mother.id ||
        targetId,
      id:
        mother.mother_id ||
        mother.user_id ||
        mother._id ||
        mother.id ||
        targetId,
      pregnancies,
      prenatalVisits,
      appointments,
      labRecords,
      supplementationRecords: supplements,
    }
  }, [
    mother,
    pregnancies,
    prenatalVisits,
    appointments,
    labRecords,
    supplements,
    targetId,
  ])

  const motherName = useMemo(() => {
    if (!mother) return "Mother Profile"
    return (
      [
        mother.user?.first_name || mother.first_name,
        mother.user?.middle_name || mother.middle_name,
        mother.user?.last_name || mother.last_name,
      ]
        .filter(Boolean)
        .join(" ") ||
      mother.name ||
      "Mother Profile"
    )
  }, [mother])

  const defaultRisk = useMemo(() => {
    return extractRiskLevel(mother, pregnancies, prenatalVisits)
  }, [mother, pregnancies, prenatalVisits])

  const tabTriggerClass =
    "text-xs font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs text-muted-foreground hover:text-foreground rounded-md px-3 py-1 h-full transition-all"

  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-8 text-xs text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Loading mother profile...</span>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-start overflow-hidden bg-background">
      <div className="relative flex h-full w-full min-w-0 flex-col overflow-y-auto text-foreground">
        <div className="flex flex-col gap-4 p-4 pr-4 pb-24 pl-3 md:pb-4">
          <div className="-mb-2 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/dashboard/mothers")}
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Masterlist
            </Button>

            {isSyncing && (
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                <span>Updating profile...</span>
              </div>
            )}
          </div>

          <ProfileHeader
            motherData={fullMotherData}
            pregnancies={pregnancies}
            prenatalVisits={prenatalVisits}
            onEditClick={() => setEditModalOpen(true)}
            onLogVitalsClick={() => setLogVitalsModalOpen(true)}
            onAvatarClick={() => setAvatarModalOpen(true)}
          />

          <div className="sticky top-0 z-10 -mb-2 w-full shrink-0 [scrollbar-width:none] overflow-x-auto bg-background pt-2 pb-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full md:w-max"
            >
              <TabsList className="h-9 w-full justify-start gap-1 rounded-lg border border-border bg-muted p-1 *:flex-1 md:w-max md:*:flex-initial">
                <TabsTrigger value="pregnancy" className={tabTriggerClass}>
                  Pregnancy
                </TabsTrigger>
                <TabsTrigger value="encounters" className={tabTriggerClass}>
                  Visitation
                </TabsTrigger>
                <TabsTrigger value="appointments" className={tabTriggerClass}>
                  Appointments
                </TabsTrigger>
                <TabsTrigger value="laboratory" className={tabTriggerClass}>
                  Laboratory Records
                </TabsTrigger>
                <TabsTrigger value="prescriptions" className={tabTriggerClass}>
                  Prescriptions & Supplements
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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
