
import { useEffect, useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { sessionManager } from "@/auth/session";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";
import { BrandDashboard } from "@/components/dashboard/BrandDashboard";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getDataProvider } from "@/lib/dataProvider/providerFactory";
import { runtimeConfig } from "@/config/runtime";
import { useTour } from "@/contexts/TourContext";
import { OnboardingTour } from "@/components/tours/OnboardingTour";

export default function Dashboard() {
  const [effectiveRole, setEffectiveRole] = useState(sessionManager.getEffectiveRole());
  const [isInPreviewMode, setIsInPreviewMode] = useState(sessionManager.isInPreviewMode());
  const [apiCount, setApiCount] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const session = sessionManager.getCurrentSession();
  const { startTour, hasCompletedTour } = useTour();

  // Listen for role changes
  useEffect(() => {
    const unsubscribe = sessionManager.addListener(() => {
      setEffectiveRole(sessionManager.getEffectiveRole());
      setIsInPreviewMode(sessionManager.isInPreviewMode());
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const provider = getDataProvider() as any;
    if (typeof provider.getCount !== 'function') return;

    provider.getCount("venues")
      .then((count: number) => {
        setApiCount(count);
        setApiError(null);
      })
      .catch((err: any) => {
        console.error("[Dashboard] API status error:", err?.message || err);
        setApiCount(null);
        setApiError(err?.message || String(err));
      });
  }, []);

  // Auto-start tour for first-time users
  useEffect(() => {
    if (session && effectiveRole && !hasCompletedTour('main')) {
      // Small delay to ensure DOM elements are rendered
      const timer = setTimeout(() => {
        startTour('main');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session, effectiveRole, hasCompletedTour, startTour]);
  if (!session || !effectiveRole) {
    return null;
  }

  const renderDashboard = () => {
    switch (effectiveRole) {
      case 'cgi_admin':
        return <AdminDashboard />;
      case 'venue_owner':
        return <OwnerDashboard />;
      case 'venue_staff':
        return <StaffDashboard />;
      case 'brand_admin':
        return <BrandDashboard />;
      default:
        return <div>Ismeretlen szerepkör</div>;
    }
  };

  return (
    <PageLayout>
      {/* Onboarding Tour */}
      <OnboardingTour tourName="main" role={effectiveRole} />

      {/* API Status */}
      <Card className="cgi-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="text-cgi-surface-foreground font-medium">API Status</div>
          {apiError ? (
            <Badge variant="destructive" className="cgi-badge bg-cgi-error text-cgi-error-foreground">
              Hiba
            </Badge>
          ) : (
            <Badge variant="secondary" className="cgi-badge bg-cgi-secondary text-cgi-secondary-foreground">
              OK
            </Badge>
          )}
        </div>
        <div className="mt-2 text-sm text-cgi-muted-foreground">
          {apiError ? `Hiba: ${apiError}` : `Venues száma: ${apiCount ?? '—'}`}
        </div>
      </Card>

      {isInPreviewMode && (
        <div className="mb-4">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
            Előnézet mód: {effectiveRole === 'venue_owner' ? 'Venue Owner' : 'Staff'} dashboard
          </Badge>
        </div>
      )}
      {renderDashboard()}
    </PageLayout>
  );
}
