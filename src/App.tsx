import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { BrandingProvider } from '@/context/BrandingContext';
import { AppLayout } from '@/components/AppLayout';
import { DatabaseStatus } from '@/components/DatabaseStatus';
import { Login as LoginPage } from '@/pages/Login';
import { supabase } from '@/lib/supabase';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { IndicatorsPage } from '@/pages/IndicatorsPage';
import { ActivitiesPage } from '@/pages/ActivitiesPage';
import { BeneficiariesPage } from '@/pages/BeneficiariesPage';
import { DistrictsPage } from '@/pages/DistrictsPage';
import { UsersPage } from '@/pages/UsersPage';
import { BrandingPage } from '@/pages/BrandingPage';
import { SchemaGeneratorPage } from '@/pages/SchemaGeneratorPage';
import { DatabaseExplorerPage } from '@/pages/DatabaseExplorerPage';
import { KoboToolboxPage } from '@/pages/KoboToolboxPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ThemePage } from '@/pages/ThemePage';
import { KoboApproval } from '@/pages/KoboApproval';
import { ProjectAccessProvider, useProjectAccess } from '@/context/ProjectAccessContext';

function AccessRestrictedPage() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-8 text-center" role="alert">
      <h2 className="text-lg font-semibold text-rose-900">Acesso Negado</h2>
      <p className="mt-2 text-sm text-rose-800">Esta secção está reservada aos administradores.</p>
    </div>
  );
}

const PAGE_PATHS: Record<string, string> = {
  dashboard: '/',
  projects: '/projects',
  indicators: '/indicators',
  activities: '/activities',
  beneficiaries: '/beneficiaries',
  districts: '/districts',
  users: '/admin/users',
  branding: '/branding',
  'schema-generator': '/schema-generator',
  'database-explorer': '/database-explorer',
  kobo: '/kobo',
  'kobo-approval': '/admin/kobo-approval',
  reports: '/reports',
  theme: '/theme',
};

function pageFromPath(pathname: string) {
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  if (normalizedPath === '/user-management' || normalizedPath === '/users' || normalizedPath === '/admin/users') return 'users';
  const match = Object.entries(PAGE_PATHS).find(([, path]) => path === normalizedPath);
  return match?.[0] ?? 'dashboard';
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState(() => pageFromPath(window.location.pathname));
  const { isAdmin, loading: loadingProjectAccess, profileLoaded, error: projectAccessError } = useProjectAccess();

  useEffect(() => {
    const handlePopState = () => setCurrentPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPage = (page: string) => {
    const path = PAGE_PATHS[page] ?? '/';
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setCurrentPage(page);
  };

  if (loadingProjectAccess || !profileLoaded || projectAccessError) {
    return (
      <div
        className="p-8 text-center text-sm"
        role="status"
        aria-live="polite"
        title={projectAccessError ?? undefined}
      >
        A carregar segurança do ecossistema s-wona...
      </div>
    );
  }

  const pages: Record<string, ReactNode> = {
    'dashboard': <DashboardPage />,
    'projects': <ProjectsPage />,
    'indicators': <IndicatorsPage />,
    'activities': <ActivitiesPage />,
    'beneficiaries': <BeneficiariesPage />,
    'districts': <DistrictsPage />,
    'users': isAdmin ? <UsersPage /> : <AccessRestrictedPage />,
    'branding': <BrandingPage />,
    'schema-generator': <SchemaGeneratorPage />,
    'database-explorer': <DatabaseExplorerPage />,
    'kobo': <KoboToolboxPage />,
    'kobo-approval': isAdmin ? <KoboApproval /> : <AccessRestrictedPage />,
    'reports': <ReportsPage />,
    'theme': <ThemePage />,
  };

  return (
    <AppLayout currentPage={currentPage} onNavigate={navigateToPage}>
      {pages[currentPage] ?? pages['dashboard']}
    </AppLayout>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setCheckingSession(false);
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Unable to restore Supabase session:', error.message);
      if (!mounted) return;
      setSession(data.session);
      setCheckingSession(false);
    }).catch((error: unknown) => {
      if (error instanceof Error) console.error('Unable to restore Supabase session:', error.message);
      if (!mounted) return;
      setSession(null);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950" aria-label="A verificar sessão">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </main>
    );
  }

  if (!session) return <LoginPage />;

  return (
    <BrandingProvider>
      <ProjectAccessProvider>
        <AppContent />
        <DatabaseStatus />
      </ProjectAccessProvider>
    </BrandingProvider>
  );
}

export default App;
