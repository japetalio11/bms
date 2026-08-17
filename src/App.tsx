import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthForm } from "@/features/auth/components/AuthForm"
import { DashboardLayout } from "@/features/dashboard/components/DashboardLayout"
import { DashboardPage } from "@/features/dashboard/components/DashboardPage"
import { AppointmentListPage } from "@/features/appointments/components/AppointmentListPage"
import { CalendarPage } from "@/features/calendar/components/CalendarPage"
import { TeamManagementPage } from "@/features/team/components/TeamManagementPage"
import { StaffProfilePage } from "@/features/team/components/StaffProfilePage"
import { SettingsPage } from "@/features/settings/components/SettingsPage"
import { AnalyticsPage } from "@/features/analytics/components/AnalyticsPage"
import { MothersPage } from "@/features/mothers/components/MothersPage"
import { MotherProfilePage } from "@/features/mothers/components/MotherProfilePage"
import { ReferralsPage } from "@/features/referrals/components/ReferralsPage"
import { MessagesPage } from "@/features/messages/components/MessagesPage"

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/" element={<AuthForm />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />

            {/* Sidebar Routes */}
            <Route path="mothers" element={<MothersPage />} />
            <Route path="mothers/:id" element={<MotherProfilePage />} />
            <Route path="appointments" element={<AppointmentListPage />} />
            <Route path="referrals" element={<ReferralsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="team" element={<TeamManagementPage />} />
            <Route path="team/:id" element={<StaffProfilePage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Legacy / Hidden Routes */}
            <Route path="analytics" element={<AnalyticsPage />} />

            <Route path="calendar" element={<CalendarPage />} />
            <Route path="feedback" element={<div className="flex-1 w-full h-full bg-white dark:bg-black" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

