import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/context/BrandingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import type { ThemeConfig, FooterConfig } from '@/types';
import { Palette, Save, Eye, Footprints, Phone, Mail, Building2, CheckCircle2 } from 'lucide-react';

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

export function ThemePage() {
  const { appConfig, refreshAppConfig } = useBranding();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canUpdate = true;

  useEffect(() => {
    if (appConfig) {
      setTheme(appConfig.theme);
      setFooter(appConfig.footer);
    }
  }, [appConfig]);

  const handleSave = async () => {
    setSaving(true);
    const payload = { theme, footer, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('app_config').update(payload).eq('id', 1);
    if (error) {
      const { error: insertError } = await supabase.from('app_config').insert({ id: 1, ...payload });
      if (insertError) console.error('Save error:', insertError.message);
    }
    await refreshAppConfig();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const themeFields: { key: keyof ThemeConfig; label: string; description: string }[] = [
    { key: 'primary_color', label: 'Primary Color', description: 'Main accent color for buttons, links, highlights' },
    { key: 'secondary_color', label: 'Secondary Color', description: 'Used for headers, branding panels, sidebar logo' },
    { key: 'sidebar_bg', label: 'Sidebar Background', description: 'Background color of the navigation sidebar' },
    { key: 'sidebar_text', label: 'Sidebar Text', description: 'Text color inside the navigation sidebar' },
    { key: 'widget_header_bg', label: 'Widget Header Background', description: 'Background color for card/widget headers' },
    { key: 'text_color', label: 'Text Color', description: 'Default text color across the application' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Theme Configurator</h2>
          <p className="text-sm text-slate-500">Customize colors, sidebar, and footer across the entire application</p>
        </div>
        {canUpdate && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : saved ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Saved!</> : <><Save className="w-4 h-4 mr-1" /> Save Changes</>}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="w-4 h-4" /> Color Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {themeFields.map((field) => (
              <div key={field.key} className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700 block">{field.label}</label>
                  <p className="text-xs text-slate-400">{field.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={theme[field.key]}
                      onChange={(e) => setTheme({ ...theme, [field.key]: e.target.value })}
                      className="w-12 h-9 rounded-lg border border-slate-200 cursor-pointer"
                      disabled={!canUpdate}
                    />
                    <Input
                      value={theme[field.key]}
                      onChange={(e) => setTheme({ ...theme, [field.key]: e.target.value })}
                      className="flex-1"
                      disabled={!canUpdate}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="w-4 h-4" /> Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              {/* Mini sidebar preview */}
              <div className="flex" style={{ minHeight: '200px' }}>
                <div
                  className="w-32 p-3 flex flex-col gap-2"
                  style={{ backgroundColor: theme.sidebar_bg, color: theme.sidebar_text }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.primary_color }}>
                      <div className="w-3 h-3 rounded-sm bg-white/30" />
                    </div>
                    <div className="text-xs font-bold truncate">Brand</div>
                  </div>
                  <div className="text-xs px-2 py-1.5 rounded" style={{ backgroundColor: theme.primary_color + '30' }}>
                    Dashboard
                  </div>
                  <div className="text-xs px-2 py-1.5 opacity-70">Projects</div>
                  <div className="text-xs px-2 py-1.5 opacity-70">Reports</div>
                </div>
                {/* Main content preview */}
                <div className="flex-1 p-4" style={{ backgroundColor: theme.widget_header_bg, color: theme.text_color }}>
                  <div className="text-sm font-bold mb-3">Widget Header</div>
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 mb-2">
                    <div className="text-xs text-slate-500 mb-1">KPI Card</div>
                    <div className="text-lg font-bold" style={{ color: theme.primary_color }}>1,234</div>
                  </div>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white ml-2"
                    style={{ backgroundColor: theme.secondary_color }}
                  >
                    Secondary Button
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Footprints className="w-4 h-4" /> Footer Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" /> Office Address
                </label>
                <Textarea
                  value={footer.office_address}
                  onChange={(e) => setFooter({ ...footer, office_address: e.target.value })}
                  rows={2}
                  placeholder="e.g. Av. Julius Nyerere, Maputo, Moçambique"
                  disabled={!canUpdate}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" /> Contact Phone
                  </label>
                  <Input
                    value={footer.contact_phone}
                    onChange={(e) => setFooter({ ...footer, contact_phone: e.target.value })}
                    placeholder="+258 84 123 4567"
                    disabled={!canUpdate}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-slate-400" /> Contact Email
                  </label>
                  <Input
                    type="email"
                    value={footer.contact_email}
                    onChange={(e) => setFooter({ ...footer, contact_email: e.target.value })}
                    placeholder="info@tlmmoz.org"
                    disabled={!canUpdate}
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Institutional Description</label>
              <Textarea
                value={footer.institutional_description}
                onChange={(e) => setFooter({ ...footer, institutional_description: e.target.value })}
                rows={2}
                placeholder="Brief description of the organization..."
                disabled={!canUpdate}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Custom Footer Text</label>
              <Input
                value={footer.custom_footer_text}
                onChange={(e) => setFooter({ ...footer, custom_footer_text: e.target.value })}
                placeholder="e.g. © 2024 Missão contra a Lepra Moçambique"
                disabled={!canUpdate}
              />
            </div>

            {/* Footer preview */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <p className="text-xs text-slate-500 mb-2">Footer Preview:</p>
              <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Office Location</p>
                    <p className="text-slate-500">{footer.office_address || 'Not configured'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">Contact</p>
                    <p className="text-slate-500">{footer.contact_phone || '—'}</p>
                    <p className="text-slate-500">{footer.contact_email || '—'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 mb-1">About</p>
                    <p className="text-slate-500">{footer.institutional_description || footer.custom_footer_text || 'Not configured'}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
