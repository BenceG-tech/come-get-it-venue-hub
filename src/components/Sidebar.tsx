import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, CreditCard, Gift, BarChart3, Settings, Menu, Users, X, Building, Factory, LogOut, TrendingUp, ChevronDown, Landmark, Bell, HelpCircle, FileText, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sessionManager } from "@/auth/mockSession";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTour } from "@/contexts/TourContext";

type NavGroup = 'core' | 'tx' | 'marketing' | 'analytics' | 'admin';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  tourId: string;
  group: NavGroup;
}

const navigation: NavItem[] = [
  // FŐ
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['cgi_admin', 'venue_owner', 'venue_staff', 'brand_admin'], tourId: 'nav-dashboard', group: 'core' },
  { name: 'Helyszínek', href: '/venues', icon: Building, roles: ['cgi_admin'], tourId: 'nav-venues', group: 'core' },
  { name: 'Felhasználók', href: '/users', icon: Users, roles: ['cgi_admin'], tourId: 'nav-users', group: 'core' },
  // TRANZAKCIÓK
  { name: 'Beváltások', href: '/redemptions', icon: Receipt, roles: ['cgi_admin', 'venue_owner', 'venue_staff'], tourId: 'nav-redemptions', group: 'tx' },
  { name: 'Tranzakciók', href: '/transactions', icon: CreditCard, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-transactions', group: 'tx' },
  { name: 'Banki Tranzakciók', href: '/saltedge-transactions', icon: Landmark, roles: ['cgi_admin'], tourId: 'nav-saltedge', group: 'tx' },
  // MARKETING
  { name: 'Jutalmak', href: '/rewards', icon: Gift, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-rewards', group: 'marketing' },
  { name: 'Promóciók', href: '/promotions', icon: TrendingUp, roles: ['cgi_admin'], tourId: 'nav-promotions', group: 'marketing' },
  { name: 'Értesítések', href: '/notifications', icon: Bell, roles: ['cgi_admin'], tourId: 'nav-notifications', group: 'marketing' },
  // ANALITIKA
  { name: 'Analitika', href: '/analytics', icon: BarChart3, roles: ['cgi_admin', 'venue_owner', 'brand_admin'], tourId: 'nav-analytics', group: 'analytics' },
  { name: 'Adat Értékek', href: '/data-insights', icon: TrendingUp, roles: ['cgi_admin'], tourId: 'nav-data-insights', group: 'analytics' },
  { name: 'Jótékonysági Hatás', href: '/charity-impact', icon: Heart, roles: ['cgi_admin'], tourId: 'nav-charity', group: 'analytics' },
  // ADMIN
  { name: 'Márkák', href: '/brands', icon: Factory, roles: ['cgi_admin'], tourId: 'nav-brands', group: 'admin' },
  { name: 'Audit Napló', href: '/audit-log', icon: FileText, roles: ['cgi_admin'], tourId: 'nav-audit-log', group: 'admin' },
  { name: 'Beállítások', href: '/settings', icon: Settings, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-settings', group: 'admin' },
];

const groupConfig: Record<NavGroup, { label: string; color: string; bg: string; ring: string }> = {
  core:      { label: 'Fő',          color: 'text-cgi-primary',  bg: 'bg-cgi-primary/15',  ring: 'border-cgi-primary' },
  tx:        { label: 'Tranzakciók', color: 'text-amber-400',    bg: 'bg-amber-400/15',    ring: 'border-amber-400' },
  marketing: { label: 'Marketing',   color: 'text-purple-400',   bg: 'bg-purple-400/15',   ring: 'border-purple-400' },
  analytics: { label: 'Analitika',   color: 'text-emerald-400',  bg: 'bg-emerald-400/15',  ring: 'border-emerald-400' },
  admin:     { label: 'Admin',       color: 'text-slate-300',    bg: 'bg-slate-400/15',    ring: 'border-slate-400' },
};

const groupOrder: NavGroup[] = ['core', 'tx', 'marketing', 'analytics', 'admin'];

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
  const { startTour } = useTour();

  useEffect(() => {
    const unsubscribe = sessionManager.addListener(() => {
      setEffectiveRole(sessionManager.getEffectiveRole());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Allow external triggers (e.g. onboarding tour) to open/close the mobile drawer.
  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener('cgi:open-mobile-sidebar', open);
    window.addEventListener('cgi:close-mobile-sidebar', close);
    return () => {
      window.removeEventListener('cgi:open-mobile-sidebar', open);
      window.removeEventListener('cgi:close-mobile-sidebar', close);
    };
  }, []);

  const filteredNavigation = navigation.filter(item => {
    if (!effectiveRole) return false;
    return item.roles.includes(effectiveRole);
  });

  const handleLogout = () => {
    sessionManager.clearSession();
    navigate('/');
  };
  const handleRoleChange = (role: 'cgi_admin' | 'venue_owner' | 'venue_staff' | 'brand_admin') => {
    sessionManager.setPreviewRole(role === 'cgi_admin' ? null : role);
  };

  if (!session || !effectiveRole) return null;
  const isAdmin = session.user.role === 'cgi_admin';

  return (
    <>
      {!isOpen && (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menü megnyitása"
          className="lg:hidden fixed top-3 left-3 z-50 h-9 w-9 rounded-full cgi-button-ghost bg-cgi-surface/95 backdrop-blur-sm shadow-lg border border-cgi-muted"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <div className={`fixed inset-y-0 left-0 z-40 w-[84vw] max-w-xs lg:w-64 bg-cgi-surface border-r border-cgi-muted transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="relative flex h-16 items-center gap-2 px-4 lg:px-6 border-b border-cgi-muted" data-tour="sidebar-header">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-900 shrink-0">
              <Users className="h-5 w-5 text-cgi-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-cgi-surface-foreground truncate">Come Get It</h1>
              <p className="text-xs text-cgi-muted-foreground truncate">Partner Dashboard</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menü bezárása"
              className="lg:hidden h-9 w-9 shrink-0 text-cgi-surface-foreground hover:bg-cgi-muted/50"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto">
            {groupOrder.map((groupKey, gi) => {
              const items = filteredNavigation.filter(i => i.group === groupKey);
              if (items.length === 0) return null;
              const cfg = groupConfig[groupKey];
              return (
                <div key={groupKey} className={gi > 0 ? 'mt-3' : ''}>
                  <div className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.color}/80`}>
                    {cfg.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const isActive =
                        location.pathname === item.href ||
                        (item.href === '/venues' && location.pathname.startsWith('/venues')) ||
                        (item.href === '/users' && location.pathname.startsWith('/users'));
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          data-tour={item.tourId}
                          className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all border-l-[3px] ${
                            isActive
                              ? `${cfg.bg} ${cfg.color} ${cfg.ring} font-medium`
                              : `border-transparent text-cgi-muted-foreground hover:text-cgi-surface-foreground hover:bg-cgi-muted/40`
                          }`}
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                            isActive ? `${cfg.bg} ${cfg.color}` : `bg-cgi-muted/30 text-cgi-muted-foreground group-hover:${cfg.color}`
                          }`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="truncate">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-cgi-muted p-3 sm:p-4 space-y-3">
            {isAdmin && (
              <div data-tour="role-switcher">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between text-xs cgi-button-secondary">
                      <span className="truncate">{roleLabels[effectiveRole]}</span>
                      <ChevronDown className="h-3 w-3 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-cgi-surface border-cgi-muted">
                    <DropdownMenuItem onClick={() => handleRoleChange('cgi_admin')} className="text-cgi-surface-foreground hover:bg-cgi-muted/50">Admin Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange('venue_owner')} className="text-cgi-surface-foreground hover:bg-cgi-muted/50">Venue Owner előnézet</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange('venue_staff')} className="text-cgi-surface-foreground hover:bg-cgi-muted/50">Staff előnézet</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRoleChange('brand_admin')} className="text-cgi-surface-foreground hover:bg-cgi-muted/50">Brand Admin előnézet</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-cgi-secondary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-cgi-secondary">
                  {session.user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cgi-surface-foreground truncate">{session.user.name}</p>
                <p className="text-xs text-cgi-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" onClick={() => startTour('main')} className="h-10 justify-center cgi-button-ghost" data-tour="help-button">
                <HelpCircle className="h-4 w-4 mr-2" />
                Súgó
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-10 justify-center cgi-button-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="h-4 w-4 mr-2" />
                Kilépés
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)} />}
    </>
  );
}
