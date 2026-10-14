import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { KoboConnection, KoboFormConfig, KoboImport, KoboUniversalSubmission } from '@/types';
import { Cloud, Plus, Trash2, RefreshCw, Zap, ArrowRight, CheckCircle2, AlertCircle, FileDown, Database } from 'lucide-react';

interface KoboForm {
  id: string;
  name: string;
  fields: KoboFormField[];
  rawSchema: Record<string, unknown>;
}

interface KoboFormField {
  name: string;
  type: string;
  label: string;
}

interface ConnectionForm {
  name: string;
  api_url: string;
  api_token: string;
  username: string;
}

export function KoboToolboxPage() {
  const [connections, setConnections] = useState<KoboConnection[]>([]);
  const [imports, setImports] = useState<KoboImport[]>([]);
  const [formConfigs, setFormConfigs] = useState<KoboFormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ConnectionForm>({ name: '', api_url: '', api_token: '', username: '' });
  const [selectedConn, setSelectedConn] = useState<string>('all');
  const [fetchingForms, setFetchingForms] = useState(false);
  const [availableForms, setAvailableForms] = useState<KoboForm[]>([]);
  const [formFetchError, setFormFetchError] = useState<string | null>(null);
  const [mappingForm, setMappingForm] = useState<KoboForm | null>(null);
  const [selectedFormConfigId, setSelectedFormConfigId] = useState('');
  const [submissions, setSubmissions] = useState<KoboUniversalSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [syncingFormConfigId, setSyncingFormConfigId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null);

  const canCreate = true;
  const canDelete = true;

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: conns }, { data: imps }, { data: configs }] = await Promise.all([
      supabase.from('kobo_connections').select('*').order('created_at', { ascending: false }),
      supabase.from('kobo_imports').select('*').order('created_at', { ascending: false }),
      supabase.from('kobo_forms_config').select('*').order('deployed_at', { ascending: false }),
    ]);
    setConnections(conns as KoboConnection[] ?? []);
    setImports(imps as KoboImport[] ?? []);
    const loadedConfigs = configs as KoboFormConfig[] ?? [];
    setFormConfigs(loadedConfigs);
    setSelectedFormConfigId(current => loadedConfigs.some(config => config.id === current) ? current : loadedConfigs[0]?.id ?? '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('kobo_connections').insert({
      name: form.name,
      api_url: form.api_url,
      api_token: form.api_token,
      username: form.username || null,
      is_active: true,
      created_by: null,
    });
    if (error) { alert('Error creating connection: ' + error.message); return; }
    setForm({ name: '', api_url: '', api_token: '', username: '' });
    setModalOpen(false);
    load();
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Delete this KoboToolbox connection?')) return;
    const { error } = await supabase.from('kobo_connections').delete().eq('id', id);
    if (error) { alert('Error deleting connection: ' + error.message); return; }
    load();
  };

  const handleFetchForms = async () => {
    const conn = connections.find((c) => c.id === selectedConn);
    if (!conn) return;
    setFetchingForms(true);
    setFormFetchError(null);
    setAvailableForms([]);
    const endpoint = '/api/kobo/api/v2/assets.json';

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${conn.api_token}`,
          'Accept': 'application/json',
        },
      });
      const responseBody = await response.text();

      if (!response.ok) {
        const responseDetails = responseBody.trim().slice(0, 1200) || '(empty response body)';
        throw new Error([
          `Request: GET ${endpoint}`,
          `HTTP ${response.status} ${response.statusText}`.trim(),
          `Kobo response: ${responseDetails}`,
          'Verify that the token is valid and has access to this KoboToolbox account.',
        ].join('\n'));
      }

      let data: { results?: Record<string, unknown>[] };
      try {
        data = JSON.parse(responseBody) as { results?: Record<string, unknown>[] };
      } catch {
        throw new Error(`Request: GET ${endpoint}\nThe server returned HTTP ${response.status}, but the response was not valid JSON. Response: ${responseBody.slice(0, 1200) || '(empty response body)'}`);
      }
      if (!Array.isArray(data.results)) {
        throw new Error(`Request: GET ${endpoint}\nUnexpected Kobo response: expected a JSON object with a "results" array. Response: ${responseBody.slice(0, 1200) || '(empty response body)'}`);
      }

      const forms = await Promise.all(data.results.map(async (asset: Record<string, unknown>) => {
        const id = String(asset.uid ?? asset.id ?? '');
        let schema = (asset.content ?? asset) as Record<string, unknown>;
        if (!Array.isArray(schema.survey) && id) {
          const detailResponse = await fetch(`/api/kobo/api/v2/assets/${encodeURIComponent(id)}.json`, {
            headers: { Authorization: `Token ${conn.api_token}`, Accept: 'application/json' },
          });
          if (!detailResponse.ok) {
            throw new Error(`Could not read structure for Kobo form ${id}: HTTP ${detailResponse.status} ${detailResponse.statusText}`);
          }
          const detail = await detailResponse.json() as Record<string, unknown>;
          schema = (detail.content ?? detail) as Record<string, unknown>;
        }
        return {
          id,
          name: String(asset.name ?? 'Unnamed Form'),
          fields: parseFormFields(schema),
          rawSchema: schema,
        } satisfies KoboForm;
      }));

      setAvailableForms(forms);
      if (forms.length === 0) {
        setFormFetchError(`Request succeeded (GET ${endpoint}), but Kobo returned no forms for connection "${conn.name}".`);
      }
    } catch (err) {
      const message = err instanceof Error
        ? `Falha ao obter formulários da ligação "${conn.name}".\n${err.message}`
        : `Falha desconhecida ao obter formulários via ${endpoint}.`;
      setFormFetchError(message);
    } finally {
      setFetchingForms(false);
    }
  };

  const parseFormFields = (content: Record<string, unknown> | undefined): KoboFormField[] => {
    if (!content) return [];
    const survey = content.survey as Array<Record<string, unknown>> | undefined;
    if (!survey) return [];
    return survey
      .filter((item) => item.type && item.type !== 'begin_group' && item.type !== 'end_group')
      .map((item) => ({
        name: String(item.name ?? item.$autoname ?? ''),
        type: String(item.type ?? 'text'),
        label: typeof item.label === 'string'
          ? item.label
          : String((item.label as Record<string, string> | undefined)?.English ?? item.name ?? ''),
      }));
  };

  const openMapping = (koboForm: KoboForm) => {
    setMappingForm(koboForm);
    setApplyResult(null);
  };

  const handleDeployForm = async () => {
    if (!mappingForm || selectedConn === 'all') return;
    setDeploying(true);
    setApplyResult(null);
    try {
      const { data, error } = await supabase.from('kobo_forms_config').upsert({
        connection_id: selectedConn,
        kobo_form_id: mappingForm.id,
        form_name: mappingForm.name,
        fields_schema: mappingForm.fields,
        is_active: true,
        deployed_at: new Date().toISOString(),
      }, { onConflict: 'connection_id,kobo_form_id' }).select('*').single();
      if (error) throw error;
      const deployedConfig = data as KoboFormConfig;
      setApplyResult({ success: true, message: `Formulário "${mappingForm.name}" publicado com ${mappingForm.fields.length} campos. Já pode sincronizar as submissões.` });
      setSelectedFormConfigId(deployedConfig.id);
      await load();
    } catch (error) {
      setApplyResult({
        success: false,
        message: error instanceof Error ? error.message : 'Falha ao guardar a configuração dinâmica do formulário.',
      });
    } finally {
      setDeploying(false);
    }
  };

  const syncFormSubmissions = async (config: KoboFormConfig) => {
    const connection = connections.find(candidate => candidate.id === config.connection_id);
    if (!connection) {
      setFormFetchError(`A ligação Kobo associada a "${config.form_name}" já não existe.`);
      return;
    }
    setSyncingFormConfigId(config.id);
    setFormFetchError(null);
    setSyncResult(null);
    const firstUrl = `/api/kobo/api/v2/assets/${encodeURIComponent(config.kobo_form_id)}/data.json`;
    let nextUrl: string | null = firstUrl;
    let syncedCount = 0;
    const visited = new Set<string>();

    try {
      while (nextUrl) {
        if (visited.has(nextUrl)) throw new Error(`Kobo pagination repeated the same URL: ${nextUrl}`);
        visited.add(nextUrl);
        const response = await fetch(nextUrl, {
          headers: { Authorization: `Token ${connection.api_token}`, Accept: 'application/json' },
        });
        const body = await response.text();
        if (!response.ok) {
          throw new Error(`GET ${nextUrl} returned HTTP ${response.status} ${response.statusText}. Response: ${body.slice(0, 1000) || '(empty)'}`);
        }
        const page = JSON.parse(body) as { results?: Record<string, unknown>[]; next?: string | null };
        if (!Array.isArray(page.results)) throw new Error(`Unexpected submissions response from ${nextUrl}: missing results[]`);

        const rows = page.results.map(submission => {
          const sourceId = submission._id ?? submission._uuid ?? submission['meta/instanceID'];
          if (sourceId === undefined || sourceId === null) {
            throw new Error(`Submission does not contain _id, _uuid or meta/instanceID: ${JSON.stringify(submission).slice(0, 500)}`);
          }
          const submittedAt = submission._submission_time;
          return {
            form_config_id: config.id,
            kobo_form_id: config.kobo_form_id,
            kobo_submission_id: String(sourceId),
            submitted_at: typeof submittedAt === 'string' ? submittedAt : null,
            answers: submission,
            synced_at: new Date().toISOString(),
          };
        });

        if (rows.length > 0) {
          const { error } = await supabase.from('kobo_universal_submissions').upsert(rows, {
            onConflict: 'form_config_id,kobo_submission_id',
          });
          if (error) throw new Error(`Supabase save failed: ${error.message}`);
          syncedCount += rows.length;
        }

        if (page.next) {
          const parsedNext = new URL(page.next, 'https://kf.kobotoolbox.org');
          if (parsedNext.hostname !== 'kf.kobotoolbox.org') {
            throw new Error(`Refusing Kobo pagination URL outside kf.kobotoolbox.org: ${parsedNext.hostname}`);
          }
          nextUrl = `/api/kobo${parsedNext.pathname}${parsedNext.search}`;
        } else {
          nextUrl = null;
        }
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase.from('kobo_forms_config').update({ last_synced_at: now }).eq('id', config.id);
      if (updateError) throw updateError;
      await supabase.from('kobo_connections').update({ last_synced_at: now }).eq('id', connection.id);
      setSyncResult({ success: true, message: `Sincronização concluída: ${syncedCount} submissão(ões) recebida(s) para "${config.form_name}".` });
      await load();
      setSelectedFormConfigId(config.id);
      await loadUniversalSubmissions(config.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida ao sincronizar submissões do KoboToolbox.';
      setSyncResult({ success: false, message });
      setFormFetchError(message);
    } finally {
      setSyncingFormConfigId(null);
    }
  };

  const loadUniversalSubmissions = async (configId: string) => {
    if (!configId) {
      setSubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    const { data, error } = await supabase
      .from('kobo_universal_submissions')
      .select('*')
      .eq('form_config_id', configId)
      .order('submitted_at', { ascending: false })
      .limit(200);
    if (error) setFormFetchError(`Não foi possível carregar as submissões: ${error.message}`);
    setSubmissions(data as KoboUniversalSubmission[] ?? []);
    setLoadingSubmissions(false);
  };

  useEffect(() => {
    void loadUniversalSubmissions(selectedFormConfigId);
  }, [selectedFormConfigId]);

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
          <h2 className="text-xl font-bold text-slate-900">KoboToolbox Hub</h2>
          <p className="text-sm text-slate-500">Synchronize field data from KoboToolbox forms</p>
        </div>
        {canCreate && <Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Connection</Button>}
      </div>

      {/* Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cloud className="w-4 h-4" /> Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {connections.length > 0 ? (
            <div className="space-y-2">
              {connections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${conn.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{conn.name}</p>
                      <p className="text-xs text-slate-400">{conn.api_url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={conn.is_active ? 'ongoing' : 'planned'} label={conn.is_active ? 'Active' : 'Inactive'} />
                    {canDelete && <button onClick={() => handleDeleteConnection(conn.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No connections yet. Create one to start syncing KoboToolbox data.</p>
          )}
        </CardContent>
      </Card>

      {/* Form Discovery & Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4" /> Descoberta e publicação dinâmica de formulários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Select label="Select Connection" value={selectedConn} onChange={(e) => setSelectedConn(e.target.value)}>
                <option value="all">Choose a connection...</option>
                {connections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <Button onClick={handleFetchForms} disabled={fetchingForms || selectedConn === 'all'}>
              {fetchingForms ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Fetch Forms
            </Button>
          </div>

          {formFetchError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3" role="alert">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 font-medium">Não foi possível obter formulários do KoboToolbox</p>
                <pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-amber-100/70 p-3 text-xs leading-relaxed text-amber-900">{formFetchError}</pre>
                <p className="text-xs text-amber-700 mt-2">Confirme que o servidor Vite está em execução, o token tem acesso aos formulários e a API está disponível.</p>
              </div>
            </div>
          )}

          {availableForms.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Available Forms ({availableForms.length})</p>
              {availableForms.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.name}</p>
                    <p className="text-xs text-slate-400">{f.fields.length} campos · ID: {f.id}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openMapping(f)}>
                    <ArrowRight className="w-3.5 h-3.5 mr-1" /> Configurar JSONB
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-4 w-4" /> Formulários publicados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {syncResult && (
            <div className={`flex items-start gap-2 rounded-lg border p-3 ${syncResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`} role="status">
              {syncResult.success ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <pre className="whitespace-pre-wrap break-words text-xs">{syncResult.message}</pre>
            </div>
          )}
          {formConfigs.length > 0 ? formConfigs.map(config => {
            const connection = connections.find(item => item.id === config.connection_id);
            return (
              <div key={config.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{config.form_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{connection?.name ?? 'Ligação removida'} · {config.fields_schema.length} campos · ID: {config.kobo_form_id}</p>
                  <p className="mt-1 text-xs text-slate-400">Última sincronização: {config.last_synced_at ? new Date(config.last_synced_at).toLocaleString() : 'Ainda não sincronizado'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={config.is_active ? 'completed' : 'planned'} label={config.is_active ? 'Ativo' : 'Inativo'} />
                  <Button size="sm" variant="outline" onClick={() => { setSelectedFormConfigId(config.id); void syncFormSubmissions(config); }} disabled={syncingFormConfigId !== null}>
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncingFormConfigId === config.id ? 'animate-spin' : ''}`} />
                    {syncingFormConfigId === config.id ? 'A sincronizar…' : 'Sincronizar submissões'}
                  </Button>
                </div>
              </div>
            );
          }) : (
            <p className="py-5 text-center text-sm text-slate-400">Ainda não há formulários publicados. Use Fetch Forms e configure um formulário para começar.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileDown className="h-4 w-4" /> Submissões universais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select label="Formulário ativo" value={selectedFormConfigId} onChange={e => setSelectedFormConfigId(e.target.value)}>
            <option value="">Selecione um formulário publicado...</option>
            {formConfigs.filter(config => config.is_active).map(config => <option key={config.id} value={config.id}>{config.form_name}</option>)}
          </Select>
          {loadingSubmissions ? (
            <p className="py-8 text-center text-sm text-slate-500">A carregar submissões…</p>
          ) : submissions.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">ID Kobo</th>
                    <th className="whitespace-nowrap px-3 py-2 font-semibold">Submetido</th>
                    {Object.keys(submissions[0].answers ?? {}).map(key => <th key={key} className="whitespace-nowrap px-3 py-2 font-semibold">{key}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {submissions.map(row => (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{row.kobo_submission_id}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '—'}</td>
                      {Object.keys(submissions[0].answers ?? {}).map(key => {
                        const value = row.answers?.[key];
                        return <td key={key} className="max-w-xs whitespace-pre-wrap break-words px-3 py-2 text-slate-700">{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '—')}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">{selectedFormConfigId ? 'Não há submissões sincronizadas para este formulário.' : 'Selecione um formulário publicado para ver os dados.'}</p>
          )}
          {submissions.length >= 200 && <p className="text-right text-xs text-slate-400">A mostrar as 200 submissões mais recentes.</p>}
        </CardContent>
      </Card>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileDown className="w-4 h-4" /> Import History</CardTitle>
        </CardHeader>
        <CardContent>
          {imports.length > 0 ? (
            <div className="space-y-2">
              {imports.map((imp) => (
                <div key={imp.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{imp.form_name}</p>
                    <p className="text-xs text-slate-400">
                      {imp.generated_table_name ?? 'No table'} · {new Date(imp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      status={imp.status === 'applied' ? 'completed' : imp.status === 'failed' ? 'delayed' : 'planned'}
                      label={imp.status}
                    />
                    {imp.error_message && (
                      <span className="text-xs text-red-500" title={imp.error_message}>!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">No imports yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Connection Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New KoboToolbox Connection" size="md">
        <form onSubmit={handleSaveConnection} className="space-y-4">
          <Input label="Connection Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. TLM Field Data" />
          <Input label="API URL" value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} required placeholder="https://kf.kobotoolbox.org" />
          <Input label="API Token" value={form.api_token} onChange={(e) => setForm({ ...form, api_token: e.target.value })} required placeholder="Your KoboToolbox API token" />
          <Input label="Username (optional)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Your KoboToolbox username" />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Connection</Button>
          </div>
        </form>
      </Modal>

      {/* Dynamic JSONB form configuration modal */}
      <Modal open={!!mappingForm} onClose={() => setMappingForm(null)} title={`Publicar formulário: ${mappingForm?.name ?? ''}`} size="xl">
        {mappingForm && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
              <Database className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">
                A estrutura deste formulário será guardada em JSONB. As submissões serão sincronizadas para a tabela universal, sem criar tabelas físicas.
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Campo Kobo</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Tipo</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Rótulo</th>
                  </tr>
                </thead>
                <tbody>
                  {mappingForm.fields.map((field) => (
                    <tr key={field.name} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-slate-700">{field.name}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{field.type}</td>
                      <td className="px-3 py-2 text-slate-700">{field.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="rounded-lg border border-slate-200 p-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">Ver estrutura original Kobo (JSON)</summary>
              <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-500">{JSON.stringify(mappingForm.rawSchema, null, 2)}</pre>
            </details>

            {applyResult && (
              <div className={`rounded-lg p-3 flex items-start gap-2 ${applyResult.success ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {applyResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                <p className={`text-sm ${applyResult.success ? 'text-emerald-800' : 'text-red-800'}`}>{applyResult.message}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setMappingForm(null)}>Close</Button>
              <Button onClick={handleDeployForm} disabled={deploying || selectedConn === 'all'}>
                {deploying ? 'A publicar…' : 'Deploy formulário'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
