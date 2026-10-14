import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { generateSchemaProposal, proposalToSql } from '@/lib/schemaGenerator';
import type { SchemaProposal, CustomSchema } from '@/types';
import {
  Sparkles, Database, Key, Link2, Check, Loader2, Wand2,
  ChevronRight, Table2, Columns, FileCode
} from 'lucide-react';

const EXAMPLE_PROMPTS = [
  'I need a tracking table for school screening results linked to baseline indicators',
  'Create a table for OPAL savings group meetings with member attendance and financial records',
  'Track health worker training sessions with participant evaluation scores linked to projects',
  'Build a stigma assessment survey table with SARI scores by district',
];

export function SchemaGeneratorPage() {
  const canCreate = true;

  const [prompt, setPrompt] = useState('');
  const [proposal, setProposal] = useState<SchemaProposal | null>(null);
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CustomSchema[]>([]);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setApplied(false);

    await new Promise(r => setTimeout(r, 800));

    const result = generateSchemaProposal(prompt);
    setProposal(result);
    setGenerating(false);
  }

  async function handleApproveAndApply() {
    if (!proposal) return;
    setApplying(true);
    setError(null);

    try {
      const sql = proposalToSql(proposal);
      const tableName = proposal.tables[0]?.name ?? 'custom_table';

      const { error: rpcError } = await supabase.rpc('apply_custom_schema', { sql_text: sql });
      if (rpcError) throw rpcError;

      const { error: insertError } = await supabase.from('custom_schemas').insert({
        prompt,
        proposal: proposal as unknown as Record<string, unknown>,
        status: 'applied',
        table_name: tableName,
        created_by: null,
      });
      if (insertError) { alert('Error saving schema: ' + insertError.message); }

      setApplied(true);
      setApplying(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply schema. The custom tables require admin-level database access. The schema proposal has been saved for manual application.');
      setApplying(false);

      await supabase.from('custom_schemas').insert({
        prompt,
        proposal: proposal as unknown as Record<string, unknown>,
        status: 'draft',
        table_name: proposal.tables[0]?.name ?? null,
        created_by: null,
      }).then(({ error: insertError }) => {
        if (insertError) { alert('Error saving schema draft: ' + insertError.message); }
      });
    }
  }

  function loadHistory() {
    supabase.from('custom_schemas').select('*').order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setHistory(data as CustomSchema[] ?? []));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#EE3A25]" /> AI Schema Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Describe what you want to track. The system will generate a database schema proposal with tables, columns, and relationships.
          </p>
          <Textarea
            rows={4}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g., I need a tracking table for school screening results linked to baseline indicators"
          />
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <button
                key={i}
                onClick={() => setPrompt(ex)}
                className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
              >
                {ex.length > 50 ? ex.slice(0, 50) + '...' : ex}
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={generating || !prompt.trim()}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Schema</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Proposal */}
      {proposal && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-[#711246]" /> Generated Schema Proposal</CardTitle>
              {canCreate && !applied && (
                <Button onClick={handleApproveAndApply} disabled={applying} variant="secondary">
                  {applying ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</> : <><Check className="w-4 h-4" /> Approve & Apply</>}
                </Button>
              )}
              {applied && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <Check className="w-4 h-4" /> Schema Applied
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Schema saved as draft</p>
                <p className="text-amber-700">{error}</p>
              </div>
            )}

            {/* Tables */}
            {proposal.tables.map((table, ti) => (
              <div key={ti} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <Table2 className="w-4 h-4 text-[#EE3A25]" />
                  <span className="font-mono text-sm font-semibold text-slate-900">{table.name}</span>
                  <span className="text-xs text-slate-400 ml-2">{table.columns.length} columns</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {table.columns.map((col, ci) => (
                    <div key={ci} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex items-center gap-2 flex-1">
                        {col.is_primary ? (
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                        ) : col.is_foreign ? (
                          <Link2 className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <Columns className="w-3.5 h-3.5 text-slate-300" />
                        )}
                        <span className="font-mono text-sm text-slate-700">{col.name}</span>
                        {col.is_primary && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">PK</span>}
                        {col.is_foreign && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">FK → {col.foreign_table}</span>}
                      </div>
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{col.type}</span>
                      {!col.nullable && !col.is_primary && <span className="text-xs text-slate-400">NOT NULL</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Relationships */}
            {proposal.relationships.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-500" /> Relationships
                </h4>
                <div className="space-y-1.5">
                  {proposal.relationships.map((rel, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-mono bg-blue-50/50 rounded-lg px-3 py-2">
                      <ChevronRight className="w-4 h-4 text-blue-400" />
                      {rel}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SQL preview */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-slate-600 flex items-center gap-2 hover:text-slate-900">
                <FileCode className="w-4 h-4" /> View Generated SQL
              </summary>
              <pre className="mt-3 bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto">
                {proposalToSql(proposal)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schema History</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadHistory}>Load History</Button>
          </div>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center gap-3 border border-slate-200 rounded-lg p-3">
                  <Database className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{h.prompt}</p>
                    <p className="text-xs text-slate-400">{h.table_name ?? 'No table'} · {new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${h.status === 'applied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {h.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">No schemas generated yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
