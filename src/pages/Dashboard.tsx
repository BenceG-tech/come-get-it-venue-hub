
import { PageLayout } from "@/components/PageLayout";
import { sessionManager } from "@/auth/mockSession";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const session = sessionManager.getCurrentSession();
  const effectiveRole = sessionManager.getEffectiveRole();
  const isInPreviewMode = sessionManager.isInPreviewMode();

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
      default:
        return <div>Ismeretlen szerepkör</div>;
    }
  };

  return (
    <PageLayout>
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
