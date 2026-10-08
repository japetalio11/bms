import { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft, Loader2, AlertTriangle, GitMerge } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"

import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMotherProfile } from "../hooks/useMotherProfile"
import { ConflictResolutionModal } from "@/features/sync/components/ConflictResolutionModal"
import { ProfileHeader } from "./profile/ProfileHeader"
import { PregnancyTab } from "./profile/PregnancyTab"
import { VisitationTab } from "./profile/VisitationTab"
import { AppointmentsTab } from "./profile/AppointmentsTab"
import { LaboratoryTab } from "./profile/LaboratoryTab"
import { PrescriptionsTab } from "./profile/PrescriptionsTab"
import { DeliveryNewbornTab } from "./profile/DeliveryNewbornTab"

import { EditMotherModal } from "./EditMotherModal"
import { UploadAvatarModal } from "./UploadAvatarModal"
import { LogVitalsModal } from "./LogVitalsModal"
import { RegisterPregnancyModal } from "./RegisterPregnancyModal"
import { RegisterAppointmentModal } from "./RegisterAppointmentModal"
import { RegisterLabModal } from "./RegisterLabModal"
import { RegisterSupplementModal } from "./RegisterSupplementModal"
import { RecordDeliveryModal } from "./RecordDeliveryModal"
import { AssignStaffModal } from "./AssignStaffModal"
import { ExportMotherClinicalRecordModal } from "./ExportMotherClinicalRecordModal"
import { DetailSideSheet } from "./DetailSideSheet"
import { extractRiskLevel } from "@/lib/riskUtils"
import { isDemoMode } from "@/lib/utils"

