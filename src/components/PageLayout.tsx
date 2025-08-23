
import { Sidebar } from "@/components/Sidebar";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "py-8" }: PageLayoutProps) {
  return (
    <div className="cgi-page flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-0">
        <div className={`cgi-container ${className}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
