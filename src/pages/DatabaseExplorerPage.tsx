import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Database, Table2, Key, Link2, RefreshCw, Pencil, Save, X } from 'lucide-react';

interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
  foreign_keys: FKInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  is_primary: boolean;
}

interface FKInfo {
  column: string;
  references_table: string;
  references_column: string;
}

export function DatabaseExplorerPage() {
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const canUpdate = true;
  const canDelete = true;

  const loadSchema = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_project_schema');
    if (error) {
      console.error('Schema load error:', error.message);
      setSchema([]);
    } else {
      setSchema((data as TableInfo[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSchema(); }, [loadSchema]);

  const loadRows = useCallback(async (tableName: string) => {
    setRowsLoading(true);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(100)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Row load error:', error.message);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setRowsLoading(false);
  }, []);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    loadRows(tableName);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditingRow(row);
    const form: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key === 'created_at' || key === 'id') return;
      form[key] = value === null ? '' : String(value);
    });
    setEditForm(form);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTable || !editingRow) return;
    const payload: Record<string, unknown> = {};
    Object.entries(editForm).forEach(([key, value]) => {
      const col = schema.find((t) => t.table_name === selectedTable)?.columns.find((c) => c.name === key);
      if (!col) return;
      if (value === '') {
        payload[key] = null;
      } else if (col.type.includes('int') || col.type.includes('numeric')) {
        payload[key] = parseFloat(value) || 0;
      } else if (col.type.includes('bool')) {
        payload[key] = value === 'true';
      } else {
        payload[key] = value;
      }
    });

    const rowId = editingRow.id as string;
    const { error } = await supabase.from(selectedTable).update(payload).eq('id', rowId);
    if (error) { alert('Error updating row: ' + error.message); return; }
    setEditModalOpen(false);
    loadRows(selectedTable);
  };

  const handleDeleteRow = async (row: Record<string, unknown>) => {
    if (!selectedTable) return;
    if (!confirm('Delete this row? This cannot be undone.')) return;
    const rowId = row.id as string;
    const { error } = await supabase.from(selectedTable).delete().eq('id', rowId);
    if (error) { alert('Error deleting row: ' + error.message); return; }
    loadRows(selectedTable);
  };

  const currentTableInfo = schema.find((t) => t.table_name === selectedTable);
  const columnNames = rows.length > 0 ? Object.keys(rows[0]) : (currentTableInfo?.columns.map((c) => c.name) ?? []);

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
          <h2 className="text-xl font-bold text-slate-900">Database Explorer</h2>
          <p className="text-sm text-slate-500">{schema.length} tables in the public schema</p>
        </div>
        <Button variant="outline" onClick={loadSchema}><RefreshCw className="w-4 h-4 mr-1" /> Refresh Schema</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Table list */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Database className="w-4 h-4" /> Tables</CardTitle>
            </CardHeader>
            <CardContent className="p-2 max-h-96 overflow-y-auto">
              {schema.map((t) => (
                <button
                  key={t.table_name}
                  onClick={() => handleTableSelect(t.table_name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedTable === t.table_name ? 'bg-[#EE3A25]/10 text-[#EE3A25] font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Table2 className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{t.table_name}</span>
                  {(t.foreign_keys?.length ?? 0) > 0 && <Link2 className="w-3 h-3 text-blue-400 flex-shrink-0" />}
                </button>
              ))}
              {schema.length === 0 && <p className="text-sm text-slate-400 p-3">No tables found.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Table detail */}
        <div className="lg:col-span-3 space-y-4">
          {selectedTable && currentTableInfo ? (
            <>
              {/* Schema info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table2 className="w-4 h-4" /> {selectedTable}
                    <Badge status="ongoing" label={`${currentTableInfo.columns.length} columns`} />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentTableInfo.columns.map((col) => (
                      <div key={col.name} className="flex items-center gap-2 text-sm p-2 border border-slate-100 rounded-lg">
                        {col.is_primary ? (
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                        ) : (currentTableInfo.foreign_keys ?? []).some((fk) => fk.column === col.name) ? (
                          <Link2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                        )}
                        <span className="font-medium text-slate-700">{col.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{col.type}</span>
                        {!col.nullable && <span className="text-xs text-red-400">NOT NULL</span>}
                        {(currentTableInfo.foreign_keys ?? []).find((fk) => fk.column === col.name) && (
                          <span className="text-xs text-blue-500">→ {(currentTableInfo.foreign_keys ?? []).find((fk) => fk.column === col.name)?.references_table}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Data table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Table2 className="w-4 h-4" /> Data Rows ({rows.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {rowsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            {columnNames.map((col) => (
                              <th key={col} className="text-left px-3 py-2 font-medium text-slate-600 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                            {(canUpdate || canDelete) && <th className="px-3 py-2">Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                              {columnNames.map((col) => {
                                const val = row[col];
                                return (
                                  <td key={col} className="px-3 py-2 text-slate-700 whitespace-nowrap max-w-xs truncate">
                                    {val === null ? <span className="text-slate-300 italic">null</span> : String(val)}
                                  </td>
                                );
                              })}
                              {(canUpdate || canDelete) && (
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    {canUpdate && <button onClick={() => openEdit(row)} className="p-1 hover:bg-slate-100 rounded"><Pencil className="w-3.5 h-3.5 text-slate-500" /></button>}
                                    {canDelete && <button onClick={() => handleDeleteRow(row)} className="p-1 hover:bg-red-50 rounded"><X className="w-3.5 h-3.5 text-red-500" /></button>}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No rows in this table.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Database className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-400">Select a table from the left to view its schema and data.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Row Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit Row: ${selectedTable ?? ''}`} size="lg">
        <div className="space-y-3">
          {Object.entries(editForm).map(([key, value]) => {
            const col = currentTableInfo?.columns.find((c) => c.name === key);
            const isNumeric = col?.type.includes('int') || col?.type.includes('numeric');
            return (
              <div key={key}>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  {key} <span className="text-xs text-slate-400">({col?.type})</span>
                </label>
                {col?.type.includes('text') && col.type !== 'text' ? (
                  <Textarea value={value} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })} rows={2} />
                ) : (
                  <Input
                    type={isNumeric ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  />
                )}
              </div>
            );
          })}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}><Save className="w-4 h-4 mr-1" /> Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
