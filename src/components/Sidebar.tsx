
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Gift, 
  BarChart3, 
  Settings,
  Menu,
  Users,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Beváltások', href: '/redemptions', icon: Receipt },
  { name: 'Tranzakciók', href: '/transactions', icon: CreditCard },
  { name: 'Jutalmak', href: '/rewards', icon: Gift },
  { name: 'Analitika', href: '/analytics', icon: BarChart3 },
  { name: 'Beállítások', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50 cgi-button-ghost"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-cgi-surface border-r border-cgi-muted transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center gap-2 px-6 border-b border-cgi-muted">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cgi-secondary">
              <Users className="h-5 w-5 text-cgi-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-cgi-surface-foreground">Come Get It</h1>
              <p className="text-xs text-cgi-muted-foreground">Partner Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`cgi-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-cgi-muted p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-cgi-secondary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-cgi-secondary">TB</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cgi-surface-foreground truncate">
                  Trendy Bar & Lounge
                </p>
                <p className="text-xs text-cgi-muted-foreground truncate">
                  admin@venue.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
