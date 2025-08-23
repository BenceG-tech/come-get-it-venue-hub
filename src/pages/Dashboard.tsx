
import { PageLayout } from "@/components/PageLayout";
import { sessionManager } from "@/auth/mockSession";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";

export default function Dashboard() {
  const session = sessionManager.getCurrentSession();

  if (!session) {
    return null;
  }

  const renderDashboard = () => {
    switch (session.user.role) {
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
      {renderDashboard()}
    </PageLayout>
  );
}
