import { Suspense } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { lazyWithRetry } from "@/lib/lazyWithRetry"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/features/auth/context/AuthContext"
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute"
import { PublicOnlyRoute } from "@/features/auth/components/PublicOnlyRoute"
import { AuthForm } from "@/components/auth-form"
import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout"
import { UnifiedPageLoader } from "@/components/ui/unified-page-loader"
import { PinUnlockModal } from "@/features/auth/components/PinUnlockModal"

const DashboardPage = lazyWithRetry(() => import("@/features/dashboard/components/DashboardPage"), "DashboardPage")
const AppointmentListPage = lazyWithRetry(() => import("@/features/appointments/components/AppointmentListPage"), "AppointmentListPage")
const CalendarPage = lazyWithRetry(() => import("@/features/calendar/components/CalendarPage"), "CalendarPage")
const TeamManagementPage = lazyWithRetry(() => import("@/features/team/components/TeamManagementPage"), "TeamManagementPage")
const StaffProfilePage = lazyWithRetry(() => import("@/features/team/components/StaffProfilePage"), "StaffProfilePage")
const SettingsPage = lazyWithRetry(() => import("@/features/settings/components/SettingsPage"), "SettingsPage")
const AnalyticsPage = lazyWithRetry(() => import("@/features/analytics/components/AnalyticsPage"), "AnalyticsPage")
const MothersPage = lazyWithRetry(() => import("@/features/mothers/components/MothersPage"), "MothersPage")
const MotherProfilePage = lazyWithRetry(() => import("@/features/mothers/components/MotherProfilePage"), "MotherProfilePage")
const ReferralsPage = lazyWithRetry(() => import("@/features/referrals/components/ReferralsPage"), "ReferralsPage")
const MessagesPage = lazyWithRetry(() => import("@/features/messages/components/MessagesPage"), "MessagesPage")
const EhrPage = lazyWithRetry(() => import("@/features/ehr/components/EhrPage"), "EhrPage")
const TestSmsPage = lazyWithRetry(() => import("@/pages/TestSmsPage"), "TestSmsPage")
const PublicReferralPage = lazyWithRetry(() => import("@/features/referrals/components/PublicReferralPage"), "PublicReferralPage")
const PublicSharedJourneyPage = lazyWithRetry(() => import("@/features/mothers/components/PublicSharedJourneyPage"), "PublicSharedJourneyPage")

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PinUnlockModal />
        <BrowserRouter>
          <Suspense fallback={<UnifiedPageLoader />}>
            <Routes>
              {/* Public open patient endpoints */}
              <Route path="/referral/:id" element={<PublicReferralPage />} />
              <Route path="/shared-journey/:token" element={<PublicSharedJourneyPage />} />
              <Route path="/m/:token" element={<PublicSharedJourneyPage />} />

              {/* Developer / test utilities */}
              <Route path="/test-sms" element={<TestSmsPage />} />
              <Route path="/test sms" element={<TestSmsPage />} />
              <Route path="/test%20sms" element={<TestSmsPage />} />
              <Route path="/sms-test" element={<TestSmsPage />} />

              {/* Public-only / Guest auth routes */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/" element={<AuthForm />} />
                <Route path="/login" element={<AuthForm />} />
                <Route path="/register" element={<AuthForm />} />
                <Route path="/sign-in" element={<AuthForm />} />
                <Route path="/sign-up" element={<AuthForm />} />
                <Route path="/forgot-password" element={<AuthForm />} />
                <Route path="/terms" element={<AuthForm />} />
              </Route>

              {/* Protected staff dashboard routes */}
              <Route element={<ProtectedRoute />}>
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
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
