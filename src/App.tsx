import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { ActiveChartProvider } from "@/hooks/useActiveChart";
import Login from "./pages/Login";
import AdminLayout from "./components/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/UsersPage";
import NakshatrasPage from "./pages/admin/NakshatrasPage";
import PlanetsPage from "./pages/admin/PlanetsPage";
import AdminRemediesPage from "./pages/admin/RemediesPage";
import YogasPage from "./pages/admin/YogasPage";
import AnalyticsPage from "./pages/admin/AnalyticsPage";
import AppearancePage from "./pages/admin/AppearancePage";
import AiEnginePage from "./pages/admin/AiEnginePage";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute";
import UserLayout from "./components/UserLayout";
import UserDashboard from "./pages/UserDashboard";
import BirthChartPage from "./pages/BirthChartPage";
import DreamInterpretationPage from "./pages/DreamInterpretationPage";
import ProfilePage from "./pages/ProfilePage";
import CompatibilityPage from "./pages/CompatibilityPage";
import OnboardingPage from "./pages/OnboardingPage";
import DailyHoroscopePage from "./pages/DailyHoroscopePage";
import RemediesPage from "./pages/RemediesPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import TimelinePage from "./pages/TimelinePage";
import AskOraclePage from "./pages/AskOraclePage";
import MuhurtaPage from "./pages/MuhurtaPage";
import InstallPage from "./pages/InstallPage";
import PricingPage from "./pages/PricingPage";
import BillingPage from "./pages/BillingPage";
import HoroscopePreview from "./pages/preview/HoroscopePreview";
import DreamPreview from "./pages/preview/DreamPreview";
import ChartPreview from "./pages/preview/ChartPreview";
import OraclePreview from "./pages/preview/OraclePreview";
import RouteAwareUniverseBackground from "./components/RouteAwareUniverseBackground";
import PWAUpdater from "./components/PWAUpdater";
import ChartSwitchTransition from "./components/ChartSwitchTransition";
import UpgradeModal from "./components/subscription/UpgradeModal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAUpdater />
      <BrowserRouter>
        <RouteAwareUniverseBackground />
        <AuthProvider>
          <SubscriptionProvider>
            <ActiveChartProvider>
            <ChartSwitchTransition />
            <UpgradeModal />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/install" element={<InstallPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/preview/horoscope" element={<HoroscopePreview />} />
              <Route path="/preview/dream" element={<DreamPreview />} />
              <Route path="/preview/chart" element={<ChartPreview />} />
              <Route path="/preview/oracle" element={<OraclePreview />} />
              <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
              {/* User pages wrapped in UserLayout */}
              <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<UserDashboard />} />
                <Route path="/chart" element={<BirthChartPage />} />
                <Route path="/dreams" element={<DreamInterpretationPage />} />
                <Route path="/compatibility" element={<CompatibilityPage />} />
                <Route path="/horoscope" element={<DailyHoroscopePage />} />
                <Route path="/remedies" element={<RemediesPage />} />
                <Route path="/timeline" element={<TimelinePage />} />
                <Route path="/ask" element={<AskOraclePage />} />
                <Route path="/muhurta" element={<MuhurtaPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/billing" element={<BillingPage />} />
              </Route>
              {/* Admin */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="nakshatras" element={<NakshatrasPage />} />
                <Route path="planets" element={<PlanetsPage />} />
                <Route path="remedies" element={<AdminRemediesPage />} />
                <Route path="yogas" element={<YogasPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="appearance" element={<AppearancePage />} />
                <Route path="ai-engine" element={<AiEnginePage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ActiveChartProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
