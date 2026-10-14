import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, ProgressBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { STATUS_COLORS, ACTIVITY_STATUS_OPTIONS, ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS, formatMZN } from '@/lib/constants';
import type { Activity, Project } from '@/types';
import { Plus, Pencil, Trash2, Flag, DollarSign } from 'lucide-react';

interface ActivityForm {
  project_id: string;
  title: string;
  description: string;
  activity_type: string;
  status: string;
  progress: string;
  budget: string;
  budget_spent: string;
  start_date: string;
  end_date: string;
  milestone: boolean;
}

const EMPTY_FORM: ActivityForm = {
  project_id: '', title: '', description: '', activity_type: 'other',
  status: 'planned', progress: '0', budget: '0', budget_spent: '0',
  start_date: '', end_date: '', milestone: false,
};

export function ActivitiesPage() {
  const { data: activities, loading: loadingAct, reload } = useRealtimeTable<Activity>('activities', {
    select: '*, project:projects(*)',
    orderBy: { column: 'created_at', ascending: false },
  });
  const { data: projects, loading: loadingProj } = useRealtimeTable<Project>('projects', {
    orderBy: { column: 'title', ascending: true },
  });
  const loading = loadingAct || loadingProj;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM);
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, project_id: projects[0]?.id ?? '' });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (a: Activity) => {
    setForm({
      project_id: a.project_id,
      title: a.title,
      description: a.description ?? '',
      activity_type: a.activity_type ?? 'other',
      status: a.status,
      progress: String(a.progress),
      budget: String(a.budget ?? 0),
      budget_spent: String(a.budget_spent ?? 0),
      start_date: a.start_date ?? '',
      end_date: a.end_date ?? '',
      milestone: a.milestone,
    });
    setEditingId(a.id);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      project_id: form.project_id,
      title: form.title,
      description: form.description || null,
      activity_type: form.activity_type,
      status: form.status,
      progress: Math.min(100, Math.max(0, parseInt(form.progress) || 0)),
      budget: parseFloat(form.budget) || 0,
      budget_spent: parseFloat(form.budget_spent) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      milestone: form.milestone,
    };
    if (editingId) {
      const { error } = await supabase.from('activities').update(payload).eq('id', editingId);
      if (error) { alert('Error updating activity: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('activities').insert(payload);
      if (error) { alert('Error creating activity: ' + error.message); return; }
    }
    setModalOpen(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this activity?')) return;
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) { alert('Error deleting activity: ' + error.message); return; }
    reload();
  };

  const filtered = activities.filter((a) => {
    if (filterProject !== 'all' && a.project_id !== filterProject) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterType !== 'all' && (a.activity_type ?? 'other') !== filterType) return false;
    return true;
  });

  const projectTitle = (id: string) => projects.find((p) => p.id === id)?.title ?? 'Unknown';

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
          <h2 className="text-xl font-bold text-slate-900">Activities</h2>
          <p className="text-sm text-slate-500">{filtered.length} of {activities.length} activity(s)</p>
        </div>
        {canCreate && <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Activity</Button>}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-3">
        <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </Select>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {ACTIVITY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_COLORS[s].label}</option>)}
        </Select>
        <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </Select>
      </div>

      {/* Activity cards */}
      <div className="space-y-3">
        {filtered.map((a) => (
          <Card key={a.id} className="hover:shadow-md transition-shadow">
            <CardContent>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 truncate">{a.title}</h3>
                    {a.milestone && <Flag className="w-4 h-4 text-amber-500 fill-current flex-shrink-0" />}
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    <span className="text-slate-500">{projectTitle(a.project_id)}</span>
                    <Badge status={a.status} />
                    <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {ACTIVITY_TYPE_LABELS[a.activity_type ?? 'other'] ?? 'Other'}
                    </span>
                  </div>
                  {(a.budget ?? 0) > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Budget: {formatMZN(a.budget ?? 0)}</span>
                      <span className="text-slate-400">|</span>
                      <span>Spent: {formatMZN(a.budget_spent ?? 0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    {canUpdate && <button onClick={() => openEdit(a)} className="p-1.5 hover:bg-slate-100 rounded-lg"><Pencil className="w-4 h-4 text-slate-500" /></button>}
                    {canDelete && <button onClick={() => handleDelete(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>}
                  </div>
                  <div className="w-28">
                    <ProgressBar value={a.progress} />
                    <div className="text-right mt-1"><ProgressBadge value={a.progress} /></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Activity' : 'Create Activity'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Project" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} required>
            <option value="">Select project...</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>

          <Input label="Activity Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Community screening campaign" />

          <Select label="Type of Activity" value={form.activity_type} onChange={(e) => setForm({ ...form, activity_type: e.target.value })} required>
            {ACTIVITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>

          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {ACTIVITY_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_COLORS[s].label}</option>)}
            </Select>
            <Input label="Progress (%)" type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} required />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Activity Budget (MZN)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Allocated Budget" type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              <Input label="Budget Spent" type="number" step="0.01" value={form.budget_spent} onChange={(e) => setForm({ ...form, budget_spent: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.milestone} onChange={(e) => setForm({ ...form, milestone: e.target.checked })} className="rounded border-slate-300" />
            <Flag className="w-4 h-4 text-amber-500" /> Mark as milestone
          </label>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingId ? 'Update' : 'Create'} Activity</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
