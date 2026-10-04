import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Receipt, CreditCard, Gift, BarChart3, Settings, Menu, Users, X, Building, Factory, LogOut, TrendingUp, ChevronDown, Landmark, Bell, HelpCircle, FileText, Heart, ScanLine, GlassWater, Inbox, Handshake, Send, CalendarDays, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sessionManager } from "@/auth/session";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTour } from "@/contexts/TourContext";
import { useCsrConfigured } from "@/hooks/useCsrConfigured";
import { signOutSupabase } from "@/auth/supabaseAuth";

type NavGroup = 'core' | 'tx' | 'marketing' | 'growth' | 'analytics' | 'admin';
// The cgi_admin view is grouped into work areas; partner roles keep the groups above.
type AdminGroup = 'ma' | 'partnerek' | 'helyek' | 'novekedes' | 'szamok' | 'admin';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  tourId: string;
  group: NavGroup;
  adminGroup?: AdminGroup;
  adminName?: string;
}

const navigation: NavItem[] = [
  // FŐ
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['cgi_admin', 'venue_owner', 'venue_staff', 'brand_admin'], tourId: 'nav-dashboard', group: 'core', adminGroup: 'ma', adminName: 'Áttekintés' },
  { name: 'Jelentkezők', href: '/applicants', icon: Inbox, roles: ['cgi_admin'], tourId: 'nav-applicants', group: 'admin', adminGroup: 'partnerek' },
  { name: 'Partnerszerzés', href: '/partner-leads', icon: Handshake, roles: ['cgi_admin'], tourId: 'nav-partner-leads', group: 'admin', adminGroup: 'partnerek' },
  { name: 'Ajánlatok', href: '/growth/offers', icon: Send, roles: ['cgi_admin'], tourId: 'nav-growth-offers', group: 'growth', adminGroup: 'partnerek' },
  { name: 'Helyszínek', href: '/venues', icon: Building, roles: ['cgi_admin'], tourId: 'nav-venues', group: 'core', adminGroup: 'helyek' },
  { name: 'Felhasználók', href: '/users', icon: Users, roles: ['cgi_admin'], tourId: 'nav-users', group: 'core', adminGroup: 'admin' },
  // TRANZAKCIÓK
  { name: 'QR beváltás', href: '/pos/redeem', icon: ScanLine, roles: ['cgi_admin', 'venue_owner', 'venue_staff'], tourId: 'nav-pos-redeem', group: 'tx', adminGroup: 'helyek' },
  { name: 'Beváltások', href: '/redemptions', icon: Receipt, roles: ['cgi_admin', 'venue_owner', 'venue_staff'], tourId: 'nav-redemptions', group: 'tx', adminGroup: 'helyek' },
  { name: 'Tranzakciók', href: '/transactions', icon: CreditCard, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-transactions', group: 'tx' },
  { name: 'Költés-tranzakciók', href: '/saltedge-transactions', icon: Landmark, roles: ['cgi_admin'], tourId: 'nav-saltedge', group: 'tx' },
  // MARKETING
  { name: 'Jutalmak', href: '/rewards', icon: Gift, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-rewards', group: 'marketing', adminGroup: 'helyek' },
  { name: 'Promóciók', href: '/promotions', icon: TrendingUp, roles: ['cgi_admin'], tourId: 'nav-promotions', group: 'marketing', adminGroup: 'helyek' },
  { name: 'Értesítések', href: '/notifications', icon: Bell, roles: ['cgi_admin'], tourId: 'nav-notifications', group: 'marketing', adminGroup: 'helyek' },
  // NÖVEKEDÉS
  { name: 'Tartalom', href: '/growth/content', icon: CalendarDays, roles: ['cgi_admin'], tourId: 'nav-growth-content', group: 'growth', adminGroup: 'novekedes' },
  { name: 'Importálás', href: '/growth/import', icon: Upload, roles: ['cgi_admin'], tourId: 'nav-growth-import', group: 'growth', adminGroup: 'novekedes' },
  // ANALITIKA
  { name: 'Ingyen ital hatása', href: '/free-drink-impact', icon: GlassWater, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-free-drink-impact', group: 'analytics', adminGroup: 'szamok' },
  { name: 'Analitika', href: '/analytics', icon: BarChart3, roles: ['cgi_admin', 'venue_owner', 'brand_admin'], tourId: 'nav-analytics', group: 'analytics', adminGroup: 'szamok' },
  { name: 'Adat Értékek', href: '/data-insights', icon: TrendingUp, roles: ['cgi_admin'], tourId: 'nav-data-insights', group: 'analytics', adminGroup: 'szamok' },
  { name: 'Jótékonysági Hatás', href: '/charity-impact', icon: Heart, roles: ['cgi_admin'], tourId: 'nav-charity', group: 'analytics', adminGroup: 'szamok' },
  // ADMIN
  { name: 'Márkák', href: '/brands', icon: Factory, roles: ['cgi_admin'], tourId: 'nav-brands', group: 'admin', adminGroup: 'helyek' },
  { name: 'Audit Napló', href: '/audit-log', icon: FileText, roles: ['cgi_admin'], tourId: 'nav-audit-log', group: 'admin', adminGroup: 'admin', adminName: 'Audit napló' },
  { name: 'Beállítások', href: '/settings', icon: Settings, roles: ['cgi_admin', 'venue_owner'], tourId: 'nav-settings', group: 'admin', adminGroup: 'admin' },
];

const groupConfig: Record<NavGroup, { label: string; color: string; bg: string; ring: string }> = {
  core:      { label: 'Fő',          color: 'text-cgi-primary',  bg: 'bg-cgi-primary/15',  ring: 'border-cgi-primary' },
  tx:        { label: 'Tranzakciók', color: 'text-amber-400',    bg: 'bg-amber-400/15',    ring: 'border-amber-400' },
  marketing: { label: 'Marketing',   color: 'text-purple-400',   bg: 'bg-purple-400/15',   ring: 'border-purple-400' },
  growth:    { label: 'Növekedés',   color: 'text-cyan-400',     bg: 'bg-cyan-400/15',     ring: 'border-cyan-400' },
  analytics: { label: 'Analitika',   color: 'text-emerald-400',  bg: 'bg-emerald-400/15',  ring: 'border-emerald-400' },
  admin:     { label: 'Admin',       color: 'text-slate-300',    bg: 'bg-slate-400/15',    ring: 'border-slate-400' },
};

const groupOrder: NavGroup[] = ['core', 'tx', 'marketing', 'growth', 'analytics', 'admin'];

const adminGroupConfig: Record<AdminGroup, { label: string; color: string; bg: string; ring: string }> = {
  ma:     { label: 'Ma',     color: 'text-cgi-primary', bg: 'bg-cgi-primary/15', ring: 'border-cgi-primary' },
  partnerek: { label: 'Partnerek', color: 'text-teal-300', bg: 'bg-teal-400/15', ring: 'border-teal-300' },
  helyek: { label: 'Helyek', color: 'text-amber-400',   bg: 'bg-amber-400/15',   ring: 'border-amber-400' },
  novekedes: { label: 'Növekedés', color: 'text-cyan-400', bg: 'bg-cyan-400/15', ring: 'border-cyan-400' },
  szamok: { label: 'Számok', color: 'text-emerald-400', bg: 'bg-emerald-400/15', ring: 'border-emerald-400' },
  admin:  { label: 'Admin',  color: 'text-slate-300',   bg: 'bg-slate-400/15',   ring: 'border-slate-400' },
};

const adminGroupOrder: AdminGroup[] = ['ma', 'partnerek', 'helyek', 'novekedes', 'szamok', 'admin'];

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
  const { isCsrConfigured } = useCsrConfigured();

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
    // Charity impact only when CSR is actually live on an active venue.
    if (item.href === '/charity-impact' && !isCsrConfigured) return false;
    return item.roles.includes(effectiveRole);
  });

  const handleLogout = async () => {
    await signOutSupabase();
    navigate('/', { replace: true });
  };
  const handleRoleChange = (role: 'cgi_admin' | 'venue_owner' | 'venue_staff' | 'brand_admin') => {
    sessionManager.setPreviewRole(role === 'cgi_admin' ? null : role);
  };

  if (!session || !effectiveRole) return null;
  const isAdmin = session.user.role === 'cgi_admin';

  // Admin view: work areas, items without an adminGroup (Salt Edge pages) stay off the menu.
  // Partner roles (and admin previews of them) keep the original groups unchanged.
  const isAdminView = effectiveRole === 'cgi_admin';
  const sections = isAdminView
    ? adminGroupOrder.map(key => ({
        key,
        cfg: adminGroupConfig[key],
        items: filteredNavigation.filter(i => i.adminGroup === key),
      }))
    : groupOrder.map(key => ({
        key,
        cfg: groupConfig[key],
        items: filteredNavigation.filter(i => i.group === key),
      }));

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
            {sections.filter(sec => sec.items.length > 0).map(({ key: groupKey, cfg, items }, gi) => {
              return (
                <div key={groupKey} className={gi > 0 ? 'mt-3' : ''}>
                  <div className={`px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.color}/80`}>
                    {cfg.label}
                  </div>
                  <div className="space-y-0.5">
                    {items.map(item => {
                      const isActive =
                        location.pathname === item.href ||
                        (item.href === '/pos/redeem' && location.pathname.startsWith('/pos')) ||
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
                          <span className="truncate">{isAdminView ? item.adminName ?? item.name : item.name}</span>
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
