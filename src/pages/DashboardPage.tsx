import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useProjectAccess } from '@/context/ProjectAccessContext';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Select } from '@/components/ui/Input';
import { STATUS_COLORS, formatMZN, convertToMZN, ACTIVITY_TYPE_LABELS } from '@/lib/constants';
import type { Project, Indicator, Activity, Beneficiary } from '@/types';
import {
  Users, DollarSign, Target, Activity as ActivityIcon, AlertCircle, CheckCircle2,
  Sun, Moon, Palette, SlidersHorizontal, ChevronDown
} from 'lucide-react';

type DashboardTab = 'overview' | 'project';
type DashboardTheme = 'light' | 'dark' | 'blue' | 'green';

const METRIC_OPTIONS = [
  { key: 'beneficiaries', label: 'Beneficiários' },
  { key: 'budget', label: 'Orçamento executado' },
  { key: 'indicators', label: 'Indicadores ativos' },
  { key: 'activity_progress', label: 'Progresso das atividades' },
  { key: 'gender', label: 'Desagregação por género' },
  { key: 'disability', label: 'Classificação de deficiência' },
  { key: 'activity_status', label: 'Estado das atividades' },
  { key: 'activity_types', label: 'Tipos de atividade' },
  { key: 'indicator_statistics', label: 'Estatísticas da View M&A' },
  { key: 'project_status', label: 'Estado dos projetos' },
];

const THEME_CONFIG: Record<DashboardTheme, { label: string; icon: typeof Sun; wrapper: string; accent: string; soft: string }> = {
  light: { label: 'Claro', icon: Sun, wrapper: 'bg-slate-50 text-slate-900', accent: 'bg-rose-600', soft: 'bg-rose-50 text-rose-700' },
  dark: { label: 'Escuro', icon: Moon, wrapper: 'dashboard-theme-dark bg-slate-950 text-slate-100', accent: 'bg-sky-500', soft: 'bg-sky-950 text-sky-200' },
  blue: { label: 'Azul Institucional', icon: Palette, wrapper: 'bg-blue-50 text-slate-900', accent: 'bg-blue-700', soft: 'bg-blue-100 text-blue-800' },
  green: { label: 'Verde Saúde', icon: Palette, wrapper: 'bg-emerald-50 text-slate-900', accent: 'bg-emerald-700', soft: 'bg-emerald-100 text-emerald-800' },
};

