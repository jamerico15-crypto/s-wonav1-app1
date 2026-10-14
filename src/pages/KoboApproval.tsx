import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import type { Activity, KoboUniversalSubmission, Project } from '@/types';

interface ApprovalFormState {
  projectId: string;
  activityId: string;
  valueField: string;
}

const EMPTY_FORM: ApprovalFormState = { projectId: '', activityId: '', valueField: '' };

function asNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function KoboApproval() {
  const [submissions, setSubmissions] = useState<KoboUniversalSubmission[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [forms, setForms] = useState<Record<string, ApprovalFormState>>({});
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [submissionResult, projectResult, activityResult, mappingResult] = await Promise.all([
        supabase.from('kobo_universal_submissions').select('*').order('submitted_at', { ascending: false }).limit(500),
        supabase.from('projects').select('*').order('title', { ascending: true }),
        supabase.from('activities').select('*').order('title', { ascending: true }),
        supabase.from('kobo_activity_mappings').select('submission_id,status'),
      ]);
      const failedQuery = [submissionResult.error, projectResult.error, activityResult.error, mappingResult.error].find(Boolean);
      if (failedQuery) throw failedQuery;

      const approvedSubmissionIds = new Set((mappingResult.data ?? [])
        .filter(mapping => String(mapping.status).toLocaleLowerCase() === 'aprovado')
        .map(mapping => String(mapping.submission_id)));
      const allSubmissions = submissionResult.data as KoboUniversalSubmission[] ?? [];
      setSubmissions(allSubmissions.filter(submission => !approvedSubmissionIds.has(submission.id)));
      setProjects(projectResult.data as Project[] ?? []);
      setActivities(activityResult.data as Activity[] ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao carregar a fila de triagem MEAL.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const updateForm = (submissionId: string, update: Partial<ApprovalFormState>) => {
    setForms(current => ({
      ...current,
      [submissionId]: { ...EMPTY_FORM, ...current[submissionId], ...update },
    }));
  };

  const approveRelation = async (submission: KoboUniversalSubmission) => {
    const form = forms[submission.id] ?? EMPTY_FORM;
    const activity = activities.find(candidate => candidate.id === form.activityId);
    const fieldValue = form.valueField ? submission.answers?.[form.valueField] : null;
    const numericValue = asNumericValue(fieldValue);
    if (!form.projectId || !activity || activity.project_id !== form.projectId || numericValue === null) {
      setErrorMessage('Selecione um projeto, uma atividade desse projeto e um campo de resposta numérico válido.');
      return;
    }

    setApprovingId(submission.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.from('kobo_activity_mappings').insert({
        submission_id: submission.id,
        project_id: form.projectId,
        activity_id: form.activityId,
        numeric_value: numericValue,
        status: 'aprovado',
      });
      if (error) throw error;
      setSubmissions(current => current.filter(row => row.id !== submission.id));
      setSuccessMessage(`Relação aprovada para a atividade “${activity.title}” (${numericValue}).`);
      setForms(current => {
        const next = { ...current };
        delete next[submission.id];
        return next;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível aprovar a relação MEAL.');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">KoboToolbox · MEAL</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Triagem e Conciliação</h2>
          <p className="mt-1 text-sm text-slate-500">Revise as respostas recebidas e associe-as a um projeto e atividade.</p>
        </div>
        <Button variant="outline" onClick={() => void loadPending()} disabled={loading}>
          <LoaderCircle className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar fila
        </Button>
      </header>

      {errorMessage && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <pre className="whitespace-pre-wrap break-words font-sans">{errorMessage}</pre>
        </div>
      )}
      {successMessage && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMessage}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-sm font-medium text-slate-600">Submissões pendentes</span>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">{submissions.length}</span>
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <LoaderCircle className="h-5 w-5 animate-spin text-rose-700" /> A carregar submissões…
          </div>
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-2xl bg-emerald-50 p-4"><ClipboardCheck className="h-8 w-8 text-emerald-600" /></div>
            <h3 className="font-semibold text-slate-800">Fila de triagem vazia</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">Não existem submissões pendentes de conciliação neste momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map(submission => {
            const form = forms[submission.id] ?? EMPTY_FORM;
            const numericFields = Object.keys(submission.answers ?? {}).filter(key => asNumericValue(submission.answers[key]) !== null);
            const matchingActivities = form.projectId ? activities.filter(activity => activity.project_id === form.projectId) : [];
            const selectedNumericValue = form.valueField ? asNumericValue(submission.answers?.[form.valueField]) : null;
            return (
              <Card key={submission.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{submission.kobo_form_id}</CardTitle>
                    <p className="mt-1 text-xs text-slate-500">Submissão {submission.kobo_submission_id} · {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Data não indicada'}</p>
                  </div>
                  <Badge status="delayed" label="Pendente" />
                </CardHeader>
                <CardContent className="space-y-5">
                  <details className="rounded-lg border border-slate-200 bg-slate-50">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">Ver respostas JSONB</summary>
                    <pre className="max-h-96 overflow-auto border-t border-slate-200 p-4 text-xs leading-relaxed text-slate-600">{JSON.stringify(submission.answers, null, 2)}</pre>
                  </details>

                  <div className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-2 xl:grid-cols-4">
                    <Select label="Projeto" value={form.projectId} onChange={event => updateForm(submission.id, { projectId: event.target.value, activityId: '' })}>
                      <option value="">Selecione um projeto...</option>
                      {projects.map(project => <option key={project.id} value={project.id}>{project.title}</option>)}
                    </Select>
                    <Select label="Atividade" value={form.activityId} disabled={!form.projectId} onChange={event => updateForm(submission.id, { activityId: event.target.value })}>
                      <option value="">Selecione uma atividade...</option>
                      {matchingActivities.map(activity => <option key={activity.id} value={activity.id}>{activity.title}</option>)}
                    </Select>
                    <Select label="Campo numérico da resposta" value={form.valueField} onChange={event => updateForm(submission.id, { valueField: event.target.value })}>
                      <option value="">Selecione o valor...</option>
                      {numericFields.map(key => <option key={key} value={key}>{key} · {String(submission.answers[key])}</option>)}
                    </Select>
                    <div className="flex flex-col justify-center rounded-lg bg-slate-50 px-3 py-2">
                      <span className="text-xs font-medium text-slate-500">Valor a conciliar</span>
                      <span className="mt-1 text-lg font-semibold text-slate-900">{selectedNumericValue === null ? '—' : selectedNumericValue.toLocaleString()}</span>
                    </div>
                    <div className="md:col-span-2 xl:col-span-4 flex justify-end">
                      <Button onClick={() => void approveRelation(submission)} disabled={approvingId !== null || !form.projectId || !form.activityId || selectedNumericValue === null}>
                        {approvingId === submission.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Aprovar Relação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
