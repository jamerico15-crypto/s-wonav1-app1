import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, ProgressBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { STATUS_COLORS, PROJECT_STATUS_OPTIONS, CURRENCIES, PROVINCE_NAMES, formatMZN, formatCurrency, convertToMZN } from '@/lib/constants';
import type { Project, District, Activity } from '@/types';
import { Plus, Pencil, Trash2, Eye, DollarSign, MapPin, TrendingUp, X } from 'lucide-react';

interface ProjectForm {
  title: string;
  description: string;
  objectives: string;
  inputs: string;
  target_indicators: string;
  outcomes: string;
  budget: string;
  budget_spent: string;
  currency: string;
  exchange_rate: string;
  province: string;
  status: string;
  phase: string;
  start_date: string;
  end_date: string;
  district_ids: string[];
  selected_district_id: string;
}

const EMPTY_FORM: ProjectForm = {
  title: '', description: '', objectives: '', inputs: '', target_indicators: '',
  outcomes: '', budget: '0', budget_spent: '0', currency: 'MZN', exchange_rate: '1',
  province: '', status: 'planned', phase: '', start_date: '', end_date: '', district_ids: [],
  selected_district_id: '',
};

export function ProjectsPage() {
  const { data: projects, loading: loadingProjects, reload: reloadProjects } = useRealtimeTable<Project>('projects', {
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: districts, loading: loadingDistricts } = useRealtimeTable<District>('districts', {
    orderBy: { column: 'name', ascending: true },
  });
  const loading = loadingProjects || loadingDistricts;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [detailActivities, setDetailActivities] = useState<Activity[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [geographyError, setGeographyError] = useState('');

  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setGeographyError('');
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setForm({
      title: p.title,
      description: p.description ?? '',
      objectives: p.objectives ?? '',
      inputs: p.inputs ?? '',
      target_indicators: p.target_indicators ?? '',
      outcomes: p.outcomes ?? '',
      budget: String(p.budget ?? 0),
      budget_spent: String(p.budget_spent ?? 0),
      currency: p.currency ?? 'MZN',
      exchange_rate: String(p.exchange_rate ?? 1),
      province: p.province ?? '',
      status: p.status,
      phase: p.phase ?? '',
      start_date: p.start_date ?? '',
      end_date: p.end_date ?? '',
      district_ids: p.district_ids ?? [],
      selected_district_id: '',
    });
    setGeographyError('');
    setEditingId(p.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.province) {
      setGeographyError('Selecione uma província para definir a abrangência geográfica.');
      return;
    }
    if (form.district_ids.length === 0) {
      setGeographyError('Adicione pelo menos um distrito à abrangência do projeto.');
      return;
    }

    setSaving(true);
    setGeographyError('');
    const budgetNum = parseFloat(form.budget) || 0;
    const exchangeRateNum = parseFloat(form.exchange_rate) || 1;
    const budgetMzn = convertToMZN(budgetNum, form.currency, exchangeRateNum);

    const payload = {
      title: form.title,
      description: form.description || null,
      objectives: form.objectives || null,
      inputs: form.inputs || null,
      target_indicators: form.target_indicators || null,
      outcomes: form.outcomes || null,
      budget: budgetNum,
      budget_spent: parseFloat(form.budget_spent) || 0,
      budget_mzn: budgetMzn,
      currency: form.currency,
      exchange_rate: exchangeRateNum,
      province: form.province || null,
      status: form.status,
      phase: form.phase || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };

    let projectId = editingId;
    let createdProject = false;
    try {
      if (projectId) {
        const { error } = await supabase.from('projects').update(payload).eq('id', projectId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({ ...payload, district_ids: [] })
          .select('id')
          .single();
        if (error) throw error;
        projectId = data.id;
        createdProject = true;
      }

      const districtIds: string[] = [];
      for (const districtId of form.district_ids) {
        const district = districts.find(candidate => candidate.id === districtId);
        if (!district || district.province !== form.province) {
          throw new Error('Um dos distritos selecionados não pertence à província do projeto.');
        }
        const { data: resolvedDistrictId, error: linkError } = await supabase.rpc('add_project_district', {
          p_project_id: projectId,
          p_district_name: district.name,
          p_province: form.province,
        });
        if (linkError) throw linkError;
        if (!resolvedDistrictId) throw new Error(`Não foi possível associar o distrito ${district.name} ao projeto.`);
        districtIds.push(resolvedDistrictId);
      }

      const { data: currentLinks, error: linksError } = await supabase
        .from('project_districts')
        .select('id, district_id')
        .eq('project_id', projectId);
      if (linksError) throw linksError;
      const selectedDistrictIdSet = new Set(districtIds);
      const linksToRemove = (currentLinks ?? []).filter(link => !selectedDistrictIdSet.has(link.district_id));
      for (const link of linksToRemove) {
        const { error: removeError } = await supabase.from('project_districts').delete().eq('id', link.id);
        if (removeError) throw removeError;
      }

      const { error: syncError } = await supabase
        .from('projects')
        .update({ district_ids: districtIds })
        .eq('id', projectId);
      if (syncError) throw syncError;

      setModalOpen(false);
      reloadProjects();
    } catch (error) {
      // Remove a newly created project only if no district has been linked yet.
      // Once links exist, leave the project available to edit and complete safely.
      if (createdProject && projectId) {
        const { count } = await supabase
          .from('project_districts')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', projectId);
        if (!count) {
          await supabase.from('projects').delete().eq('id', projectId);
        } else {
          reloadProjects();
        }
      }
      const message = error instanceof Error ? error.message : 'Não foi possível guardar o projeto e os distritos.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? This will also remove related indicators and activities.')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { alert('Error deleting project: ' + error.message); return; }
    reloadProjects();
  };

  const viewDetails = async (p: Project) => {
    setSelectedProject(p);
    setDetailLoading(true);
    const { data: acts } = await supabase
      .from('activities')
      .select('*')
      .eq('project_id', p.id)
      .order('created_at', { ascending: false });
    setDetailActivities(acts as Activity[] ?? []);
    setDetailLoading(false);
  };

  const availableDistricts = form.province
    ? districts.filter(district => district.province === form.province)
    : [];

  const addDistrictToProject = () => {
    if (!form.selected_district_id || form.district_ids.includes(form.selected_district_id)) return;
    setForm(current => ({
      ...current,
      district_ids: [...current.district_ids, current.selected_district_id],
      selected_district_id: '',
    }));
    setGeographyError('');
  };

  const selectedDistrictLabels = form.district_ids.map(id => ({
    id,
    name: districts.find(district => district.id === id)?.name ?? 'Distrito',
  }));

  const computeRemaining = (p: Project, acts: Activity[]): number => {
    const totalBudgetMzn = p.currency === 'MZN' ? p.budget : p.budget * (p.exchange_rate ?? 1);
    const activityBudgetsMzn = acts.reduce((sum, a) => {
      return sum + (a.budget ?? 0);
    }, 0);
    return totalBudgetMzn - activityBudgetsMzn;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Projects</h2>
          <p className="text-sm text-slate-500">{projects.length} project(s) registered</p>
        </div>
        {canCreate && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Project</Button>}
      </div>

      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => {
          const statusStyle = STATUS_COLORS[p.status] ?? STATUS_COLORS.planned;
          const budgetMzn = p.budget_mzn ?? convertToMZN(p.budget, p.currency, p.exchange_rate);
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{p.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge status={p.status} />
                      {p.currency !== 'MZN' && (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          {p.currency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canUpdate && <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4 text-slate-500" /></button>}
                    {canDelete && <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {p.province && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-600">{p.province}, Moçambique</span>
                  </div>
                )}
                {p.description && <p className="text-sm text-slate-600 line-clamp-2 mb-3">{p.description}</p>}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Budget</span>
                    <span className="font-semibold text-slate-800">{formatMZN(budgetMzn)}</span>
                  </div>
                  <ProgressBar value={p.budget_spent ? (p.budget_spent / p.budget) * 100 : 0} />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Spent: {formatCurrency(p.budget_spent, p.currency)}</span>
                    <ProgressBadge value={p.budget_spent && p.budget ? (p.budget_spent / p.budget) * 100 : 0} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => viewDetails(p)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Project' : 'Create Project'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Project Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. OLIKANASSA" />

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin className="h-4 w-4 text-[#EE3A25]" /> Abrangência Geográfica</h3>
              <p className="mt-1 text-xs text-slate-500">Selecione uma província, escolha cada distrito e adicione apenas os abrangidos pelo projeto.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Província"
                required
                value={form.province}
                onChange={(e) => {
                  setForm(current => ({
                    ...current,
                    province: e.target.value,
                    district_ids: [],
                    selected_district_id: '',
                  }));
                  setGeographyError('');
                }}
              >
                <option value="">Selecione a província...</option>
                {PROVINCE_NAMES.map((prov) => <option key={prov} value={prov}>{prov}</option>)}
              </Select>
              <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PROJECT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_COLORS[s].label}</option>)}
              </Select>
            </div>

            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1">
                <Select
                  label="Distrito"
                  value={form.selected_district_id}
                  disabled={!form.province || availableDistricts.length === 0}
                  onChange={e => setForm(current => ({ ...current, selected_district_id: e.target.value }))}
                >
                  <option value="">{form.province ? 'Selecione um distrito...' : 'Selecione primeiro uma província...'}</option>
                  {availableDistricts.map(district => (
                    <option key={district.id} value={district.id} disabled={form.district_ids.includes(district.id)}>
                      {district.name}{form.district_ids.includes(district.id) ? ' (adicionado)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="outline" disabled={!form.selected_district_id} onClick={addDistrictToProject}>
                <Plus className="h-4 w-4" /> Adicionar à lista do projeto
              </Button>
            </div>

            {selectedDistrictLabels.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Distritos selecionados para o projeto">
                {selectedDistrictLabels.map(district => (
                  <li key={district.id} className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                    <MapPin className="h-3.5 w-3.5 text-rose-600" /> {district.name}
                    <button
                      type="button"
                      aria-label={`Remover ${district.name} da abrangência`}
                      title="Remover da abrangência do projeto"
                      onClick={() => setForm(current => ({
                        ...current,
                        district_ids: current.district_ids.filter(id => id !== district.id),
                      }))}
                      className="rounded-full p-0.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-500">Ainda não há distritos na lista deste projeto.</p>
            )}
            {geographyError && <p role="alert" className="text-xs font-medium text-rose-700">{geographyError}</p>}
          </section>

          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

          {/* Budget section */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Total Allocated Budget</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Amount" type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} required />
              <Select label="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value, exchange_rate: e.target.value === 'MZN' ? '1' : form.exchange_rate })}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </Select>
              {form.currency !== 'MZN' && (
                <Input label="Exchange Rate (to MZN)" type="number" step="0.0001" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} required placeholder="e.g. 63.5" />
              )}
            </div>
            {form.currency !== 'MZN' && (
              <div className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Equivalent in MZN: <strong>{formatMZN(convertToMZN(parseFloat(form.budget) || 0, form.currency, parseFloat(form.exchange_rate) || 1))}</strong>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} placeholder="e.g. Phase 1" />
            <Input label="Budget Spent" type="number" step="0.01" value={form.budget_spent} onChange={(e) => setForm({ ...form, budget_spent: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>

          <Textarea label="Objectives" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={2} />
          <Textarea label="Inputs" value={form.inputs} onChange={(e) => setForm({ ...form, inputs: e.target.value })} rows={2} />
          <Textarea label="Target Indicators" value={form.target_indicators} onChange={(e) => setForm({ ...form, target_indicators: e.target.value })} rows={2} />
          <Textarea label="Outcomes" value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} rows={2} />

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'A guardar…' : `${editingId ? 'Update' : 'Create'} Project`}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!selectedProject} onClose={() => setSelectedProject(null)} title={selectedProject?.title ?? ''} size="xl">
        {selectedProject && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Status</p>
                <Badge status={selectedProject.status} />
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Province</p>
                <p className="text-sm font-medium text-slate-800">{selectedProject.province ?? '—'}, Moçambique</p>
              </div>
            </div>

            {/* Budget breakdown */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Budget Allocation
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Total Budget (MZN)</p>
                  <p className="font-bold text-slate-800">{formatMZN(selectedProject.budget_mzn ?? convertToMZN(selectedProject.budget, selectedProject.currency, selectedProject.exchange_rate))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Activity Allocations</p>
                  <p className="font-bold text-blue-600">{formatMZN(detailActivities.reduce((s, a) => s + (a.budget ?? 0), 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Remanescente (Remaining)</p>
                  <p className="font-bold text-emerald-600">
                    {formatMZN(
                      computeRemaining(selectedProject, detailActivities)
                    )}
                  </p>
                </div>
              </div>
              <ProgressBar
                value={detailActivities.length > 0
                  ? (detailActivities.reduce((s, a) => s + (a.budget ?? 0), 0) / (selectedProject.budget_mzn ?? convertToMZN(selectedProject.budget, selectedProject.currency, selectedProject.exchange_rate))) * 100
                  : 0
                }
              />
            </div>

            {selectedProject.objectives && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-1">Objectives</h4>
                <p className="text-sm text-slate-600">{selectedProject.objectives}</p>
              </div>
            )}

            {/* Activities with budgets */}
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Activities & Budgets</h4>
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detailActivities.length > 0 ? (
                <div className="space-y-2">
                  {detailActivities.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge status={a.status} />
                          <span className="text-xs text-slate-500">{formatMZN(a.budget ?? 0)}</span>
                        </div>
                      </div>
                      <ProgressBadge value={a.progress} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No activities yet. Add activities from the Activities page.</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