export function DashboardPage() {
  const { isAdmin, projectIds: authorizedProjectIds, loading: loadingProjectAccess } = useProjectAccess();
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [theme, setTheme] = useState<DashboardTheme>('light');
  const [metricPanelOpen, setMetricPanelOpen] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<string, boolean>>({});
  const [indicatorStatistics, setIndicatorStatistics] = useState<Record<string, unknown>[]>([]);
  const [loadingIndicatorStatistics, setLoadingIndicatorStatistics] = useState(true);
  const [indicatorStatisticsError, setIndicatorStatisticsError] = useState<string | null>(null);
  const { data: projects, loading: lp } = useRealtimeTable<Project>('projects');
  const { data: indicators, loading: li } = useRealtimeTable<Indicator>('indicators');
  const { data: activities, loading: la } = useRealtimeTable<Activity>('activities');
  const { data: beneficiaries, loading: lb } = useRealtimeTable<Beneficiary>('beneficiaries', {
    select: '*, district:districts(*)',
  });
  const loading = lp || li || la || lb || loadingProjectAccess;

  const loadIndicatorStatistics = useCallback(async () => {
    if (loadingProjectAccess) return;
    setLoadingIndicatorStatistics(true);
    if (!isAdmin && authorizedProjectIds.length === 0) {
      setIndicatorStatistics([]);
      setIndicatorStatisticsError(null);
      setLoadingIndicatorStatistics(false);
      return;
    }
    let query = supabase.from('view_indicator_statistics').select('*');
    if (!isAdmin) query = query.in('project_id', authorizedProjectIds);
    const { data, error } = await query;
    if (error) {
      setIndicatorStatisticsError(error.message);
    } else {
      setIndicatorStatistics(data as Record<string, unknown>[] ?? []);
      setIndicatorStatisticsError(null);
    }
    setLoadingIndicatorStatistics(false);
  }, [authorizedProjectIds, isAdmin, loadingProjectAccess]);

  useEffect(() => {
    void loadIndicatorStatistics();
    const refreshInterval = window.setInterval(() => void loadIndicatorStatistics(), 30_000);
    const channel = supabase
      .channel('dashboard-indicator-statistics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kobo_activity_mappings' }, () => {
        void loadIndicatorStatistics();
      })
      .subscribe();

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(channel);
    };
  }, [loadIndicatorStatistics]);

  const viewingProject = activeTab === 'project' && Boolean(selectedProjectId);
  const dashboardProjects = useMemo(() => viewingProject ? projects.filter(project => project.id === selectedProjectId) : projects, [projects, selectedProjectId, viewingProject]);
  const dashboardIndicators = useMemo(() => viewingProject ? indicators.filter(indicator => indicator.project_id === selectedProjectId) : indicators, [indicators, selectedProjectId, viewingProject]);
  const dashboardActivities = useMemo(() => viewingProject ? activities.filter(activity => activity.project_id === selectedProjectId) : activities, [activities, selectedProjectId, viewingProject]);
  const dashboardBeneficiaries = useMemo(() => viewingProject ? beneficiaries.filter(beneficiary => beneficiary.project_id === selectedProjectId) : beneficiaries, [beneficiaries, selectedProjectId, viewingProject]);
  const dashboardIndicatorStatistics = useMemo(() => viewingProject
    ? indicatorStatistics.filter(row => String(row.project_id ?? '') === selectedProjectId)
    : indicatorStatistics, [indicatorStatistics, selectedProjectId, viewingProject]);

  const stats = useMemo(() => {
    const totalBeneficiaries = dashboardBeneficiaries.reduce((s, b) => s + b.total_reached, 0);
    const totalMale = dashboardBeneficiaries.reduce((s, b) => s + b.male, 0);
    const totalFemale = dashboardBeneficiaries.reduce((s, b) => s + b.female, 0);
    const totalG1 = dashboardBeneficiaries.reduce((s, b) => s + b.disability_grade1, 0);
    const totalG2 = dashboardBeneficiaries.reduce((s, b) => s + b.disability_grade2, 0);
    const totalBudgetMZN = dashboardProjects.reduce((s, p) => s + (p.budget_mzn ?? convertToMZN(Number(p.budget), p.currency ?? 'MZN', p.exchange_rate ?? 1)), 0);
    const totalSpentMZN = dashboardProjects.reduce((s, p) => {
      const spent = Number(p.budget_spent);
      return s + (p.currency === 'MZN' ? spent : spent * (p.exchange_rate ?? 1));
    }, 0);
    const budgetPct = totalBudgetMZN > 0 ? (totalSpentMZN / totalBudgetMZN) * 100 : 0;
    const ongoingCount = dashboardProjects.filter(p => p.status === 'ongoing').length;
    const completedCount = dashboardProjects.filter(p => p.status === 'completed').length;
    const delayedCount = dashboardProjects.filter(p => p.status === 'delayed').length;
    const plannedCount = dashboardProjects.filter(p => p.status === 'planned').length;
    const avgProgress = dashboardActivities.length > 0
      ? Math.round(dashboardActivities.reduce((s, a) => s + a.progress, 0) / dashboardActivities.length)
      : 0;

    return {
      totalBeneficiaries, totalMale, totalFemale, totalG1, totalG2,
      totalBudgetMZN, totalSpentMZN, budgetPct,
      ongoingCount, completedCount, delayedCount, plannedCount,
      avgProgress,
    };
  }, [dashboardProjects, dashboardBeneficiaries, dashboardActivities]);

  const statisticColumns = useMemo(() => Object.keys(dashboardIndicatorStatistics[0] ?? {}), [dashboardIndicatorStatistics]);
  const statisticLabelColumn = statisticColumns.find(column => /project.*title|activity.*title|indicator.*name|(^|_)title$|(^|_)name$|label/i.test(column));
  const statisticValueColumns = useMemo(() => {
    const preferred = /value|count|total|amount|target|approved|submission/i;
    return statisticColumns.filter(column =>
      dashboardIndicatorStatistics.some(row => typeof row[column] === 'number' || (typeof row[column] === 'string' && row[column] !== '' && Number.isFinite(Number(row[column])))),
    ).sort((left, right) => Number(preferred.test(right)) - Number(preferred.test(left))).slice(0, 3);
  }, [dashboardIndicatorStatistics, statisticColumns]);

  const metricOptions = useMemo(() => [
    ...METRIC_OPTIONS,
    ...statisticValueColumns.map(column => ({ key: `view:${column}`, label: column.replace(/_/g, ' ') })),
  ], [statisticValueColumns]);
  const metricIsVisible = (key: string) => visibleMetrics[key] ?? true;
  const toggleMetric = (key: string) => setVisibleMetrics(current => ({ ...current, [key]: !(current[key] ?? true) }));

  const activityStatusCounts = useMemo(() => {
    const counts: Record<string, number> = { planned: 0, ongoing: 0, delayed: 0, completed: 0 };
    dashboardActivities.forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return counts;
  }, [dashboardActivities]);

  const activityTypeCounts = useMemo(() => {
    const map = new Map<string, number>();
    dashboardActivities.forEach(a => {
      const t = a.activity_type ?? 'other';
      map.set(t, (map.get(t) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, [dashboardActivities]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#EE3A25] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`dashboard-root min-h-full space-y-6 rounded-3xl p-4 transition-colors sm:p-6 ${THEME_CONFIG[theme].wrapper}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">S-WONA · Monitorização e Avaliação</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Painel de Desempenho</h2>
          <p className="mt-1 text-sm text-slate-500">Indicadores, atividades e resultados consolidados de Moçambique.</p>
        </div>
        <details className="relative z-20">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
            <Palette className="h-4 w-4" /> Customizar Tema <ChevronDown className="h-4 w-4" />
          </summary>
          <div className="dashboard-surface absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
            {(Object.keys(THEME_CONFIG) as DashboardTheme[]).map(themeName => {
              const ThemeIcon = THEME_CONFIG[themeName].icon;
              return (
                <button
                  key={themeName}
                  type="button"
                  onClick={event => {
                    setTheme(themeName);
                    const details = event.currentTarget.closest('details');
                    if (details) details.open = false;
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${theme === themeName ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <ThemeIcon className="h-4 w-4" /> {THEME_CONFIG[themeName].label}
                </button>
              );
            })}
          </div>
        </details>
      </div>

      <div className="dashboard-surface flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Âmbito do dashboard">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'overview' ? `${THEME_CONFIG[theme].accent} text-white shadow-sm` : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Visão Geral (M&amp;A)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'project'}
            onClick={() => setActiveTab('project')}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === 'project' ? `${THEME_CONFIG[theme].accent} text-white shadow-sm` : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Filtro por Projeto
          </button>
        </div>
        {activeTab === 'project' && (
          <div className="w-full sm:max-w-sm">
            <Select label="Projeto" value={selectedProjectId} onChange={event => setSelectedProjectId(event.target.value)} className="dashboard-select !bg-white">
              <option value="">Selecione um projeto...</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
            </Select>
          </div>
        )}
      </div>

      {activeTab === 'project' && !selectedProjectId && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Escolha um projeto para filtrar cartões, gráficos e estatísticas.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">Personalizar Métricas Visíveis</h3>
          <p className="text-xs text-slate-500">Escolha os cartões e gráficos apresentados neste painel.</p>
        </div>
        <button
          type="button"
          aria-expanded={metricPanelOpen}
          onClick={() => setMetricPanelOpen(open => !open)}
          className="dashboard-surface inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <SlidersHorizontal className="h-4 w-4" /> {metricPanelOpen ? 'Fechar configuração' : 'Configurar métricas'}
        </button>
      </div>
      {metricPanelOpen && (
        <div className="dashboard-surface grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricOptions.map(metric => (
            <label key={metric.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
              <input type="checkbox" checked={metricIsVisible(metric.key)} onChange={() => toggleMetric(metric.key)} className="rounded border-slate-300 text-blue-700 focus:ring-blue-500" />
              <span className="capitalize">{metric.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricIsVisible('beneficiaries') && (
        <KpiCard
          icon={Users}
          label="Beneficiários alcançados"
          value={stats.totalBeneficiaries.toLocaleString()}
          sub={`${stats.totalMale.toLocaleString()} masculino · ${stats.totalFemale.toLocaleString()} feminino`}
          color={theme === 'green' ? 'text-emerald-700' : theme === 'blue' ? 'text-blue-700' : 'text-[#EE3A25]'}
          bg={theme === 'green' ? 'bg-emerald-100' : theme === 'blue' ? 'bg-blue-100' : 'bg-[#EE3A25]/8'}
        />
        )}
        {metricIsVisible('budget') && <KpiCard
          icon={DollarSign}
          label="Orçamento executado"
          value={`${stats.budgetPct.toFixed(0)}%`}
          sub={`${formatMZN(stats.totalSpentMZN)} / ${formatMZN(stats.totalBudgetMZN)}`}
          color={theme === 'green' ? 'text-emerald-800' : theme === 'blue' ? 'text-blue-800' : 'text-[#711246]'}
          bg={theme === 'green' ? 'bg-emerald-100' : theme === 'blue' ? 'bg-blue-100' : 'bg-[#711246]/8'}
        />}
        {metricIsVisible('indicators') && <KpiCard
          icon={Target}
          label="Indicadores ativos"
          value={dashboardIndicators.length.toString()}
          sub={`${dashboardIndicators.filter(i => i.current_value >= i.target_value).length} atingidos`}
          color="text-blue-600"
          bg="bg-blue-50"
        />}
        {metricIsVisible('activity_progress') && <KpiCard
          icon={ActivityIcon}
          label="Progresso médio das atividades"
          value={`${stats.avgProgress}%`}
          sub={`${dashboardActivities.length} atividades`}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gender breakdown */}
        {metricIsVisible('gender') && <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Desagregação por género</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Female</span>
                  <span className="font-semibold text-slate-900">{stats.totalFemale.toLocaleString()}</span>
                </div>
                <ProgressBar value={stats.totalFemale} max={stats.totalMale + stats.totalFemale || 1} color="bg-[#711246]" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Male</span>
                  <span className="font-semibold text-slate-900">{stats.totalMale.toLocaleString()}</span>
                </div>
                <ProgressBar value={stats.totalMale} max={stats.totalMale + stats.totalFemale || 1} color="bg-blue-500" />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Female burden ratio</span>
                  <span className="font-semibold text-[#711246]">
                    {((stats.totalFemale / (stats.totalMale + stats.totalFemale || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* Disability breakdown */}
        {metricIsVisible('disability') && <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Classificação de deficiência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Grade-1 Deformities</span>
                  <span className="font-semibold text-slate-900">{stats.totalG1}</span>
                </div>
                <ProgressBar value={stats.totalG1} max={stats.totalG1 + stats.totalG2 || 1} color="bg-amber-500" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Grade-2 Deformities</span>
                  <span className="font-semibold text-slate-900">{stats.totalG2}</span>
                </div>
                <ProgressBar value={stats.totalG2} max={stats.totalG1 + stats.totalG2 || 1} color="bg-red-500" />
              </div>
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{stats.totalG1}</p>
                  <p className="text-xs text-amber-600">Grade 1</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{stats.totalG2}</p>
                  <p className="text-xs text-red-600">Grade 2</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>}

        {/* Activity status */}
        {metricIsVisible('activity_status') && <Card className="dashboard-card">
          <CardHeader>
            <CardTitle>Estado das atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(activityStatusCounts).map(([status, count]) => {
                const config = STATUS_COLORS[status];
                const total = dashboardActivities.length || 1;
                return (
                  <div key={status}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className={`flex items-center gap-1.5 ${config.text}`}>
                        <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                      <span className="font-semibold text-slate-900">{count}</span>
                    </div>
                    <ProgressBar value={count} max={total} color={config.dot} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>}
      </div>

      {/* Activity Type Breakdown */}
      {metricIsVisible('activity_types') && <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Tipos de atividade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activityTypeCounts.map(({ type, count }) => (
              <div key={type} className="border border-slate-200 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-slate-800">{count}</p>
                <p className="text-xs text-slate-500 mt-1">{ACTIVITY_TYPE_LABELS[type] ?? type}</p>
              </div>
            ))}
            {activityTypeCounts.length === 0 && (
              <p className="text-sm text-slate-400 col-span-4 text-center py-4">No activities classified yet.</p>
            )}
          </div>
        </CardContent>
      </Card>}

      {/* Live indicator statistics from the approved Kobo mappings view */}
      {metricIsVisible('indicator_statistics') && <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Estatísticas de indicadores · conciliação Kobo</CardTitle>
        </CardHeader>
        <CardContent>
          {indicatorStatisticsError ? (
            <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Não foi possível carregar view_indicator_statistics: {indicatorStatisticsError}
            </div>
          ) : loadingIndicatorStatistics ? (
            <p className="py-6 text-center text-sm text-slate-500">A carregar estatísticas conciliadas…</p>
          ) : dashboardIndicatorStatistics.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Ainda não existem relações Kobo aprovadas para apresentar.</p>
          ) : statisticValueColumns.length === 0 ? (
            <div className="dashboard-surface overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600"><tr>{statisticColumns.map(column => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">{dashboardIndicatorStatistics.map((row, index) => <tr key={index}>{statisticColumns.map(column => <td key={column} className="px-3 py-2 text-slate-700">{String(row[column] ?? '—')}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {statisticValueColumns.filter(metric => metricIsVisible(`view:${metric}`)).map((metric, metricIndex) => {
                const rows = dashboardIndicatorStatistics.map((row, index) => ({
                  id: String(row.id ?? `${index}-${String(row[statisticLabelColumn ?? ''])}`),
                  label: String((statisticLabelColumn ? row[statisticLabelColumn] : undefined) ?? row.project_title ?? row.activity_title ?? `Registo ${index + 1}`),
                  value: Number(row[metric]) || 0,
                })).sort((a, b) => b.value - a.value).slice(0, 10);
                const maxValue = Math.max(1, ...rows.map(row => Math.abs(row.value)));
                return (
                  <div key={metric} className="space-y-3">
                    <h4 className="text-sm font-semibold capitalize text-slate-700">{metric.replace(/_/g, ' ')}</h4>
                    {rows.map(row => (
                      <div key={row.id}>
                        <div className="mb-1 flex justify-between gap-3 text-xs">
                          <span className="truncate text-slate-600">{row.label}</span>
                          <span className="shrink-0 font-semibold text-slate-900">{row.value.toLocaleString()}</span>
                        </div>
                        <ProgressBar value={Math.abs(row.value)} max={maxValue} color={metricIndex === 0 ? 'bg-[#EE3A25]' : metricIndex === 1 ? 'bg-blue-500' : 'bg-emerald-500'} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-4 text-right text-[11px] text-slate-400">Fonte: view_indicator_statistics · atualização em tempo real e a cada 30 s</p>
        </CardContent>
      </Card>}

      {/* Project status summary */}
      {metricIsVisible('project_status') && <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Estado dos projetos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ProjectStatusBox label="Planned" count={stats.plannedCount} icon={AlertCircle} color="slate" />
            <ProjectStatusBox label="Ongoing" count={stats.ongoingCount} icon={ActivityIcon} color="blue" />
            <ProjectStatusBox label="Delayed" count={stats.delayedCount} icon={AlertCircle} color="amber" />
            <ProjectStatusBox label="Completed" count={stats.completedCount} icon={CheckCircle2} color="emerald" />
          </div>
        </CardContent>
      </Card>}
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, color, bg
}: {
  icon: typeof Users; label: string; value: string; sub: string; color: string; bg: string;
}) {
  return (
    <Card className="dashboard-card hover:shadow-md transition-shadow">
      <CardContent className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectStatusBox({
  label, count, icon: Icon, color
}: {
  label: string; count: number; icon: typeof Users; color: 'slate' | 'blue' | 'amber' | 'emerald';
}) {
  const colors = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <div className={`rounded-xl border p-4 text-center ${colors[color]}`}>
      <Icon className="w-5 h-5 mx-auto mb-2" />
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
