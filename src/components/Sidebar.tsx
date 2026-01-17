
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  Gift, 
  BarChart3, 
  Settings,
  Menu,
  Users,
  X,
  Building,
  Factory,
  LogOut,
  TrendingUp,
  ChevronDown,
  Landmark,
  Bell,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { sessionManager } from "@/auth/mockSession";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTour } from "@/contexts/TourContext";

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['cgi_admin', 'venue_owner', 'venue_staff', 'brand_admin'], tourId: 'nav-dashboard' },
  { name: 'Beváltások', href: '/redemptions', icon: Receipt, roles: ['cgi_admin', 'venue_owner', 'venue_staff'], tourId: 'nav-redemptions' },
  { name: 'Tranzakciók', href: '/transactions', icon: CreditCard, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-transactions' },
  { name: 'Banki Tranzakciók', href: '/saltedge-transactions', icon: Landmark, roles: ['cgi_admin'], tourId: 'nav-saltedge' },
  { name: 'Jutalmak', href: '/rewards', icon: Gift, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-rewards' },
  { name: 'Promóciók', href: '/promotions', icon: TrendingUp, roles: ['cgi_admin'], tourId: 'nav-promotions' },
  { name: 'Analitika', href: '/analytics', icon: BarChart3, roles: ['cgi_admin', 'venue_owner', 'brand_admin'], tourId: 'nav-analytics' },
  { name: 'Felhasználók', href: '/users', icon: Users, roles: ['cgi_admin'], tourId: 'nav-users' },
  { name: 'Helyszínek', href: '/venues', icon: Building, roles: ['cgi_admin'], tourId: 'nav-venues' },
  { name: 'Márkák', href: '/brands', icon: Factory, roles: ['cgi_admin'], tourId: 'nav-brands' },
  { name: 'Értesítések', href: '/notifications', icon: Bell, roles: ['cgi_admin'], tourId: 'nav-notifications' },
  { name: 'Beállítások', href: '/settings', icon: Settings, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-settings' },
];

const roleLabels = {
  'cgi_admin': 'Admin Dashboard',
  'venue_owner': 'Venue Owner előnézet',
  'venue_staff': 'Staff előnézet',
  'brand_admin': 'Brand Admin előnézet'
};

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [effectiveRole, setEffectiveRole] = useState(sessionManager.getEffectiveRole());
  
  const location = useLocation();
  const navigate = useNavigate();
  const session = sessionManager.getCurrentSession();
  const { startTour, hasCompletedTour } = useTour();

  // Listen for role changes
  useEffect(() => {
    const unsubscribe = sessionManager.addListener(() => {
      const newEffectiveRole = sessionManager.getEffectiveRole();
      console.log('Sidebar: Role changed to:', newEffectiveRole);
      setEffectiveRole(newEffectiveRole);
    });

    return unsubscribe;
  }, []);

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Filter navigation based on effective role
  const filteredNavigation = navigation.filter(item => {
    if (!effectiveRole) return false;
    return item.roles.includes(effectiveRole);
  });

  const handleLogout = () => {
    sessionManager.clearSession();
    navigate('/');
  };

  const handleRoleChange = (role: 'cgi_admin' | 'venue_owner' | 'venue_staff' | 'brand_admin') => {
    console.log('Sidebar: Changing role to:', role);
    sessionManager.setPreviewRole(role === 'cgi_admin' ? null : role);
  };

  // Don't render sidebar if no session
  if (!session || !effectiveRole) {
    return null;
  }

  const isAdmin = session.user.role === 'cgi_admin';

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="lg:hidden fixed top-4 left-4 z-50 cgi-button-ghost bg-cgi-surface/95 backdrop-blur-sm shadow-lg border border-cgi-muted"
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
          <div className="flex h-16 items-center gap-2 px-6 border-b border-cgi-muted" data-tour="sidebar-header">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cgi-secondary">
              <Users className="h-5 w-5 text-cgi-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-cgi-surface-foreground">Come Get It</h1>
              <p className="text-xs text-cgi-muted-foreground">Partner Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                              (item.href === '/venues' && location.pathname.startsWith('/venues'));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-tour={item.tourId}
                  className={`cgi-nav-item ${isActive ? 'active' : ''} ${
                    isActive && effectiveRole === 'cgi_admin' ? 'admin-active' : ''
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-cgi-muted p-4 space-y-4">
            {/* Role Preview Dropdown - Only for admins */}
            {isAdmin && (
              <div className="mb-4" data-tour="role-switcher">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-between text-xs cgi-button-secondary"
                    >
                      <span>{roleLabels[effectiveRole]}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-cgi-surface border-cgi-muted">
                    <DropdownMenuItem 
                      onClick={() => handleRoleChange('cgi_admin')}
                      className="text-cgi-surface-foreground hover:bg-cgi-muted/50"
                    >
                      Admin Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleRoleChange('venue_owner')}
                      className="text-cgi-surface-foreground hover:bg-cgi-muted/50"
                    >
                      Venue Owner előnézet
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleRoleChange('venue_staff')}
                      className="text-cgi-surface-foreground hover:bg-cgi-muted/50"
                    >
                      Staff előnézet
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleRoleChange('brand_admin')}
                      className="text-cgi-surface-foreground hover:bg-cgi-muted/50"
                    >
                      Brand Admin előnézet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-cgi-secondary/20 flex items-center justify-center">
                <span className="text-xs font-medium text-cgi-secondary">
                  {session.user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cgi-surface-foreground truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-cgi-muted-foreground truncate">
                  {session.user.email}
                </p>
                <p className="text-xs text-cgi-muted-foreground capitalize">
                  {session.user.role.replace('_', ' ')}
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => startTour('main')}
                className="flex-1 justify-start cgi-button-ghost"
                data-tour="help-button"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Súgó
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex-1 justify-start cgi-button-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Kilépés
              </Button>
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
