import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { sessionManager } from "@/auth/mockSession";
import { Loader2 } from "lucide-react";

interface POSGuardProps {
  children: ReactNode;
}

export function POSGuard({ children }: POSGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const session = sessionManager.getCurrentSession();
      
      if (!session) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Allow cgi_admin, venue_owner, and venue_staff
      const allowedRoles = ["cgi_admin", "venue_owner", "venue_staff"];
      const hasAccess = allowedRoles.includes(session.user.role);
      
      setIsAuthorized(hasAccess);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
