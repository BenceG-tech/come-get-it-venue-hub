
import { sessionManager } from '@/auth/mockSession';
import { Venue } from '@/lib/types';

interface FeatureGateProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPlans?: string[];
  venue?: Venue;
  fallback?: React.ReactNode;
}

export function FeatureGate({ 
  children, 
  requiredRoles = [], 
  requiredPlans = [],
  venue,
  fallback = null 
}: FeatureGateProps) {
  const session = sessionManager.getCurrentSession();

  // Check if user is logged in
  if (!session) {
    return <>{fallback}</>;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !sessionManager.hasRole(requiredRoles)) {
    return <>{fallback}</>;
  }

  // Check plan requirements
  if (requiredPlans.length > 0 && venue && !requiredPlans.includes(venue.plan)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
