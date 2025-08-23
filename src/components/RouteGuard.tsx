
import { Navigate } from 'react-router-dom';
import { sessionManager } from '@/auth/mockSession';

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
  fallback = '/login' 
}: RouteGuardProps) {
  const session = sessionManager.getCurrentSession();

  // Check if user is logged in
  if (!session) {
    return <Navigate to={fallback} replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !sessionManager.hasRole(requiredRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check venue access
  if (venueId && !sessionManager.canAccessVenue(venueId)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
