
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteGuard } from "@/components/RouteGuard";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ConsumerApp from "./pages/ConsumerApp";
import Redemptions from "./pages/Redemptions";
import Transactions from "./pages/Transactions";
import Rewards from "./pages/Rewards";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Venues from "./pages/Venues";
import VenueDetail from "./pages/VenueDetail";
import VenueComparison from "./pages/VenueComparison";
import Brands from "./pages/Brands";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import PublicVenueDetail from "./pages/PublicVenueDetail";
import SaltEdgeTransactions from "./pages/SaltEdgeTransactions";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard fallback="/">
      {children}
    </RouteGuard>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin login */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            
            {/* Consumer app */}
            <Route path="/app" element={<ConsumerApp />} />
            <Route path="/app/venue/:id" element={<PublicVenueDetail />} />
            <Route path="/venue/:id" element={<Navigate to="/app/venue/:id" replace />} />
            
            {/* Protected admin routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/redemptions" element={
              <ProtectedRoute>
                <Redemptions />
              </ProtectedRoute>
            } />
            
            <Route path="/transactions" element={
              <RouteGuard requiredRoles={['cgi_admin', 'venue_owner']} fallback="/dashboard">
                <Transactions />
              </RouteGuard>
            } />
            
            <Route path="/rewards" element={
              <RouteGuard requiredRoles={['cgi_admin', 'venue_owner']} fallback="/dashboard">
                <Rewards />
              </RouteGuard>
            } />
            
            <Route path="/analytics" element={
              <RouteGuard requiredRoles={['cgi_admin', 'venue_owner']} fallback="/dashboard">
                <Analytics />
              </RouteGuard>
            } />
            
            <Route path="/venues" element={
              <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
                <Venues />
              </RouteGuard>
            } />
            
            <Route path="/venues/comparison" element={
              <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
                <VenueComparison />
              </RouteGuard>
            } />
            
            <Route path="/venues/:id" element={
              <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
                <VenueDetail />
              </RouteGuard>
            } />
            
            <Route path="/brands" element={
              <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
                <Brands />
              </RouteGuard>
            } />
            
            <Route path="/settings" element={
              <RouteGuard requiredRoles={['cgi_admin', 'venue_owner']} fallback="/dashboard">
                <Settings />
              </RouteGuard>
            } />

            <Route path="/saltedge-transactions" element={
              <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
                <SaltEdgeTransactions />
              </RouteGuard>
            } />

            <Route path="/notifications" element={
              <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
                <Notifications />
              </RouteGuard>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
