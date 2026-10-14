import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Beneficiary, Project, District, ProjectDistrict } from '@/types';
import { LoaderCircle, Plus, Pencil, Trash2, Users, Download } from 'lucide-react';

interface BeneficiaryForm {
  project_id: string;
  province: string;
  district_id: string;
  total_reached: string;
  male: string;
  female: string;
  disability_grade1: string;
  disability_grade2: string;
  age_group: string;
  date_recorded: string;
}

const EMPTY_FORM: BeneficiaryForm = {
  project_id: '', province: '', district_id: '', total_reached: '0', male: '0', female: '0',
  disability_grade1: '0', disability_grade2: '0', age_group: 'all-ages', date_recorded: '',
};

export function BeneficiariesPage() {
  const { data: beneficiaries, loading: loadingBen, reload } = useRealtimeTable<Beneficiary>('beneficiaries', {
    select: '*, project:projects(title), district:districts(name, province)',
    orderBy: { column: 'date_recorded', ascending: false },
  });
  const { data: projects, loading: loadingProj } = useRealtimeTable<Project>('projects', {
    select: 'id, title',
    orderBy: { column: 'title', ascending: true },
  });
  const { data: districts, loading: loadingDist } = useRealtimeTable<District>('districts', {
    orderBy: { column: 'name', ascending: true },
  });
  const { data: projectDistricts, loading: loadingProjectDistricts } = useRealtimeTable<ProjectDistrict>('project_districts');
  const loading = loadingBen || loadingProj || loadingDist || loadingProjectDistricts;
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [filterProject, setFilterProject] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [form, setForm] = useState<BeneficiaryForm>(EMPTY_FORM);

  const linkedDistrictIds = new Set(projectDistricts
    .filter(link => link.project_id === form.project_id)
    .map(link => link.district_id));
  const projectDistrictOptions = districts.filter(district => linkedDistrictIds.has(district.id));
  const provinces = [...new Set(projectDistrictOptions
    .map(district => district.province)
    .filter((province): province is string => Boolean(province)))].sort((a, b) => a.localeCompare(b));
  const provinceDistricts = projectDistrictOptions.filter(district => district.province === form.province);

  const canCreate = true;
  const canUpdate = true;
  const canDelete = true;

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date_recorded: new Date().toISOString().slice(0, 10) });
    setModalOpen(true);
  }

  function openEdit(b: Beneficiary) {
    setEditing(b);
    const province = districts.find(district => district.id === b.district_id)?.province ?? '';
    setForm({
      project_id: b.project_id, province, district_id: province ? b.district_id : '',
      total_reached: String(b.total_reached), male: String(b.male), female: String(b.female),
      disability_grade1: String(b.disability_grade1), disability_grade2: String(b.disability_grade2),
      age_group: b.age_group ?? 'all-ages', date_recorded: b.date_recorded,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const selectedDistrict = districts.find(district => district.id === form.district_id);
    const districtIsLinkedToProject = projectDistricts.some(link =>
      link.project_id === form.project_id && link.district_id === form.district_id,
    );
    if (!selectedDistrict || selectedDistrict.province !== form.province || !districtIsLinkedToProject) {
      alert('Select a district that belongs to the selected project and province.');
      return;
    }
    const payload = {
      project_id: form.project_id, district_id: form.district_id,
      total_reached: Number(form.total_reached) || 0, male: Number(form.male) || 0,
      female: Number(form.female) || 0, disability_grade1: Number(form.disability_grade1) || 0,
      disability_grade2: Number(form.disability_grade2) || 0, age_group: form.age_group,
      date_recorded: form.date_recorded,
    };
    if (editing) {
      const { error } = await supabase.from('beneficiaries').update(payload).eq('id', editing.id);
      if (error) { alert('Error updating beneficiary: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('beneficiaries').insert(payload);
      if (error) { alert('Error creating beneficiary: ' + error.message); return; }
    }
    setModalOpen(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this record?')) return;
    const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
    if (error) { alert('Error deleting beneficiary: ' + error.message); return; }
    reload();
  }

  function exportCsv() {
    const rows = [
      ['Project', 'District', 'Total', 'Male', 'Female', 'G1', 'G2', 'Age Group', 'Date'],
      ...filtered.map(b => [
        (b as unknown as { project?: { title: string } }).project?.title ?? '',
        (b as unknown as { district?: { name: string } }).district?.name ?? '',
        b.total_reached, b.male, b.female, b.disability_grade1, b.disability_grade2,
        b.age_group ?? '', b.date_recorded,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'beneficiaries.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = beneficiaries.filter(b =>
    (!filterProject || b.project_id === filterProject) &&
    (!filterDistrict || b.district_id === filterDistrict)
  );

  const totals = filtered.reduce((acc, b) => ({
    total: acc.total + b.total_reached, male: acc.male + b.male,
    female: acc.female + b.female, g1: acc.g1 + b.disability_grade1, g2: acc.g2 + b.disability_grade2,
  }), { total: 0, male: 0, female: 0, g1: 0, g2: 0 });

  if (loading) return (
    <div className="flex min-h-64 items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-8 py-7 shadow-sm">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#EE3A25]" aria-hidden="true" />
        <p className="text-sm font-medium text-slate-700">A carregar beneficiários…</p>
        <p className="text-xs text-slate-500">Estamos a obter os dados mais recentes.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <Select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="max-w-xs">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)} className="max-w-[160px]">
            <option value="">All Districts</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}><Download className="w-4 h-4" /> Export</Button>
          {canCreate && <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Record</Button>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: totals.total, color: 'text-slate-900' },
          { label: 'Male', value: totals.male, color: 'text-blue-600' },
          { label: 'Female', value: totals.female, color: 'text-[#711246]' },
          { label: 'Grade-1', value: totals.g1, color: 'text-amber-600' },
          { label: 'Grade-2', value: totals.g2, color: 'text-red-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">District</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Male</th>
                  <th className="px-4 py-3 font-medium text-right">Female</th>
                  <th className="px-4 py-3 font-medium text-right">G1</th>
                  <th className="px-4 py-3 font-medium text-right">G2</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{(b as unknown as { project?: { title: string } }).project?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{(b as unknown as { district?: { name: string } }).district?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{b.total_reached.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{b.male}</td>
                    <td className="px-4 py-3 text-right text-[#711246]">{b.female}</td>
                    <td className="px-4 py-3 text-right text-amber-600">{b.disability_grade1}</td>
                    <td className="px-4 py-3 text-right text-red-600">{b.disability_grade2}</td>
                    <td className="px-4 py-3 text-slate-500">{b.date_recorded}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {canUpdate && <button onClick={() => openEdit(b)} className="p-1 text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
                        {canDelete && <button onClick={() => handleDelete(b.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Record' : 'New Beneficiary Record'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Project" required value={form.project_id} onChange={e => setForm(current => ({ ...current, project_id: e.target.value, province: '', district_id: '' }))}>
            <option value="">Select project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
          <Select label="Province" required disabled={!form.project_id} value={form.province} onChange={e => setForm(current => ({ ...current, province: e.target.value, district_id: '' }))}>
            <option value="">Select province...</option>
            {provinces.map(province => <option key={province} value={province}>{province}</option>)}
          </Select>
          <Select
            label="District"
            required
            disabled={!form.project_id || !form.province || loadingDist || loadingProjectDistricts}
            value={form.district_id}
            onChange={e => setForm(current => ({ ...current, district_id: e.target.value }))}
          >
            <option value="">{!form.project_id ? 'Select a project first...' : !form.province ? 'Select a province first...' : 'Select district...'}</option>
            {provinceDistricts.map(district => <option key={district.id} value={district.id}>{district.name}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Total Reached" type="number" value={form.total_reached} onChange={e => setForm({ ...form, total_reached: e.target.value })} />
            <Input label="Male" type="number" value={form.male} onChange={e => setForm({ ...form, male: e.target.value })} />
            <Input label="Female" type="number" value={form.female} onChange={e => setForm({ ...form, female: e.target.value })} />
            <Input label="Disability G1" type="number" value={form.disability_grade1} onChange={e => setForm({ ...form, disability_grade1: e.target.value })} />
            <Input label="Disability G2" type="number" value={form.disability_grade2} onChange={e => setForm({ ...form, disability_grade2: e.target.value })} />
            <Input label="Date" type="date" value={form.date_recorded} onChange={e => setForm({ ...form, date_recorded: e.target.value })} />
          </div>
          <Input label="Age Group" value={form.age_group} onChange={e => setForm({ ...form, age_group: e.target.value })} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
