
import { Sidebar } from "@/components/Sidebar";
import { sessionManager } from '@/auth/mockSession';
import adminBackground from '@/assets/admin-background.png';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "py-4 sm:py-8" }: PageLayoutProps) {
  const effectiveRole = sessionManager.getEffectiveRole();
  const isAdmin = effectiveRole === 'cgi_admin';

  return (
    <div className="cgi-page flex min-h-screen">
      <Sidebar />
      <main 
        className="flex-1 lg:ml-0 relative"
        style={isAdmin ? {
          backgroundImage: `url(${adminBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}
      >
        {isAdmin && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        )}
        <div className={`cgi-container px-4 sm:px-6 lg:px-8 ${className} relative z-10`}>
          {children}
        </div>
      </main>
    </div>
  );
}