export function MotherProfilePage({ motherId }: { motherId?: string }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const targetId = id || motherId

  const [activeTab, setActiveTab] = useState("pregnancy")

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [logVitalsModalOpen, setLogVitalsModalOpen] = useState(false)
  const [assignStaffModalOpen, setAssignStaffModalOpen] = useState(false)
  const [exportClinicalModalOpen, setExportClinicalModalOpen] = useState(false)
  const [registerPregnancyModalOpen, setRegisterPregnancyModalOpen] =
    useState(false)
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [supplementModalOpen, setSupplementModalOpen] = useState(false)
  const [recordDeliveryModalOpen, setRecordDeliveryModalOpen] = useState(false)
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false)

  const conflictRecord = useLiveQuery(
    () =>
      targetId
        ? db.conflicts
            .where("entity_id")
            .equals(targetId)
            .and((c) => c.status === "unresolved")
            .first()
        : undefined,
    [targetId]
  )

  const handleSimulatePatientConflict = async () => {
    if (!targetId || !fullMotherData) return
    const demoConflictId = `conflict_mother_${targetId}`
    await db.conflicts.put({
      conflict_id: demoConflictId,
      entity_type: "mother",
      entity_id: targetId,
      entity_name:
        `${fullMotherData.first_name || ""} ${fullMotherData.last_name || ""}`.trim() ||
        "Patient",
      endpoint: `/api/v1/mother/update/${targetId}`,
      method: "PUT",
      server_version: (fullMotherData.version || 1) + 2,
      client_version: fullMotherData.version || 1,
      server_record: {
        ...fullMotherData,
        civil_status: "Married",
        blood_type: "O+",
        phone_number: "+63 917 555 1234",
        address: "Zone 2, Main Health Center District",
        version: (fullMotherData.version || 1) + 2,
      },
      client_payload: {
        ...fullMotherData,
        civil_status: "Single",
        blood_type: "A+",
        phone_number: "+63 917 888 5678",
        address: "Purok 5, Remote Station Outreach Area",
        version: fullMotherData.version || 1,
      },
      conflicting_fields: ["civil_status", "blood_type", "phone_number", "address"],
      status: "unresolved",
      detected_at: Date.now(),
      last_error: `Conflict detected on ${fullMotherData.first_name || "patient"}: Concurrent update on server.`,
    })
    await db.mothers.update(targetId, { sync_status: "conflict" }).catch(() => {})
    await syncEngine.notify()
    setIsConflictModalOpen(true)
  }

  const [sideSheetOpen, setSideSheetOpen] = useState(false)
  const [sideSheetType, setSideSheetType] = useState<
    | "pregnancy"
    | "visitation"
    | "appointment"
    | "laboratory"
    | "prescription"
    | "delivery"
    | null
  >(null)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const openSideSheet = (
    type:
      | "pregnancy"
      | "visitation"
      | "appointment"
      | "laboratory"
      | "prescription"
      | "delivery",
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
    deliveries,
    newborns,
    postpartumVisits,
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
      deliveries,
      newborns,
      postpartumVisits,
    }
  }, [
    mother,
    pregnancies,
    prenatalVisits,
    appointments,
    labRecords,
    supplements,
    deliveries,
    newborns,
    postpartumVisits,
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

            <div className="flex items-center gap-2">
              {isDemoMode() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulatePatientConflict}
                  className="h-8 gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  title="Simulate a concurrent modification conflict on this patient"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  <span>Test Conflict Mode</span>
                </Button>
              )}

              {isSyncing && (
                <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>Updating profile...</span>
                </div>
              )}
            </div>
          </div>

          {(conflictRecord || mother?.sync_status === "conflict") && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">
                    Concurrent MVCC Conflict Detected
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Modifications made to this patient profile conflict with updates on the server.
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setIsConflictModalOpen(true)}
                className="shrink-0 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Resolve Conflict</span>
              </Button>
            </div>
          )}

          <ProfileHeader
            motherData={fullMotherData}
            pregnancies={pregnancies}
            prenatalVisits={prenatalVisits}
            onEditClick={() => setEditModalOpen(true)}
            onLogVitalsClick={() => setLogVitalsModalOpen(true)}
            onAvatarClick={() => setAvatarModalOpen(true)}
            onAssignStaffClick={() => setAssignStaffModalOpen(true)}
            onExportChartClick={() => setExportClinicalModalOpen(true)}
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
                <TabsTrigger value="delivery" className={tabTriggerClass}>
                  Delivery & Newborns
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

            {activeTab === "delivery" && (
              <DeliveryNewbornTab
                deliveryList={deliveries}
                newbornList={newborns}
                postpartumList={postpartumVisits}
                onViewRecord={(d) => openSideSheet("delivery", d)}
                onEditRecord={(d) => openSideSheet("delivery", d)}
                onDeleteRecord={(d) => openSideSheet("delivery", d)}
                onNewRecord={() => setRecordDeliveryModalOpen(true)}
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
      <RecordDeliveryModal
        open={recordDeliveryModalOpen}
        onOpenChange={setRecordDeliveryModalOpen}
        motherData={fullMotherData}
        pregnancyList={pregnancies}
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
      <AssignStaffModal
        open={assignStaffModalOpen}
        onOpenChange={setAssignStaffModalOpen}
        motherId={
          fullMotherData?.mother_id ||
          fullMotherData?._id ||
          fullMotherData?.id ||
          targetId ||
          ""
        }
        currentStaffId={
          fullMotherData?.assigned_worker_id ||
          fullMotherData?.assignedWorker?.user_id
        }
        currentStaffName={
          fullMotherData?.assignedWorker
            ? `${fullMotherData.assignedWorker.first_name} ${fullMotherData.assignedWorker.last_name}`
            : undefined
        }
        motherName={motherName}
        onSuccess={refresh}
      />
      <ExportMotherClinicalRecordModal
        open={exportClinicalModalOpen}
        onOpenChange={setExportClinicalModalOpen}
        motherData={fullMotherData}
        pregnancyList={pregnancies}
        prenatalVisits={prenatalVisits}
        labRecords={labRecords}
        supplements={supplements}
        deliveries={deliveries}
        newborns={newborns}
        postpartumVisits={postpartumVisits}
      />
      <ConflictResolutionModal
        open={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        entityId={targetId}
        onResolved={refresh}
      />
    </div>
  )
}

