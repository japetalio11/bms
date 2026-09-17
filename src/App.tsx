import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthForm } from "@/components/auth-form"
import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout"
import { UnifiedPageLoader } from "@/components/ui/unified-page-loader"
import { PinUnlockModal } from "@/features/auth/components/PinUnlockModal"

const DashboardPage = lazy(() => import("@/features/dashboard/components/DashboardPage").then(m => ({ default: m.DashboardPage })))
const AppointmentListPage = lazy(() => import("@/features/appointments/components/AppointmentListPage").then(m => ({ default: m.AppointmentListPage })))
const CalendarPage = lazy(() => import("@/features/calendar/components/CalendarPage").then(m => ({ default: m.CalendarPage })))
const TeamManagementPage = lazy(() => import("@/features/team/components/TeamManagementPage").then(m => ({ default: m.TeamManagementPage })))
const StaffProfilePage = lazy(() => import("@/features/team/components/StaffProfilePage").then(m => ({ default: m.StaffProfilePage })))
const SettingsPage = lazy(() => import("@/features/settings/components/SettingsPage").then(m => ({ default: m.SettingsPage })))
const AnalyticsPage = lazy(() => import("@/features/analytics/components/AnalyticsPage").then(m => ({ default: m.AnalyticsPage })))
const MothersPage = lazy(() => import("@/features/mothers/components/MothersPage").then(m => ({ default: m.MothersPage })))
const MotherProfilePage = lazy(() => import("@/features/mothers/components/MotherProfilePage").then(m => ({ default: m.MotherProfilePage })))
const ReferralsPage = lazy(() => import("@/features/referrals/components/ReferralsPage").then(m => ({ default: m.ReferralsPage })))
const MessagesPage = lazy(() => import("@/features/messages/components/MessagesPage").then(m => ({ default: m.MessagesPage })))
const EhrPage = lazy(() => import("@/features/ehr/components/EhrPage").then(m => ({ default: m.EhrPage })))
const TestSmsPage = lazy(() => import("@/pages/TestSmsPage").then(m => ({ default: m.TestSmsPage })))
const PublicReferralPage = lazy(() => import("@/features/referrals/components/PublicReferralPage").then(m => ({ default: m.PublicReferralPage })))
const PublicSharedJourneyPage = lazy(() => import("@/features/mothers/components/PublicSharedJourneyPage").then(m => ({ default: m.PublicSharedJourneyPage })))

export function App() {
  return (
    <ThemeProvider>
      <PinUnlockModal />
      <BrowserRouter>
        <Suspense fallback={<UnifiedPageLoader />}>
          <Routes>
            <Route path="/referral/:id" element={<PublicReferralPage />} />

            <Route path="/shared-journey/:token" element={<PublicSharedJourneyPage />} />
            <Route path="/m/:token" element={<PublicSharedJourneyPage />} />

            <Route path="/" element={<AuthForm />} />
            <Route path="/login" element={<AuthForm />} />
            <Route path="/register" element={<AuthForm />} />
            <Route path="/sign-in" element={<AuthForm />} />
            <Route path="/sign-up" element={<AuthForm />} />
            <Route path="/forgot-password" element={<AuthForm />} />
            <Route path="/terms" element={<AuthForm />} />
            <Route path="/test-sms" element={<TestSmsPage />} />
            <Route path="/test sms" element={<TestSmsPage />} />
            <Route path="/test%20sms" element={<TestSmsPage />} />
            <Route path="/sms-test" element={<TestSmsPage />} />

            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />

              <Route path="mothers" element={<MothersPage />} />
              <Route path="mothers/:id" element={<MotherProfilePage />} />
              <Route path="appointments" element={<AppointmentListPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="ehr" element={<EhrPage />} />
              <Route path="referrals" element={<ReferralsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="team" element={<TeamManagementPage />} />
              <Route path="team/:id" element={<StaffProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />

              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="feedback" element={<div className="flex-1 w-full h-full bg-white dark:bg-black" />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App


