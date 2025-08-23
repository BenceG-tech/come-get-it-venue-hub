
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RouteGuard } from "@/components/RouteGuard";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Redemptions from "./pages/Redemptions";
import Transactions from "./pages/Transactions";
import Rewards from "./pages/Rewards";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Venues from "./pages/Venues";
import VenueDetail from "./pages/VenueDetail";
import Brands from "./pages/Brands";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard fallback="/login">
      {children}
    </RouteGuard>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          
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
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          } />
          
          <Route path="/rewards" element={
            <ProtectedRoute>
              <Rewards />
            </ProtectedRoute>
          } />
          
          <Route path="/analytics" element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          } />
          
          <Route path="/venues" element={
            <RouteGuard requiredRoles={['cgi_admin']} fallback="/dashboard">
              <Venues />
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
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
