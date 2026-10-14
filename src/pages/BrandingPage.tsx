import { useEffect, useState, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/context/BrandingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Heart, Upload, Save, Palette, Trash2, Loader2 } from 'lucide-react';
import type { Branding } from '@/types';

export function BrandingPage() {
  const { branding, refresh } = useBranding();
  const canUpdate = true;

  const [form, setForm] = useState<Branding>(branding);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => { setForm(branding); }, [branding]);

  async function uploadLogoToStorage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'png';
    const fileName = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { contentType: file.type || undefined });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async function saveLogoUrlToDb(logoUrl: string | null): Promise<void> {
    const payload = {
      logo_url: logoUrl,
      primary_label: form.primary_label,
      secondary_label: form.secondary_label,
      base_font: form.base_font,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      updated_at: new Date().toISOString(),
    };

    if (branding.id !== 'default') {
      const { error: updateErr } = await supabase
        .from('branding')
        .update(payload)
        .eq('id', branding.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('branding')
        .insert(payload);
      if (insertErr) throw insertErr;
    }
  }

  async function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const publicUrl = await uploadLogoToStorage(file);
      setForm(prev => ({ ...prev, logo_url: publicUrl }));
      await saveLogoUrlToDb(publicUrl);
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  }

  async function handleLogoRemove() {
    setUploadError(null);
    setForm(prev => ({ ...prev, logo_url: null }));
    try {
      await saveLogoUrlToDb(null);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove logo';
      setUploadError(message);
    }
  }

  async function handleSave() {
    setSaving(true);
    if (branding.id !== 'default') {
      const { error } = await supabase.from('branding').update({
        logo_url: form.logo_url, primary_label: form.primary_label,
        secondary_label: form.secondary_label, base_font: form.base_font,
        primary_color: form.primary_color, secondary_color: form.secondary_color,
        updated_at: new Date().toISOString(),
      }).eq('id', branding.id);
      if (error) { alert('Error saving branding: ' + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('branding').insert({
        logo_url: form.logo_url, primary_label: form.primary_label,
        secondary_label: form.secondary_label, base_font: form.base_font,
        primary_color: form.primary_color, secondary_color: form.secondary_color,
      });
      if (error) { alert('Error saving branding: ' + error.message); setSaving(false); return; }
    }
    await refresh();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-[#711246] to-[#3d0a26] rounded-xl p-8 flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 overflow-hidden">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Heart className="w-8 h-8 text-[#EE3A25]" fill="currentColor" />
              )}
            </div>
            <div className="text-white">
              <p className="text-xl font-bold">{form.secondary_label}</p>
              <p className="text-sm text-white/70">{form.primary_label}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="w-5 h-5 text-[#711246]" /> Branding Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Logo Image</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                ) : form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Heart className="w-8 h-8 text-slate-300" />
                )}
              </div>
              {canUpdate && (
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
                  </label>
                  {form.logo_url && (
                    <button
                      onClick={handleLogoRemove}
                      className="inline-flex items-center gap-1 px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            {uploadError && (
              <p className="text-xs text-red-600 mt-2">{uploadError}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">Uploads to secure storage. Changes apply everywhere after saving.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Primary Label (e.g. Moçambique)" value={form.primary_label} onChange={e => setForm({ ...form, primary_label: e.target.value })} disabled={!canUpdate} />
            <Input label="Secondary Label (e.g. Missão contra a Lepra)" value={form.secondary_label} onChange={e => setForm({ ...form, secondary_label: e.target.value })} disabled={!canUpdate} />
            <Input label="Base Font" value={form.base_font} onChange={e => setForm({ ...form, base_font: e.target.value })} disabled={!canUpdate} placeholder="Inter, Roboto, etc." />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} disabled={!canUpdate} className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer" />
                <input type="text" value={form.primary_color} onChange={e => setForm({ ...form, primary_color: e.target.value })} disabled={!canUpdate} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">Secondary Color</label>
              <div className="flex gap-2">
                <input type="color" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} disabled={!canUpdate} className="w-12 h-10 rounded-lg border border-slate-300 cursor-pointer" />
                <input type="text" value={form.secondary_color} onChange={e => setForm({ ...form, secondary_color: e.target.value })} disabled={!canUpdate} className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg" />
              </div>
            </div>
          </div>

          {canUpdate && (
            <div className="flex justify-end gap-3 pt-2">
              {saved && <span className="text-sm text-emerald-600 self-center">Saved!</span>}
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
