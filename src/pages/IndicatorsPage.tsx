import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ProgressBadge } from '@/components/ui/Badge';
import { INDICATOR_CATEGORIES, DISAGGREGATION_TYPES } from '@/lib/constants';
import type { Indicator, Project } from '@/types';
import { LoaderCircle, Plus, Pencil, Trash2, Target } from 'lucide-react';

interface IndicatorForm {
  project_id: string;
  name: string;
  description: string;
  baseline_value: string;
  target_value: string;
  current_value: string;
  unit: string;
  disaggregation: string;
  category: string;
}

const EMPTY_FORM: IndicatorForm = {
  project_id: '', name: '', description: '', baseline_value: '0', target_value: '0',
  current_value: '0', unit: '', disaggregation: 'none', category: 'output',
};

export function IndicatorsPage() {
  const { data: indicators, loading: loadingInd, reload } = useRealtimeTable<Indicator>('indicators', {
    select: '*, project:projects(title)',
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: projects, loading: loadingProj } = useRealtimeTable<Project>('projects', {
    select: 'id, title',
    orderBy: { column: 'title', ascending: true },
  });
  const loading = loadingInd || loadingProj;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Indicator | null>(null);
  const [filterProject, setFilterProject] = useState('');
  const [form, setForm] = useState<IndicatorForm>(EMPTY_FORM);

  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, project_id: projects[0]?.id ?? '' });
    setModalOpen(true);
  }

  function openEdit(ind: Indicator) {
    setEditing(ind);
    setForm({
      project_id: ind.project_id, name: ind.name, description: ind.description ?? '',
      baseline_value: String(ind.baseline_value), target_value: String(ind.target_value),
      current_value: String(ind.current_value), unit: ind.unit ?? '', disaggregation: ind.disaggregation ?? 'none',
      category: ind.category,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      project_id: form.project_id,
      name: form.name,
      description: form.description || null,
      baseline_value: Number(form.baseline_value) || 0,
      target_value: Number(form.target_value) || 0,
      current_value: Number(form.current_value) || 0,
      unit: form.unit || null,
      disaggregation: form.disaggregation,
      category: form.category,
    };
    if (editing) {
      const { error } = await supabase.from('indicators').update(payload).eq('id', editing.id);
      if (error) { alert('Error updating indicator: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('indicators').insert(payload);
      if (error) { alert('Error creating indicator: ' + error.message); return; }
    }
    setModalOpen(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this indicator?')) return;
    const { error } = await supabase.from('indicators').delete().eq('id', id);
    if (error) { alert('Error deleting indicator: ' + error.message); return; }
    reload();
  }

  const filtered = filterProject ? indicators.filter(i => i.project_id === filterProject) : indicators;

  if (loading) return (
    <div className="flex min-h-64 items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-7 shadow-sm">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#EE3A25]" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">A carregar indicadores…</p>
        <p className="text-xs text-slate-500">Estamos a obter os dados mais recentes.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="max-w-xs">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
        {canCreate && <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Indicator</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(ind => {
          const pct = ind.target_value > 0 ? (ind.current_value / ind.target_value) * 100 : 0;
          const projectTitle = (ind as unknown as { project?: { title: string } }).project?.title ?? '';
          return (
            <Card key={ind.id} className="hover:shadow-md transition-shadow">
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#EE3A25]/8 flex items-center justify-center">
                      <Target className="w-5 h-5 text-[#EE3A25]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{ind.name}</h3>
                      <p className="text-xs text-slate-400">{projectTitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ProgressBadge value={Math.round(pct)} />
                    {(canUpdate || canDelete) && (
                      <div className="flex gap-1">
                        {canUpdate && <button onClick={() => openEdit(ind)} className="p-1 text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
                        {canDelete && <button onClick={() => handleDelete(ind.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    )}
                  </div>
                </div>

                {ind.description && <p className="text-sm text-slate-600">{ind.description}</p>}

                <div className="flex gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize">{ind.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 capitalize">{ind.disaggregation}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Baseline</p>
                    <p className="text-sm font-semibold text-slate-700">{ind.baseline_value}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Current</p>
                    <p className="text-sm font-semibold text-[#EE3A25]">{ind.current_value}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Target</p>
                    <p className="text-sm font-semibold text-slate-700">{ind.target_value}</p>
                  </div>
                </div>
                <ProgressBar value={pct} color={pct >= 100 ? 'bg-emerald-500' : 'bg-[#EE3A25]'} />
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <Card className="col-span-full"><CardContent className="text-center py-12 text-slate-400">No indicators found.</CardContent></Card>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Indicator' : 'New Indicator'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Project" required value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
            <option value="">Select project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Input label="Indicator Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Description" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Baseline" type="number" value={form.baseline_value} onChange={e => setForm({ ...form, baseline_value: e.target.value })} />
            <Input label="Current" type="number" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} />
            <Input label="Target" type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="cases, %, persons" />
            <Select label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {INDICATOR_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </Select>
            <Select label="Disaggregation" value={form.disaggregation} onChange={e => setForm({ ...form, disaggregation: e.target.value })}>
              {DISAGGREGATION_TYPES.map(d => <option key={d} value={d} className="capitalize">{d}</option>)}
            </Select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
