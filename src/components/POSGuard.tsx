import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { sessionManager } from "@/auth/session";
import { Loader2 } from "lucide-react";

interface POSGuardProps {
  children: ReactNode;
}

const ALLOWED_ROLES = ["cgi_admin", "venue_owner", "venue_staff"];

export function POSGuard({ children }: POSGuardProps) {
  const [, setTick] = useState(0);

  useEffect(() => sessionManager.addListener(() => setTick((t) => t + 1)), []);

  if (!sessionManager.isBootstrapped()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionManager.hasNoAccess()) {
    return <Navigate to="/no-access" replace />;
  }

  const session = sessionManager.getCurrentSession();
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
