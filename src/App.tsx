import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { RequireAuth, RedirectIfAuthenticated, RequireRole } from "@/app/router/guards";
import { ToastProvider } from "@/services/toastService";
import { ThemeProvider } from "@/services/themeService";
import { I18nProvider } from "@/services/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import LoginPage from "@/features/auth/LoginPage";
import CallbackPage from "@/features/auth/CallbackPage";
import DashboardPage from "@/pages/Dashboard";
import CasesPage from "@/pages/Cases";
import NewCasePage from "@/pages/NewCase";
import CaseDetailPage from "@/pages/CaseDetail";
import HouseholdsPage from "@/pages/Households";
import HouseholdProfilePage from "@/pages/HouseholdProfile";
import FollowUpsPage from "@/pages/FollowUps";
import TeamPage from "@/pages/Team";
import ProgrammeDetailPage from "@/pages/ProgrammeDetail";
import ProgrammeReportsPage from "@/pages/ProgrammeReports";
import DonorReportsPage from "@/pages/DonorReports";
import AccessLogsPage from "@/pages/AccessLogs";
import SearchPage from "@/pages/Search";
import ProfilePage from "@/pages/Profile";

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider delayDuration={150}>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  {/* /login/callback must NOT be wrapped in any auth guard — the
                      user is by definition not yet authenticated when they land here. */}
                  <Route path="/login/callback" element={<CallbackPage />} />
                  <Route
                    path="/login"
                    element={
                      <RedirectIfAuthenticated>
                        <LoginPage />
                      </RedirectIfAuthenticated>
                    }
                  />
                  <Route
                    element={
                      <RequireAuth>
                        <AppShell />
                      </RequireAuth>
                    }
                  >
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/cases" element={<CasesPage />} />
                    <Route path="/cases/new" element={<NewCasePage />} />
                    <Route path="/cases/:id" element={<CaseDetailPage />} />
                    <Route path="/households" element={<HouseholdsPage />} />
                    <Route
                      path="/households/:id"
                      element={<HouseholdProfilePage />}
                    />
                    <Route path="/follow-ups" element={<FollowUpsPage />} />
                    <Route path="/team" element={<TeamPage />} />
                    <Route
                      path="/programmes/:programmeSlug"
                      element={<ProgrammeDetailPage />}
                    />
                    <Route
                      path="/programme-reports"
                      element={<ProgrammeReportsPage />}
                    />
                    <Route path="/donor-reports" element={<DonorReportsPage />} />
                    <Route
                      path="/access-logs"
                      element={
                        <RequireRole roles={["programme_coordinator", "regional_manager"]}>
                          <AccessLogsPage />
                        </RequireRole>
                      }
                    />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
