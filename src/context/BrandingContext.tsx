import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Branding, AppConfig, ThemeConfig, FooterConfig } from '@/types';

interface BrandingContextValue {
  branding: Branding;
  appConfig: AppConfig | null;
  loading: boolean;
  refresh: () => Promise<void>;
  refreshAppConfig: () => Promise<void>;
}

const DEFAULT_BRANDING: Branding = {
  id: 'default',
  logo_url: null,
  primary_label: 'Moçambique',
  secondary_label: 'Missão contra a Lepra',
  base_font: 'Inter',
  primary_color: '#EE3A25',
  secondary_color: '#711246',
  updated_at: new Date().toISOString(),
};

const DEFAULT_THEME: ThemeConfig = {
  primary_color: '#EE3A25',
  secondary_color: '#711246',
  sidebar_bg: '#1a1a2e',
  sidebar_text: '#ffffff',
  widget_header_bg: '#f8fafc',
  text_color: '#1e293b',
};

const DEFAULT_FOOTER: FooterConfig = {
  office_address: '',
  contact_phone: '',
  contact_email: '',
  institutional_description: '',
  custom_footer_text: '',
};

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('branding').select('*').maybeSingle();
    if (data) setBranding(data as Branding);
  }, []);

  const refreshAppConfig = useCallback(async () => {
    const { data } = await supabase.from('app_config').select('*').eq('id', 1).maybeSingle();
    if (data) setAppConfig(data as AppConfig);
  }, []);

  useEffect(() => {
    Promise.all([refresh(), refreshAppConfig()]).finally(() => setLoading(false));
  }, [refresh, refreshAppConfig]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--app-font', branding.base_font || 'Inter');
    root.style.setProperty('--color-primary', branding.primary_color || '#EE3A25');
    root.style.setProperty('--color-secondary', branding.secondary_color || '#711246');
  }, [branding.base_font, branding.primary_color, branding.secondary_color]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = appConfig?.theme ?? DEFAULT_THEME;
    root.style.setProperty('--theme-primary', theme.primary_color);
    root.style.setProperty('--theme-secondary', theme.secondary_color);
    root.style.setProperty('--theme-sidebar-bg', theme.sidebar_bg);
    root.style.setProperty('--theme-sidebar-text', theme.sidebar_text);
    root.style.setProperty('--theme-widget-header-bg', theme.widget_header_bg);
    root.style.setProperty('--theme-text-color', theme.text_color);
  }, [appConfig]);

  return (
    <BrandingContext.Provider value={{ branding, appConfig, loading, refresh, refreshAppConfig }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used within BrandingProvider');
  return ctx;
}
