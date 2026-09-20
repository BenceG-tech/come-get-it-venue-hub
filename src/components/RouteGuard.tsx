import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { sessionManager } from '@/auth/session';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  venueId?: string;
  fallback?: string;
}

export function RouteGuard({
  children,
  requiredRoles = [],
  venueId,
  fallback = '/',
}: RouteGuardProps) {
  const location = useLocation();
  const [, setTick] = useState(0);

  // Re-render on any auth bootstrap / state change.
  useEffect(() => sessionManager.addListener(() => setTick((t) => t + 1)), []);

  // Wait for the Supabase session bootstrap before deciding.
  if (!sessionManager.isBootstrapped()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-cgi-primary" />
      </div>
    );
  }

  if (sessionManager.hasNoAccess()) {
    return <Navigate to="/no-access" replace />;
  }

  const session = sessionManager.getCurrentSession();
  if (!session) {
    return <Navigate to={fallback} replace state={{ from: location }} />;
  }

  // Authorization always uses the real database-derived role.
  if (requiredRoles.length > 0 && !sessionManager.hasRole(requiredRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (venueId && !sessionManager.canAccessVenue(venueId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
