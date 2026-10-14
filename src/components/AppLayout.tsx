import { useState, type ReactNode } from 'react';
import { useBranding } from '@/context/BrandingContext';
import { useProjectAccess } from '@/context/ProjectAccessContext';
import { supabase } from '@/lib/supabase';
import {
  Heart, LayoutDashboard, FolderKanban, Target, ListChecks, Users,
  MapPin, Settings, Palette, Database, Cloud, FileText,
  Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, Footprints, ClipboardCheck, LogOut, LoaderCircle
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: typeof Heart;
  page: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, page: 'dashboard' },
  { label: 'Projects', icon: FolderKanban, page: 'projects' },
  { label: 'Indicators', icon: Target, page: 'indicators' },
  { label: 'Activities', icon: ListChecks, page: 'activities' },
  { label: 'Beneficiaries', icon: Users, page: 'beneficiaries' },
  { label: 'Districts', icon: MapPin, page: 'districts' },
  { label: 'Reports', icon: FileText, page: 'reports' },
  { label: 'KoboToolbox', icon: Cloud, page: 'kobo' },
  { label: 'MEAL Triage & Approval', icon: ClipboardCheck, page: 'kobo-approval' },
  { label: 'Schema Generator', icon: Database, page: 'schema-generator' },
  { label: 'Database Explorer', icon: Database, page: 'database-explorer' },
  { label: 'Gestão de Utilizadores', icon: ShieldCheck, page: 'users' },
  { label: 'Branding', icon: Settings, page: 'branding' },
  { label: 'Theme Configurator', icon: Palette, page: 'theme' },
];

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: ReactNode;
}

export function AppLayout({ currentPage, onNavigate, children }: AppLayoutProps) {
  const { branding, appConfig } = useBranding();
  const { isAdmin } = useProjectAccess();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const visibleNavItems = isAdmin
    ? NAV_ITEMS
    : NAV_ITEMS.filter(item => item.page !== 'users' && item.page !== 'kobo-approval');
  const currentLabel = visibleNavItems.find((n) => n.page === currentPage)?.label ?? 'Dashboard';

  const sidebarBg = appConfig?.theme?.sidebar_bg ?? '#1a1a2e';
  const sidebarText = appConfig?.theme?.sidebar_text ?? '#ffffff';

  const handleLogout = async () => {
    setSigningOut(true);
    setLogoutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLogoutError(error.message);
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top header bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="w-5 h-5 text-slate-600" /> : <PanelLeftClose className="w-5 h-5 text-slate-600" />}
          </button>
          <h1 className="text-lg font-bold text-slate-800">{currentLabel}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-700">System Active</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${
            sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
          } fixed lg:static inset-y-0 left-0 z-40 transition-all duration-300 flex flex-col`}
          style={{ backgroundColor: sidebarBg, color: sidebarText }}
        >
          {/* Logo / branding */}
          <div className={`p-4 border-b border-white/10 flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
              {branding.logo_url ? (
                <img src={branding.logo_url} alt="Logo" className="w-full h-full rounded-xl object-cover" />
              ) : (
                <Heart className="w-5 h-5" style={{ color: branding.primary_color }} fill="currentColor" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate" style={{ color: sidebarText }}>
                  {branding.secondary_label}
                </p>
                <p className="text-xs opacity-70 truncate" style={{ color: sidebarText }}>
                  {branding.primary_label}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.page;
                return (
                  <li key={item.page}>
                    <button
                      onClick={() => {
                        onNavigate(item.page);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive ? 'bg-white/15' : 'hover:bg-white/10'
                      } ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                      style={{ color: sidebarText }}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" style={{ color: isActive ? branding.primary_color : sidebarText }} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="border-t border-white/10 p-3">
            {logoutError && !sidebarCollapsed && (
              <p role="alert" className="mb-2 rounded-lg bg-rose-500/15 px-2.5 py-2 text-xs text-rose-100">
                Não foi possível terminar a sessão: {logoutError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={signingOut}
              aria-label="Terminar Sessão"
              title={sidebarCollapsed ? 'Terminar Sessão' : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-rose-500/15 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
            >
              {signingOut ? <LoaderCircle className="h-5 w-5 shrink-0 animate-spin" /> : <LogOut className="h-5 w-5 shrink-0" />}
              {!sidebarCollapsed && <span>{signingOut ? 'A terminar sessão…' : 'Terminar Sessão'}</span>}
            </button>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>

          {/* Footer */}
          <footer className="mt-auto border-t border-slate-200 bg-white px-6 py-5">
            {appConfig?.footer && (appConfig.footer.office_address || appConfig.footer.contact_phone || appConfig.footer.institutional_description) ? (
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Footprints className="w-4 h-4 text-slate-400" />
                    <h4 className="text-sm font-semibold text-slate-700">Office Location</h4>
                  </div>
                  <p className="text-xs text-slate-500">{appConfig.footer.office_address || 'Not configured'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Contact</h4>
                  <p className="text-xs text-slate-500">
                    {appConfig.footer.contact_phone && <span className="block">{appConfig.footer.contact_phone}</span>}
                    {appConfig.footer.contact_email && <span className="block">{appConfig.footer.contact_email}</span>}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">About</h4>
                  <p className="text-xs text-slate-500">{appConfig.footer.institutional_description || appConfig.footer.custom_footer_text || 'Missão contra a Lepra Moçambique'}</p>
                </div>
              </div>
            ) : (
              <div className="max-w-7xl mx-auto text-center">
                <p className="text-xs text-slate-400">© 2024 Missão contra a Lepra Moçambique. All rights reserved.</p>
              </div>
            )}
          </footer>
        </main>
      </div>
    </div>
  );
}
