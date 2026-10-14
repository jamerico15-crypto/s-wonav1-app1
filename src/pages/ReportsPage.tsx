import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { useBranding } from '@/context/BrandingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge, ProgressBadge } from '@/components/ui/Badge';
import { STATUS_COLORS, formatMZN, ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import type { Project, Indicator, Activity, Beneficiary } from '@/types';
import {
  FileText, Download, CheckSquare, Square, FileSpreadsheet, FileType2,
  FileImage, Calendar, DollarSign, Users, Target, ListChecks
} from 'lucide-react';

type ReportPeriod = 'monthly' | 'quarterly' | 'annual';
type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'docx';

interface ReportSection {
  key: string;
  label: string;
  icon: typeof FileText;
  enabled: boolean;
}

const SECTIONS: ReportSection[] = [
  { key: 'project_profiles', label: 'Project Profiles', icon: FileText, enabled: true },
  { key: 'financial_remainders', label: 'Financial Remainders', icon: DollarSign, enabled: true },
  { key: 'target_indicators', label: 'Target Indicators', icon: Target, enabled: true },
  { key: 'gender_disaggregation', label: 'Gender-Disaggregated Burdens', icon: Users, enabled: true },
  { key: 'activity_milestones', label: 'Activity Milestones', icon: ListChecks, enabled: true },
];

export function ReportsPage() {
  const { branding } = useBranding();
  const { data: projects, loading: lp } = useRealtimeTable<Project>('projects');
  const { data: indicators, loading: li } = useRealtimeTable<Indicator>('indicators');
  const { data: activities, loading: la } = useRealtimeTable<Activity>('activities', {
    select: '*, project:projects(*)',
  });
  const { data: beneficiaries, loading: lb } = useRealtimeTable<Beneficiary>('beneficiaries');
  const loading = lp || li || la || lb;

  const [period, setPeriod] = useState<ReportPeriod>('quarterly');
  const [selectedProject, setSelectedProject] = useState('all');
  const [sections, setSections] = useState<ReportSection[]>(SECTIONS);
  const [reportTitle, setReportTitle] = useState('MEAL Quarterly Report');
  const [customHeader, setCustomHeader] = useState('');
  const [customFooter, setCustomFooter] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const canCreate = true;

  const loadData = useCallback(async () => {
    // Data is already loaded via realtime hooks; this is a no-op for compatibility
  }, []);

  const toggleSection = (key: string) => {
    setSections(sections.map((s) => s.key === key ? { ...s, enabled: !s.enabled } : s));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const filteredProjects = selectedProject === 'all' ? projects : projects.filter((p) => p.id === selectedProject);
  const projectIds = filteredProjects.map((p) => p.id);
  const filteredIndicators = indicators.filter((i) => projectIds.includes(i.project_id));
  const filteredActivities = activities.filter((a) => projectIds.includes(a.project_id));
  const filteredBeneficiaries = beneficiaries.filter((b) => projectIds.includes(b.project_id));

  const generatePreview = () => {
    const enabledSections = sections.filter((s) => s.enabled);
    const logo = logoPreview ?? branding.logo_url;
    const headerText = customHeader || `${branding.secondary_label} ${branding.primary_label}`;

    let html = `
      <div style="font-family: ${branding.base_font || 'Inter'}, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto;">
        <div style="border-bottom: 3px solid ${branding.primary_color}; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
          ${logo ? `<img src="${logo}" style="height: 60px; object-fit: contain;" alt="Logo" />` : ''}
          <div>
            <h1 style="margin: 0; font-size: 22px; color: ${branding.secondary_color};">${reportTitle}</h1>
            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">${headerText}</p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #94a3b8;">Period: ${period.toUpperCase()} · Generated: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
    `;

    if (enabledSections.find((s) => s.key === 'project_profiles')) {
      html += `<h2 style="font-size: 16px; color: ${branding.secondary_color}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">1. Project Profiles</h2>`;
      filteredProjects.forEach((p) => {
        html += `
          <div style="margin: 12px 0; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="margin: 0 0 8px; font-size: 14px;">${p.title}</h3>
            <p style="font-size: 12px; color: #64748b; margin: 0 0 4px;">${p.description ?? ''}</p>
            <p style="font-size: 12px; margin: 0;"><strong>Status:</strong> ${STATUS_COLORS[p.status]?.label ?? p.status} | <strong>Budget:</strong> ${formatMZN(p.budget_mzn ?? p.budget)}</p>
          </div>
        `;
      });
    }

    if (enabledSections.find((s) => s.key === 'financial_remainders')) {
      const totalBudget = filteredProjects.reduce((s, p) => s + (p.budget_mzn ?? p.budget), 0);
      const totalSpent = filteredProjects.reduce((s, p) => s + (p.budget_spent ?? 0), 0);
      const remaining = totalBudget - totalSpent;
      html += `
        <h2 style="font-size: 16px; color: ${branding.secondary_color}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">2. Financial Remainders</h2>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin: 12px 0;">
          <tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0;">Project</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Budget (MZN)</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Spent</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Remaining</th></tr>
          ${filteredProjects.map((p) => `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;">${p.title}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatMZN(p.budget_mzn ?? p.budget)}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatMZN(p.budget_spent ?? 0)}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatMZN((p.budget_mzn ?? p.budget) - (p.budget_spent ?? 0))}</td></tr>`).join('')}
          <tr style="background: #f8fafc; font-weight: bold;"><td style="padding: 8px; border: 1px solid #e2e8f0;">Total</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatMZN(totalBudget)}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatMZN(totalSpent)}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${formatMZN(remaining)}</td></tr>
        </table>
      `;
    }

    if (enabledSections.find((s) => s.key === 'target_indicators')) {
      html += `<h2 style="font-size: 16px; color: ${branding.secondary_color}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">3. Target Indicators</h2>`;
      html += `<table style="width: 100%; font-size: 12px; border-collapse: collapse; margin: 12px 0;"><tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0;">Indicator</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Baseline</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Current</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Target</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Progress</th></tr>`;
      filteredIndicators.forEach((ind) => {
        const pct = ind.target_value > 0 ? Math.min((ind.current_value / ind.target_value) * 100, 100) : 0;
        html += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;">${ind.name}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${ind.baseline_value}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${ind.current_value}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${ind.target_value} ${ind.unit ?? ''}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${pct.toFixed(0)}%</td></tr>`;
      });
      html += `</table>`;
    }

    if (enabledSections.find((s) => s.key === 'gender_disaggregation')) {
      const totalMale = filteredBeneficiaries.reduce((s, b) => s + b.male, 0);
      const totalFemale = filteredBeneficiaries.reduce((s, b) => s + b.female, 0);
      const totalG1 = filteredBeneficiaries.reduce((s, b) => s + b.disability_grade1, 0);
      const totalG2 = filteredBeneficiaries.reduce((s, b) => s + b.disability_grade2, 0);
      html += `
        <h2 style="font-size: 16px; color: ${branding.secondary_color}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">4. Gender-Disaggregated Burdens</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0;">
          <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;"><p style="font-size: 24px; font-weight: bold; margin: 0;">${totalMale}</p><p style="font-size: 11px; color: #64748b;">Male</p></div>
          <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;"><p style="font-size: 24px; font-weight: bold; margin: 0;">${totalFemale}</p><p style="font-size: 11px; color: #64748b;">Female</p></div>
          <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;"><p style="font-size: 24px; font-weight: bold; margin: 0;">${totalG1}</p><p style="font-size: 11px; color: #64748b;">Grade-1</p></div>
          <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;"><p style="font-size: 24px; font-weight: bold; margin: 0;">${totalG2}</p><p style="font-size: 11px; color: #64748b;">Grade-2</p></div>
        </div>
      `;
    }

    if (enabledSections.find((s) => s.key === 'activity_milestones')) {
      html += `<h2 style="font-size: 16px; color: ${branding.secondary_color}; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">5. Activity Milestones</h2>`;
      html += `<table style="width: 100%; font-size: 12px; border-collapse: collapse; margin: 12px 0;"><tr style="background: #f8fafc;"><th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0;">Activity</th><th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0;">Type</th><th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0;">Status</th><th style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">Progress</th></tr>`;
      filteredActivities.forEach((a) => {
        html += `<tr><td style="padding: 8px; border: 1px solid #e2e8f0;">${a.title}${a.milestone ? ' ⭐' : ''}</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${ACTIVITY_TYPE_LABELS[a.activity_type ?? 'other'] ?? 'Other'}</td><td style="padding: 8px; border: 1px solid #e2e8f0;">${STATUS_COLORS[a.status]?.label ?? a.status}</td><td style="text-align: right; padding: 8px; border: 1px solid #e2e8f0;">${a.progress}%</td></tr>`;
      });
      html += `</table>`;
    }

    const footerText = customFooter || `© ${new Date().getFullYear()} ${branding.secondary_label} ${branding.primary_label}`;
    html += `<div style="border-top: 2px solid ${branding.primary_color}; padding-top: 12px; margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8;">${footerText}</div></div>`;

    setPreviewHtml(html);
  };

  const handleExport = (format: ExportFormat) => {
    setGenerating(true);

    if (format === 'csv') {
      const rows: string[] = [];
      if (sections.find((s) => s.key === 'project_profiles')?.enabled) {
        rows.push('Section,Project,Status,Budget MZN,Spent MZN');
        filteredProjects.forEach((p) => {
          rows.push(`Project Profile,${p.title},${p.status},${p.budget_mzn ?? p.budget},${p.budget_spent ?? 0}`);
        });
      }
      if (sections.find((s) => s.key === 'target_indicators')?.enabled) {
        rows.push('Section,Indicator,Baseline,Current,Target,Unit,Progress');
        filteredIndicators.forEach((i) => {
          const pct = i.target_value > 0 ? ((i.current_value / i.target_value) * 100).toFixed(0) : '0';
          rows.push(`Indicator,${i.name},${i.baseline_value},${i.current_value},${i.target_value},${i.unit ?? ''},${pct}%`);
        });
      }
      const csv = rows.join('\n');
      downloadFile(csv, `${reportTitle.replace(/\s+/g, '_')}.csv`, 'text/csv');
    } else if (format === 'xlsx') {
      let csvContent = '';
      if (sections.find((s) => s.key === 'project_profiles')?.enabled) {
        csvContent += 'Project,Status,Budget (MZN),Spent (MZN),Remaining\n';
        filteredProjects.forEach((p) => {
          csvContent += `${p.title},${p.status},${p.budget_mzn ?? p.budget},${p.budget_spent ?? 0},${(p.budget_mzn ?? p.budget) - (p.budget_spent ?? 0)}\n`;
        });
        csvContent += '\n';
      }
      if (sections.find((s) => s.key === 'target_indicators')?.enabled) {
        csvContent += 'Indicator,Baseline,Current,Target,Unit,Progress (%)\n';
        filteredIndicators.forEach((i) => {
          const pct = i.target_value > 0 ? ((i.current_value / i.target_value) * 100).toFixed(0) : '0';
          csvContent += `${i.name},${i.baseline_value},${i.current_value},${i.target_value},${i.unit ?? ''},${pct}\n`;
        });
        csvContent += '\n';
      }
      downloadFile(csvContent, `${reportTitle.replace(/\s+/g, '_')}.csv`, 'application/vnd.ms-excel');
    } else {
      const html = previewHtml ?? '<p>Generate preview first.</p>';
      if (format === 'pdf') {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`<html><head><title>${reportTitle}</title></head><body>${html}</body></html>`);
          printWindow.document.close();
          printWindow.print();
        }
      } else if (format === 'docx') {
        const docHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${reportTitle}</title></head><body>${html}</body></html>`;
        downloadFile(docHtml, `${reportTitle.replace(/\s+/g, '_')}.doc`, 'application/msword');
      }
    }

    setGenerating(false);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#EE3A25] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Report Generator</h2>
        <p className="text-sm text-slate-500">Create branded reports with selectable data sections</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Report Setup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input label="Report Title" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
              <Select label="Period" value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </Select>
              <Select label="Project Scope" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                <option value="all">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Data Sections</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {sections.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleSection(s.key)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-sm text-left"
                  >
                    {s.enabled ? <CheckSquare className="w-4 h-4 text-[#EE3A25]" /> : <Square className="w-4 h-4 text-slate-300" />}
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className={s.enabled ? 'text-slate-700' : 'text-slate-400'}>{s.label}</span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Style & Branding</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Institutional Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#EE3A25] file:text-white file:cursor-pointer" />
                {logoPreview && <img src={logoPreview} alt="Logo preview" className="mt-2 h-12 object-contain" />}
              </div>
              <Input label="Custom Header Text" value={customHeader} onChange={(e) => setCustomHeader(e.target.value)} placeholder="Optional header text" />
              <Textarea label="Custom Footer Text" value={customFooter} onChange={(e) => setCustomFooter(e.target.value)} rows={2} placeholder="Optional footer text" />
            </CardContent>
          </Card>

          <Button className="w-full" onClick={generatePreview}>
            <FileText className="w-4 h-4 mr-1" /> Generate Preview
          </Button>
        </div>

        {/* Preview panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Report Preview</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExport('csv')} disabled={generating || !canCreate}>
                    <Download className="w-3.5 h-3.5 mr-1" /> CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('xlsx')} disabled={generating || !canCreate}>
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('docx')} disabled={generating || !canCreate || !previewHtml}>
                    <FileType2 className="w-3.5 h-3.5 mr-1" /> Word
                  </Button>
                  <Button size="sm" onClick={() => handleExport('pdf')} disabled={generating || !canCreate || !previewHtml}>
                    <FileImage className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {previewHtml ? (
                <div className="border border-slate-200 rounded-lg p-6 bg-white overflow-y-auto max-h-[600px]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <FileText className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">Configure your report and click "Generate Preview" to see a live preview.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
