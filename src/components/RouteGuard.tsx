
import { Navigate, useLocation } from 'react-router-dom';
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
  const location = useLocation();

  // Check if user is logged in
  if (!session) {
    // If trying to access root path, redirect to login
    if (location.pathname === '/') {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to={fallback} replace state={{ from: location }} />;
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
