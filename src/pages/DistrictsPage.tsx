import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useRealtimeTable } from '@/lib/useRealtimeTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { District } from '@/types';
import { Pencil, Trash2, MapPin } from 'lucide-react';

export function DistrictsPage() {
  const { data: districts, loading, reload } = useRealtimeTable<District>('districts', {
    orderBy: { column: 'name', ascending: true },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<District | null>(null);
  const [form, setForm] = useState({ name: '', province: '' });

  const canUpdate = true;
  const canDelete = true;

  function openEdit(d: District) {
    setEditing(d);
    setForm({ name: d.name, province: d.province ?? '' });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = { name: form.name, province: form.province || null };
    const { error } = await supabase.from('districts').update(payload).eq('id', editing.id);
    if (error) { alert('Error updating district: ' + error.message); return; }
    setModalOpen(false);
    reload();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this district? Related data may be affected.')) return;
    const { error } = await supabase.from('districts').delete().eq('id', id);
    if (error) { alert('Error deleting district: ' + error.message); return; }
    reload();
  }

  if (loading) return <div className="flex justify-center h-64"><div className="w-8 h-8 border-2 border-[#EE3A25] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{districts.length} districts (strata)</p>
          <p className="mt-1 text-xs text-slate-400">Novos distritos são adicionados através da abrangência geográfica de um projeto.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {districts.map(d => (
          <Card key={d.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EE3A25]/8 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#EE3A25]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900">{d.name}</h3>
                <p className="text-sm text-slate-500">{d.province ?? '—'}</p>
              </div>
              {(canUpdate || canDelete) && (
                <div className="flex gap-1">
                  {canUpdate && <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
                  {canDelete && <button onClick={() => handleDelete(d.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {districts.length === 0 && <Card className="col-span-full"><CardContent className="text-center py-12 text-slate-400">No districts yet.</CardContent></Card>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Edit District">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="District Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="Province" value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} placeholder="e.g. Zambézia" />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
